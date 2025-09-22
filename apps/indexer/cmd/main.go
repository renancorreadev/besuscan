package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"sync"
	"syscall"

	"github.com/hubweb3/indexer/internal/modules/block"
	"github.com/hubweb3/indexer/internal/modules/events"
	"github.com/hubweb3/indexer/internal/modules/mempool"
	"github.com/hubweb3/indexer/internal/modules/transaction"
	"github.com/joho/godotenv"
)

func main() {
	// Carregar variáveis de ambiente
	err := godotenv.Load()
	if err != nil {
		log.Printf("⚠️ Arquivo .env não encontrado, usando variáveis do sistema: %v", err)
	}

	log.Println("📡 Iniciando Block Explorer Indexer...")

	// Verificar variáveis de ambiente essenciais
	requiredEnvs := []string{"ETH_WS_URL", "RABBITMQ_URL", "RABBITMQ_EXCHANGE"}
	for _, env := range requiredEnvs {
		if os.Getenv(env) == "" {
			log.Fatalf("❌ Variável de ambiente obrigatória não definida: %s", env)
		}
	}

	// Configurar canal para capturar sinais de encerramento
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	// Criar contexto cancelável
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// WaitGroup para aguardar todos os módulos terminarem
	var wg sync.WaitGroup

	// Iniciar módulo de blocos (listener + publisher)
	wg.Add(1)
	go func() {
		defer wg.Done()
		log.Println("🔄 Iniciando Block Listener...")
		block.RunBlockListener()
	}()

	// Iniciar módulo de transações (listener)
	wg.Add(1)
	go func() {
		defer wg.Done()
		log.Println("🔄 Iniciando Transaction Indexer...")
		transaction.RunTxIndexer()
	}()

	// Iniciar módulo de mempool (listener)
	wg.Add(1)
	go func() {
		defer wg.Done()
		log.Println("🔄 Iniciando Mempool Listener...")
		mempool.RunMempoolListener(ctx)
	}()

	// Iniciar módulo de eventos (listener)
	wg.Add(1)
	go func() {
		defer wg.Done()
		log.Println("🔄 Iniciando Event Listener...")
		events.RunEventListener()
	}()

	// TODO: Adicionar outros módulos conforme necessário
	// - Gas tracking
	// - Account management

	log.Println("🚀 Indexer iniciado com sucesso. Pressione Ctrl+C para encerrar.")
	log.Println("📊 Módulos ativos:")
	log.Println("  • Block Listener - Monitora novos blocos")
	log.Println("  • Transaction Indexer - Monitora transações")
	log.Println("  • Mempool Listener - Monitora transações pendentes")
	log.Println("  • Event Listener - Monitora eventos de smart contracts")

	// Aguardar sinal de encerramento
	<-sigChan
	log.Println("\n🛑 Recebido sinal de encerramento. Parando módulos...")

	// Cancelar contexto para parar todos os módulos
	cancel()

	// Aguardar todos os módulos terminarem
	wg.Wait()

	log.Println("✅ Indexer encerrado com sucesso")
}
