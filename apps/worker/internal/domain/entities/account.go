package entities

import (
	"math/big"
	"time"
)

// AccountType representa o tipo de conta
type AccountType string

const (
	AccountTypeEOA          AccountType = "eoa"
	AccountTypeSmartAccount AccountType = "smart_account"
)

// ComplianceStatus representa o status de compliance da conta
type ComplianceStatus string

const (
	ComplianceStatusCompliant   ComplianceStatus = "compliant"
	ComplianceStatusFlagged     ComplianceStatus = "flagged"
	ComplianceStatusUnderReview ComplianceStatus = "under_review"
)

// Account representa uma conta na blockchain (EOA ou Smart Account)
type Account struct {
	Address                  string      `json:"address"`
	Type                     AccountType `json:"type"`
	Balance                  *big.Int    `json:"balance"`
	Nonce                    uint64      `json:"nonce"`
	TransactionCount         uint64      `json:"transaction_count"`
	ContractInteractions     uint64      `json:"contract_interactions"`
	SmartContractDeployments uint64      `json:"smart_contract_deployments"`
	FirstSeen                time.Time   `json:"first_seen"`
	LastActivity             *time.Time  `json:"last_activity"`
	IsContract               bool        `json:"is_contract"`
	ContractType             *string     `json:"contract_type"`

	// Smart Account specific fields (ERC-4337)
	FactoryAddress        *string `json:"factory_address"`
	ImplementationAddress *string `json:"implementation_address"`
	OwnerAddress          *string `json:"owner_address"`

	// Corporate/Enterprise fields
	Label            *string          `json:"label"`
	Tags             []string         `json:"tags"`
	RiskScore        *int             `json:"risk_score"`
	ComplianceStatus ComplianceStatus `json:"compliance_status"`
	ComplianceNotes  *string          `json:"compliance_notes"`

	// Metadata
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// NewAccount cria uma nova instância de Account
func NewAccount(address string, accountType AccountType) *Account {
	now := time.Now()
	return &Account{
		Address:                  address,
		Type:                     accountType,
		Balance:                  big.NewInt(0),
		Nonce:                    0,
		TransactionCount:         0,
		ContractInteractions:     0,
		SmartContractDeployments: 0,
		FirstSeen:                now,
		IsContract:               accountType == AccountTypeSmartAccount,
		Tags:                     []string{},
		ComplianceStatus:         ComplianceStatusCompliant,
		CreatedAt:                now,
		UpdatedAt:                now,
	}
}

// IsValid verifica se a conta é válida
func (a *Account) IsValid() bool {
	return a.Address != "" &&
		len(a.Address) == 42 && // 0x + 40 chars
		(a.Type == AccountTypeEOA || a.Type == AccountTypeSmartAccount)
}

// IsSmartAccount verifica se é uma Smart Account
func (a *Account) IsSmartAccount() bool {
	return a.Type == AccountTypeSmartAccount
}

// IsEOA verifica se é uma conta EOA
func (a *Account) IsEOA() bool {
	return a.Type == AccountTypeEOA
}

// UpdateBalance atualiza o saldo da conta
func (a *Account) UpdateBalance(balance *big.Int) {
	a.Balance = balance
	a.UpdatedAt = time.Now()
}

// IncrementTransactionCount incrementa o contador de transações
func (a *Account) IncrementTransactionCount() {
	a.TransactionCount++
	a.LastActivity = &time.Time{}
	*a.LastActivity = time.Now()
	a.UpdatedAt = time.Now()
}

// IncrementContractInteractions incrementa o contador de interações com contratos
func (a *Account) IncrementContractInteractions() {
	a.ContractInteractions++
	a.UpdatedAt = time.Now()
}

// IncrementSmartContractDeployments incrementa o contador de deployments de contratos
func (a *Account) IncrementSmartContractDeployments() {
	a.SmartContractDeployments++
	a.UpdatedAt = time.Now()
}

// SetSmartAccountInfo define informações específicas de Smart Account
func (a *Account) SetSmartAccountInfo(factoryAddress, implementationAddress, ownerAddress *string) {
	if a.IsSmartAccount() {
		a.FactoryAddress = factoryAddress
		a.ImplementationAddress = implementationAddress
		a.OwnerAddress = ownerAddress
		a.UpdatedAt = time.Now()
	}
}

// SetLabel define um label para a conta
func (a *Account) SetLabel(label string) {
	a.Label = &label
	a.UpdatedAt = time.Now()
}

// AddTag adiciona uma tag à conta
func (a *Account) AddTag(tag string) {
	for _, existingTag := range a.Tags {
		if existingTag == tag {
			return // Tag já existe
		}
	}
	a.Tags = append(a.Tags, tag)
	a.UpdatedAt = time.Now()
}

// RemoveTag remove uma tag da conta
func (a *Account) RemoveTag(tag string) {
	for i, existingTag := range a.Tags {
		if existingTag == tag {
			a.Tags = append(a.Tags[:i], a.Tags[i+1:]...)
			a.UpdatedAt = time.Now()
			return
		}
	}
}

// SetRiskScore define o score de risco da conta
func (a *Account) SetRiskScore(score int) {
	if score >= 0 && score <= 10 {
		a.RiskScore = &score
		a.UpdatedAt = time.Now()
	}
}

// SetComplianceStatus define o status de compliance
func (a *Account) SetComplianceStatus(status ComplianceStatus, notes *string) {
	a.ComplianceStatus = status
	a.ComplianceNotes = notes
	a.UpdatedAt = time.Now()
}

// UpdateNonce atualiza o nonce da conta
func (a *Account) UpdateNonce(nonce uint64) {
	a.Nonce = nonce
	a.UpdatedAt = time.Now()
}

// MarkAsContract marca a conta como contrato
func (a *Account) MarkAsContract(contractType string) {
	a.IsContract = true
	a.ContractType = &contractType
	if a.Type == AccountTypeEOA {
		a.Type = AccountTypeSmartAccount
	}
	a.UpdatedAt = time.Now()
}
