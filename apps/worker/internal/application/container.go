package application

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"time"

	"github.com/ethereum/go-ethereum/ethclient"
	"github.com/hubweb3/worker/internal/application/handlers"
	"github.com/hubweb3/worker/internal/application/services"
	"github.com/hubweb3/worker/internal/config"
	"github.com/hubweb3/worker/internal/domain/repositories"
	domainServices "github.com/hubweb3/worker/internal/domain/services"
	"github.com/hubweb3/worker/internal/infrastructure/database"
	"github.com/hubweb3/worker/internal/queues"
	"github.com/jackc/pgx/v4/pgxpool"
	_ "github.com/lib/pq"
)

// Container gerencia todas as dependências da aplicação
type Container struct {
	config *config.Config

	// Infrastructure
	db                  *sql.DB
	dbPool              *pgxpool.Pool
	ethClient           *ethclient.Client
	blockConsumer       *queues.Consumer // Consumer dedicado para blocos
	transactionConsumer *queues.Consumer // Consumer dedicado para transações
	accountConsumer     *queues.Consumer // Consumer dedicado para accounts
	pendingTxConsumer   *queues.Consumer // Consumer dedicado para pending transactions
	eventConsumer       *queues.Consumer // Consumer dedicado para eventos
	publisher           *queues.Publisher

	// Repositories
	blockRepo     repositories.BlockRepository
	txRepo        repositories.TransactionRepository
	accountRepo   *database.PostgresAccountRepository
	validatorRepo repositories.ValidatorRepository
	eventRepo     repositories.EventRepository
	contractRepo  repositories.SmartContractRepository

	// Services
	blockService                *domainServices.BlockService
	transactionMethodService    *services.TransactionMethodService
	contractMetricsService      *services.SmartContractMetricsService
	accountTransactionProcessor *services.AccountTransactionProcessor
	validatorService            *domainServices.ValidatorService

	// Handlers
	blockHandler       *handlers.BlockHandler
	transactionHandler *handlers.TransactionHandler
	accountHandler     *handlers.AccountHandler
	validatorHandler   *handlers.ValidatorHandler
	pendingTxHandler   *handlers.PendingTxHandler
	eventHandler       *handlers.EventHandler
}

// NewContainer cria uma nova instância do container
func NewContainer(cfg *config.Config) (*Container, error) {
	container := &Container{
		config: cfg,
	}

	if err := container.initializeInfrastructure(); err != nil {
		return nil, fmt.Errorf("erro ao inicializar infraestrutura: %w", err)
	}

	container.initializeRepositories()
	container.initializeServices()
	container.initializeHandlers()

	return container, nil
}

