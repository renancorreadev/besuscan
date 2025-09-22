package services

import (
	"fmt"
	"strings"
	"time"
)

// BlockStats representa estatísticas dos blocos
type BlockStats struct {
	TotalBlocks          int64     `json:"total_blocks"`
	LatestBlockNumber    uint64    `json:"latest_block_number"`
	LatestBlockHash      string    `json:"latest_block_hash"`
	LatestBlockTimestamp time.Time `json:"latest_block_timestamp"`
}

// MethodStats representa estatísticas de métodos de contratos
type MethodStats struct {
	MethodName   string `json:"method_name"`
	CallCount    int64  `json:"call_count"`
	TotalGasUsed int64  `json:"total_gas_used"`
	ContractName string `json:"contract_name"`
}

// PaginationParams representa parâmetros de paginação
type PaginationParams struct {
	Page  int `json:"page"`
	Limit int `json:"limit"`
}

// PaginatedResponse representa uma resposta paginada
type PaginatedResponse struct {
	Data       interface{} `json:"data"`
	Page       int         `json:"page"`
	Limit      int         `json:"limit"`
	Total      int64       `json:"total"`
	TotalPages int         `json:"total_pages"`
}

// PaginatedResult representa um resultado paginado genérico
type PaginatedResult[T any] struct {
	Data       []T `json:"data"`
	Page       int `json:"page"`
	Limit      int `json:"limit"`
	Total      int `json:"total"`
	TotalPages int `json:"total_pages"`
}

// BlockFilters representa filtros para busca de blocos
type BlockFilters struct {
	// Filtros básicos
	Miner   string `json:"miner,omitempty"`    // Endereço do minerador
	MinSize uint64 `json:"min_size,omitempty"` // Tamanho mínimo do bloco
	MaxSize uint64 `json:"max_size,omitempty"` // Tamanho máximo do bloco

	// Filtros de gas
	MinGasUsed  uint64 `json:"min_gas_used,omitempty"`  // Gas usado mínimo
	MaxGasUsed  uint64 `json:"max_gas_used,omitempty"`  // Gas usado máximo
	MinGasLimit uint64 `json:"min_gas_limit,omitempty"` // Gas limit mínimo
	MaxGasLimit uint64 `json:"max_gas_limit,omitempty"` // Gas limit máximo

	// Filtros de transações
	MinTxCount int   `json:"min_tx_count,omitempty"` // Número mínimo de transações
	MaxTxCount int   `json:"max_tx_count,omitempty"` // Número máximo de transações
	HasTx      *bool `json:"has_tx,omitempty"`       // true = com transações, false = sem transações

	// Filtros de tempo
	FromTimestamp *time.Time `json:"from_timestamp,omitempty"` // Data/hora inicial
	ToTimestamp   *time.Time `json:"to_timestamp,omitempty"`   // Data/hora final
	FromDate      string     `json:"from_date,omitempty"`      // Data inicial (YYYY-MM-DD)
	ToDate        string     `json:"to_date,omitempty"`        // Data final (YYYY-MM-DD)

	// Filtros de intervalo de blocos
	FromBlock uint64 `json:"from_block,omitempty"` // Número do bloco inicial
	ToBlock   uint64 `json:"to_block,omitempty"`   // Número do bloco final

	// Ordenação
	OrderBy  string `json:"order_by,omitempty"`  // Campo para ordenação (number, timestamp, gas_used, size)
	OrderDir string `json:"order_dir,omitempty"` // Direção (asc, desc)

	// Paginação
	Page  int `json:"page,omitempty"`  // Página (padrão: 1)
	Limit int `json:"limit,omitempty"` // Limite por página (padrão: 10, máx: 100)
}

