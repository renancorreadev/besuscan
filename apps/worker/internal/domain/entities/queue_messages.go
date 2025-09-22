package entities

import (
	"time"
)

// AccountDiscoveredMessage representa uma mensagem de conta descoberta
type AccountDiscoveredMessage struct {
	Address     string      `json:"address"`
	Type        AccountType `json:"type"`
	BlockNumber uint64      `json:"block_number"`
	TxHash      string      `json:"tx_hash"`
	Timestamp   time.Time   `json:"timestamp"`
}

// AccountBalanceUpdateMessage representa uma mensagem de atualização de saldo
type AccountBalanceUpdateMessage struct {
	Address     string    `json:"address"`
	Balance     string    `json:"balance"` // em wei como string
	BlockNumber uint64    `json:"block_number"`
	Timestamp   time.Time `json:"timestamp"`
}

// SmartAccountProcessingMessage representa uma mensagem de processamento de Smart Account
type SmartAccountProcessingMessage struct {
	Address               string    `json:"address"`
	FactoryAddress        *string   `json:"factory_address"`
	ImplementationAddress *string   `json:"implementation_address"`
	OwnerAddress          *string   `json:"owner_address"`
	BlockNumber           uint64    `json:"block_number"`
	TxHash                string    `json:"tx_hash"`
	Timestamp             time.Time `json:"timestamp"`
}

// AccountComplianceMessage representa uma mensagem de análise de compliance
type AccountComplianceMessage struct {
	Address   string    `json:"address"`
	Reason    string    `json:"reason"`
	Timestamp time.Time `json:"timestamp"`
}

// AccountAnalyticsMessage representa uma mensagem de processamento de analytics
type AccountAnalyticsMessage struct {
	Address   string    `json:"address"`
	Date      time.Time `json:"date"`
	Timestamp time.Time `json:"timestamp"`
}

// ContractInteractionMessage representa uma mensagem de interação com contrato
type ContractInteractionMessage struct {
	AccountAddress  string    `json:"account_address"`
	ContractAddress string    `json:"contract_address"`
	Method          *string   `json:"method"`
	GasUsed         string    `json:"gas_used"`
	ValueSent       string    `json:"value_sent"`
	BlockNumber     uint64    `json:"block_number"`
	TxHash          string    `json:"tx_hash"`
	Timestamp       time.Time `json:"timestamp"`
}

// TokenHoldingUpdateMessage representa uma mensagem de atualização de holding de token
type TokenHoldingUpdateMessage struct {
	AccountAddress string    `json:"account_address"`
	TokenAddress   string    `json:"token_address"`
	TokenSymbol    string    `json:"token_symbol"`
	TokenName      string    `json:"token_name"`
	TokenDecimals  uint8     `json:"token_decimals"`
	Balance        string    `json:"balance"`
	ValueUSD       string    `json:"value_usd"`
	BlockNumber    uint64    `json:"block_number"`
	TxHash         string    `json:"tx_hash"`
	Timestamp      time.Time `json:"timestamp"`
}

// ===== NOVAS MENSAGENS PARA OPERAÇÕES DE ACCOUNT VIA API =====

// AccountCreationMessage representa uma mensagem de criação de account via API
type AccountCreationMessage struct {
	// Dados básicos da account
	Address     string `json:"address"`
	AccountType string `json:"account_type"` // "EOA" ou "Smart Account"

	// Dados opcionais da account
	Balance             *string `json:"balance,omitempty"`
	Nonce               *uint64 `json:"nonce,omitempty"`
	ContractCode        *string `json:"contract_code,omitempty"`
	CreatorAddress      *string `json:"creator_address,omitempty"`
	CreationTxHash      *string `json:"creation_tx_hash,omitempty"`
	CreationBlockNumber *uint64 `json:"creation_block_number,omitempty"`

	// Smart Account specific fields
	FactoryAddress        *string `json:"factory_address,omitempty"`
	ImplementationAddress *string `json:"implementation_address,omitempty"`
	OwnerAddress          *string `json:"owner_address,omitempty"`

	// Corporate/Enterprise fields
	Label            *string `json:"label,omitempty"`
	Description      *string `json:"description,omitempty"`
	RiskScore        *int    `json:"risk_score,omitempty"`
	ComplianceStatus *string `json:"compliance_status,omitempty"`
	ComplianceNotes  *string `json:"compliance_notes,omitempty"`

	// Tags iniciais
	Tags []string `json:"tags,omitempty"`

	// Metadata
	CreatedBy *string   `json:"created_by,omitempty"`
	Source    string    `json:"source"` // "api", "indexer", "worker"
	Timestamp time.Time `json:"timestamp"`
}