// initializeInfrastructure inicializa as dependências de infraestrutura
func (c *Container) initializeInfrastructure() error {
	var err error

	// Conectar ao PostgreSQL com retry
	var db *sql.DB
	maxRetriesDB := 10
	for i := 0; i < maxRetriesDB; i++ {
		db, err = sql.Open("postgres", c.config.DatabaseURL)
		if err == nil {
			err = db.Ping()
			if err == nil {
				break
			}
		}

		if i < maxRetriesDB-1 {
			log.Printf("⚠️ Tentativa %d/%d: Aguardando PostgreSQL estar pronto... (%v)", i+1, maxRetriesDB, err)
			if db != nil {
				db.Close()
			}
			time.Sleep(time.Duration(i+1) * time.Second)
		}
	}

	if err != nil {
		return fmt.Errorf("erro ao conectar ao PostgreSQL após %d tentativas: %w", maxRetriesDB, err)
	}

	c.db = db

	// Conectar ao PostgreSQL com pgxpool para o TransactionMethodService
	var dbPool *pgxpool.Pool
	for i := 0; i < maxRetriesDB; i++ {
		dbPool, err = pgxpool.Connect(context.Background(), c.config.DatabaseURL)
		if err == nil {
			err = dbPool.Ping(context.Background())
			if err == nil {
				break
			}
		}

		if i < maxRetriesDB-1 {
			log.Printf("⚠️ Tentativa %d/%d: Aguardando PostgreSQL (pgxpool) estar pronto... (%v)", i+1, maxRetriesDB, err)
			if dbPool != nil {
				dbPool.Close()
			}
			time.Sleep(time.Duration(i+1) * time.Second)
		}
	}

	if err != nil {
		return fmt.Errorf("erro ao conectar ao PostgreSQL (pgxpool) após %d tentativas: %w", maxRetriesDB, err)
	}

	c.dbPool = dbPool

	// Conectar ao Ethereum
	ethClient, err := ethclient.Dial(c.config.EthereumRPCURL)
	if err != nil {
		return fmt.Errorf("erro ao conectar ao Ethereum: %w", err)
	}

	c.ethClient = ethClient

	// Conectar ao RabbitMQ com retry
	var blockConsumer *queues.Consumer
	var transactionConsumer *queues.Consumer
	var accountConsumer *queues.Consumer
	var pendingTxConsumer *queues.Consumer
	var eventConsumer *queues.Consumer
	maxRetriesRMQ := 10
	for i := 0; i < maxRetriesRMQ; i++ {
		blockConsumer, err = queues.NewConsumer(c.config.RabbitMQURL)
		if err == nil {
			transactionConsumer, err = queues.NewConsumer(c.config.RabbitMQURL)
			if err == nil {
				accountConsumer, err = queues.NewConsumer(c.config.RabbitMQURL)
				if err == nil {
					pendingTxConsumer, err = queues.NewConsumer(c.config.RabbitMQURL)
					if err == nil {
						eventConsumer, err = queues.NewConsumer(c.config.RabbitMQURL)
						if err == nil {
							break
						}
					}
				}
			}
		}

		if i < maxRetriesRMQ-1 {
			log.Printf("⚠️ Tentativa %d/%d: Aguardando RabbitMQ estar pronto... (%v)", i+1, maxRetriesRMQ, err)
			time.Sleep(time.Duration(i+1) * time.Second)
		}
	}

	if err != nil {
		return fmt.Errorf("erro ao conectar ao RabbitMQ após %d tentativas: %w", maxRetriesRMQ, err)
	}

	c.blockConsumer = blockConsumer
	c.transactionConsumer = transactionConsumer
	c.accountConsumer = accountConsumer
	c.pendingTxConsumer = pendingTxConsumer
	c.eventConsumer = eventConsumer

	// Conectar ao RabbitMQ Publisher
	publisher, err := queues.NewPublisher(c.config.RabbitMQURL)
	if err != nil {
		return fmt.Errorf("erro ao conectar ao RabbitMQ Publisher: %w", err)
	}

	c.publisher = publisher

	return nil
}

// initializeRepositories inicializa os repositórios
func (c *Container) initializeRepositories() {
	c.blockRepo = database.NewPostgresBlockRepository(c.db)
	c.txRepo = database.NewPostgresTransactionRepositorySimple(c.db)
	c.accountRepo = database.NewPostgresAccountRepository(c.db)
	c.validatorRepo = database.NewPostgresValidatorRepository(c.db)
	c.eventRepo = database.NewPostgresEventRepository(c.db)
	c.contractRepo = database.NewPostgresSmartContractRepository(c.db)
}

// initializeServices inicializa os serviços de domínio
func (c *Container) initializeServices() {
	c.blockService = domainServices.NewBlockService(c.blockRepo, c.txRepo)
	c.transactionMethodService = services.NewTransactionMethodService(c.dbPool)
	c.contractMetricsService = services.NewSmartContractMetricsService(c.dbPool)
	c.accountTransactionProcessor = services.NewAccountTransactionProcessor(c.dbPool, c.ethClient)
	c.validatorService = domainServices.NewValidatorService(c.validatorRepo)
}

