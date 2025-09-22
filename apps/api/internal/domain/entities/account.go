package entities

import (
	"time"
)

// Account representa uma conta Ethereum (EOA ou Smart Account)
type Account struct {
	Address             string     `json:"address" db:"address"`
	AccountType         string     `json:"account_type" db:"account_type"`
	Balance             string     `json:"balance" db:"balance"`
	Nonce               uint64     `json:"nonce" db:"nonce"`
	TransactionCount    int        `json:"transaction_count" db:"transaction_count"`
	ContractCode        *string    `json:"contract_code,omitempty" db:"contract_code"`
	IsContract          bool       `json:"is_contract" db:"is_contract"`
	CreatorAddress      *string    `json:"creator_address,omitempty" db:"creator_address"`
	CreationTxHash      *string    `json:"creation_tx_hash,omitempty" db:"creation_tx_hash"`
	CreationBlockNumber *uint64    `json:"creation_block_number,omitempty" db:"creation_block_number"`
	FirstSeenAt         time.Time  `json:"first_seen_at" db:"first_seen"`
	LastActivityAt      *time.Time `json:"last_activity_at,omitempty" db:"last_activity"`

	// Smart Account specific fields
	FactoryAddress        *string `json:"factory_address,omitempty" db:"factory_address"`
	ImplementationAddress *string `json:"implementation_address,omitempty" db:"implementation_address"`
	OwnerAddress          *string `json:"owner_address,omitempty" db:"owner_address"`

	// Corporate/Enterprise fields
	Label            *string `json:"label,omitempty" db:"label"`
	Description      *string `json:"description,omitempty" db:"description"`
	RiskScore        int     `json:"risk_score" db:"risk_score"`
	ComplianceStatus string  `json:"compliance_status" db:"compliance_status"`
	ComplianceNotes  *string `json:"compliance_notes,omitempty" db:"compliance_notes"`

	// Metadata
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

// AccountSummary representa um resumo da conta para listagens
type AccountSummary struct {
	Address          string     `json:"address"`
	AccountType      string     `json:"account_type"`
	Balance          string     `json:"balance"`
	TransactionCount int        `json:"transaction_count"`
	IsContract       bool       `json:"is_contract"`
	Label            *string    `json:"label,omitempty"`
	RiskScore        int        `json:"risk_score"`
	ComplianceStatus string     `json:"compliance_status"`
	LastActivityAt   *time.Time `json:"last_activity_at,omitempty"`
	CreatedAt        time.Time  `json:"created_at"`
}

// AccountTag representa uma tag associada a uma conta
type AccountTag struct {
	ID        uint64    `json:"id" db:"id"`
	Address   string    `json:"address" db:"address"`
	Tag       string    `json:"tag" db:"tag"`
	Value     *string   `json:"value,omitempty" db:"value"`
	CreatedBy *string   `json:"created_by,omitempty" db:"created_by"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

// AccountAnalytics representa métricas analíticas de uma conta
type AccountAnalytics struct {
	Address              string    `json:"address" db:"address"`
	Date                 time.Time `json:"date" db:"date"`
	TransactionsCount    int       `json:"transactions_count" db:"transactions_count"`
	TransactionsSent     int       `json:"transactions_sent" db:"transactions_sent"`
	TransactionsReceived int       `json:"transactions_received" db:"transactions_received"`
	VolumeIn             string    `json:"volume_in" db:"volume_in"`
	VolumeOut            string    `json:"volume_out" db:"volume_out"`
	GasUsed              string    `json:"gas_used" db:"gas_used"`
	UniqueCounterparties int       `json:"unique_counterparties" db:"unique_counterparties"`
	AvgTransactionValue  string    `json:"avg_transaction_value" db:"avg_transaction_value"`
	CreatedAt            time.Time `json:"created_at" db:"created_at"`
}

// ContractInteraction representa uma interação com smart contract
type ContractInteraction struct {
	ID              uint64    `json:"id" db:"id"`
	AccountAddress  string    `json:"account_address" db:"account_address"`
	ContractAddress string    `json:"contract_address" db:"contract_address"`
	Method          *string   `json:"method,omitempty" db:"method"`
	InteractionType string    `json:"interaction_type" db:"interaction_type"`
	TransactionHash string    `json:"transaction_hash" db:"transaction_hash"`
	BlockNumber     uint64    `json:"block_number" db:"block_number"`
	GasUsed         uint64    `json:"gas_used" db:"gas_used"`
	Success         bool      `json:"success" db:"success"`
	CreatedAt       time.Time `json:"created_at" db:"created_at"`
}

// TokenHolding representa um token mantido por uma conta
type TokenHolding struct {
	ID             uint64    `json:"id" db:"id"`
	AccountAddress string    `json:"account_address" db:"account_address"`
	TokenAddress   string    `json:"token_address" db:"token_address"`
	TokenSymbol    *string   `json:"token_symbol,omitempty" db:"token_symbol"`
	TokenName      *string   `json:"token_name,omitempty" db:"token_name"`
	TokenDecimals  *int      `json:"token_decimals,omitempty" db:"token_decimals"`
	Balance        string    `json:"balance" db:"balance"`
	LastUpdated    time.Time `json:"last_updated" db:"last_updated"`
	CreatedAt      time.Time `json:"created_at" db:"created_at"`
}

// ToSummary converte Account para AccountSummary
func (a *Account) ToSummary() *AccountSummary {
	return &AccountSummary{
		Address:          a.Address,
		AccountType:      a.AccountType,
		Balance:          a.Balance,
		TransactionCount: a.TransactionCount,
		IsContract:       a.IsContract,
		Label:            a.Label,
		RiskScore:        a.RiskScore,
		ComplianceStatus: a.ComplianceStatus,
		LastActivityAt:   a.LastActivityAt,
		CreatedAt:        a.CreatedAt,
	}
}

// IsEOA verifica se a conta é uma EOA (Externally Owned Account)
func (a *Account) IsEOA() bool {
	return a.AccountType == "EOA"
}

// IsSmartAccount verifica se a conta é uma Smart Account
func (a *Account) IsSmartAccount() bool {
	return a.AccountType == "Smart Account"
}

// GetRiskLevel retorna o nível de risco baseado no score
func (a *Account) GetRiskLevel() string {
	switch {
	case a.RiskScore >= 8:
		return "HIGH"
	case a.RiskScore >= 5:
		return "MEDIUM"
	case a.RiskScore >= 2:
		return "LOW"
	default:
		return "MINIMAL"
	}
}

// IsCompliant verifica se a conta está em compliance
func (a *Account) IsCompliant() bool {
	return a.ComplianceStatus == "compliant"
}

// HasActivity verifica se a conta tem atividade recente
func (a *Account) HasActivity() bool {
	return a.LastActivityAt != nil && a.TransactionCount > 0
}
