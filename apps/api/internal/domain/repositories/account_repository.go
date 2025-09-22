package repositories

import (
	"context"
	"explorer-api/internal/domain/entities"
)

// AccountFilters representa os filtros para busca de accounts
type AccountFilters struct {
	AccountType      string   `json:"account_type,omitempty"`
	MinBalance       string   `json:"min_balance,omitempty"`
	MaxBalance       string   `json:"max_balance,omitempty"`
	MinTransactions  int      `json:"min_transactions,omitempty"`
	MaxTransactions  int      `json:"max_transactions,omitempty"`
	IsContract       *bool    `json:"is_contract,omitempty"`
	ComplianceStatus string   `json:"compliance_status,omitempty"`
	MinRiskScore     int      `json:"min_risk_score,omitempty"`
	MaxRiskScore     int      `json:"max_risk_score,omitempty"`
	HasActivity      *bool    `json:"has_activity,omitempty"`
	CreatedAfter     string   `json:"created_after,omitempty"`
	CreatedBefore    string   `json:"created_before,omitempty"`
	Search           string   `json:"search,omitempty"`
	Tags             []string `json:"tags,omitempty"`

	// Ordenação
	OrderBy  string `json:"order_by,omitempty"`  // address, balance, transaction_count, created_at, etc.
	OrderDir string `json:"order_dir,omitempty"` // asc, desc

	// Paginação
	Page  int `json:"page,omitempty"`
	Limit int `json:"limit,omitempty"`
}

// AccountRepository define as operações de persistência para accounts
type AccountRepository interface {
	// CRUD básico
	Create(ctx context.Context, account *entities.Account) error
	GetByAddress(ctx context.Context, address string) (*entities.Account, error)
	Update(ctx context.Context, account *entities.Account) error
	Delete(ctx context.Context, address string) error

	// Listagem e busca
	GetAll(ctx context.Context, filters *AccountFilters) ([]*entities.Account, int, error)
	GetSummaries(ctx context.Context, filters *AccountFilters) ([]*entities.AccountSummary, int, error)
	Search(ctx context.Context, query string, limit int) ([]*entities.AccountSummary, error)

	// Operações específicas
	GetByType(ctx context.Context, accountType string, limit int) ([]*entities.Account, error)
	GetByComplianceStatus(ctx context.Context, status string, limit int) ([]*entities.Account, error)
	GetByRiskScore(ctx context.Context, minScore, maxScore int, limit int) ([]*entities.Account, error)
	GetTopByBalance(ctx context.Context, limit int) ([]*entities.Account, error)
	GetTopByTransactions(ctx context.Context, limit int) ([]*entities.Account, error)
	GetRecentlyActive(ctx context.Context, limit int) ([]*entities.Account, error)
	GetRecentlyCreated(ctx context.Context, limit int) ([]*entities.Account, error)

	// Smart Account específico
	GetSmartAccounts(ctx context.Context, limit int) ([]*entities.Account, error)
	GetByFactory(ctx context.Context, factoryAddress string, limit int) ([]*entities.Account, error)
	GetByOwner(ctx context.Context, ownerAddress string, limit int) ([]*entities.Account, error)

	// Estatísticas
	GetStats(ctx context.Context) (*AccountStats, error)
	GetStatsByType(ctx context.Context) (map[string]*AccountTypeStats, error)
	GetComplianceStats(ctx context.Context) (*ComplianceStats, error)

	// Bulk operations
	CreateBatch(ctx context.Context, accounts []*entities.Account) error
	UpdateBalances(ctx context.Context, updates map[string]string) error
	UpdateTransactionCounts(ctx context.Context, updates map[string]int) error
}

// AccountTagRepository define as operações para tags de accounts
type AccountTagRepository interface {
	// CRUD básico
	Create(ctx context.Context, tag *entities.AccountTag) error
	GetByID(ctx context.Context, id uint64) (*entities.AccountTag, error)
	Update(ctx context.Context, tag *entities.AccountTag) error
	Delete(ctx context.Context, id uint64) error

	// Operações por account
	GetByAddress(ctx context.Context, address string) ([]*entities.AccountTag, error)
	CreateForAddress(ctx context.Context, address, tag string, value *string, createdBy *string) error
	DeleteByAddress(ctx context.Context, address, tag string) error

	// Busca por tags
	GetAccountsByTag(ctx context.Context, tag string, limit int) ([]*entities.Account, error)
	GetPopularTags(ctx context.Context, limit int) ([]TagCount, error)
}

// AccountAnalyticsRepository define as operações para analytics de accounts
type AccountAnalyticsRepository interface {
	// CRUD básico
	Create(ctx context.Context, analytics *entities.AccountAnalytics) error
	GetByAddressAndDate(ctx context.Context, address string, date string) (*entities.AccountAnalytics, error)
	Update(ctx context.Context, analytics *entities.AccountAnalytics) error

	// Busca por período
	GetByAddress(ctx context.Context, address string, days int) ([]*entities.AccountAnalytics, error)
	GetByDateRange(ctx context.Context, address string, startDate, endDate string) ([]*entities.AccountAnalytics, error)

	// Agregações
	GetDailyStats(ctx context.Context, days int) ([]*DailyAccountStats, error)
	GetTopAccountsByVolume(ctx context.Context, days int, limit int) ([]*AccountVolumeStats, error)
	GetTopAccountsByTransactions(ctx context.Context, days int, limit int) ([]*AccountTransactionStats, error)

	// Bulk operations
	CreateBatch(ctx context.Context, analytics []*entities.AccountAnalytics) error
}

