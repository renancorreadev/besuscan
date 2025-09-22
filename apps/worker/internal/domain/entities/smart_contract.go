package entities

import (
	"encoding/json"
	"time"
)

// SmartContract representa um smart contract na blockchain
type SmartContract struct {
	// Identificação básica
	Address string  `json:"address" db:"address"`
	Name    *string `json:"name,omitempty" db:"name"`
	Symbol  *string `json:"symbol,omitempty" db:"symbol"`
	Type    *string `json:"contract_type,omitempty" db:"contract_type"`

	// Informações de criação
	CreatorAddress      string    `json:"creator_address" db:"creator_address"`
	CreationTxHash      string    `json:"creation_tx_hash" db:"creation_tx_hash"`
	CreationBlockNumber int64     `json:"creation_block_number" db:"creation_block_number"`
	CreationTimestamp   time.Time `json:"creation_timestamp" db:"creation_timestamp"`

	// Informações de verificação
	IsVerified          bool       `json:"is_verified" db:"is_verified"`
	VerificationDate    *time.Time `json:"verification_date,omitempty" db:"verification_date"`
	CompilerVersion     *string    `json:"compiler_version,omitempty" db:"compiler_version"`
	OptimizationEnabled *bool      `json:"optimization_enabled,omitempty" db:"optimization_enabled"`
	OptimizationRuns    *int       `json:"optimization_runs,omitempty" db:"optimization_runs"`
	LicenseType         *string    `json:"license_type,omitempty" db:"license_type"`

	// Código e ABI
	SourceCode      *string         `json:"source_code,omitempty" db:"source_code"`
	ABI             json.RawMessage `json:"abi,omitempty" db:"abi"`
	Bytecode        *string         `json:"bytecode,omitempty" db:"bytecode"`
	ConstructorArgs *string         `json:"constructor_args,omitempty" db:"constructor_args"`

	// Métricas básicas
	Balance     string `json:"balance" db:"balance"` // Wei como string
	Nonce       int64  `json:"nonce" db:"nonce"`
	CodeSize    *int   `json:"code_size,omitempty" db:"code_size"`
	StorageSize *int   `json:"storage_size,omitempty" db:"storage_size"`

	// Métricas de atividade
	TotalTransactions         int64  `json:"total_transactions" db:"total_transactions"`
	TotalInternalTransactions int64  `json:"total_internal_transactions" db:"total_internal_transactions"`
	TotalEvents               int64  `json:"total_events" db:"total_events"`
	UniqueAddressesCount      int64  `json:"unique_addresses_count" db:"unique_addresses_count"`
	TotalGasUsed              string `json:"total_gas_used" db:"total_gas_used"`                   // Wei como string
	TotalValueTransferred     string `json:"total_value_transferred" db:"total_value_transferred"` // Wei como string

	// Métricas de tempo
	FirstTransactionAt *time.Time `json:"first_transaction_at,omitempty" db:"first_transaction_at"`
	LastTransactionAt  *time.Time `json:"last_transaction_at,omitempty" db:"last_transaction_at"`
	LastActivityAt     *time.Time `json:"last_activity_at,omitempty" db:"last_activity_at"`

	// Status e flags
	IsActive            bool    `json:"is_active" db:"is_active"`
	IsProxy             bool    `json:"is_proxy" db:"is_proxy"`
	ProxyImplementation *string `json:"proxy_implementation,omitempty" db:"proxy_implementation"`
	IsToken             bool    `json:"is_token" db:"is_token"`

	// Metadados adicionais
	Description      *string  `json:"description,omitempty" db:"description"`
	WebsiteURL       *string  `json:"website_url,omitempty" db:"website_url"`
	GithubURL        *string  `json:"github_url,omitempty" db:"github_url"`
	DocumentationURL *string  `json:"documentation_url,omitempty" db:"documentation_url"`
	Tags             []string `json:"tags,omitempty" db:"tags"`

	// Timestamps de controle
	CreatedAt         time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at" db:"updated_at"`
	LastMetricsUpdate *time.Time `json:"last_metrics_update,omitempty" db:"last_metrics_update"`
}

