package services

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strings"

	"explorer-api/internal/domain/entities"

	_ "github.com/lib/pq"
)

// eventServiceImpl implementa EventService
type eventServiceImpl struct {
	db *sql.DB
}

// NewEventService cria uma nova instância do serviço de eventos
func NewEventService() EventService {
	// Obter a URL do banco de dados das variáveis de ambiente
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		log.Println("ERRO: DATABASE_URL não definida nas variáveis de ambiente. Usando mockEventService.")
		return &mockEventService{}
	}

	// Conectar ao banco de dados
	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		log.Printf("Erro ao conectar ao banco de dados: %v", err)
		// Retornar implementação mock em caso de erro
		return &mockEventService{}
	}

	if err := db.Ping(); err != nil {
		log.Printf("Erro ao fazer ping no banco de dados: %v", err)
		// Retornar implementação mock em caso de erro
		return &mockEventService{}
	}

	log.Println("✅ EventService conectado ao banco de dados")
	return &eventServiceImpl{db: db}
}

// GetEvents busca eventos com filtros e paginação
func (s *eventServiceImpl) GetEvents(ctx context.Context, filters entities.EventFilters) ([]*entities.EventSummary, int64, error) {
	// Construir query base
	baseQuery := `
		SELECT e.id, e.contract_address, e.event_name, e.transaction_hash, 
		       e.block_number, e.timestamp, e.from_address, e.to_address,
		       e.data, e.decoded_data, sc.name as contract_name
		FROM events e
		LEFT JOIN smart_contracts sc ON e.contract_address = sc.address
	`

	countQuery := `
		SELECT COUNT(*)
		FROM events e
		LEFT JOIN smart_contracts sc ON e.contract_address = sc.address
	`

	// Construir condições WHERE
	var conditions []string
	var args []interface{}
	argIndex := 1

	// Aplicar filtros
	if filters.ContractAddress != nil && *filters.ContractAddress != "" {
		conditions = append(conditions, fmt.Sprintf("e.contract_address = $%d", argIndex))
		args = append(args, *filters.ContractAddress)
		argIndex++
	}

	if filters.EventName != nil && *filters.EventName != "" {
		conditions = append(conditions, fmt.Sprintf("e.event_name ILIKE $%d", argIndex))
		args = append(args, "%"+*filters.EventName+"%")
		argIndex++
	}

	if filters.FromAddress != nil && *filters.FromAddress != "" {
		conditions = append(conditions, fmt.Sprintf("e.from_address = $%d", argIndex))
		args = append(args, *filters.FromAddress)
		argIndex++
	}

	if filters.ToAddress != nil && *filters.ToAddress != "" {
		conditions = append(conditions, fmt.Sprintf("e.to_address = $%d", argIndex))
		args = append(args, *filters.ToAddress)
		argIndex++
	}

	if filters.FromBlock != nil && *filters.FromBlock > 0 {
		conditions = append(conditions, fmt.Sprintf("e.block_number >= $%d", argIndex))
		args = append(args, *filters.FromBlock)
		argIndex++
	}

	if filters.ToBlock != nil && *filters.ToBlock > 0 {
		conditions = append(conditions, fmt.Sprintf("e.block_number <= $%d", argIndex))
		args = append(args, *filters.ToBlock)
		argIndex++
	}

	// Adicionar WHERE se há condições
	whereClause := ""
	if len(conditions) > 0 {
		whereClause = " WHERE " + strings.Join(conditions, " AND ")
	}

	// Contar total de registros
	var totalCount int64
	err := s.db.QueryRowContext(ctx, countQuery+whereClause, args...).Scan(&totalCount)
	if err != nil {
		return nil, 0, fmt.Errorf("erro ao contar eventos: %w", err)
	}

	// Construir query final com ordenação e paginação
	orderBy := " ORDER BY e.block_number DESC, e.log_index DESC"
	limitOffset := fmt.Sprintf(" LIMIT $%d OFFSET $%d", argIndex, argIndex+1)

	finalQuery := baseQuery + whereClause + orderBy + limitOffset
	offset := (filters.Page - 1) * filters.Limit
	args = append(args, filters.Limit, offset)

	// Executar query
	rows, err := s.db.QueryContext(ctx, finalQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("erro ao buscar eventos: %w", err)
	}
	defer rows.Close()

	var events []*entities.EventSummary
	for rows.Next() {
		var event entities.EventSummary
		var contractName sql.NullString
		var fromAddress, toAddress sql.NullString
		var decodedData sql.NullString

		err := rows.Scan(
			&event.ID,
			&event.ContractAddress,
			&event.EventName,
			&event.TransactionHash,
			&event.BlockNumber,
			&event.Timestamp,
			&fromAddress,
			&toAddress,
			&event.Data,
			&decodedData,
			&contractName,
		)
		if err != nil {
			log.Printf("Erro ao escanear evento: %v", err)
			continue
		}

		// Definir valores opcionais
		if contractName.Valid {
			event.ContractName = &contractName.String
		}
		if fromAddress.Valid {
			event.FromAddress = fromAddress.String
		}
		if toAddress.Valid {
			event.ToAddress = &toAddress.String
		}

		// Deserializar decoded_data
		if decodedData.Valid {
			var decoded map[string]interface{}
			if err := json.Unmarshal([]byte(decodedData.String), &decoded); err == nil {
				event.DecodedData = decoded
			}
		}

		events = append(events, &event)
	}

	return events, totalCount, nil
}

