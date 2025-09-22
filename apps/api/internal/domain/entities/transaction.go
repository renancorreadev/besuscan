package entities

import (
	"math/big"
	"time"
)

// Transaction representa uma transação na blockchain para a API
type Transaction struct {
	Hash                 string     `json:"hash"`
	BlockNumber          *uint64    `json:"block_number"`
	BlockHash            *string    `json:"block_hash"`
	TransactionIndex     *uint64    `json:"transaction_index"`
	From                 string     `json:"from"`
	To                   *string    `json:"to"`
	Value                *big.Int   `json:"value"`
	Gas                  uint64     `json:"gas"`
	GasPrice             *big.Int   `json:"gas_price"`
	GasUsed              *uint64    `json:"gas_used"`
	MaxFeePerGas         *big.Int   `json:"max_fee_per_gas"`
	MaxPriorityFeePerGas *big.Int   `json:"max_priority_fee_per_gas"`
	Nonce                uint64     `json:"nonce"`
	Data                 []byte     `json:"data"`
	Status               string     `json:"status"`
	ContractAddress      *string    `json:"contract_address"`
	Type                 uint8      `json:"type"`
	Method               *string    `json:"method,omitempty"`
	MethodType           *string    `json:"method_type,omitempty"`
	CreatedAt            time.Time  `json:"created_at"`
	UpdatedAt            time.Time  `json:"updated_at"`
	MinedAt              *time.Time `json:"mined_at"`
}

// TransactionSummary representa um resumo de transação para listagens
type TransactionSummary struct {
	Hash        string     `json:"hash"`
	BlockNumber *uint64    `json:"block_number"`
	From        string     `json:"from"`
	To          *string    `json:"to"`
	Value       string     `json:"value"`
	Gas         uint64     `json:"gas"`
	GasUsed     *uint64    `json:"gas_used"`
	Status      string     `json:"status"`
	Type        uint8      `json:"type"`
	Method      *string    `json:"method,omitempty"`      // Nome do método identificado
	MethodType  *string    `json:"method_type,omitempty"` // Tipo do método
	MinedAt     *time.Time `json:"mined_at"`
}

// ToSummary converte uma Transaction para TransactionSummary
func (t *Transaction) ToSummary() *TransactionSummary {
	var valueStr string
	if t.Value != nil {
		valueStr = t.Value.String()
	} else {
		valueStr = "0"
	}

	return &TransactionSummary{
		Hash:        t.Hash,
		BlockNumber: t.BlockNumber,
		From:        t.From,
		To:          t.To,
		Value:       valueStr,
		Gas:         t.Gas,
		GasUsed:     t.GasUsed,
		Status:      t.Status,
		Type:        t.Type,
		Method:      t.Method,
		MethodType:  t.MethodType,
		MinedAt:     t.MinedAt,
	}
}

// IsContractCreation verifica se é uma criação de contrato
func (t *Transaction) IsContractCreation() bool {
	return t.To == nil || *t.To == ""
}

// IsPending verifica se a transação está pendente
func (t *Transaction) IsPending() bool {
	return t.Status == "pending"
}

// IsSuccess verifica se a transação foi bem-sucedida
func (t *Transaction) IsSuccess() bool {
	return t.Status == "success"
}

// IsFailed verifica se a transação falhou
func (t *Transaction) IsFailed() bool {
	return t.Status == "failed"
}

// GetValueInEther retorna o valor em Ether (como string)
func (t *Transaction) GetValueInEther() string {
	if t.Value == nil {
		return "0"
	}

	// Converter de Wei para Ether (dividir por 10^18)
	ether := new(big.Float)
	ether.SetInt(t.Value)
	ether.Quo(ether, big.NewFloat(1e18))

	return ether.Text('f', 18)
}

// GetGasFee calcula a taxa de gas total
func (t *Transaction) GetGasFee() *big.Int {
	if t.GasUsed == nil || t.GasPrice == nil {
		return big.NewInt(0)
	}

	fee := new(big.Int)
	fee.Mul(big.NewInt(int64(*t.GasUsed)), t.GasPrice)
	return fee
}
