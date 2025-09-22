package entities

import (
	"math/big"
	"time"
)

// Block representa um bloco na blockchain para a API
type Block struct {
	Number          uint64    `json:"number"`
	Hash            string    `json:"hash"`
	ParentHash      string    `json:"parent_hash"`
	Timestamp       time.Time `json:"timestamp"`
	Miner           string    `json:"miner"`
	Difficulty      *big.Int  `json:"difficulty"`
	TotalDifficulty *big.Int  `json:"total_difficulty"`
	Size            uint64    `json:"size"`
	GasLimit        uint64    `json:"gas_limit"`
	GasUsed         uint64    `json:"gas_used"`
	BaseFeePerGas   *big.Int  `json:"base_fee_per_gas"`
	TxCount         int       `json:"tx_count"`
	UncleCount      int       `json:"uncle_count"`

	// Novos campos adicionados
	Bloom       string `json:"bloom"`        // Bloom filter
	ExtraData   string `json:"extra_data"`   // Dados extras
	MixDigest   string `json:"mix_digest"`   // Mix digest
	Nonce       uint64 `json:"nonce"`        // Nonce
	ReceiptHash string `json:"receipt_hash"` // Hash das receipts
	StateRoot   string `json:"state_root"`   // Root do estado
	TxHash      string `json:"tx_hash"`      // Hash das transações

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// BlockSummary representa um resumo de bloco para listagens
type BlockSummary struct {
	Number    uint64    `json:"number"`
	Hash      string    `json:"hash"`
	Timestamp time.Time `json:"timestamp"`
	Miner     string    `json:"miner"`
	TxCount   int       `json:"tx_count"`
	GasUsed   uint64    `json:"gas_used"`
	Size      uint64    `json:"size"`
}

// ToSummary converte um Block para BlockSummary
func (b *Block) ToSummary() *BlockSummary {
	return &BlockSummary{
		Number:    b.Number,
		Hash:      b.Hash,
		Timestamp: b.Timestamp,
		Miner:     b.Miner,
		TxCount:   b.TxCount,
		GasUsed:   b.GasUsed,
		Size:      b.Size,
	}
}

// GasTrend representa tendência de gas price
type GasTrend struct {
	Date     string  `json:"date"`
	AvgPrice string  `json:"avg_price"`
	MinPrice string  `json:"min_price"`
	MaxPrice string  `json:"max_price"`
	Volume   string  `json:"volume"`
	TxCount  int64   `json:"tx_count"`
}

// VolumeDistribution representa distribuição de volume
type VolumeDistribution struct {
	Period            string                    `json:"period"`
	TotalVolume       string                    `json:"total_volume"`
	TotalTransactions int64                     `json:"total_transactions"`
	ByHour            []VolumeByTime           `json:"by_hour,omitempty"`
	ByDay             []VolumeByTime           `json:"by_day,omitempty"`
	ByContractType    []VolumeByContractType   `json:"by_contract_type"`
}

// VolumeByTime representa volume por período de tempo
type VolumeByTime struct {
	Time   string `json:"time"`
	Volume string `json:"volume"`
	Count  int64  `json:"count"`
}

// VolumeByContractType representa volume por tipo de contrato
type VolumeByContractType struct {
	ContractType string  `json:"contract_type"`
	Volume       string  `json:"volume"`
	Count        int64   `json:"count"`
	Percentage   float64 `json:"percentage"`
}
