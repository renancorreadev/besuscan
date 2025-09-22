package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/ethclient"
	"github.com/hubweb3/worker/internal/application"
	"github.com/hubweb3/worker/internal/config"
	"github.com/jackc/pgx/v4/pgxpool"
	"github.com/joho/godotenv"
)

func main() {
	// Carregar variáveis de ambiente
	err := godotenv.Load()
	if err != nil {
		log.Printf("⚠️ Arquivo .env não encontrado, usando variáveis do sistema: %v", err)
	}

	log.Println("🔧 Iniciando Block Explorer Worker (Clean Architecture)...")

	// Carregar configurações
	cfg := config.Load()

	// Inicializar container de dependências
	container, err := application.NewContainer(cfg)
	if err != nil {
		log.Fatalf("❌ Falha ao inicializar container: %v", err)
	}
	defer container.Close()
	log.Println("✅ Container de dependências inicializado")

	// Configurar canal para capturar sinais de encerramento
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	// Criar contexto cancelável
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// WaitGroup para aguardar todos os handlers terminarem
	var wg sync.WaitGroup

	// Iniciar Block Handler (nova arquitetura)
	wg.Add(1)
	go func() {
		defer wg.Done()
		blockHandler := container.GetBlockHandler()
		if err := blockHandler.Start(ctx); err != nil {
			log.Printf("❌ Erro no Block Handler: %v", err)
		}
	}()

	// Iniciar Transaction Handler
	wg.Add(1)
	go func() {
		defer wg.Done()
		transactionHandler := container.GetTransactionHandler()
		if err := transactionHandler.Start(ctx); err != nil {
			log.Printf("❌ Erro no Transaction Handler: %v", err)
		}
	}()

	// Iniciar Account Handler
	wg.Add(1)
	go func() {
		defer wg.Done()
		accountHandler := container.GetAccountHandler()
		if err := accountHandler.Start(ctx); err != nil {
			log.Printf("❌ Erro no Account Handler: %v", err)
		}
	}()

	// Iniciar Validator Handler
	wg.Add(1)
	go func() {
		defer wg.Done()
		validatorHandler := container.GetValidatorHandler()
		if err := validatorHandler.Start(ctx); err != nil {
			log.Printf("❌ Erro no Validator Handler: %v", err)
		}
	}()

	// Iniciar Pending Transaction Handler
	wg.Add(1)
	go func() {
		defer wg.Done()
		pendingTxHandler := container.GetPendingTxHandler()
		if err := pendingTxHandler.Start(ctx); err != nil {
			log.Printf("❌ Erro no Pending Transaction Handler: %v", err)
		}
	}()

	// Iniciar Event Handler
	wg.Add(1)
	go func() {
		defer wg.Done()
		eventHandler := container.GetEventHandler()
		if err := eventHandler.Start(ctx); err != nil {
			log.Printf("❌ Erro no Event Handler: %v", err)
		}
	}()

	go func() {
		time.Sleep(10 * time.Second) // Aguardar inicialização completa
		cleanupIncorrectContracts(ctx, container.GetDBPool(), container.GetEthClient())
	}()

	log.Println("🚀 Worker iniciado com sucesso (Clean Architecture). Pressione Ctrl+C para encerrar.")

	// Aguardar sinal de encerramento
	<-sigChan
	log.Println("\n🛑 Recebido sinal de encerramento. Parando handlers...")

	// Cancelar contexto para parar todos os handlers
	cancel()

	// Aguardar todos os handlers terminarem
	wg.Wait()

	log.Println("✅ Worker encerrado com sucesso")
}

// cleanupIncorrectContracts verifica e remove registros incorretos de contratos
func cleanupIncorrectContracts(ctx context.Context, db *pgxpool.Pool, ethClient *ethclient.Client) {
	log.Println("🧹 Iniciando limpeza de contratos incorretos...")

	// Buscar todos os contratos registrados
	query := `SELECT address FROM smart_contracts WHERE created_at > NOW() - INTERVAL '7 days'`
	rows, err := db.Query(ctx, query)
	if err != nil {
		log.Printf("❌ Erro ao buscar contratos para verificação: %v", err)
		return
	}
	defer rows.Close()

	var contractsToRemove []string
	checked := 0
	removed := 0

	for rows.Next() {
		var address string
		if err := rows.Scan(&address); err != nil {
			continue
		}

		checked++

		// Verificar se realmente tem código
		code, err := ethClient.CodeAt(ctx, common.HexToAddress(address), nil)
		if err != nil {
			log.Printf("⚠️ Erro ao verificar código do endereço %s: %v", address, err)
			continue
		}

		// Se não tem código ou tem código muito pequeno, marcar para remoção
		if len(code) == 0 {
			log.Printf("🗑️ Endereço %s não tem código, marcando para remoção", address)
			contractsToRemove = append(contractsToRemove, address)
		} else if len(code) < 10 {
			log.Printf("🗑️ Endereço %s tem código muito pequeno (%d bytes), marcando para remoção", address, len(code))
			contractsToRemove = append(contractsToRemove, address)
		}
	}

	// Remover contratos incorretos
	for _, address := range contractsToRemove {
		deleteQuery := `DELETE FROM smart_contracts WHERE address = $1`
		_, err := db.Exec(ctx, deleteQuery, address)
		if err != nil {
			log.Printf("❌ Erro ao remover contrato incorreto %s: %v", address, err)
		} else {
			log.Printf("✅ Contrato incorreto %s removido com sucesso", address)
			removed++
		}
	}

	log.Printf("🧹 Limpeza concluída: %d contratos verificados, %d removidos", checked, removed)
}
