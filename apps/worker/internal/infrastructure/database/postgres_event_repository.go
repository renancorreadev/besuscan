package database

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	"github.com/hubweb3/worker/internal/domain/entities"
	"github.com/hubweb3/worker/internal/domain/repositories"
)

// PostgresEventRepository implementa EventRepository usando PostgreSQL
type PostgresEventRepository struct {
	db *sql.DB
}

// NewPostgresEventRepository cria uma nova instância do repositório
func NewPostgresEventRepository(db *sql.DB) repositories.EventRepository {
	return &PostgresEventRepository{db: db}
}

// Create salva um novo evento
func (r *PostgresEventRepository) Create(ctx context.Context, event *entities.Event) error {
	query := `
		INSERT INTO events (
			id, contract_address, contract_name, event_name, event_signature,
			transaction_hash, block_number, block_hash, log_index, transaction_index,
			from_address, to_address, topics, data, decoded_data, gas_used, gas_price,
			status, removed, timestamp, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
		)
		ON CONFLICT (id) DO UPDATE SET
			contract_name = EXCLUDED.contract_name,
			decoded_data = EXCLUDED.decoded_data,
			updated_at = EXCLUDED.updated_at
	`

	now := time.Now()
	event.CreatedAt = now
	event.UpdatedAt = now

	_, err := r.db.ExecContext(ctx, query,
		event.ID, event.ContractAddress, event.ContractName, event.EventName, event.EventSignature,
		event.TransactionHash, event.BlockNumber, event.BlockHash, event.LogIndex, event.TransactionIndex,
		event.FromAddress, event.ToAddress, event.Topics, event.Data, event.DecodedData,
		event.GasUsed, event.GasPrice, event.Status, event.Removed, event.Timestamp,
		event.CreatedAt, event.UpdatedAt)

	return err
}

// GetByID busca um evento pelo ID
func (r *PostgresEventRepository) GetByID(ctx context.Context, id string) (*entities.Event, error) {
	query := `
		SELECT id, contract_address, contract_name, event_name, event_signature,
			   transaction_hash, block_number, block_hash, log_index, transaction_index,
			   from_address, to_address, topics, data, decoded_data, gas_used, gas_price,
			   status, removed, timestamp, created_at, updated_at
		FROM events WHERE id = $1
	`

	var event entities.Event
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&event.ID, &event.ContractAddress, &event.ContractName, &event.EventName, &event.EventSignature,
		&event.TransactionHash, &event.BlockNumber, &event.BlockHash, &event.LogIndex, &event.TransactionIndex,
		&event.FromAddress, &event.ToAddress, &event.Topics, &event.Data, &event.DecodedData,
		&event.GasUsed, &event.GasPrice, &event.Status, &event.Removed, &event.Timestamp,
		&event.CreatedAt, &event.UpdatedAt)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	return &event, nil
}

