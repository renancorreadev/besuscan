package entities

import (
	"math/big"
	"time"
)

// TransactionStatus representa o status de uma transação
type TransactionStatus string

const (
	StatusPending  TransactionStatus = "pending"
	StatusSuccess  TransactionStatus = "success"
	StatusFailed   TransactionStatus = "failed"
	StatusDropped  TransactionStatus = "dropped"
	StatusReplaced TransactionStatus = "replaced"
)

// Transaction representa uma transação na blockchain
type Transaction struct {
	Hash                 string            `json:"hash"`
	BlockNumber          *uint64           `json:"block_number"`
	BlockHash            *string           `json:"block_hash"`
	TransactionIndex     *uint64           `json:"transaction_index"`
	From                 string            `json:"from"`
	To                   *string           `json:"to"`
	Value                *big.Int          `json:"value"`
	Gas                  uint64            `json:"gas"`
	GasPrice             *big.Int          `json:"gas_price"`
	GasUsed              *uint64           `json:"gas_used"`
	MaxFeePerGas         *big.Int          `json:"max_fee_per_gas"`
	MaxPriorityFeePerGas *big.Int          `json:"max_priority_fee_per_gas"`
	Nonce                uint64            `json:"nonce"`
	Data                 []byte            `json:"data"`
	Status               TransactionStatus `json:"status"`
	ContractAddress      *string           `json:"contract_address"`
	LogsBloom            []byte            `json:"logs_bloom"`
	Type                 uint8             `json:"type"`
	AccessList           []byte            `json:"access_list"`
	CreatedAt            time.Time         `json:"created_at"`
	UpdatedAt            time.Time         `json:"updated_at"`
	MinedAt              *time.Time        `json:"mined_at"`
}

// NewTransaction cria uma nova instância de Transaction
func NewTransaction(hash, from string, nonce uint64) *Transaction {
	now := time.Now()
	return &Transaction{
		Hash:      hash,
		From:      from,
		Nonce:     nonce,
		Status:    StatusPending,
		CreatedAt: now,
		UpdatedAt: now,
	}
}

// IsValid verifica se a transação é válida
func (t *Transaction) IsValid() bool {
	return t.Hash != "" &&
		len(t.Hash) == 66 && // 0x + 64 chars
		t.From != "" &&
		len(t.From) == 42 // 0x + 40 chars
}

// IsPending verifica se a transação está pendente
func (t *Transaction) IsPending() bool {
	return t.Status == StatusPending
}

// IsConfirmed verifica se a transação foi confirmada
func (t *Transaction) IsConfirmed() bool {
	return t.BlockNumber != nil && t.BlockHash != nil
}

// SetBlockInfo define informações do bloco
func (t *Transaction) SetBlockInfo(blockNumber uint64, blockHash string, txIndex uint64) {
	t.BlockNumber = &blockNumber
	t.BlockHash = &blockHash
	t.TransactionIndex = &txIndex
	now := time.Now()
	t.MinedAt = &now
	t.UpdatedAt = now
}

// SetGasInfo define informações de gas
func (t *Transaction) SetGasInfo(gas uint64, gasPrice *big.Int, gasUsed *uint64) {
	t.Gas = gas
	t.GasPrice = gasPrice
	t.GasUsed = gasUsed
	t.UpdatedAt = time.Now()
}

// SetEIP1559Info define informações EIP-1559
func (t *Transaction) SetEIP1559Info(maxFeePerGas, maxPriorityFeePerGas *big.Int) {
	t.MaxFeePerGas = maxFeePerGas
	t.MaxPriorityFeePerGas = maxPriorityFeePerGas
	t.UpdatedAt = time.Now()
}

// SetStatus atualiza o status da transação
func (t *Transaction) SetStatus(status TransactionStatus) {
	t.Status = status
	t.UpdatedAt = time.Now()
}

// SetContractCreation define informações de criação de contrato
func (t *Transaction) SetContractCreation(contractAddress string) {
	t.ContractAddress = &contractAddress
	t.UpdatedAt = time.Now()
}

// CalculateFee calcula a taxa da transação
func (t *Transaction) CalculateFee() *big.Int {
	if t.GasUsed == nil || t.GasPrice == nil {
		return big.NewInt(0)
	}

	fee := new(big.Int)
	fee.Mul(big.NewInt(int64(*t.GasUsed)), t.GasPrice)
	return fee
}

// IsContractCreation verifica se é uma criação de contrato
func (t *Transaction) IsContractCreation() bool {
	return t.To == nil || *t.To == ""
}