// ContractInteractionRepository define as operações para interações com contratos
type ContractInteractionRepository interface {
	// CRUD básico
	Create(ctx context.Context, interaction *entities.ContractInteraction) error
	GetByID(ctx context.Context, id uint64) (*entities.ContractInteraction, error)

	// Busca por account
	GetByAccount(ctx context.Context, accountAddress string, limit int) ([]*entities.ContractInteraction, error)
	GetByAccountAndContract(ctx context.Context, accountAddress, contractAddress string, limit int) ([]*entities.ContractInteraction, error)

	// Busca por contrato
	GetByContract(ctx context.Context, contractAddress string, limit int) ([]*entities.ContractInteraction, error)

	// Estatísticas
	GetInteractionStats(ctx context.Context, accountAddress string) (*InteractionStats, error)
	GetTopContracts(ctx context.Context, accountAddress string, limit int) ([]*ContractStats, error)

	// Bulk operations
	CreateBatch(ctx context.Context, interactions []*entities.ContractInteraction) error
}

// TokenHoldingRepository define as operações para holdings de tokens
type TokenHoldingRepository interface {
	// CRUD básico
	Create(ctx context.Context, holding *entities.TokenHolding) error
	GetByID(ctx context.Context, id uint64) (*entities.TokenHolding, error)
	Update(ctx context.Context, holding *entities.TokenHolding) error
	Delete(ctx context.Context, id uint64) error

	// Busca por account
	GetByAccount(ctx context.Context, accountAddress string) ([]*entities.TokenHolding, error)
	GetByAccountAndToken(ctx context.Context, accountAddress, tokenAddress string) (*entities.TokenHolding, error)

	// Busca por token
	GetByToken(ctx context.Context, tokenAddress string, limit int) ([]*entities.TokenHolding, error)
	GetHoldersByToken(ctx context.Context, tokenAddress string, limit int) ([]*entities.Account, error)

	// Estatísticas
	GetPortfolioValue(ctx context.Context, accountAddress string) (*PortfolioStats, error)
	GetTopHolders(ctx context.Context, tokenAddress string, limit int) ([]*TokenHolderStats, error)

	// Bulk operations
	CreateBatch(ctx context.Context, holdings []*entities.TokenHolding) error
	UpdateBalances(ctx context.Context, updates map[string]map[string]string) error // account -> token -> balance
}

// Estruturas auxiliares para estatísticas

type AccountStats struct {
	TotalAccounts    int64   `json:"total_accounts"`
	EOAAccounts      int64   `json:"eoa_accounts"`
	SmartAccounts    int64   `json:"smart_accounts"`
	ContractAccounts int64   `json:"contract_accounts"`
	ActiveAccounts   int64   `json:"active_accounts"`
	TotalBalance     string  `json:"total_balance"`
	AvgBalance       string  `json:"avg_balance"`
	AvgTransactions  float64 `json:"avg_transactions"`
}

type AccountTypeStats struct {
	Count           int64   `json:"count"`
	Percentage      float64 `json:"percentage"`
	TotalBalance    string  `json:"total_balance"`
	AvgBalance      string  `json:"avg_balance"`
	AvgTransactions float64 `json:"avg_transactions"`
}

type ComplianceStats struct {
	Compliant    int64 `json:"compliant"`
	NonCompliant int64 `json:"non_compliant"`
	Pending      int64 `json:"pending"`
	UnderReview  int64 `json:"under_review"`
	HighRisk     int64 `json:"high_risk"`
	MediumRisk   int64 `json:"medium_risk"`
	LowRisk      int64 `json:"low_risk"`
	MinimalRisk  int64 `json:"minimal_risk"`
}

type TagCount struct {
	Tag   string `json:"tag"`
	Count int64  `json:"count"`
}

type DailyAccountStats struct {
	Date              string `json:"date"`
	NewAccounts       int64  `json:"new_accounts"`
	ActiveAccounts    int64  `json:"active_accounts"`
	TotalTransactions int64  `json:"total_transactions"`
	TotalVolume       string `json:"total_volume"`
}

type AccountVolumeStats struct {
	Address     string  `json:"address"`
	Label       *string `json:"label,omitempty"`
	VolumeIn    string  `json:"volume_in"`
	VolumeOut   string  `json:"volume_out"`
	TotalVolume string  `json:"total_volume"`
}

type AccountTransactionStats struct {
	Address              string  `json:"address"`
	Label                *string `json:"label,omitempty"`
	TransactionsSent     int64   `json:"transactions_sent"`
	TransactionsReceived int64   `json:"transactions_received"`
	TotalTransactions    int64   `json:"total_transactions"`
}

type InteractionStats struct {
	TotalInteractions      int64  `json:"total_interactions"`
	UniqueContracts        int64  `json:"unique_contracts"`
	SuccessfulInteractions int64  `json:"successful_interactions"`
	FailedInteractions     int64  `json:"failed_interactions"`
	TotalGasUsed           string `json:"total_gas_used"`
	AvgGasPerInteraction   string `json:"avg_gas_per_interaction"`
}

type ContractStats struct {
	ContractAddress  string  `json:"contract_address"`
	ContractName     *string `json:"contract_name,omitempty"`
	InteractionCount int64   `json:"interaction_count"`
	TotalGasUsed     string  `json:"total_gas_used"`
	SuccessRate      float64 `json:"success_rate"`
}

type PortfolioStats struct {
	TotalTokens      int64                  `json:"total_tokens"`
	TotalValue       string                 `json:"total_value"`
	TopTokenByValue  *entities.TokenHolding `json:"top_token_by_value,omitempty"`
	TopTokenByAmount *entities.TokenHolding `json:"top_token_by_amount,omitempty"`
}

type TokenHolderStats struct {
	AccountAddress string  `json:"account_address"`
	Label          *string `json:"label,omitempty"`
	Balance        string  `json:"balance"`
	Percentage     float64 `json:"percentage"`
}