// GetAll busca eventos com filtros e paginação
func (r *PostgresEventRepository) GetAll(ctx context.Context, filters entities.EventFilters) ([]*entities.EventSummary, int64, error) {
	whereClause, args := r.buildWhereClause(filters)

	// Query para contar total
	countQuery := fmt.Sprintf(`SELECT COUNT(*) FROM events %s`, whereClause)

	var total int64
	err := r.db.QueryRowContext(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	// Query para buscar dados
	orderBy := "timestamp DESC"
	if filters.OrderBy != "" {
		orderBy = fmt.Sprintf("%s %s", filters.OrderBy, filters.OrderDir)
	}

	offset := (filters.Page - 1) * filters.Limit

	dataQuery := fmt.Sprintf(`
		SELECT 
			id, event_name, contract_address, contract_name, event_name as method,
			transaction_hash, block_number, timestamp, from_address, to_address,
			topics, data, decoded_data
		FROM events %s
		ORDER BY %s
		LIMIT $%d OFFSET $%d
	`, whereClause, orderBy, len(args)+1, len(args)+2)

	args = append(args, filters.Limit, offset)

	rows, err := r.db.QueryContext(ctx, dataQuery, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var events []*entities.EventSummary
	for rows.Next() {
		var event entities.EventSummary
		err := rows.Scan(
			&event.ID, &event.EventName, &event.ContractAddress, &event.ContractName,
			&event.Method, &event.TransactionHash, &event.BlockNumber, &event.Timestamp,
			&event.FromAddress, &event.ToAddress, &event.Topics, &event.Data, &event.DecodedData,
		)
		if err != nil {
			return nil, 0, err
		}
		events = append(events, &event)
	}

	return events, total, nil
}

// GetByTransactionHash busca eventos por hash da transação
func (r *PostgresEventRepository) GetByTransactionHash(ctx context.Context, txHash string) ([]*entities.Event, error) {
	query := `
		SELECT id, contract_address, contract_name, event_name, event_signature,
			   transaction_hash, block_number, block_hash, log_index, transaction_index,
			   from_address, to_address, topics, data, decoded_data, gas_used, gas_price,
			   status, removed, timestamp, created_at, updated_at
		FROM events 
		WHERE transaction_hash = $1 
		ORDER BY log_index ASC
	`

	rows, err := r.db.QueryContext(ctx, query, txHash)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []*entities.Event
	for rows.Next() {
		var event entities.Event
		err := rows.Scan(
			&event.ID, &event.ContractAddress, &event.ContractName, &event.EventName, &event.EventSignature,
			&event.TransactionHash, &event.BlockNumber, &event.BlockHash, &event.LogIndex, &event.TransactionIndex,
			&event.FromAddress, &event.ToAddress, &event.Topics, &event.Data, &event.DecodedData,
			&event.GasUsed, &event.GasPrice, &event.Status, &event.Removed, &event.Timestamp,
			&event.CreatedAt, &event.UpdatedAt)
		if err != nil {
			return nil, err
		}
		events = append(events, &event)
	}

	return events, nil
}

// GetByContractAddress busca eventos por endereço do contrato
func (r *PostgresEventRepository) GetByContractAddress(ctx context.Context, contractAddress string, limit, offset int) ([]*entities.Event, error) {
	query := `
		SELECT id, contract_address, contract_name, event_name, event_signature,
			   transaction_hash, block_number, block_hash, log_index, transaction_index,
			   from_address, to_address, topics, data, decoded_data, gas_used, gas_price,
			   status, removed, timestamp, created_at, updated_at
		FROM events 
		WHERE contract_address = $1 
		ORDER BY timestamp DESC
		LIMIT $2 OFFSET $3
	`

	rows, err := r.db.QueryContext(ctx, query, contractAddress, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []*entities.Event
	for rows.Next() {
		var event entities.Event
		err := rows.Scan(
			&event.ID, &event.ContractAddress, &event.ContractName, &event.EventName, &event.EventSignature,
			&event.TransactionHash, &event.BlockNumber, &event.BlockHash, &event.LogIndex, &event.TransactionIndex,
			&event.FromAddress, &event.ToAddress, &event.Topics, &event.Data, &event.DecodedData,
			&event.GasUsed, &event.GasPrice, &event.Status, &event.Removed, &event.Timestamp,
			&event.CreatedAt, &event.UpdatedAt)
		if err != nil {
			return nil, err
		}
		events = append(events, &event)
	}

	return events, nil
}

// GetByBlockNumber busca eventos por número do bloco
func (r *PostgresEventRepository) GetByBlockNumber(ctx context.Context, blockNumber uint64) ([]*entities.Event, error) {
	query := `
		SELECT id, contract_address, contract_name, event_name, event_signature,
			   transaction_hash, block_number, block_hash, log_index, transaction_index,
			   from_address, to_address, topics, data, decoded_data, gas_used, gas_price,
			   status, removed, timestamp, created_at, updated_at
		FROM events 
		WHERE block_number = $1 
		ORDER BY log_index ASC
	`

	rows, err := r.db.QueryContext(ctx, query, blockNumber)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []*entities.Event
	for rows.Next() {
		var event entities.Event
		err := rows.Scan(
			&event.ID, &event.ContractAddress, &event.ContractName, &event.EventName, &event.EventSignature,
			&event.TransactionHash, &event.BlockNumber, &event.BlockHash, &event.LogIndex, &event.TransactionIndex,
			&event.FromAddress, &event.ToAddress, &event.Topics, &event.Data, &event.DecodedData,
			&event.GasUsed, &event.GasPrice, &event.Status, &event.Removed, &event.Timestamp,
			&event.CreatedAt, &event.UpdatedAt)
		if err != nil {
			return nil, err
		}
		events = append(events, &event)
	}

	return events, nil
}

// GetByBlockRange busca eventos em um intervalo de blocos
func (r *PostgresEventRepository) GetByBlockRange(ctx context.Context, fromBlock, toBlock uint64, limit, offset int) ([]*entities.Event, error) {
	query := `
		SELECT id, contract_address, contract_name, event_name, event_signature,
			   transaction_hash, block_number, block_hash, log_index, transaction_index,
			   from_address, to_address, topics, data, decoded_data, gas_used, gas_price,
			   status, removed, timestamp, created_at, updated_at
		FROM events 
		WHERE block_number >= $1 AND block_number <= $2 
		ORDER BY block_number DESC, log_index ASC
		LIMIT $3 OFFSET $4
	`

	rows, err := r.db.QueryContext(ctx, query, fromBlock, toBlock, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []*entities.Event
	for rows.Next() {
		var event entities.Event
		err := rows.Scan(
			&event.ID, &event.ContractAddress, &event.ContractName, &event.EventName, &event.EventSignature,
			&event.TransactionHash, &event.BlockNumber, &event.BlockHash, &event.LogIndex, &event.TransactionIndex,
			&event.FromAddress, &event.ToAddress, &event.Topics, &event.Data, &event.DecodedData,
			&event.GasUsed, &event.GasPrice, &event.Status, &event.Removed, &event.Timestamp,
			&event.CreatedAt, &event.UpdatedAt)
		if err != nil {
			return nil, err
		}
		events = append(events, &event)
	}

	return events, nil
}

// GetStats retorna estatísticas de eventos
func (r *PostgresEventRepository) GetStats(ctx context.Context) (*entities.EventStats, error) {
	// Total de eventos
	var totalEvents int64
	err := r.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM events").Scan(&totalEvents)
	if err != nil {
		return nil, err
	}

	// Contratos únicos
	var uniqueContracts int64
	err = r.db.QueryRowContext(ctx, "SELECT COUNT(DISTINCT contract_address) FROM events").Scan(&uniqueContracts)
	if err != nil {
		return nil, err
	}

	// Eventos populares
	popularEvents, err := r.GetPopularEvents(ctx, 10)
	if err != nil {
		return nil, err
	}

	// Atividade recente
	recentActivity, err := r.GetRecentActivity(ctx, 7)
	if err != nil {
		return nil, err
	}

	// Converter slices de ponteiros para slices de valores
	popularEventsSlice := make([]entities.PopularEvent, len(popularEvents))
	for i, pe := range popularEvents {
		popularEventsSlice[i] = *pe
	}

	recentActivitySlice := make([]entities.EventActivity, len(recentActivity))
	for i, ra := range recentActivity {
		recentActivitySlice[i] = *ra
	}

	return &entities.EventStats{
		TotalEvents:     totalEvents,
		UniqueContracts: uniqueContracts,
		PopularEvents:   popularEventsSlice,
		RecentActivity:  recentActivitySlice,
	}, nil
}

// Search busca eventos por termo
func (r *PostgresEventRepository) Search(ctx context.Context, query string, limit, offset int) ([]*entities.EventSummary, int64, error) {
	searchTerm := "%" + strings.ToLower(query) + "%"

	// Detectar tipo de busca
	var whereClause string
	var args []interface{}

	if len(query) == 66 && strings.HasPrefix(query, "0x") {
		// Hash de transação
		whereClause = "WHERE LOWER(transaction_hash) = LOWER($1)"
		args = []interface{}{query}
	} else if len(query) == 42 && strings.HasPrefix(query, "0x") {
		// Endereço de contrato
		whereClause = "WHERE LOWER(contract_address) = LOWER($1) OR LOWER(from_address) = LOWER($1) OR LOWER(to_address) = LOWER($1)"
		args = []interface{}{query}
	} else if isNumeric(query) {
		// Número do bloco
		whereClause = "WHERE block_number = $1"
		args = []interface{}{query}
	} else {
		// Busca textual
		whereClause = `WHERE LOWER(event_name) LIKE $1 
					   OR LOWER(contract_name) LIKE $1 
					   OR LOWER(contract_address) LIKE $1`
		args = []interface{}{searchTerm}
	}

	// Contar total
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM events %s", whereClause)
	var total int64
	err := r.db.QueryRowContext(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	// Buscar dados
	dataQuery := fmt.Sprintf(`
		SELECT 
			id, event_name, contract_address, contract_name, event_name as method,
			transaction_hash, block_number, timestamp, from_address, to_address,
			topics, data, decoded_data
		FROM events %s
		ORDER BY timestamp DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, len(args)+1, len(args)+2)

	args = append(args, limit, offset)

	rows, err := r.db.QueryContext(ctx, dataQuery, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var events []*entities.EventSummary
	for rows.Next() {
		var event entities.EventSummary
		err := rows.Scan(
			&event.ID, &event.EventName, &event.ContractAddress, &event.ContractName,
			&event.Method, &event.TransactionHash, &event.BlockNumber, &event.Timestamp,
			&event.FromAddress, &event.ToAddress, &event.Topics, &event.Data, &event.DecodedData,
		)
		if err != nil {
			return nil, 0, err
		}
		events = append(events, &event)
	}

	return events, total, nil
}

// GetPopularEvents retorna eventos mais populares
func (r *PostgresEventRepository) GetPopularEvents(ctx context.Context, limit int) ([]*entities.PopularEvent, error) {
	query := `
		SELECT 
			event_name,
			COUNT(*) as count,
			ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
		FROM events 
		WHERE event_name IS NOT NULL AND event_name != ''
		GROUP BY event_name 
		ORDER BY count DESC 
		LIMIT $1
	`

	rows, err := r.db.QueryContext(ctx, query, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []*entities.PopularEvent
	for rows.Next() {
		var event entities.PopularEvent
		err := rows.Scan(&event.EventName, &event.Count, &event.Percentage)
		if err != nil {
			return nil, err
		}
		events = append(events, &event)
	}

	return events, nil
}

// GetRecentActivity retorna atividade recente por dias
func (r *PostgresEventRepository) GetRecentActivity(ctx context.Context, days int) ([]*entities.EventActivity, error) {
	query := `
		SELECT 
			DATE(timestamp) as date,
			COUNT(*) as count
		FROM events 
		WHERE timestamp >= NOW() - INTERVAL '%d days'
		GROUP BY DATE(timestamp)
		ORDER BY date DESC
		LIMIT $1
	`

	rows, err := r.db.QueryContext(ctx, fmt.Sprintf(query, days), days)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var activities []*entities.EventActivity
	for rows.Next() {
		var activity entities.EventActivity
		err := rows.Scan(&activity.Date, &activity.Count)
		if err != nil {
			return nil, err
		}
		activities = append(activities, &activity)
	}

	return activities, nil
}

// Update atualiza um evento
func (r *PostgresEventRepository) Update(ctx context.Context, event *entities.Event) error {
	query := `
		UPDATE events SET
			contract_name = $2, decoded_data = $3, updated_at = $4
		WHERE id = $1
	`

	event.UpdatedAt = time.Now()
	_, err := r.db.ExecContext(ctx, query, event.ID, event.ContractName, event.DecodedData, event.UpdatedAt)
	return err
}

// Delete remove um evento
func (r *PostgresEventRepository) Delete(ctx context.Context, id string) error {
	query := `DELETE FROM events WHERE id = $1`
	_, err := r.db.ExecContext(ctx, query, id)
	return err
}

// GetUniqueContracts retorna lista de contratos únicos
func (r *PostgresEventRepository) GetUniqueContracts(ctx context.Context) ([]string, error) {
	query := `SELECT DISTINCT contract_address FROM events ORDER BY contract_address`

	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var contracts []string
	for rows.Next() {
		var contract string
		if err := rows.Scan(&contract); err != nil {
			return nil, err
		}
		contracts = append(contracts, contract)
	}

	return contracts, nil
}

// GetEventNames retorna lista de nomes de eventos únicos
func (r *PostgresEventRepository) GetEventNames(ctx context.Context) ([]string, error) {
	query := `SELECT DISTINCT event_name FROM events WHERE event_name IS NOT NULL ORDER BY event_name`

	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var eventNames []string
	for rows.Next() {
		var eventName string
		if err := rows.Scan(&eventName); err != nil {
			return nil, err
		}
		eventNames = append(eventNames, eventName)
	}

	return eventNames, nil
}

// BulkCreate salva múltiplos eventos em lote
func (r *PostgresEventRepository) BulkCreate(ctx context.Context, events []*entities.Event) error {
	if len(events) == 0 {
		return nil
	}

	// Preparar statement
	valueStrings := make([]string, 0, len(events))
	valueArgs := make([]interface{}, 0, len(events)*22)

	for i, event := range events {
		now := time.Now()
		event.CreatedAt = now
		event.UpdatedAt = now

		valueStrings = append(valueStrings, fmt.Sprintf("($%d, $%d, $%d, $%d, $%d, $%d, $%d, $%d, $%d, $%d, $%d, $%d, $%d, $%d, $%d, $%d, $%d, $%d, $%d, $%d, $%d, $%d)",
			i*22+1, i*22+2, i*22+3, i*22+4, i*22+5, i*22+6, i*22+7, i*22+8, i*22+9, i*22+10,
			i*22+11, i*22+12, i*22+13, i*22+14, i*22+15, i*22+16, i*22+17, i*22+18, i*22+19, i*22+20, i*22+21, i*22+22))

		valueArgs = append(valueArgs,
			event.ID, event.ContractAddress, event.ContractName, event.EventName, event.EventSignature,
			event.TransactionHash, event.BlockNumber, event.BlockHash, event.LogIndex, event.TransactionIndex,
			event.FromAddress, event.ToAddress, event.Topics, event.Data, event.DecodedData,
			event.GasUsed, event.GasPrice, event.Status, event.Removed, event.Timestamp,
			event.CreatedAt, event.UpdatedAt)
	}

	query := fmt.Sprintf(`
		INSERT INTO events (
			id, contract_address, contract_name, event_name, event_signature,
			transaction_hash, block_number, block_hash, log_index, transaction_index,
			from_address, to_address, topics, data, decoded_data, gas_used, gas_price,
			status, removed, timestamp, created_at, updated_at
		) VALUES %s
		ON CONFLICT (id) DO UPDATE SET
			contract_name = EXCLUDED.contract_name,
			decoded_data = EXCLUDED.decoded_data,
			updated_at = EXCLUDED.updated_at
	`, strings.Join(valueStrings, ","))

	_, err := r.db.ExecContext(ctx, query, valueArgs...)
	return err
}

// Exists verifica se um evento existe
func (r *PostgresEventRepository) Exists(ctx context.Context, id string) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM events WHERE id = $1)`

	var exists bool
	err := r.db.QueryRowContext(ctx, query, id).Scan(&exists)
	return exists, err
}

// GetLatest retorna os eventos mais recentes
func (r *PostgresEventRepository) GetLatest(ctx context.Context, limit int) ([]*entities.EventSummary, error) {
	query := `
		SELECT 
			id, event_name, contract_address, contract_name, event_name as method,
			transaction_hash, block_number, timestamp, from_address, to_address,
			topics, data, decoded_data
		FROM events 
		ORDER BY timestamp DESC 
		LIMIT $1
	`

	rows, err := r.db.QueryContext(ctx, query, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []*entities.EventSummary
	for rows.Next() {
		var event entities.EventSummary
		err := rows.Scan(
			&event.ID, &event.EventName, &event.ContractAddress, &event.ContractName,
			&event.Method, &event.TransactionHash, &event.BlockNumber, &event.Timestamp,
			&event.FromAddress, &event.ToAddress, &event.Topics, &event.Data, &event.DecodedData,
		)
		if err != nil {
			return nil, err
		}
		events = append(events, &event)
	}

	return events, nil
}

// CountByContract conta eventos por contrato
func (r *PostgresEventRepository) CountByContract(ctx context.Context, contractAddress string) (int64, error) {
	query := `SELECT COUNT(*) FROM events WHERE contract_address = $1`

	var count int64
	err := r.db.QueryRowContext(ctx, query, contractAddress).Scan(&count)
	return count, err
}

// CountByEventName conta eventos por nome
func (r *PostgresEventRepository) CountByEventName(ctx context.Context, eventName string) (int64, error) {
	query := `SELECT COUNT(*) FROM events WHERE event_name = $1`

	var count int64
	err := r.db.QueryRowContext(ctx, query, eventName).Scan(&count)
	return count, err
}

// buildWhereClause constrói cláusula WHERE baseada nos filtros
func (r *PostgresEventRepository) buildWhereClause(filters entities.EventFilters) (string, []interface{}) {
	var conditions []string
	var args []interface{}
	argCount := 0

	if filters.Search != nil && *filters.Search != "" {
		argCount++
		searchTerm := "%" + strings.ToLower(*filters.Search) + "%"
		conditions = append(conditions, fmt.Sprintf(`(
			LOWER(event_name) LIKE $%d 
			OR LOWER(contract_name) LIKE $%d 
			OR LOWER(contract_address) LIKE $%d
			OR LOWER(transaction_hash) LIKE $%d
		)`, argCount, argCount, argCount, argCount))
		args = append(args, searchTerm)
	}

	if filters.ContractAddress != nil && *filters.ContractAddress != "" {
		argCount++
		conditions = append(conditions, fmt.Sprintf("LOWER(contract_address) = LOWER($%d)", argCount))
		args = append(args, *filters.ContractAddress)
	}

	if filters.EventName != nil && *filters.EventName != "" {
		argCount++
		conditions = append(conditions, fmt.Sprintf("event_name = $%d", argCount))
		args = append(args, *filters.EventName)
	}

	if filters.FromAddress != nil && *filters.FromAddress != "" {
		argCount++
		conditions = append(conditions, fmt.Sprintf("LOWER(from_address) = LOWER($%d)", argCount))
		args = append(args, *filters.FromAddress)
	}

	if filters.ToAddress != nil && *filters.ToAddress != "" {
		argCount++
		conditions = append(conditions, fmt.Sprintf("LOWER(to_address) = LOWER($%d)", argCount))
		args = append(args, *filters.ToAddress)
	}

	if filters.TransactionHash != nil && *filters.TransactionHash != "" {
		argCount++
		conditions = append(conditions, fmt.Sprintf("LOWER(transaction_hash) = LOWER($%d)", argCount))
		args = append(args, *filters.TransactionHash)
	}

	if filters.Status != nil && *filters.Status != "" {
		argCount++
		conditions = append(conditions, fmt.Sprintf("status = $%d", argCount))
		args = append(args, *filters.Status)
	}

	if filters.FromBlock != nil {
		argCount++
		conditions = append(conditions, fmt.Sprintf("block_number >= $%d", argCount))
		args = append(args, *filters.FromBlock)
	}

	if filters.ToBlock != nil {
		argCount++
		conditions = append(conditions, fmt.Sprintf("block_number <= $%d", argCount))
		args = append(args, *filters.ToBlock)
	}

	if filters.FromDate != nil && *filters.FromDate != "" {
		argCount++
		conditions = append(conditions, fmt.Sprintf("DATE(timestamp) >= $%d", argCount))
		args = append(args, *filters.FromDate)
	}

	if filters.ToDate != nil && *filters.ToDate != "" {
		argCount++
		conditions = append(conditions, fmt.Sprintf("DATE(timestamp) <= $%d", argCount))
		args = append(args, *filters.ToDate)
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + strings.Join(conditions, " AND ")
	}

	return whereClause, args
}

// isNumeric verifica se uma string é numérica
func isNumeric(s string) bool {
	for _, char := range s {
		if char < '0' || char > '9' {
			return false
		}
	}
	return len(s) > 0
}
