package transaction

import (
	"context"
	"encoding/json"
	"log"
	"math/big"
	"os"
	"time"

	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/ethclient"
	"github.com/hubweb3/indexer/internal/queues"
)

// TransactionEvent representa um evento de transação para o worker processar
type TransactionEvent struct {
	Hash        string `json:"hash"`
	BlockNumber uint64 `json:"block_number"`
	BlockHash   string `json:"block_hash"`
	From        string `json:"from"`
	To          string `json:"to"`
	Value       string `json:"value"`
	Gas         uint64 `json:"gas"`
	GasPrice    string `json:"gas_price"`
	Nonce       uint64 `json:"nonce"`
}

// BlockJob estrutura do job recebido do RabbitMQ
type BlockJob struct {
	Number    uint64 `json:"number"`
	Hash      string `json:"hash"`
	Timestamp int64  `json:"timestamp"`
}

func RunTxIndexer() {
	// Capturar panics para debug
	defer func() {
		if r := recover(); r != nil {
			log.Printf("[tx_indexer] ❌ PANIC capturado: %v", r)
		}
	}()

	log.Println("[tx_indexer] 🚀 Inicializando módulo de transações...")
	ctx := context.Background()

	rabbitURL := os.Getenv("RABBITMQ_URL")
	if rabbitURL == "" {
		rabbitURL = "amqp://guest:guest@localhost:5672/"
	}
	besuWS := os.Getenv("ETH_WS_URL")
	if besuWS == "" {
		besuWS = "ws://localhost:6174"
	}

	log.Printf("[tx_indexer] 🔗 Conectando ao RabbitMQ: %s", rabbitURL)
	log.Printf("[tx_indexer] 🔗 Conectando ao Besu: %s", besuWS)

	// Função para conectar ao cliente Ethereum com retentativas
	connectEthClient := func() *ethclient.Client {
		for {
			client, err := ethclient.Dial(besuWS)
			if err == nil {
				log.Println("[tx_indexer] ✅ Cliente Ethereum conectado")
				return client
			}
			log.Printf("[tx_indexer] ❌ Erro ao conectar no Besu: %v. Tentando novamente em 5 segundos...", err)
			time.Sleep(5 * time.Second)
		}
	}

	// Conectar ao RabbitMQ para consumir e publicar
	log.Println("[tx_indexer] 📡 Criando consumer...")
	consumer, err := queues.NewConsumer(rabbitURL)
	if err != nil {
		log.Fatalf("[tx_indexer] ❌ Falha ao conectar no RabbitMQ (consumer): %v", err)
	}
	defer consumer.Close()
	log.Println("[tx_indexer] ✅ Consumer criado com sucesso")

	log.Println("[tx_indexer] 📡 Criando publisher...")
	publisher, err := queues.NewPublisher(rabbitURL)
	if err != nil {
		log.Fatalf("[tx_indexer] ❌ Falha ao conectar no RabbitMQ (publisher): %v", err)
	}
	defer publisher.Close()
	log.Println("[tx_indexer] ✅ Publisher criado com sucesso")

	// Declarar filas
	log.Println("[tx_indexer] 📋 Declarando fila block-mined...")
	if err := consumer.DeclareQueue(queues.BlockMinedQueue); err != nil {
		log.Fatalf("[tx_indexer] ❌ Erro ao declarar fila block-mined: %v", err)
	}
	log.Println("[tx_indexer] ✅ Fila block-mined declarada")

	// Declarar fila transaction-mined para publicar eventos
	log.Println("[tx_indexer] 📋 Declarando fila transaction-mined...")
	transactionMinedQueue := queues.QueueDeclaration{
		Name:       "transaction-mined",
		Durable:    true,
		AutoDelete: false,
		Exclusive:  false,
		NoWait:     false,
		Args:       nil,
	}
	if err := publisher.DeclareQueue(transactionMinedQueue); err != nil {
		log.Fatalf("[tx_indexer] ❌ Erro ao declarar fila transaction-mined: %v", err)
	}
	log.Println("[tx_indexer] ✅ Fila transaction-mined declarada")

	// Declarar fila block-processed para o worker processar
	log.Println("[tx_indexer] 📋 Declarando fila block-processed...")
	blockProcessedQueue := queues.QueueDeclaration{
		Name:       "block-processed",
		Durable:    true,
		AutoDelete: false,
		Exclusive:  false,
		NoWait:     false,
		Args:       nil,
	}
	if err := publisher.DeclareQueue(blockProcessedQueue); err != nil {
		log.Fatalf("[tx_indexer] ❌ Erro ao declarar fila block-processed: %v", err)
	}
	log.Println("[tx_indexer] ✅ Fila block-processed declarada")

	// Consumir jobs da fila block-mined
	log.Println("[tx_indexer] 🎯 Registrando consumer na fila block-mined...")
	msgs, err := consumer.Consume(queues.BlockMinedQueue.Name)
	if err != nil {
		log.Fatalf("[tx_indexer] ❌ Falha ao registrar consumer: %v", err)
	}
	log.Println("[tx_indexer] ✅ Consumer registrado na fila block-mined")

	// Conectar ao cliente Ethereum
	client := connectEthClient()

	log.Println("[tx_indexer] 🎉 Worker pronto para consumir jobs do RabbitMQ...")
	log.Println("[tx_indexer] 👂 Aguardando mensagens na fila block-mined...")

	processedBlocks := 0
	for d := range msgs {
		log.Printf("[tx_indexer] 📨 Nova mensagem recebida da fila (tamanho: %d bytes)", len(d.Body))

		var blockJob BlockJob
		if err := json.Unmarshal(d.Body, &blockJob); err != nil {
			log.Printf("[tx_indexer] ❌ Payload inválido: %v", err)
			d.Nack(false, false) // Rejeitar mensagem malformada
			continue
		}

		log.Printf("[tx_indexer] 📥 Recebido job para bloco %d", blockJob.Number)

		// Buscar bloco com retry
		var block *types.Block
		var blockErr error
		for attempt := 1; attempt <= 3; attempt++ {
			block, blockErr = client.BlockByNumber(ctx, big.NewInt(int64(blockJob.Number)))
			if blockErr == nil {
				break
			}
			log.Printf("[tx_indexer] ⏳ Tentativa %d falhou para bloco %d: %v", attempt, blockJob.Number, blockErr)
			if attempt < 3 {
				time.Sleep(time.Duration(attempt) * time.Second)
			}
		}

		if blockErr != nil {
			log.Printf("[tx_indexer] ❌ Erro ao buscar bloco %d após 3 tentativas: %v", blockJob.Number, blockErr)
			d.Nack(false, true) // Reenviar para fila
			continue
		}

		log.Printf("[tx_indexer] 🔍 Processando bloco %d com %d transações", blockJob.Number, len(block.Transactions()))

		// Para cada transação, publicar evento para o worker processar
		for i, tx := range block.Transactions() {
			txHash := tx.Hash().Hex()

			// Buscar dados completos da transação via RPC com retry
			var txRPC struct {
				From string `json:"from"`
				To   string `json:"to"`
			}
			var callErr error
			for attempt := 1; attempt <= 3; attempt++ {
				callErr = client.Client().CallContext(ctx, &txRPC, "eth_getTransactionByHash", txHash)
				if callErr == nil {
					break
				}
				log.Printf("[tx_indexer] ⏳ Tentativa %d falhou ao buscar tx %s via RPC: %v", attempt, txHash, callErr)
				if attempt < 3 {
					time.Sleep(time.Duration(attempt) * time.Second)
				}
			}

			if callErr != nil {
				log.Printf("[tx_indexer] Erro ao buscar tx %s via RPC após 3 tentativas: %v. Pulando transação.", txHash, callErr)
				continue
			}

			// Criar evento de transação
			txEvent := TransactionEvent{
				Hash:        txHash,
				BlockNumber: blockJob.Number,
				BlockHash:   block.Hash().Hex(),
				From:        txRPC.From,
				To:          txRPC.To,
				Value:       tx.Value().String(),
				Gas:         tx.Gas(),
				GasPrice:    tx.GasPrice().String(),
				Nonce:       tx.Nonce(),
			}

			if tx.To() != nil {
				txEvent.To = tx.To().Hex()
			}

			// Publicar evento para o worker processar
			eventData, err := json.Marshal(txEvent)
			if err != nil {
				log.Printf("[tx_indexer] Erro ao serializar evento da tx %s: %v", txHash, err)
				continue
			}

			if err := publisher.Publish("transaction-mined", eventData); err != nil {
				log.Printf("[tx_indexer] Erro ao publicar evento da tx %d/%d %s: %v", i+1, len(block.Transactions()), txHash, err)
			} else {
				log.Printf("[tx_indexer] Evento de transação %d/%d publicado: %s", i+1, len(block.Transactions()), txHash)
			}
		}

		processedBlocks++
		log.Printf("[tx_indexer] ✅ Bloco %d processado - %d transações publicadas (Total blocos processados: %d)", blockJob.Number, len(block.Transactions()), processedBlocks)

		// Publicar bloco processado para o worker
		blockProcessedData, err := json.Marshal(blockJob)
		if err != nil {
			log.Printf("[tx_indexer] Erro ao serializar bloco processado %d: %v", blockJob.Number, err)
		} else {
			if err := publisher.Publish("block-processed", blockProcessedData); err != nil {
				log.Printf("[tx_indexer] Erro ao publicar bloco processado %d: %v", blockJob.Number, err)
			} else {
				log.Printf("[tx_indexer] 📡 Bloco %d publicado para worker processar", blockJob.Number)
			}
		}

		// Confirmar processamento da mensagem
		d.Ack(false)
	}
}
