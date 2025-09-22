package entities

import (
	"time"
)

// AccountCreationMessage representa uma mensagem de criação de account
type AccountCreationMessage struct {
	// Dados básicos da account
	Address     string `json:"address" validate:"required,eth_addr"`
	AccountType string `json:"account_type" validate:"required,oneof=EOA 'Smart Account'"`

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
	RiskScore        *int    `json:"risk_score,omitempty" validate:"omitempty,min=0,max=10"`
	ComplianceStatus *string `json:"compliance_status,omitempty" validate:"omitempty,oneof=compliant non_compliant pending under_review"`
	ComplianceNotes  *string `json:"compliance_notes,omitempty"`

	// Tags iniciais
	Tags []string `json:"tags,omitempty"`

	// Metadata
	CreatedBy *string   `json:"created_by,omitempty"`
	Source    string    `json:"source" validate:"required"` // "api", "indexer", "worker"
	Timestamp time.Time `json:"timestamp"`
}

// AccountUpdateMessage representa uma mensagem de atualização de account
type AccountUpdateMessage struct {
	Address string `json:"address" validate:"required,eth_addr"`

	// Campos que podem ser atualizados
	Balance          *string    `json:"balance,omitempty"`
	Nonce            *uint64    `json:"nonce,omitempty"`
	TransactionCount *int       `json:"transaction_count,omitempty"`
	Label            *string    `json:"label,omitempty"`
	Description      *string    `json:"description,omitempty"`
	RiskScore        *int       `json:"risk_score,omitempty" validate:"omitempty,min=0,max=10"`
	ComplianceStatus *string    `json:"compliance_status,omitempty" validate:"omitempty,oneof=compliant non_compliant pending under_review"`
	ComplianceNotes  *string    `json:"compliance_notes,omitempty"`
	LastActivityAt   *time.Time `json:"last_activity_at,omitempty"`

	// Smart Account updates
	FactoryAddress        *string `json:"factory_address,omitempty"`
	ImplementationAddress *string `json:"implementation_address,omitempty"`
	OwnerAddress          *string `json:"owner_address,omitempty"`

	// Metadata
	UpdatedBy *string   `json:"updated_by,omitempty"`
	Source    string    `json:"source" validate:"required"`
	Timestamp time.Time `json:"timestamp"`
}

// AccountTaggingMessage representa uma mensagem de tagging de account
type AccountTaggingMessage struct {
	Address   string    `json:"address" validate:"required,eth_addr"`
	Tags      []string  `json:"tags" validate:"required,min=1"`
	Operation string    `json:"operation" validate:"required,oneof=add remove replace"`
	CreatedBy *string   `json:"created_by,omitempty"`
	Source    string    `json:"source" validate:"required"`
	Timestamp time.Time `json:"timestamp"`
}

// AccountComplianceUpdateMessage representa uma mensagem de atualização de compliance
type AccountComplianceUpdateMessage struct {
	Address          string    `json:"address" validate:"required,eth_addr"`
	ComplianceStatus string    `json:"compliance_status" validate:"required,oneof=compliant non_compliant pending under_review"`
	ComplianceNotes  *string   `json:"compliance_notes,omitempty"`
	RiskScore        *int      `json:"risk_score,omitempty" validate:"omitempty,min=0,max=10"`
	ReviewedBy       *string   `json:"reviewed_by,omitempty"`
	ReviewReason     *string   `json:"review_reason,omitempty"`
	Source           string    `json:"source" validate:"required"`
	Timestamp        time.Time `json:"timestamp"`
}

// AccountBulkOperationMessage representa uma mensagem de operação em lote
type AccountBulkOperationMessage struct {
	Operation string        `json:"operation" validate:"required,oneof=create update tag compliance"`
	Accounts  []interface{} `json:"accounts" validate:"required,min=1"`
	BatchID   string        `json:"batch_id" validate:"required"`
	CreatedBy *string       `json:"created_by,omitempty"`
	Source    string        `json:"source" validate:"required"`
	Timestamp time.Time     `json:"timestamp"`
}

// Validation helpers

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
