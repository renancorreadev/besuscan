package entities

import (
	"database/sql/driver"
	"encoding/json"
	"time"
)

// Event representa um evento de smart contract
type Event struct {
	ID               string       `json:"id" db:"id"`
	ContractAddress  string       `json:"contract_address" db:"contract_address"`
	ContractName     *string      `json:"contract_name,omitempty" db:"contract_name"`
	EventName        string       `json:"event_name" db:"event_name"`
	EventSignature   string       `json:"event_signature" db:"event_signature"`
	TransactionHash  string       `json:"transaction_hash" db:"transaction_hash"`
	BlockNumber      uint64       `json:"block_number" db:"block_number"`
	BlockHash        string       `json:"block_hash" db:"block_hash"`
	LogIndex         uint64       `json:"log_index" db:"log_index"`
	TransactionIndex uint64       `json:"transaction_index" db:"transaction_index"`
	FromAddress      string       `json:"from_address" db:"from_address"`
	ToAddress        *string      `json:"to_address,omitempty" db:"to_address"`
	Topics           TopicsArray  `json:"topics" db:"topics"`
	Data             []byte       `json:"data" db:"data"`
	DecodedData      *DecodedData `json:"decoded_data,omitempty" db:"decoded_data"`
	GasUsed          uint64       `json:"gas_used" db:"gas_used"`
	GasPrice         string       `json:"gas_price" db:"gas_price"`
	Status           string       `json:"status" db:"status"` // success, failed
	Removed          bool         `json:"removed" db:"removed"`
	Timestamp        time.Time    `json:"timestamp" db:"timestamp"`
	CreatedAt        time.Time    `json:"created_at" db:"created_at"`
	UpdatedAt        time.Time    `json:"updated_at" db:"updated_at"`
}

// TopicsArray é um tipo customizado para lidar com arrays de topics no PostgreSQL
type TopicsArray []string

// Value implementa driver.Valuer para serializar para o banco
func (t TopicsArray) Value() (driver.Value, error) {
	if t == nil {
		return nil, nil
	}
	return json.Marshal(t)
}

// Scan implementa sql.Scanner para deserializar do banco
func (t *TopicsArray) Scan(value interface{}) error {
	if value == nil {
		*t = nil
		return nil
	}

	bytes, ok := value.([]byte)
	if !ok {
		return nil
	}

	return json.Unmarshal(bytes, t)
}

// DecodedData representa dados decodificados de um evento
type DecodedData map[string]interface{}

// Value implementa driver.Valuer para serializar para o banco
func (d DecodedData) Value() (driver.Value, error) {
	if d == nil {
		return nil, nil
	}
	return json.Marshal(d)
}

// Scan implementa sql.Scanner para deserializar do banco
func (d *DecodedData) Scan(value interface{}) error {
	if value == nil {
		*d = nil
		return nil
	}

	bytes, ok := value.([]byte)
	if !ok {
		return nil
	}

	return json.Unmarshal(bytes, d)
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

// EventSummary representa um resumo de evento para listagens
type EventSummary struct {
	ID              string       `json:"id"`
	EventName       string       `json:"event_name"`
	ContractAddress string       `json:"contract_address"`
	ContractName    *string      `json:"contract_name,omitempty"`
	Method          string       `json:"method"`
	TransactionHash string       `json:"transaction_hash"`
	BlockNumber     uint64       `json:"block_number"`
	Timestamp       time.Time    `json:"timestamp"`
	FromAddress     string       `json:"from_address"`
	ToAddress       *string      `json:"to_address,omitempty"`
	Topics          TopicsArray  `json:"topics"`
	Data            []byte       `json:"data"`
	DecodedData     *DecodedData `json:"decoded_data,omitempty"`
}

// TableName retorna o nome da tabela para o GORM
func (Event) TableName() string {
	return "events"
}
