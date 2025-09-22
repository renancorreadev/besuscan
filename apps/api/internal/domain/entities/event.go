package entities

import (
	"time"
)

// Event representa um evento de smart contract na API
type Event struct {
	ID               string                 `json:"id"`
	ContractAddress  string                 `json:"contract_address"`
	ContractName     *string                `json:"contract_name,omitempty"`
	EventName        string                 `json:"event_name"`
	EventSignature   string                 `json:"event_signature"`
	TransactionHash  string                 `json:"transaction_hash"`
	BlockNumber      uint64                 `json:"block_number"`
	BlockHash        string                 `json:"block_hash"`
	LogIndex         uint64                 `json:"log_index"`
	TransactionIndex uint64                 `json:"transaction_index"`
	FromAddress      string                 `json:"from_address"`
	ToAddress        *string                `json:"to_address,omitempty"`
	Topics           []string               `json:"topics"`
	Data             []byte                 `json:"data"`
	DecodedData      map[string]interface{} `json:"decoded_data,omitempty"`
	GasUsed          uint64                 `json:"gas_used"`
	GasPrice         string                 `json:"gas_price"`
	Status           string                 `json:"status"`
	Removed          bool                   `json:"removed"`
	Timestamp        time.Time              `json:"timestamp"`
	CreatedAt        time.Time              `json:"created_at"`
	UpdatedAt        time.Time              `json:"updated_at"`
}

// EventSummary representa um resumo de evento para listagens
type EventSummary struct {
	ID              string                 `json:"id"`
	EventName       string                 `json:"event_name"`
	ContractAddress string                 `json:"contract_address"`
	ContractName    *string                `json:"contract_name,omitempty"`
	Method          string                 `json:"method"`
	TransactionHash string                 `json:"transaction_hash"`
	BlockNumber     uint64                 `json:"block_number"`
	Timestamp       time.Time              `json:"timestamp"`
	FromAddress     string                 `json:"from_address"`
	ToAddress       *string                `json:"to_address,omitempty"`
	Topics          []string               `json:"topics"`
	Data            []byte                 `json:"data"`
	DecodedData     map[string]interface{} `json:"decoded_data,omitempty"`
}

// EventStats representa estatísticas de eventos
type EventStats struct {
	TotalEvents     int64           `json:"total_events"`
	UniqueContracts int64           `json:"unique_contracts"`
	PopularEvents   []PopularEvent  `json:"popular_events"`
	RecentActivity  []EventActivity `json:"recent_activity"`
}

// PopularEvent representa um evento popular
type PopularEvent struct {
	EventName  string  `json:"event_name"`
	Count      int64   `json:"count"`
	Percentage float64 `json:"percentage"`
}

// EventActivity representa atividade de eventos por período
type EventActivity struct {
	Date  string `json:"date"`
	Count int64  `json:"count"`
}

// EventFilters representa filtros para busca de eventos
type EventFilters struct {
	Search          *string `json:"search,omitempty"`
	ContractAddress *string `json:"contract_address,omitempty"`
	EventName       *string `json:"event_name,omitempty"`
	FromAddress     *string `json:"from_address,omitempty"`
	ToAddress       *string `json:"to_address,omitempty"`
	FromBlock       *uint64 `json:"from_block,omitempty"`
	ToBlock         *uint64 `json:"to_block,omitempty"`
	FromDate        *string `json:"from_date,omitempty"`
	ToDate          *string `json:"to_date,omitempty"`
	TransactionHash *string `json:"transaction_hash,omitempty"`
	Status          *string `json:"status,omitempty"`
	OrderBy         string  `json:"order_by"`
	OrderDir        string  `json:"order_dir"`
	Page            int     `json:"page"`
	Limit           int     `json:"limit"`
}
