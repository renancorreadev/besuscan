package main

import (
	"database/sql"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	_ "github.com/lib/pq"
	amqp "github.com/rabbitmq/amqp091-go"

	"explorer-api/internal/app/services"
	"explorer-api/internal/infrastructure/database"
	"explorer-api/internal/infrastructure/queue"
	"explorer-api/internal/infrastructure/websocket"
	"explorer-api/internal/interfaces/http/handlers"
	"explorer-api/internal/interfaces/http/middleware"
)

func main() {
	log.Println("🚀 Iniciando BesuScan API...")

	// Configurar Gin
	r := gin.Default()

	// Middleware CORS para desenvolvimento
	r.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")
		c.Header("Access-Control-Allow-Credentials", "true")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	// Conectar ao banco de dados com retry
	db := connectToDatabase()
	if db == nil {
		log.Fatal("❌ Falha crítica: Não foi possível conectar ao banco de dados. A API não pode funcionar sem conexão com o banco.")
	}
	defer db.Close()

	// Inicializar WebSocket Hub
	hub := websocket.NewHub()
	go hub.Run()

	// Configurar URL do RabbitMQ
	rabbitmqURL := os.Getenv("RABBITMQ_URL")
	if rabbitmqURL == "" {
		rabbitmqURL = "amqp://guest:guest@rabbitmq:5672/"
	}

	// Conectar ao RabbitMQ e iniciar consumer WebSocket (apenas se habilitado)
	enableWebSocket := os.Getenv("ENABLE_WEBSOCKET")
	if enableWebSocket == "" {
		enableWebSocket = "false" // Desabilitado por padrão para melhor performance
	}

	if enableWebSocket == "true" {
		consumer, err := websocket.NewRabbitMQConsumer(rabbitmqURL, hub)
		if err != nil {
			log.Printf("⚠️ Erro ao conectar RabbitMQ Consumer: %v", err)
			log.Println("⚠️ WebSocket funcionará sem eventos em tempo real")
		} else {
			go func() {
				if err := consumer.Start(); err != nil {
					log.Printf("❌ Erro ao iniciar RabbitMQ Consumer: %v", err)
				}
			}()
			defer consumer.Close()
			log.Println("✅ RabbitMQ Consumer para WebSocket iniciado")
		}
	} else {
		log.Println("ℹ️ WebSocket Consumer desabilitado (ENABLE_WEBSOCKET=false)")
	}

	// Conectar ao RabbitMQ (conexão original para verificação)
	connectToRabbitMQ()

	// Inicializar cliente AMQP para envio de mensagens
	amqpClient, err := queue.NewAMQPClient(rabbitmqURL)
	if err != nil {
		log.Printf("⚠️ Erro ao conectar AMQP Client: %v", err)
		log.Println("⚠️ Operações de escrita via API não funcionarão")
	} else {
		defer amqpClient.Close()
		log.Println("✅ AMQP Client para envio de mensagens iniciado")
	}

	// Inicializar repositórios
	blockRepo := database.NewPostgresBlockRepository(db)
	transactionRepo := database.NewPostgresTransactionRepository(db)
	accountRepo := database.NewPostgresAccountRepository(db)
	accountTagRepo := database.NewPostgresAccountTagRepository(db)
	accountAnalyticsRepo := database.NewPostgresAccountAnalyticsRepository(db)
	contractInteractionRepo := database.NewPostgresContractInteractionRepository(db)
	tokenHoldingRepo := database.NewPostgresTokenHoldingRepository(db)
	validatorRepo := database.NewPostgresValidatorRepository(db)
	userRepo := database.NewPostgresUserRepository(db)

	// Configurar URL do RPC Besu
	rpcURL := os.Getenv("BESU_RPC_URL")
	if rpcURL == "" {
		rpcURL = "http://89.117.33.254:8545"
	}

	// Configurar JWT Secret
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "besuscan-secret-key-change-in-production" // Chave padrão para desenvolvimento
		log.Println("⚠️ Usando JWT_SECRET padrão. Configure JWT_SECRET no ambiente para produção!")
	}

	// Inicializar serviços
	blockService := services.NewBlockService(blockRepo)
	transactionService := services.NewTransactionService(transactionRepo)
	smartContractService := services.NewSmartContractService(database.NewPostgresDB(db))
	accountService := services.NewAccountService(accountRepo, accountTagRepo, accountAnalyticsRepo, contractInteractionRepo, tokenHoldingRepo, db)
	validatorService := services.NewValidatorService(validatorRepo, blockRepo, rpcURL)
	eventService := services.NewEventService()
	authService := services.NewAuthService(userRepo, jwtSecret)

	// Inicializar serviço de fila (se AMQP Client estiver disponível)
	var queueService *services.QueueService
	if amqpClient != nil {
		queueService = services.NewQueueService(amqpClient)
	}

	// Inicializar handlers
	blockHandler := handlers.NewBlockHandler(blockService)
	transactionHandler := handlers.NewTransactionHandler(transactionService)
	smartContractHandler := handlers.NewSmartContractHandler(smartContractService)
	validatorHandler := handlers.NewValidatorHandler(validatorService)
	eventHandler := handlers.NewEventHandler(eventService)
	statsHandler := handlers.NewStatsHandler(blockService, transactionService, smartContractService, accountService, db)
	authHandler := handlers.NewAuthHandler(authService)

	// AccountHandler com ou sem queue service
	accountHandler := handlers.NewAccountHandler(accountService, queueService, smartContractService)
	if queueService == nil {
		log.Println("⚠️ AccountHandler criado apenas para operações de leitura")
	}

	wsHandler := handlers.NewWebSocketHandler(hub)

	// Inicializar middleware
	authMiddleware := middleware.NewAuthMiddleware(authService)

	// Rotas de saúde
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":    "ok",
			"service":   "NXplorer API",
			"timestamp": time.Now(),
		})
	})

	// Rota WebSocket
	r.GET("/ws", wsHandler.HandleWebSocket)
	r.GET("/ws/stats", wsHandler.GetStats)

	// Rotas da API v1
	api := r.Group("/api")
	{
		// Rotas de autenticação (públicas)
		auth := api.Group("/auth")
		{
			auth.POST("/login", authHandler.Login)                    // POST /api/auth/login
			auth.POST("/register", authHandler.Register)              // POST /api/auth/register
			auth.POST("/logout", authMiddleware.RequireAuth(), authHandler.Logout) // POST /api/auth/logout
			auth.GET("/me", authMiddleware.RequireAuth(), authHandler.Me)          // GET /api/auth/me
			auth.POST("/change-password", authMiddleware.RequireAuth(), authHandler.ChangePassword) // POST /api/auth/change-password
			auth.POST("/refresh", authMiddleware.RequireAuth(), authHandler.RefreshToken)           // POST /api/auth/refresh
		}

		// Rotas de estatísticas gerais (públicas)
		api.GET("/stats", statsHandler.GetGeneralStats)                   // GET /api/stats
		api.GET("/stats/recent-activity", statsHandler.GetRecentActivity) // GET /api/stats/recent-activity
		// Rotas de blocos
		blocks := api.Group("/blocks")
		{
			blocks.GET("", blockHandler.GetBlocks)                                 // GET /api/blocks?limit=10
			blocks.GET("/search", blockHandler.GetBlocksWithFilters)               // GET /api/blocks/search?miner=0x...&min_gas_used=1000
			blocks.GET("/latest", blockHandler.GetLatestBlock)                     // GET /api/blocks/latest
			blocks.GET("/stats", blockHandler.GetBlocksStats)                      // GET /api/blocks/stats
			blocks.GET("/gas-trends", blockHandler.GetGasTrends)                   // GET /api/blocks/gas-trends?days=7
			blocks.GET("/volume-distribution", blockHandler.GetVolumeDistribution) // GET /api/blocks/volume-distribution?period=24h
			blocks.GET("/miners", blockHandler.GetUniqueMiners)                    // GET /api/blocks/miners
			blocks.GET("/range", blockHandler.GetBlocksByRange)                    // GET /api/blocks/range?from=100&to=110
			blocks.GET("/:identifier", blockHandler.GetBlock)                      // GET /api/blocks/123 ou /api/blocks/0x...
		}

		// Rota do dashboard com cache híbrido
		dashboard := api.Group("/dashboard")
		{
			dashboard.GET("/data", blockHandler.GetDashboardData) // GET /api/dashboard/data - Dados críticos com cache Redis
		}

		// Rotas de transações
		transactions := api.Group("/transactions")
		{
			transactions.GET("", transactionHandler.GetTransactions)                           // GET /api/transactions?limit=10
			transactions.GET("/search", transactionHandler.GetTransactionsWithFilters)         // GET /api/transactions/search?from=0x...&status=success
			transactions.GET("/stats", transactionHandler.GetTransactionStats)                 // GET /api/transactions/stats
			transactions.GET("/value", transactionHandler.GetTransactionsByValue)              // GET /api/transactions/value?min=1000&max=5000
			transactions.GET("/type/:type", transactionHandler.GetTransactionsByType)          // GET /api/transactions/type/0
			transactions.GET("/contracts", transactionHandler.GetContractCreations)            // GET /api/transactions/contracts
			transactions.GET("/date-range", transactionHandler.GetTransactionsByDateRange)     // GET /api/transactions/date-range?from=2024-01-01&to=2024-01-31
			transactions.GET("/block/:blockNumber", transactionHandler.GetTransactionsByBlock) // GET /api/transactions/block/123
			transactions.GET("/address/:address", transactionHandler.GetTransactionsByAddress) // GET /api/transactions/address/0x...
			transactions.GET("/status/:status", transactionHandler.GetTransactionsByStatus)    // GET /api/transactions/status/success
			transactions.GET("/:hash", transactionHandler.GetTransaction)                      // GET /api/transactions/0x...
		}

		// Rotas de smart contracts
		smartContracts := api.Group("/smart-contracts")
		{
			smartContracts.GET("", smartContractHandler.GetSmartContracts)                            // GET /api/smart-contracts?limit=10&type=ERC-20
			smartContracts.GET("/search", smartContractHandler.SearchSmartContracts)                  // GET /api/smart-contracts/search?q=uniswap
			smartContracts.GET("/stats", smartContractHandler.GetSmartContractStats)                  // GET /api/smart-contracts/stats
			smartContracts.GET("/verified", smartContractHandler.GetVerifiedSmartContracts)           // GET /api/smart-contracts/verified
			smartContracts.GET("/popular", smartContractHandler.GetPopularSmartContracts)             // GET /api/smart-contracts/popular
			smartContracts.GET("/type/:type", smartContractHandler.GetSmartContractsByType)           // GET /api/smart-contracts/type/ERC-20
			smartContracts.POST("/verify", smartContractHandler.VerifySmartContract)                  // POST /api/smart-contracts/verify - REMOVIDA AUTENTICAÇÃO
			smartContracts.POST("/register", smartContractHandler.RegisterSmartContract)              // POST /api/smart-contracts/register - REMOVIDA AUTENTICAÇÃO
			smartContracts.GET("/:address", smartContractHandler.GetSmartContractByAddress)           // GET /api/smart-contracts/0x...
			smartContracts.GET("/:address/abi", smartContractHandler.GetSmartContractABI)             // GET /api/smart-contracts/0x.../abi
			smartContracts.GET("/:address/source", smartContractHandler.GetSmartContractSourceCode)   // GET /api/smart-contracts/0x.../source
			smartContracts.GET("/:address/functions", smartContractHandler.GetSmartContractFunctions) // GET /api/smart-contracts/0x.../functions
			smartContracts.GET("/:address/events", smartContractHandler.GetSmartContractEvents)       // GET /api/smart-contracts/0x.../events
			smartContracts.GET("/:address/metrics", smartContractHandler.GetSmartContractMetrics)     // GET /api/smart-contracts/0x.../metrics
		}

		// Rotas de accounts
		accounts := api.Group("/accounts")
		{
			// ===== ROTAS DE LEITURA (EXISTENTES) =====
			accounts.GET("", accountHandler.GetAccounts)                                   // GET /api/accounts?account_type=EOA&limit=20&page=1
			accounts.GET("/search", accountHandler.SearchAccounts)                         // GET /api/accounts/search?q=0x123...&limit=10
			accounts.GET("/stats", accountHandler.GetAccountStats)                         // GET /api/accounts/stats
			accounts.GET("/stats/type", accountHandler.GetAccountStatsByType)              // GET /api/accounts/stats/type
			accounts.GET("/stats/compliance", accountHandler.GetComplianceStats)           // GET /api/accounts/stats/compliance
			accounts.GET("/type/:type", accountHandler.GetAccountsByType)                  // GET /api/accounts/type/EOA?limit=20
			accounts.GET("/top/balance", accountHandler.GetTopAccountsByBalance)           // GET /api/accounts/top/balance?limit=10
			accounts.GET("/top/transactions", accountHandler.GetTopAccountsByTransactions) // GET /api/accounts/top/transactions?limit=10
			accounts.GET("/recent/active", accountHandler.GetRecentlyActiveAccounts)       // GET /api/accounts/recent/active?limit=10
			accounts.GET("/smart", accountHandler.GetSmartAccounts)                        // GET /api/accounts/smart?limit=20
			accounts.GET("/factory/:factory_address", accountHandler.GetAccountsByFactory) // GET /api/accounts/factory/0x...?limit=20
			accounts.GET("/owner/:owner_address", accountHandler.GetAccountsByOwner)       // GET /api/accounts/owner/0x...?limit=20
			accounts.GET("/:address", accountHandler.GetAccount)                           // GET /api/accounts/0x...
			accounts.GET("/:address/tags", accountHandler.GetAccountTags)                  // GET /api/accounts/0x.../tags
			accounts.GET("/:address/analytics", accountHandler.GetAccountAnalytics)        // GET /api/accounts/0x.../analytics?days=30
			accounts.GET("/:address/interactions", accountHandler.GetContractInteractions) // GET /api/accounts/0x.../interactions?limit=20
			accounts.GET("/:address/tokens", accountHandler.GetTokenHoldings)              // GET /api/accounts/0x.../tokens
			accounts.GET("/:address/transactions", accountHandler.GetAccountTransactions)  // GET /api/accounts/0x.../transactions?limit=50
			accounts.GET("/:address/events", accountHandler.GetAccountEvents)              // GET /api/accounts/0x.../events?limit=50
			accounts.GET("/:address/method-stats", accountHandler.GetAccountMethodStats)   // GET /api/accounts/0x.../method-stats?limit=20
			accounts.GET("/:address/is-contract", accountHandler.IsContract)               // GET /api/accounts/0x.../is-contract

			// ===== NOVAS ROTAS DE ESCRITA (VIA QUEUE) - REQUEREM AUTENTICAÇÃO =====
			if queueService != nil {
				accounts.POST("", authMiddleware.RequireAuth(), accountHandler.CreateAccount)                              // POST /api/accounts - Criar account
				accounts.PUT("/:address", authMiddleware.RequireAuth(), accountHandler.UpdateAccount)                      // PUT /api/accounts/:address - Atualizar account
				accounts.POST("/:address/tags", authMiddleware.RequireAuth(), accountHandler.AddAccountTags)               // POST /api/accounts/:address/tags - Gerenciar tags
				accounts.PUT("/:address/compliance", authMiddleware.RequireAuth(), accountHandler.UpdateAccountCompliance) // PUT /api/accounts/:address/compliance - Atualizar compliance
			}
		}

		// Rotas de validadores QBFT
		validators := api.Group("/validators")
		{
			validators.GET("", validatorHandler.GetValidators)                  // GET /api/validators - Todos os validadores
			validators.GET("/active", validatorHandler.GetActiveValidators)     // GET /api/validators/active - Validadores ativos
			validators.GET("/inactive", validatorHandler.GetInactiveValidators) // GET /api/validators/inactive - Validadores inativos
			validators.GET("/metrics", validatorHandler.GetValidatorMetrics)    // GET /api/validators/metrics - Métricas dos validadores
			validators.POST("/sync", validatorHandler.SyncValidators)           // POST /api/validators/sync - Forçar sincronização
			validators.GET("/:address", validatorHandler.GetValidator)          // GET /api/validators/0x... - Validador específico
		}

		// Rotas de eventos
		events := api.Group("/events")
		{
			events.GET("", eventHandler.GetEvents)                                // GET /api/events?limit=10&page=1&order=desc
			events.GET("/stats", eventHandler.GetEventStats)                      // GET /api/events/stats
			events.GET("/search", eventHandler.SearchEvents)                      // GET /api/events/search?q=Transfer
			events.GET("/contracts", eventHandler.GetUniqueContracts)             // GET /api/events/contracts
			events.GET("/names", eventHandler.GetEventNames)                      // GET /api/events/names
			events.GET("/contract/:address", eventHandler.GetEventsByContract)    // GET /api/events/contract/0x...
			events.GET("/transaction/:hash", eventHandler.GetEventsByTransaction) // GET /api/events/transaction/0x...
			events.GET("/block/:number", eventHandler.GetEventsByBlock)           // GET /api/events/block/123
			events.GET("/:id", eventHandler.GetEvent)                             // GET /api/events/:id
		}
	}

	// Obter porta do ambiente
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("🌐 API rodando na porta %s", port)
	log.Println("📋 Rotas disponíveis:")
	log.Println("  GET /health - Status da API")
	log.Println("  GET /ws - Conexão WebSocket")
	log.Println("  GET /ws/stats - Estatísticas WebSocket")
	log.Println("--------------------------------")
	log.Println("🔐 ROTAS DE AUTENTICAÇÃO:")
	log.Println("  POST /api/auth/login - Login de usuário")
	log.Println("  POST /api/auth/register - Registro de usuário")
	log.Println("  POST /api/auth/logout - Logout (requer auth)")
	log.Println("  GET /api/auth/me - Informações do usuário (requer auth)")
	log.Println("  POST /api/auth/change-password - Alterar senha (requer auth)")
	log.Println("  POST /api/auth/refresh - Renovar token (requer auth)")
	log.Println("--------------------------------")
	log.Println("📊 ROTAS PÚBLICAS:")
	log.Println("  GET /api/blocks - Lista de blocos recentes")
	log.Println("  GET /api/blocks/search - Busca com filtros avançados")
	log.Println("  GET /api/blocks/latest - Último bloco")
	log.Println("  GET /api/blocks/stats - Estatísticas dos blocos")
	log.Println("  GET /api/blocks/miners - Lista de mineradores únicos")
	log.Println("  GET /api/blocks/range?from=X&to=Y - Blocos em intervalo")
	log.Println("  GET /api/blocks/:id - Bloco específico (número ou hash)")
	log.Println("--------------------------------")
	log.Println("  GET /api/transactions - Lista de transações recentes")
	log.Println("  GET /api/transactions/search - Busca com filtros avançados")
	log.Println("  GET /api/transactions/stats - Estatísticas das transações")
	log.Println("--------------------------------")
	log.Println("  GET /api/validators - Lista de validadores QBFT")
	log.Println("  GET /api/validators/active - Validadores ativos")
	log.Println("  GET /api/validators/inactive - Validadores inativos")
	log.Println("  GET /api/validators/metrics - Métricas dos validadores")
	log.Println("  POST /api/validators/sync - Sincronizar validadores")
	log.Println("  GET /api/validators/:address - Validador específico")
	log.Println("--------------------------------")
	log.Println("  GET /api/events - Lista de eventos de smart contracts")
	log.Println("  GET /api/events/stats - Estatísticas dos eventos")
	log.Println("  GET /api/events/search - Busca eventos por termo")
	log.Println("  GET /api/events/contracts - Lista de contratos únicos")
	log.Println("  GET /api/events/names - Lista de nomes de eventos únicos")
	log.Println("  GET /api/events/contract/:address - Eventos por contrato")
	log.Println("  GET /api/events/transaction/:hash - Eventos por transação")
	log.Println("  GET /api/events/block/:number - Eventos por bloco")
	log.Println("  GET /api/events/:id - Evento específico")

	if queueService != nil {
		log.Println("--------------------------------")
		log.Println("🔒 ROTAS PROTEGIDAS (requerem autenticação):")
		log.Println("  POST /api/accounts - Criar account via queue")
		log.Println("  PUT /api/accounts/:address - Atualizar account via queue")
		log.Println("  POST /api/accounts/:address/tags - Gerenciar tags via queue")
		log.Println("  PUT /api/accounts/:address/compliance - Atualizar compliance via queue")
		log.Println("  POST /api/smart-contracts/verify - Verificar smart contract")
		log.Println("  POST /api/smart-contracts/register - Registrar smart contract")
	}

	log.Fatal(r.Run(":" + port))
}

