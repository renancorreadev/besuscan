package types

import (
	"math/big"
	"time"
)

type Transaction struct {
	Hash        string    `json:"hash"`
	BlockNumber uint64    `json:"blockNumber"`
	From        string    `json:"from"`
	To          string    `json:"to"`
	Value       *big.Int  `json:"value"`
	Gas         uint64    `json:"gas"`
	GasPrice    *big.Int  `json:"gasPrice"`
	Nonce       uint64    `json:"nonce"`
	Status      string    `json:"status"`
	Timestamp   time.Time `json:"timestamp"`
}