// GetEventByID busca um evento pelo ID
func (s *eventServiceImpl) GetEventByID(ctx context.Context, id string) (*entities.Event, error) {
	query := `
		SELECT e.id, e.contract_address, e.event_name, e.event_signature,
		       e.transaction_hash, e.block_number, e.block_hash, e.log_index,
		       e.transaction_index, e.from_address, e.to_address, e.topics,
		       e.data, e.decoded_data, e.gas_used, e.gas_price, e.status,
		       e.removed, e.timestamp, e.created_at, e.updated_at,
		       sc.name as contract_name
		FROM events e
		LEFT JOIN smart_contracts sc ON e.contract_address = sc.address
		WHERE e.id = $1
	`

	var event entities.Event
	var contractName sql.NullString
	var fromAddress, toAddress sql.NullString
	var topics, decodedData sql.NullString

	err := s.db.QueryRowContext(ctx, query, id).Scan(
		&event.ID,
		&event.ContractAddress,
		&event.EventName,
		&event.EventSignature,
		&event.TransactionHash,
		&event.BlockNumber,
		&event.BlockHash,
		&event.LogIndex,
		&event.TransactionIndex,
		&fromAddress,
		&toAddress,
		&topics,
		&event.Data,
		&decodedData,
		&event.GasUsed,
		&event.GasPrice,
		&event.Status,
		&event.Removed,
		&event.Timestamp,
		&event.CreatedAt,
		&event.UpdatedAt,
		&contractName,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("erro ao buscar evento: %w", err)
	}

	// Processar campos opcionais
	if contractName.Valid {
		event.ContractName = &contractName.String
	}
	if fromAddress.Valid {
		event.FromAddress = fromAddress.String
	}
	if toAddress.Valid {
		event.ToAddress = &toAddress.String
	}

	// Deserializar topics
	if topics.Valid {
		var topicsArray []string
		if err := json.Unmarshal([]byte(topics.String), &topicsArray); err == nil {
			event.Topics = topicsArray
		}
	}

	// Deserializar decoded_data
	if decodedData.Valid {
		var decoded map[string]interface{}
		if err := json.Unmarshal([]byte(decodedData.String), &decoded); err == nil {
			event.DecodedData = decoded
		}
	}

	return &event, nil
}