// connectToDatabase conecta ao PostgreSQL com retry
func connectToDatabase() *sql.DB {
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		databaseURL = "postgres://explorer:explorer@postgres:5432/blockexplorer?sslmode=disable"
	}

	var db *sql.DB
	var err error

	// Tentar conectar com retry
	for i := 0; i < 10; i++ {
		db, err = sql.Open("postgres", databaseURL)
		if err == nil {
			if err = db.Ping(); err == nil {
				log.Println("✅ Conectado ao PostgreSQL")
				return db
			}
		}

		log.Printf("⚠️ Tentativa %d/10 - Erro ao conectar ao banco: %v", i+1, err)
		time.Sleep(time.Duration(i+1) * time.Second)
	}

	log.Printf("❌ Falha ao conectar ao banco após 10 tentativas: %v", err)
	log.Println("⚠️ API continuará sem conexão com banco (funcionalidade limitada)")
	return nil
}

// connectToRabbitMQ conecta ao RabbitMQ (opcional para API)
func connectToRabbitMQ() {
	rabbitmqURL := os.Getenv("RABBITMQ_URL")
	if rabbitmqURL == "" {
		rabbitmqURL = "amqp://guest:guest@rabbitmq:5672/"
	}

	conn, err := amqp.Dial(rabbitmqURL)
	if err != nil {
		log.Printf("⚠️ Erro ao conectar ao RabbitMQ: %v", err)
		log.Println("⚠️ API continuará sem RabbitMQ (funcionalidade limitada)")
		return
	}
	defer conn.Close()
	log.Println("✅ Conectado ao RabbitMQ")
}
