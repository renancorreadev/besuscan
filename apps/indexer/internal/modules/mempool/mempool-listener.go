package mempool

import (
	"context"
	"encoding/json"
	"log"
	"os"
	"time"

	"github.com/ethereum/go-ethereum/rpc"
	"github.com/hubweb3/indexer/internal/modules/mempool/types"
	"github.com/hubweb3/indexer/internal/queues"
)

// RunMempoolListener escuta transações pendentes e publica jobs na fila.
func RunMempoolListener(ctx context.Context) {
	besuWS := os.Getenv("ETH_WS_URL")
	besuRPC := os.Getenv("ETH_RPC_URL")
	if besuWS == "" && besuRPC == "" {
		besuRPC = "http://localhost:8545"
	}
	amqpURL := os.Getenv("RABBITMQ_URL")
	if amqpURL == "" {
		amqpURL = "amqp://guest:guest@localhost:5672/"
	}

	// Função para conectar ao cliente RPC com retentativas
	connectClient := func() *rpc.Client {
		for {
			var rpcClient *rpc.Client
			var dialErr error
			if besuWS != "" {
				rpcClient, dialErr = rpc.Dial(besuWS)
			} else {
				rpcClient, dialErr = rpc.Dial(besuRPC)
			}

			if dialErr == nil {
				log.Println("[mempool_listener] Conectado ao RPC do Besu")
				return rpcClient
			} else {
				log.Printf("[mempool_listener] Erro ao conectar no RPC do Besu: %v. Tentando novamente em 5 segundos...", dialErr)
				time.Sleep(5 * time.Second)
			}
		}
	}

	rpcClient := connectClient()

	publisher, err := queues.NewPublisher(amqpURL)
	if err != nil {
		log.Fatalf("[mempool_listener] Erro ao conectar no RabbitMQ: %v", err)
	}
	defer publisher.Close()

	err = publisher.DeclareQueue(queues.PendingTxQueue)
	if err != nil {
		log.Fatalf("[mempool_listener] Falha ao declarar fila pending-tx: %v", err)
	}

	// Escutar transações pendentes com lógica de reconexão
	for {
		ch := make(chan string)
		sub, err := rpcClient.EthSubscribe(ctx, ch, "newPendingTransactions")
		if err != nil {
			log.Printf("[mempool_listener] Erro ao iniciar eth_subscribe: %v. Tentando reconectar em 5 segundos...", err)
			time.Sleep(5 * time.Second)
			rpcClient = connectClient() // Tentar re-conectar o cliente
			continue                    // Tentar novamente a subscrição
		}

		log.Println("[mempool_listener] Listener de transações pendentes iniciado...")
		for {
			select {
			case err := <-sub.Err():
				log.Printf("[mempool_listener] Subscription error: %v. Re-conectando...", err)
				sub.Unsubscribe()             // Fechar subscrição anterior
				close(ch)                     // Fechar o canal para limpar goroutines lendo dele
				time.Sleep(5 * time.Second)   // Pequena pausa antes de tentar reconectar
				goto ReconnectMempoolListener // Vai para o label para tentar reconectar
			case hash := <-ch:
				job := types.PendingTxJob{Hash: hash}
				body, _ := json.Marshal(job)
				if err := publisher.Publish(queues.PendingTxQueue.Name, body); err != nil {
					log.Printf("[mempool_listener] Erro ao publicar pending-tx: %v", err)
				} else {
					log.Printf("[mempool_listener] Job de tx pendente publicado: %s", hash)
				}
			}
		}
	ReconnectMempoolListener:
		log.Println("[mempool_listener] Tentando reconectar o Mempool Listener...")
	}
}
