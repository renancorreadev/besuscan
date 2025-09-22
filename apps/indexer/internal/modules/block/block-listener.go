package block

import (
	"context"
	"encoding/json"
	"log"
	"math/big"
	"os"
	"strconv"
	"time"

	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/ethclient"
	blocktypes "github.com/hubweb3/indexer/internal/modules/block/types"
	"github.com/hubweb3/indexer/internal/queues"
)

func RunBlockListener() {
	// Listener de blocos reativo - apenas monitora e publica eventos
	ctx := context.Background()

	besuWS := os.Getenv("ETH_WS_URL")
	besuRPC := os.Getenv("ETH_RPC_URL")
	if besuWS == "" && besuRPC == "" {
		besuWS = "wss://wsrpc.hubweb3.com"
		besuRPC = "https://wsrpc.hubweb3.com"
	}
	amqpURL := os.Getenv("RABBITMQ_URL")
	if amqpURL == "" {
		amqpURL = "amqp://guest:guest@localhost:5672/"
	}

	// Configuração de bloco inicial para sincronização
	startingBlock := os.Getenv("STARTING_BLOCK")
	var startFromBlock uint64
	if startingBlock != "" {
		if parsed, err := strconv.ParseUint(startingBlock, 10, 64); err == nil {
			startFromBlock = parsed
			log.Printf("[block_listener] 🎯 Configurado para iniciar do bloco: %d", startFromBlock)
		}
	}

	publisher, err := queues.NewPublisher(amqpURL)
	if err != nil {
		log.Fatalf("[block_listener] Erro ao conectar no RabbitMQ: %v", err)
	}
	defer publisher.Close()

	// Declarar a fila block-mined sem argumentos especiais para evitar conflitos
	if err := publisher.DeclareQueue(queues.BlockMinedQueue); err != nil {
		log.Fatalf("[block_listener] Falha ao declarar fila block-mined: %v", err)
	}

	// Tentar conectar via WebSocket primeiro, depois HTTP
	var client *ethclient.Client
	if besuWS != "" {
		log.Printf("[block_listener] Tentando conectar via WebSocket: %s", besuWS)
		client, err = ethclient.Dial(besuWS)
		if err != nil {
			log.Printf("[block_listener] WebSocket falhou (%v), tentando HTTP: %s", err, besuRPC)
			if besuRPC != "" {
				client, err = ethclient.Dial(besuRPC)
				if err != nil {
					log.Fatalf("[block_listener] Erro ao conectar via HTTP: %v", err)
				}
				log.Println("[block_listener] Conectado via HTTP (polling mode)")
			} else {
				log.Fatalf("[block_listener] Erro ao conectar no Besu WS: %v", err)
			}
		} else {
			log.Println("[block_listener] Conectado via WebSocket")
		}
	} else {
		log.Printf("[block_listener] Conectando via HTTP: %s", besuRPC)
		client, err = ethclient.Dial(besuRPC)
		if err != nil {
			log.Fatalf("[block_listener] Erro ao conectar via HTTP: %v", err)
		}
	}

	// Obter último bloco da rede para começar o monitoramento
	latestOnNode, err := client.BlockNumber(ctx)
	if err != nil {
		log.Fatalf("[block_listener] Erro ao obter último bloco do node: %v", err)
	}

	// Usar bloco configurado ou último da rede
	startBlock := latestOnNode
	if startFromBlock > 0 && startFromBlock <= latestOnNode {
		startBlock = startFromBlock
		log.Printf("[block_listener] 🔄 Iniciando do bloco configurado: %d (último na rede: %d)", startBlock, latestOnNode)
	} else {
		log.Printf("[block_listener] 🔄 Iniciando do último bloco da rede: %d", startBlock)
	}

	// Se há um bloco inicial configurado, processar blocos históricos primeiro
	if startFromBlock > 0 && startFromBlock < latestOnNode {
		log.Printf("[block_listener] 📚 Processando blocos históricos de %d até %d...", startFromBlock, latestOnNode)
		for blockNum := startFromBlock; blockNum <= latestOnNode; blockNum++ {
			block, err := client.BlockByNumber(ctx, big.NewInt(int64(blockNum)))
			if err != nil {
				log.Printf("[block_listener] ⚠️ Erro ao buscar bloco histórico %d: %v", blockNum, err)
				continue
			}

			// Criar job de bloco
			job := blocktypes.BlockJob{
				Number:    blockNum,
				Hash:      block.Hash().Hex(),
				Timestamp: int64(block.Time()),
			}

			// Publicar evento
			body, _ := json.Marshal(job)
			if err := publisher.Publish(queues.BlockMinedQueue.Name, body); err != nil {
				log.Printf("[block_listener] Erro ao publicar bloco histórico %d: %v", blockNum, err)
			} else {
				log.Printf("[block_listener] 📦 Bloco histórico %d publicado (%d transações)", blockNum, len(block.Transactions()))
			}

			// Pequena pausa para não sobrecarregar
			time.Sleep(100 * time.Millisecond)
		}
		log.Printf("[block_listener] ✅ Processamento de blocos históricos concluído")
	}

	// Escutar blocos em tempo real com lógica de reconexão
	for {
		headerCh := make(chan *types.Header)
		sub, err := client.SubscribeNewHead(ctx, headerCh)
		if err != nil {
			log.Printf("[block_listener] Erro ao assinar newHeads: %v. Tentando reconectar em 5 segundos...", err)
			time.Sleep(5 * time.Second)
			// Tentar re-dial no cliente se a subscrição falhar
			newClient, dialErr := ethclient.Dial(besuWS)
			if dialErr != nil {
				log.Printf("[block_listener] Erro ao re-conectar no Besu WS: %v. Tentando novamente...", dialErr)
				continue // Tentar novamente o loop de reconexão
			}
			client = newClient
			continue // Tentar novamente a subscrição
		}

		log.Println("[block_listener] 🔴 Listener de blocos iniciado (tempo real)...")

		// Buffer para processar blocos sequencialmente e evitar perda
		blockBuffer := make(chan *types.Header, 1000) // Aumentar buffer para 1000 blocos

		// Pool de workers para processar blocos em paralelo (mas publicar sequencialmente)
		numWorkers := 10 // 10 workers paralelos

		// Canal para jobs processados (mantém ordem)
		processedJobs := make(chan blocktypes.BlockJob, 1000)

		// Workers para processar headers em paralelo
		for i := 0; i < numWorkers; i++ {
			go func(workerID int) {
				for header := range blockBuffer {
					// Criar job básico sem buscar dados completos (otimização)
					job := blocktypes.BlockJob{
						Number:    header.Number.Uint64(),
						Hash:      header.Hash().Hex(),
						Timestamp: int64(header.Time),
					}

					// Enviar job processado
					processedJobs <- job
				}
			}(i)
		}

		// Helper function para publicar batch
		publishBatch := func(pub *queues.Publisher, jobs []blocktypes.BlockJob) {
			log.Printf("[block_listener] 🚀 Publicando lote de %d blocos (do %d ao %d)",
				len(jobs), jobs[0].Number, jobs[len(jobs)-1].Number)

			for _, job := range jobs {
				body, _ := json.Marshal(job)
				if err := pub.Publish(queues.BlockMinedQueue.Name, body); err != nil {
					log.Printf("[block_listener] ❌ Erro ao publicar bloco %d: %v", job.Number, err)
				}
			}

			log.Printf("[block_listener] ✅ Lote de %d blocos publicado", len(jobs))
		}

		// Goroutine para publicar jobs processados sequencialmente
		go func() {
			batch := make([]blocktypes.BlockJob, 0, 50)  // Batch de até 50 blocos
			batchTimer := time.NewTimer(2 * time.Second) // Timeout de 2 segundos

			for {
				select {
				case job := <-processedJobs:
					batch = append(batch, job)

					// Se batch está cheio, publicar imediatamente
					if len(batch) >= 50 {
						publishBatch(publisher, batch)
						batch = batch[:0] // Clear batch
						batchTimer.Reset(2 * time.Second)
					}

				case <-batchTimer.C:
					// Timeout - publicar batch atual se não estiver vazio
					if len(batch) > 0 {
						publishBatch(publisher, batch)
						batch = batch[:0] // Clear batch
					}
					batchTimer.Reset(2 * time.Second)
				}
			}
		}()

		// Loop principal de recebimento de headers da subscrição
		for {
			select {
			case err := <-sub.Err():
				log.Printf("[block_listener] Erro na subscription: %v. Re-conectando...", err)
				// Fechar subscrição anterior e sair do loop interno para tentar reconectar
				sub.Unsubscribe()
				time.Sleep(5 * time.Second) // Pequena pausa antes de tentar reconectar
				goto ReconnectBlockListener // Vai para o label para tentar reconectar
			case header := <-headerCh:
				// Adicionar ao buffer para processamento sequencial
				select {
				case blockBuffer <- header:
					// Bloco adicionado ao buffer com sucesso
				default:
					log.Printf("[block_listener] ⚠️ Buffer cheio! Bloco %d pode ser perdido", header.Number.Uint64())
				}
			}
		}
		// Etiqueta para reconexão (goto)
	ReconnectBlockListener:
		log.Println("[block_listener] Tentando reconectar o Block Listener...")
	}
}