// Validate valida e normaliza os filtros
func (f *BlockFilters) Validate() error {
	// Validar paginação
	if f.Page <= 0 {
		f.Page = 1
	}
	if f.Limit <= 0 {
		f.Limit = 10
	}
	if f.Limit > 100 {
		f.Limit = 100
	}

	// Validar ordenação
	validOrderBy := map[string]bool{
		"number": true, "timestamp": true, "gas_used": true,
		"size": true, "tx_count": true, "miner": true,
	}
	if f.OrderBy != "" && !validOrderBy[f.OrderBy] {
		f.OrderBy = "number"
	}
	if f.OrderBy == "" {
		f.OrderBy = "number"
	}

	if f.OrderDir != "asc" && f.OrderDir != "desc" {
		f.OrderDir = "desc"
	}

	// Validar intervalos
	if f.MinSize > 0 && f.MaxSize > 0 && f.MinSize > f.MaxSize {
		f.MinSize, f.MaxSize = f.MaxSize, f.MinSize
	}
	if f.MinGasUsed > 0 && f.MaxGasUsed > 0 && f.MinGasUsed > f.MaxGasUsed {
		f.MinGasUsed, f.MaxGasUsed = f.MaxGasUsed, f.MinGasUsed
	}
	if f.MinTxCount > 0 && f.MaxTxCount > 0 && f.MinTxCount > f.MaxTxCount {
		f.MinTxCount, f.MaxTxCount = f.MaxTxCount, f.MinTxCount
	}
	if f.FromBlock > 0 && f.ToBlock > 0 && f.FromBlock > f.ToBlock {
		f.FromBlock, f.ToBlock = f.ToBlock, f.FromBlock
	}

	return nil
}

// ToSQL converte os filtros para cláusulas SQL
func (f *BlockFilters) ToSQL() (whereClause string, args []interface{}, orderClause string) {
	var conditions []string
	var argIndex int

	// Filtro por minerador
	if f.Miner != "" {
		argIndex++
		conditions = append(conditions, "miner = $"+fmt.Sprintf("%d", argIndex))
		args = append(args, f.Miner)
	}

	// Filtros de tamanho
	if f.MinSize > 0 {
		argIndex++
		conditions = append(conditions, "size >= $"+fmt.Sprintf("%d", argIndex))
		args = append(args, f.MinSize)
	}
	if f.MaxSize > 0 {
		argIndex++
		conditions = append(conditions, "size <= $"+fmt.Sprintf("%d", argIndex))
		args = append(args, f.MaxSize)
	}

	// Filtros de gas
	if f.MinGasUsed > 0 {
		argIndex++
		conditions = append(conditions, "gas_used >= $"+fmt.Sprintf("%d", argIndex))
		args = append(args, f.MinGasUsed)
	}
	if f.MaxGasUsed > 0 {
		argIndex++
		conditions = append(conditions, "gas_used <= $"+fmt.Sprintf("%d", argIndex))
		args = append(args, f.MaxGasUsed)
	}

	// Filtros de transações
	if f.MinTxCount > 0 {
		argIndex++
		conditions = append(conditions, "tx_count >= $"+fmt.Sprintf("%d", argIndex))
		args = append(args, f.MinTxCount)
	}
	if f.MaxTxCount > 0 {
		argIndex++
		conditions = append(conditions, "tx_count <= $"+fmt.Sprintf("%d", argIndex))
		args = append(args, f.MaxTxCount)
	}
	if f.HasTx != nil {
		if *f.HasTx {
			conditions = append(conditions, "tx_count > 0")
		} else {
			conditions = append(conditions, "tx_count = 0")
		}
	}

	// Filtros de tempo
	if f.FromTimestamp != nil {
		argIndex++
		conditions = append(conditions, "timestamp >= $"+fmt.Sprintf("%d", argIndex))
		args = append(args, *f.FromTimestamp)
	}
	if f.ToTimestamp != nil {
		argIndex++
		conditions = append(conditions, "timestamp <= $"+fmt.Sprintf("%d", argIndex))
		args = append(args, *f.ToTimestamp)
	}

	// Filtros de intervalo de blocos
	if f.FromBlock > 0 {
		argIndex++
		conditions = append(conditions, "number >= $"+fmt.Sprintf("%d", argIndex))
		args = append(args, f.FromBlock)
	}
	if f.ToBlock > 0 {
		argIndex++
		conditions = append(conditions, "number <= $"+fmt.Sprintf("%d", argIndex))
		args = append(args, f.ToBlock)
	}

	// Construir WHERE clause
	if len(conditions) > 0 {
		whereClause = "WHERE " + strings.Join(conditions, " AND ")
	}

	// Construir ORDER clause
	orderClause = fmt.Sprintf("ORDER BY %s %s", f.OrderBy, strings.ToUpper(f.OrderDir))

	return whereClause, args, orderClause
}