// AccountUpdateMessage representa uma mensagem de atualização de account via API
type AccountUpdateMessage struct {
	Address string `json:"address"`

	// Campos que podem ser atualizados
	Balance          *string    `json:"balance,omitempty"`
	Nonce            *uint64    `json:"nonce,omitempty"`
	TransactionCount *int       `json:"transaction_count,omitempty"`
	Label            *string    `json:"label,omitempty"`
	Description      *string    `json:"description,omitempty"`
	RiskScore        *int       `json:"risk_score,omitempty"`
	ComplianceStatus *string    `json:"compliance_status,omitempty"`
	ComplianceNotes  *string    `json:"compliance_notes,omitempty"`
	LastActivityAt   *time.Time `json:"last_activity_at,omitempty"`

	// Smart Account updates
	FactoryAddress        *string `json:"factory_address,omitempty"`
	ImplementationAddress *string `json:"implementation_address,omitempty"`
	OwnerAddress          *string `json:"owner_address,omitempty"`

	// Metadata
	UpdatedBy *string   `json:"updated_by,omitempty"`
	Source    string    `json:"source"`
	Timestamp time.Time `json:"timestamp"`
}

// AccountTaggingMessage representa uma mensagem de tagging de account via API
type AccountTaggingMessage struct {
	Address   string    `json:"address"`
	Tags      []string  `json:"tags"`
	Operation string    `json:"operation"` // "add", "remove", "replace"
	CreatedBy *string   `json:"created_by,omitempty"`
	Source    string    `json:"source"`
	Timestamp time.Time `json:"timestamp"`
}

// AccountComplianceUpdateMessage representa uma mensagem de atualização de compliance via API
type AccountComplianceUpdateMessage struct {
	Address          string    `json:"address"`
	ComplianceStatus string    `json:"compliance_status"`
	ComplianceNotes  *string   `json:"compliance_notes,omitempty"`
	RiskScore        *int      `json:"risk_score,omitempty"`
	ReviewedBy       *string   `json:"reviewed_by,omitempty"`
	ReviewReason     *string   `json:"review_reason,omitempty"`
	Source           string    `json:"source"`
	Timestamp        time.Time `json:"timestamp"`
}

// AccountBulkOperationMessage representa uma mensagem de operação em lote
type AccountBulkOperationMessage struct {
	Operation string        `json:"operation"` // "create", "update", "tag", "compliance"
	Accounts  []interface{} `json:"accounts"`
	BatchID   string        `json:"batch_id"`
	CreatedBy *string       `json:"created_by,omitempty"`
	Source    string        `json:"source"`
	Timestamp time.Time     `json:"timestamp"`
}

// Validation helpers para as novas mensagens

// IsValidAccountType verifica se o tipo de account é válido
func (m *AccountCreationMessage) IsValidAccountType() bool {
	return m.AccountType == "EOA" || m.AccountType == "Smart Account"
}

// IsSmartAccount verifica se é uma Smart Account
func (m *AccountCreationMessage) IsSmartAccount() bool {
	return m.AccountType == "Smart Account"
}

// HasSmartAccountData verifica se tem dados de Smart Account
func (m *AccountCreationMessage) HasSmartAccountData() bool {
	return m.FactoryAddress != nil || m.ImplementationAddress != nil || m.OwnerAddress != nil
}

// SetDefaults define valores padrão para campos opcionais
func (m *AccountCreationMessage) SetDefaults() {
	if m.RiskScore == nil {
		defaultRisk := 0
		m.RiskScore = &defaultRisk
	}
	if m.ComplianceStatus == nil {
		defaultStatus := "pending"
		m.ComplianceStatus = &defaultStatus
	}
	if m.Source == "" {
		m.Source = "api"
	}
	if m.Timestamp.IsZero() {
		m.Timestamp = time.Now()
	}
}

// GetPriority retorna a prioridade da mensagem (para filas prioritárias)
func (m *AccountCreationMessage) GetPriority() uint8 {
	if m.IsSmartAccount() {
		return 5 // Smart Accounts têm prioridade alta
	}
	return 1 // EOAs têm prioridade normal
}

// IsValidOperation verifica se a operação de tagging é válida
func (m *AccountTaggingMessage) IsValidOperation() bool {
	validOps := []string{"add", "remove", "replace"}
	for _, op := range validOps {
		if m.Operation == op {
			return true
		}
	}
	return false
}

// IsValidComplianceStatus verifica se o status de compliance é válido
func (m *AccountComplianceUpdateMessage) IsValidComplianceStatus() bool {
	validStatuses := []string{"compliant", "non_compliant", "pending", "under_review"}
	for _, status := range validStatuses {
		if m.ComplianceStatus == status {
			return true
		}
	}
	return false
}