// SmartContractDailyMetrics representa métricas diárias de um smart contract
type SmartContractDailyMetrics struct {
	ID              int64     `json:"id" db:"id"`
	ContractAddress string    `json:"contract_address" db:"contract_address"`
	Date            time.Time `json:"date" db:"date"`

	// Métricas do dia
	TransactionsCount    int64  `json:"transactions_count" db:"transactions_count"`
	UniqueAddressesCount int64  `json:"unique_addresses_count" db:"unique_addresses_count"`
	GasUsed              string `json:"gas_used" db:"gas_used"`                   // Wei como string
	ValueTransferred     string `json:"value_transferred" db:"value_transferred"` // Wei como string
	EventsCount          int64  `json:"events_count" db:"events_count"`

	// Métricas de performance
	AvgGasPerTx *float64 `json:"avg_gas_per_tx,omitempty" db:"avg_gas_per_tx"`
	SuccessRate *float64 `json:"success_rate,omitempty" db:"success_rate"`

	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

// SmartContractFunction representa uma função de um smart contract
type SmartContractFunction struct {
	ID                int64   `json:"id" db:"id"`
	ContractAddress   string  `json:"contract_address" db:"contract_address"`
	FunctionName      string  `json:"function_name" db:"function_name"`
	FunctionSignature string  `json:"function_signature" db:"function_signature"`       // 4-byte selector
	FunctionType      string  `json:"function_type" db:"function_type"`                 // function, constructor, fallback, receive
	StateMutability   *string `json:"state_mutability,omitempty" db:"state_mutability"` // pure, view, nonpayable, payable

	// Inputs e outputs como JSON
	Inputs  json.RawMessage `json:"inputs,omitempty" db:"inputs"`
	Outputs json.RawMessage `json:"outputs,omitempty" db:"outputs"`

	// Métricas de uso
	CallCount    int64      `json:"call_count" db:"call_count"`
	LastCalledAt *time.Time `json:"last_called_at,omitempty" db:"last_called_at"`

	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

// SmartContractEvent representa um evento de um smart contract
type SmartContractEvent struct {
	ID              int64  `json:"id" db:"id"`
	ContractAddress string `json:"contract_address" db:"contract_address"`
	EventName       string `json:"event_name" db:"event_name"`
	EventSignature  string `json:"event_signature" db:"event_signature"` // keccak256 hash

	// Definição do evento
	Inputs    json.RawMessage `json:"inputs,omitempty" db:"inputs"`
	Anonymous bool            `json:"anonymous" db:"anonymous"`

	// Métricas de uso
	EmissionCount int64      `json:"emission_count" db:"emission_count"`
	LastEmittedAt *time.Time `json:"last_emitted_at,omitempty" db:"last_emitted_at"`

	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

// Métodos para SmartContract

// IsContractCreation verifica se é uma criação de contrato
func (sc *SmartContract) IsContractCreation() bool {
	return sc.CreationTxHash != ""
}

// IsERC20 verifica se é um token ERC-20
func (sc *SmartContract) IsERC20() bool {
	return sc.Type != nil && *sc.Type == "ERC-20"
}

// IsERC721 verifica se é um token ERC-721 (NFT)
func (sc *SmartContract) IsERC721() bool {
	return sc.Type != nil && *sc.Type == "ERC-721"
}

// HasActivity verifica se o contrato tem atividade recente
func (sc *SmartContract) HasActivity() bool {
	return sc.TotalTransactions > 0
}

// GetActivityScore calcula um score de atividade baseado em métricas
func (sc *SmartContract) GetActivityScore() float64 {
	score := 0.0

	// Peso por transações (normalizado)
	if sc.TotalTransactions > 0 {
		score += float64(sc.TotalTransactions) * 0.3
	}

	// Peso por endereços únicos
	if sc.UniqueAddressesCount > 0 {
		score += float64(sc.UniqueAddressesCount) * 0.4
	}

	// Peso por eventos
	if sc.TotalEvents > 0 {
		score += float64(sc.TotalEvents) * 0.2
	}

	// Peso por atividade recente
	if sc.LastActivityAt != nil {
		daysSinceActivity := time.Since(*sc.LastActivityAt).Hours() / 24
		if daysSinceActivity < 7 {
			score += (7 - daysSinceActivity) * 0.1
		}
	}

	return score
}

// UpdateMetrics atualiza as métricas do contrato
func (sc *SmartContract) UpdateMetrics() {
	now := time.Now()
	sc.LastMetricsUpdate = &now
	sc.UpdatedAt = now
}

// SetVerified marca o contrato como verificado
func (sc *SmartContract) SetVerified(compilerVersion, licenseType string, optimizationEnabled bool, optimizationRuns int) {
	now := time.Now()
	sc.IsVerified = true
	sc.VerificationDate = &now
	sc.CompilerVersion = &compilerVersion
	sc.LicenseType = &licenseType
	sc.OptimizationEnabled = &optimizationEnabled
	sc.OptimizationRuns = &optimizationRuns
	sc.UpdatedAt = now
}

// AddTransaction incrementa as métricas de transação
func (sc *SmartContract) AddTransaction(gasUsed, value string, timestamp time.Time) {
	sc.TotalTransactions++

	// Atualizar primeira transação se necessário
	if sc.FirstTransactionAt == nil || timestamp.Before(*sc.FirstTransactionAt) {
		sc.FirstTransactionAt = &timestamp
	}

	// Atualizar última transação
	if sc.LastTransactionAt == nil || timestamp.After(*sc.LastTransactionAt) {
		sc.LastTransactionAt = &timestamp
	}

	// Atualizar última atividade
	sc.LastActivityAt = &timestamp

	sc.UpdatedAt = time.Now()
}

// AddEvent incrementa as métricas de eventos
func (sc *SmartContract) AddEvent(timestamp time.Time) {
	sc.TotalEvents++
	sc.LastActivityAt = &timestamp
	sc.UpdatedAt = time.Now()
}

// Métodos para SmartContractFunction

// IsReadOnly verifica se a função é somente leitura
func (scf *SmartContractFunction) IsReadOnly() bool {
	return scf.StateMutability != nil &&
		(*scf.StateMutability == "pure" || *scf.StateMutability == "view")
}

// IsPayable verifica se a função é payable
func (scf *SmartContractFunction) IsPayable() bool {
	return scf.StateMutability != nil && *scf.StateMutability == "payable"
}

// IncrementCallCount incrementa o contador de chamadas
func (scf *SmartContractFunction) IncrementCallCount() {
	scf.CallCount++
	now := time.Now()
	scf.LastCalledAt = &now
	scf.UpdatedAt = now
}

// Métodos para SmartContractEvent

// IncrementEmissionCount incrementa o contador de emissões
func (sce *SmartContractEvent) IncrementEmissionCount() {
	sce.EmissionCount++
	now := time.Now()
	sce.LastEmittedAt = &now
	sce.UpdatedAt = now
}
