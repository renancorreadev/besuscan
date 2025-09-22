package types

// PendingTxJob representa um job para processar uma transação pendente.
type PendingTxJob struct {
	Hash string `json:"hash"`
}

// PendingTx representa uma transação pendente detalhada.
type PendingTx struct {
	Hash      string `json:"hash"`
	From      string `json:"from"`
	To        string `json:"to"`
	Nonce     uint64 `json:"nonce"`
	Value     string `json:"value"`
	Gas       uint64 `json:"gas"`
	GasPrice  string `json:"gas_price"`
	Status    string `json:"status"` // pending, success, error
	Timestamp int64  `json:"timestamp"`
}

// MinedTx representa uma transação minerada.
type MinedTx struct {
	Hash      string `json:"hash"`
	BlockHash string `json:"block_hash"`
	BlockNum  uint64 `json:"block_num"`
	From      string `json:"from"`
	To        string `json:"to"`
	Value     string `json:"value"`
	GasUsed   uint64 `json:"gas_used"`
	Status    string `json:"status"` // success, failed
	Timestamp int64  `json:"timestamp"`
}
