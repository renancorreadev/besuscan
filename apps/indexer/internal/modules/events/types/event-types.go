package types

// EventJob representa um evento de smart contract descoberto para processamento
type EventJob struct {
	ID               string   `json:"id"`
	ContractAddress  string   `json:"contract_address"`
	TransactionHash  string   `json:"transaction_hash"`
	BlockNumber      uint64   `json:"block_number"`
	BlockHash        string   `json:"block_hash"`
	LogIndex         uint64   `json:"log_index"`
	TransactionIndex uint64   `json:"transaction_index"`
	Topics           []string `json:"topics"`
	Data             []byte   `json:"data"`
	Removed          bool     `json:"removed"`
	FromAddress      string   `json:"from_address,omitempty"`
	ToAddress        string   `json:"to_address,omitempty"`
	GasUsed          uint64   `json:"gas_used,omitempty"`
	GasPrice         string   `json:"gas_price,omitempty"`
	Timestamp        int64    `json:"timestamp,omitempty"`
	EventSignature   string   `json:"event_signature,omitempty"`
	EventName        string   `json:"event_name,omitempty"`
}

// EventProcessingResult representa o resultado do processamento de um evento
type EventProcessingResult struct {
	EventID     string `json:"event_id"`
	Success     bool   `json:"success"`
	Error       string `json:"error,omitempty"`
	ProcessedAt int64  `json:"processed_at"`
}