// GetEventStats retorna estatísticas de eventos
func (s *eventServiceImpl) GetEventStats(ctx context.Context) (*entities.EventStats, error) {
	stats := &entities.EventStats{}

	// Total de eventos
	err := s.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM events").Scan(&stats.TotalEvents)
	if err != nil {
		return nil, fmt.Errorf("erro ao contar eventos: %w", err)
	}

	// Contratos únicos
	err = s.db.QueryRowContext(ctx, "SELECT COUNT(DISTINCT contract_address) FROM events").Scan(&stats.UniqueContracts)
	if err != nil {
		return nil, fmt.Errorf("erro ao contar contratos únicos: %w", err)
	}

	// Eventos populares
	rows, err := s.db.QueryContext(ctx, `
		SELECT event_name, COUNT(*) as count
		FROM events
		GROUP BY event_name
		ORDER BY count DESC
		LIMIT 5
	`)
	if err != nil {
		return nil, fmt.Errorf("erro ao buscar eventos populares: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var popular entities.PopularEvent
		err := rows.Scan(&popular.EventName, &popular.Count)
		if err != nil {
			continue
		}
		stats.PopularEvents = append(stats.PopularEvents, popular)
	}

	// Atividade recente (últimos eventos por data)
	rows, err = s.db.QueryContext(ctx, `
		SELECT DATE(timestamp) as date, COUNT(*) as count
		FROM events
		WHERE timestamp >= NOW() - INTERVAL '7 days'
		GROUP BY DATE(timestamp)
		ORDER BY date DESC
		LIMIT 10
	`)
	if err != nil {
		return nil, fmt.Errorf("erro ao buscar atividade recente: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var activity entities.EventActivity
		err := rows.Scan(&activity.Date, &activity.Count)
		if err != nil {
			continue
		}
		stats.RecentActivity = append(stats.RecentActivity, activity)
	}

	return stats, nil
}

// SearchEvents busca eventos por termo
func (s *eventServiceImpl) SearchEvents(ctx context.Context, query string, limit, offset int) ([]*entities.EventSummary, int64, error) {
	filters := entities.EventFilters{
		EventName: &query,
		Limit:     limit,
		Page:      (offset / limit) + 1,
	}
	return s.GetEvents(ctx, filters)
}

// GetEventsByContract busca eventos por endereço do contrato
func (s *eventServiceImpl) GetEventsByContract(ctx context.Context, contractAddress string, limit, offset int) ([]*entities.Event, error) {
	// Implementação simplificada - retornar vazio por enquanto
	return []*entities.Event{}, nil
}

// GetEventsByTransaction busca eventos por hash da transação
func (s *eventServiceImpl) GetEventsByTransaction(ctx context.Context, txHash string) ([]*entities.Event, error) {
	// Implementação simplificada - retornar vazio por enquanto
	return []*entities.Event{}, nil
}

// GetEventsByBlock busca eventos por número do bloco
func (s *eventServiceImpl) GetEventsByBlock(ctx context.Context, blockNumber uint64) ([]*entities.Event, error) {
	// Implementação simplificada - retornar vazio por enquanto
	return []*entities.Event{}, nil
}

// GetUniqueContracts retorna lista de contratos únicos
func (s *eventServiceImpl) GetUniqueContracts(ctx context.Context) ([]string, error) {
	rows, err := s.db.QueryContext(ctx, "SELECT DISTINCT contract_address FROM events ORDER BY contract_address")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var contracts []string
	for rows.Next() {
		var contract string
		if err := rows.Scan(&contract); err == nil {
			contracts = append(contracts, contract)
		}
	}
	return contracts, nil
}

// GetEventNames retorna lista de nomes de eventos únicos
func (s *eventServiceImpl) GetEventNames(ctx context.Context) ([]string, error) {
	rows, err := s.db.QueryContext(ctx, "SELECT DISTINCT event_name FROM events ORDER BY event_name")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var names []string
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err == nil {
			names = append(names, name)
		}
	}
	return names, nil
}

// CountEventsByContract conta eventos por contrato
func (s *eventServiceImpl) CountEventsByContract(ctx context.Context, contractAddress string) (int64, error) {
	var count int64
	err := s.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM events WHERE contract_address = $1", contractAddress).Scan(&count)
	return count, err
}

// mockEventService para fallback em caso de erro de conexão
type mockEventService struct{}

func (s *mockEventService) GetEvents(ctx context.Context, filters entities.EventFilters) ([]*entities.EventSummary, int64, error) {
	return []*entities.EventSummary{}, 0, nil
}

func (s *mockEventService) GetEventByID(ctx context.Context, id string) (*entities.Event, error) {
	return nil, nil
}

func (s *mockEventService) GetEventStats(ctx context.Context) (*entities.EventStats, error) {
	return &entities.EventStats{}, nil
}

func (s *mockEventService) SearchEvents(ctx context.Context, query string, limit, offset int) ([]*entities.EventSummary, int64, error) {
	return []*entities.EventSummary{}, 0, nil
}

func (s *mockEventService) GetEventsByContract(ctx context.Context, contractAddress string, limit, offset int) ([]*entities.Event, error) {
	return []*entities.Event{}, nil
}

func (s *mockEventService) GetEventsByTransaction(ctx context.Context, txHash string) ([]*entities.Event, error) {
	return []*entities.Event{}, nil
}

func (s *mockEventService) GetEventsByBlock(ctx context.Context, blockNumber uint64) ([]*entities.Event, error) {
	return []*entities.Event{}, nil
}

func (s *mockEventService) GetUniqueContracts(ctx context.Context) ([]string, error) {
	return []string{}, nil
}

func (s *mockEventService) GetEventNames(ctx context.Context) ([]string, error) {
	return []string{}, nil
}

func (s *mockEventService) CountEventsByContract(ctx context.Context, contractAddress string) (int64, error) {
	return 0, nil
}
