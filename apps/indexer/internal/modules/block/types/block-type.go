package types

import (
	"math/big"
	"time"
)

// BlockJob representa o job publicado pelo listener
// para processamento assíncrono do bloco
// (mantém compatibilidade entre listener e worker)
type BlockJob struct {
	Number    uint64 `json:"number"`
	Hash      string `json:"hash"`
	Timestamp int64  `json:"timestamp"`
}

// BigIntToString converte *big.Int para string
func BigIntToString(b *big.Int) string {
	if b == nil {
		return "0"
	}
	return b.String()
}

type Block struct {
	Number        uint64    `json:"number"`
	Hash          string    `json:"hash"`
	ParentHash    string    `json:"parentHash"`
	Timestamp     time.Time `json:"timestamp"`
	Miner         string    `json:"miner"`
	TxCount       int       `json:"txCount"`
	BaseFeePerGas string    `json:"baseFeePerGas"`
}