// initializeHandlers inicializa os handlers de aplicação
func (c *Container) initializeHandlers() {
	c.blockHandler = handlers.NewBlockHandler(c.blockService, c.ethClient, c.blockConsumer, c.publisher)
	c.transactionHandler = handlers.NewTransactionHandler(c.blockService, c.txRepo, c.ethClient, c.transactionConsumer, c.publisher, c.transactionMethodService, c.contractMetricsService, c.accountTransactionProcessor)
	c.accountHandler = handlers.NewAccountHandler(c.accountRepo, c.accountConsumer, c.publisher)
	c.pendingTxHandler = handlers.NewPendingTxHandler(c.pendingTxConsumer, c.publisher)
	c.eventHandler = handlers.NewEventHandler(c.eventRepo, c.contractRepo, c.eventConsumer, c.publisher, c.accountTransactionProcessor)

	// Obter URL do RPC Besu para validadores
	besuRPCURL := c.config.EthereumRPCURL
	c.validatorHandler = handlers.NewValidatorHandler(c.validatorService, c.publisher, besuRPCURL)
}

// GetBlockHandler retorna o handler de blocos
func (c *Container) GetBlockHandler() *handlers.BlockHandler {
	return c.blockHandler
}

// GetTransactionHandler retorna o handler de transações
func (c *Container) GetTransactionHandler() *handlers.TransactionHandler {
	return c.transactionHandler
}

// GetAccountHandler retorna o handler de accounts
func (c *Container) GetAccountHandler() *handlers.AccountHandler {
	return c.accountHandler
}

// GetValidatorHandler retorna o handler de validadores
func (c *Container) GetValidatorHandler() *handlers.ValidatorHandler {
	return c.validatorHandler
}

// GetPendingTxHandler retorna o handler de transações pendentes
func (c *Container) GetPendingTxHandler() *handlers.PendingTxHandler {
	return c.pendingTxHandler
}

// GetEventHandler retorna o handler de eventos
func (c *Container) GetEventHandler() *handlers.EventHandler {
	return c.eventHandler
}

// GetBlockService retorna o serviço de blocos
func (c *Container) GetBlockService() *domainServices.BlockService {
	return c.blockService
}

// TODO: GetAccountService será implementado quando necessário
// func (c *Container) GetAccountService() domainServices.AccountService {
// 	return c.accountService
// }

// GetTransactionMethodService retorna o serviço de métodos de transação
func (c *Container) GetTransactionMethodService() *services.TransactionMethodService {
	return c.transactionMethodService
}

// GetDatabase retorna a conexão com o banco de dados
func (c *Container) GetDatabase() *sql.DB {
	return c.db
}

// GetDBPool retorna o pool de conexões pgx
func (c *Container) GetDBPool() *pgxpool.Pool {
	return c.dbPool
}

// GetEthClient retorna o cliente Ethereum
func (c *Container) GetEthClient() *ethclient.Client {
	return c.ethClient
}

// GetBlockConsumer retorna o consumer de blocos
func (c *Container) GetBlockConsumer() *queues.Consumer {
	return c.blockConsumer
}

// GetTransactionConsumer retorna o consumer de transações
func (c *Container) GetTransactionConsumer() *queues.Consumer {
	return c.transactionConsumer
}

// GetAccountConsumer retorna o consumer de accounts
func (c *Container) GetAccountConsumer() *queues.Consumer {
	return c.accountConsumer
}

// Close fecha todas as conexões
func (c *Container) Close() error {
	var errors []error

	if c.db != nil {
		if err := c.db.Close(); err != nil {
			errors = append(errors, fmt.Errorf("erro ao fechar conexão PostgreSQL: %w", err))
		}
	}

	if c.dbPool != nil {
		c.dbPool.Close()
	}

	if c.ethClient != nil {
		c.ethClient.Close()
	}

	if c.blockConsumer != nil {
		c.blockConsumer.Close()
	}

	if c.transactionConsumer != nil {
		c.transactionConsumer.Close()
	}

	if c.accountConsumer != nil {
		c.accountConsumer.Close()
	}

	if c.pendingTxConsumer != nil {
		c.pendingTxConsumer.Close()
	}

	if c.eventConsumer != nil {
		c.eventConsumer.Close()
	}

	if c.publisher != nil {
		c.publisher.Close()
	}

	if len(errors) > 0 {
		return fmt.Errorf("erros ao fechar container: %v", errors)
	}

	return nil
}
