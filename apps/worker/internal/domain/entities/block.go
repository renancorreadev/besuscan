package entities

import (
	"math/big"
	"time"
)

// Block representa um bloco na blockchain
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

// BlockSummary representa um resumo do bloco para listagens
type BlockSummary struct {
	Number    uint64    `json:"number"`
	Hash      string    `json:"hash"`
	Timestamp time.Time `json:"timestamp"`
	Miner     string    `json:"miner"`
	TxCount   int       `json:"tx_count"`
	GasUsed   uint64    `json:"gas_used"`
	Size      uint64    `json:"size"`
}

// ToSummary converte o bloco para um resumo
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

// NewBlock cria uma nova instância de Block
func NewBlock(number uint64, hash string, timestamp time.Time) *Block {
	now := time.Now()
	return &Block{
		Number:    number,
		Hash:      hash,
		Timestamp: timestamp,
		CreatedAt: now,
		UpdatedAt: now,
	}
}

// IsValid verifica se o bloco é válido
func (b *Block) IsValid() bool {
	return b.Number >= 0 &&
		b.Hash != "" &&
		len(b.Hash) == 66 && // 0x + 64 chars
		!b.Timestamp.IsZero()
}

// SetMiningInfo define informações de mineração
func (b *Block) SetMiningInfo(miner string, difficulty, totalDifficulty *big.Int) {
	b.Miner = miner
	b.Difficulty = difficulty
	b.TotalDifficulty = totalDifficulty
	b.UpdatedAt = time.Now()
}

// SetGasInfo define informações de gas
func (b *Block) SetGasInfo(gasLimit, gasUsed uint64, baseFeePerGas *big.Int) {
	b.GasLimit = gasLimit
	b.GasUsed = gasUsed
	b.BaseFeePerGas = baseFeePerGas
	b.UpdatedAt = time.Now()
}

// SetTransactionCount define o número de transações
func (b *Block) SetTransactionCount(txCount, uncleCount int) {
	b.TxCount = txCount
	b.UncleCount = uncleCount
	b.UpdatedAt = time.Now()
}

// SetBlockHashes define os hashes do bloco
func (b *Block) SetBlockHashes(receiptHash, stateRoot, txHash string) {
	b.ReceiptHash = receiptHash
	b.StateRoot = stateRoot
	b.TxHash = txHash
	b.UpdatedAt = time.Now()
}

// SetConsensusInfo define informações de consenso
func (b *Block) SetConsensusInfo(mixDigest string, nonce uint64, extraData string) {
	b.MixDigest = mixDigest
	b.Nonce = nonce
	b.ExtraData = extraData
	b.UpdatedAt = time.Now()
}

// SetBloomFilter define o bloom filter
func (b *Block) SetBloomFilter(bloom string) {
	b.Bloom = bloom
	b.UpdatedAt = time.Now()
}
