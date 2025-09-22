package repositories

import (
	"context"
	"time"

	"github.com/hubweb3/worker/internal/domain/entities"
)

// AccountRepository define a interface para operações de persistência de contas
type AccountRepository interface {
	// Operações básicas CRUD
	Create(ctx context.Context, account *entities.Account) error
	GetByAddress(ctx context.Context, address string) (*entities.Account, error)
	Update(ctx context.Context, account *entities.Account) error
	Delete(ctx context.Context, address string) error

	// Operações de busca e listagem
	List(ctx context.Context, filters AccountFilters, pagination Pagination) ([]*entities.Account, int64, error)
	Search(ctx context.Context, query string, filters AccountFilters, pagination Pagination) ([]*entities.Account, int64, error)

	// Operações específicas de contas
	UpdateBalance(ctx context.Context, address string, balance string) error
	UpdateNonce(ctx context.Context, address string, nonce uint64) error
	IncrementTransactionCount(ctx context.Context, address string) error
	IncrementContractInteractions(ctx context.Context, address string) error
	IncrementSmartContractDeployments(ctx context.Context, address string) error
	UpdateLastActivity(ctx context.Context, address string, timestamp time.Time) error

	// Operações de Smart Accounts
	SetSmartAccountInfo(ctx context.Context, address string, factoryAddress, implementationAddress, ownerAddress *string) error
	GetSmartAccountsByFactory(ctx context.Context, factoryAddress string) ([]*entities.Account, error)
	GetSmartAccountsByOwner(ctx context.Context, ownerAddress string) ([]*entities.Account, error)

	// Operações de compliance e tags
	SetComplianceStatus(ctx context.Context, address string, status entities.ComplianceStatus, notes *string) error
	SetRiskScore(ctx context.Context, address string, score int) error
	SetLabel(ctx context.Context, address string, label string) error

	// Estatísticas
	GetStats(ctx context.Context) (*AccountStats, error)
	GetTopAccountsByBalance(ctx context.Context, limit int) ([]*entities.Account, error)
	GetTopAccountsByTransactions(ctx context.Context, limit int) ([]*entities.Account, error)
	GetAccountsByComplianceStatus(ctx context.Context, status entities.ComplianceStatus) ([]*entities.Account, error)
}

// AccountTagRepository define a interface para operações de tags de contas
type AccountTagRepository interface {
	AddTag(ctx context.Context, address, tag, createdBy string) error
	RemoveTag(ctx context.Context, address, tag string) error
	GetTagsByAddress(ctx context.Context, address string) ([]*entities.AccountTag, error)
	GetAccountsByTag(ctx context.Context, tag string) ([]*entities.Account, error)
	GetAllTags(ctx context.Context) ([]string, error)
}

// AccountAnalyticsRepository define a interface para analytics de contas
type AccountAnalyticsRepository interface {
	Create(ctx context.Context, analytics *entities.AccountAnalytics) error
	Update(ctx context.Context, analytics *entities.AccountAnalytics) error
	GetByAddressAndDate(ctx context.Context, address string, date time.Time) (*entities.AccountAnalytics, error)
	GetByAddressAndDateRange(ctx context.Context, address string, startDate, endDate time.Time) ([]*entities.AccountAnalytics, error)
	GetDailyMetrics(ctx context.Context, address string, days int) ([]*entities.AccountAnalytics, error)

	// Agregações
	GetTotalTransactionsByPeriod(ctx context.Context, address string, startDate, endDate time.Time) (uint64, error)
	GetTotalValueTransferredByPeriod(ctx context.Context, address string, startDate, endDate time.Time) (string, error)
	GetAverageGasUsageByPeriod(ctx context.Context, address string, startDate, endDate time.Time) (string, error)
}

// ContractInteractionRepository define a interface para interações com contratos
type ContractInteractionRepository interface {
	Create(ctx context.Context, interaction *entities.ContractInteraction) error
	Update(ctx context.Context, interaction *entities.ContractInteraction) error
	GetByAccountAndContract(ctx context.Context, accountAddress, contractAddress string, method *string) (*entities.ContractInteraction, error)
	GetByAccount(ctx context.Context, accountAddress string, limit int) ([]*entities.ContractInteraction, error)
	GetTopContractsByAccount(ctx context.Context, accountAddress string, limit int) ([]*entities.ContractInteraction, error)
	IncrementInteraction(ctx context.Context, accountAddress, contractAddress string, method *string, gasUsed, valueSent string) error
}

// TokenHoldingRepository define a interface para holdings de tokens
type TokenHoldingRepository interface {
	Create(ctx context.Context, holding *entities.TokenHolding) error
	Update(ctx context.Context, holding *entities.TokenHolding) error
	GetByAccountAndToken(ctx context.Context, accountAddress, tokenAddress string) (*entities.TokenHolding, error)
	GetByAccount(ctx context.Context, accountAddress string) ([]*entities.TokenHolding, error)
	UpdateBalance(ctx context.Context, accountAddress, tokenAddress, balance, valueUSD string) error
	GetTopHoldersByToken(ctx context.Context, tokenAddress string, limit int) ([]*entities.TokenHolding, error)
}

// Estruturas auxiliares para filtros e paginação
type AccountFilters struct {
	Type               *entities.AccountType
	MinBalance         *string
	MaxBalance         *string
	MinTransactions    *uint64
	MaxTransactions    *uint64
	ComplianceStatus   *entities.ComplianceStatus
	HasContract        *bool
	MinRiskScore       *int
	MaxRiskScore       *int
	Tags               []string
	CreatedAfter       *time.Time
	CreatedBefore      *time.Time
	LastActivityAfter  *time.Time
	LastActivityBefore *time.Time
	SortBy             string // "balance", "transaction_count", "last_activity", "created_at"
	SortOrder          string // "asc", "desc"
}

type Pagination struct {
	Page     int
	PageSize int
	Offset   int
}

type AccountStats struct {
	TotalAccounts             int64  `json:"total_accounts"`
	EOAAccounts               int64  `json:"eoa_accounts"`
	SmartAccounts             int64  `json:"smart_accounts"`
	CompliantAccounts         int64  `json:"compliant_accounts"`
	FlaggedAccounts           int64  `json:"flagged_accounts"`
	UnderReviewAccounts       int64  `json:"under_review_accounts"`
	ActiveToday               int64  `json:"active_today"`
	ActiveThisWeek            int64  `json:"active_this_week"`
	ActiveThisMonth           int64  `json:"active_this_month"`
	TotalBalance              string `json:"total_balance"`
	AverageBalance            string `json:"average_balance"`
	TotalTransactions         int64  `json:"total_transactions"`
	TotalContractInteractions int64  `json:"total_contract_interactions"`
}
