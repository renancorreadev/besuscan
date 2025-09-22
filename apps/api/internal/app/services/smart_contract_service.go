package services

import (
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

	"explorer-api/internal/domain/entities"
	"explorer-api/internal/infrastructure/database"

	"github.com/lib/pq"
)

// SmartContractService gerencia operações relacionadas a smart contracts
type SmartContractService struct {
	db *database.PostgresDB
}

// NewSmartContractService cria uma nova instância do serviço
func NewSmartContractService(db *database.PostgresDB) *SmartContractService {
	return &SmartContractService{
		db: db,
	}
}

// SmartContractFilters representa filtros para busca de smart contracts
type SmartContractFilters struct {
	// Filtros básicos
	ContractType *string `json:"contract_type,omitempty"`
	IsVerified   *bool   `json:"is_verified,omitempty"`
	IsActive     *bool   `json:"is_active,omitempty"`
	IsToken      *bool   `json:"is_token,omitempty"`
	IsProxy      *bool   `json:"is_proxy,omitempty"`

	// Filtros por criador
	CreatorAddress *string `json:"creator_address,omitempty"`

	// Filtros por atividade
	MinTransactions *int64 `json:"min_transactions,omitempty"`
	MaxTransactions *int64 `json:"max_transactions,omitempty"`
	MinEvents       *int64 `json:"min_events,omitempty"`
	MaxEvents       *int64 `json:"max_events,omitempty"`

	// Filtros por data
	CreatedAfter  *time.Time `json:"created_after,omitempty"`
	CreatedBefore *time.Time `json:"created_before,omitempty"`
	ActiveAfter   *time.Time `json:"active_after,omitempty"`
	ActiveBefore  *time.Time `json:"active_before,omitempty"`

	// Filtros por bloco
	FromBlock *int64 `json:"from_block,omitempty"`
	ToBlock   *int64 `json:"to_block,omitempty"`

	// Busca por texto
	Search *string `json:"search,omitempty"`

	// Ordenação
	SortBy    string `json:"sort_by,omitempty"`    // address, created_at, total_transactions, etc.
	SortOrder string `json:"sort_order,omitempty"` // asc, desc

	// Paginação
	Limit  int `json:"limit,omitempty"`
	Offset int `json:"offset,omitempty"`
}

// GetSmartContracts retorna uma lista de smart contracts com filtros
func (s *SmartContractService) GetSmartContracts(filters SmartContractFilters) ([]*entities.SmartContract, int64, error) {
	log.Printf("[DEBUG] SmartContractService.GetSmartContracts - Iniciando com filtros: %+v", filters)

	// Construir query base
	baseQuery := `
		SELECT
			address, name, symbol, contract_type, creator_address, creation_tx_hash,
			creation_block_number, creation_timestamp, is_verified, verification_date,
			compiler_version, optimization_enabled, optimization_runs, license_type,
			source_code, abi, bytecode, constructor_args, balance, nonce, code_size,
			storage_size, total_transactions, total_internal_transactions, total_events,
			unique_addresses_count, total_gas_used, total_value_transferred,
			first_transaction_at, last_transaction_at, last_activity_at, is_active,
			is_proxy, proxy_implementation, is_token, description, website_url,
			github_url, documentation_url, tags, created_at, updated_at, last_metrics_update
		FROM smart_contracts`

	countQuery := "SELECT COUNT(*) FROM smart_contracts"

	// Construir condições WHERE
	whereConditions := []string{}
	args := []interface{}{}
	argIndex := 1

	// Aplicar filtros
	if filters.ContractType != nil {
		whereConditions = append(whereConditions, fmt.Sprintf("contract_type = $%d", argIndex))
		args = append(args, *filters.ContractType)
		argIndex++
	}

	if filters.IsVerified != nil {
		whereConditions = append(whereConditions, fmt.Sprintf("is_verified = $%d", argIndex))
		args = append(args, *filters.IsVerified)
		argIndex++
	}

	if filters.IsActive != nil {
		whereConditions = append(whereConditions, fmt.Sprintf("is_active = $%d", argIndex))
		args = append(args, *filters.IsActive)
		argIndex++
	}

	if filters.IsToken != nil {
		whereConditions = append(whereConditions, fmt.Sprintf("is_token = $%d", argIndex))
		args = append(args, *filters.IsToken)
		argIndex++
	}

	if filters.IsProxy != nil {
		whereConditions = append(whereConditions, fmt.Sprintf("is_proxy = $%d", argIndex))
		args = append(args, *filters.IsProxy)
		argIndex++
	}

	if filters.CreatorAddress != nil {
		whereConditions = append(whereConditions, fmt.Sprintf("creator_address = $%d", argIndex))
		args = append(args, *filters.CreatorAddress)
		argIndex++
	}

	if filters.MinTransactions != nil {
		whereConditions = append(whereConditions, fmt.Sprintf("total_transactions >= $%d", argIndex))
		args = append(args, *filters.MinTransactions)
		argIndex++
	}

	if filters.MaxTransactions != nil {
		whereConditions = append(whereConditions, fmt.Sprintf("total_transactions <= $%d", argIndex))
		args = append(args, *filters.MaxTransactions)
		argIndex++
	}

	if filters.MinEvents != nil {
		whereConditions = append(whereConditions, fmt.Sprintf("total_events >= $%d", argIndex))
		args = append(args, *filters.MinEvents)
		argIndex++
	}

	if filters.MaxEvents != nil {
		whereConditions = append(whereConditions, fmt.Sprintf("total_events <= $%d", argIndex))
		args = append(args, *filters.MaxEvents)
		argIndex++
	}

	if filters.CreatedAfter != nil {
		whereConditions = append(whereConditions, fmt.Sprintf("creation_timestamp >= $%d", argIndex))
		args = append(args, *filters.CreatedAfter)
		argIndex++
	}

	if filters.CreatedBefore != nil {
		whereConditions = append(whereConditions, fmt.Sprintf("creation_timestamp <= $%d", argIndex))
		args = append(args, *filters.CreatedBefore)
		argIndex++
	}

	if filters.ActiveAfter != nil {
		whereConditions = append(whereConditions, fmt.Sprintf("last_activity_at >= $%d", argIndex))
		args = append(args, *filters.ActiveAfter)
		argIndex++
	}

	if filters.ActiveBefore != nil {
		whereConditions = append(whereConditions, fmt.Sprintf("last_activity_at <= $%d", argIndex))
		args = append(args, *filters.ActiveBefore)
		argIndex++
	}

	if filters.FromBlock != nil {
		whereConditions = append(whereConditions, fmt.Sprintf("creation_block_number >= $%d", argIndex))
		args = append(args, *filters.FromBlock)
		argIndex++
	}

	if filters.ToBlock != nil {
		whereConditions = append(whereConditions, fmt.Sprintf("creation_block_number <= $%d", argIndex))
		args = append(args, *filters.ToBlock)
		argIndex++
	}

	if filters.Search != nil && *filters.Search != "" {
		searchCondition := fmt.Sprintf(`(
			address ILIKE $%d OR
			name ILIKE $%d OR
			symbol ILIKE $%d OR
			creator_address ILIKE $%d
		)`, argIndex, argIndex, argIndex, argIndex)
		whereConditions = append(whereConditions, searchCondition)
		searchTerm := "%" + *filters.Search + "%"
		args = append(args, searchTerm)
		argIndex++
	}

	// Adicionar WHERE se houver condições
	if len(whereConditions) > 0 {
		whereClause := " WHERE " + strings.Join(whereConditions, " AND ")
		baseQuery += whereClause
		countQuery += whereClause
	}

	// Obter total de registros
	log.Printf("[DEBUG] SmartContractService.GetSmartContracts - Executando countQuery: %s com args: %v", countQuery, args)
	var total int64
	err := s.db.DB.QueryRow(countQuery, args...).Scan(&total)
	if err != nil {
		log.Printf("[ERROR] SmartContractService.GetSmartContracts - Erro na countQuery: %v", err)
		return nil, 0, fmt.Errorf("erro ao contar smart contracts: %w", err)
	}
	log.Printf("[DEBUG] SmartContractService.GetSmartContracts - Total encontrado: %d", total)

	// Adicionar ordenação
	orderBy := "created_at DESC"
	if filters.SortBy != "" {
		validSortFields := map[string]bool{
			"address":            true,
			"name":               true,
			"contract_type":      true,
			"created_at":         true,
			"creation_timestamp": true,
			"total_transactions": true,
			"total_events":       true,
			"last_activity_at":   true,
			"is_verified":        true,
		}

		if validSortFields[filters.SortBy] {
			orderBy = filters.SortBy
			if filters.SortOrder == "asc" {
				orderBy += " ASC"
			} else {
				orderBy += " DESC"
			}
		}
	}
	baseQuery += " ORDER BY " + orderBy

	// Adicionar paginação
	if filters.Limit > 0 {
		baseQuery += fmt.Sprintf(" LIMIT $%d", argIndex)
		args = append(args, filters.Limit)
		argIndex++
	}

	if filters.Offset > 0 {
		baseQuery += fmt.Sprintf(" OFFSET $%d", argIndex)
		args = append(args, filters.Offset)
		argIndex++
	}

	// Executar query
	log.Printf("[DEBUG] SmartContractService.GetSmartContracts - Executando baseQuery: %s com args: %v", baseQuery, args)
	rows, err := s.db.DB.Query(baseQuery, args...)
	if err != nil {
		log.Printf("[ERROR] SmartContractService.GetSmartContracts - Erro na baseQuery: %v", err)
		return nil, 0, fmt.Errorf("erro ao buscar smart contracts: %w", err)
	}
	defer rows.Close()

	var contracts []*entities.SmartContract
	for rows.Next() {
		contract := &entities.SmartContract{}

		// Variáveis temporárias para campos que podem ser NULL
		var abiBytes []byte

		err := rows.Scan(
			&contract.Address, &contract.Name, &contract.Symbol, &contract.Type,
			&contract.CreatorAddress, &contract.CreationTxHash, &contract.CreationBlockNumber,
			&contract.CreationTimestamp, &contract.IsVerified, &contract.VerificationDate,
			&contract.CompilerVersion, &contract.OptimizationEnabled, &contract.OptimizationRuns,
			&contract.LicenseType, &contract.SourceCode, &abiBytes, &contract.Bytecode,
			&contract.ConstructorArgs, &contract.Balance, &contract.Nonce, &contract.CodeSize,
			&contract.StorageSize, &contract.TotalTransactions, &contract.TotalInternalTransactions,
			&contract.TotalEvents, &contract.UniqueAddressesCount, &contract.TotalGasUsed,
			&contract.TotalValueTransferred, &contract.FirstTransactionAt, &contract.LastTransactionAt,
			&contract.LastActivityAt, &contract.IsActive, &contract.IsProxy, &contract.ProxyImplementation,
			&contract.IsToken, &contract.Description, &contract.WebsiteURL, &contract.GithubURL,
			&contract.DocumentationURL, pq.Array(&contract.Tags), &contract.CreatedAt, &contract.UpdatedAt,
			&contract.LastMetricsUpdate,
		)
		if err != nil {
			log.Printf("[ERROR] SmartContractService.GetSmartContracts - Erro ao escanear linha: %v", err)
			return nil, 0, fmt.Errorf("erro ao escanear smart contract: %w", err)
		}

		// Converter abiBytes para *json.RawMessage se não for NULL
		if abiBytes != nil {
			rawMessage := json.RawMessage(abiBytes)
			contract.ABI = &rawMessage
		}

		contracts = append(contracts, contract)
	}

	log.Printf("[DEBUG] SmartContractService.GetSmartContracts - Retornando %d contratos", len(contracts))
	return contracts, total, nil
}

// GetSmartContractByAddress retorna um smart contract específico pelo endereço
func (s *SmartContractService) GetSmartContractByAddress(address string) (*entities.SmartContract, error) {
	query := `
		SELECT
			address, name, symbol, contract_type, creator_address, creation_tx_hash,
			creation_block_number, creation_timestamp, is_verified, verification_date,
			compiler_version, optimization_enabled, optimization_runs, license_type,
			source_code, abi, bytecode, constructor_args, balance, nonce, code_size,
			storage_size, total_transactions, total_internal_transactions, total_events,
			unique_addresses_count, total_gas_used, total_value_transferred,
			first_transaction_at, last_transaction_at, last_activity_at, is_active,
			is_proxy, proxy_implementation, is_token, description, website_url,
			github_url, documentation_url, tags, created_at, updated_at, last_metrics_update
		FROM smart_contracts
		WHERE address = $1`

	contract := &entities.SmartContract{}
	err := s.db.DB.QueryRow(query, address).Scan(
		&contract.Address, &contract.Name, &contract.Symbol, &contract.Type,
		&contract.CreatorAddress, &contract.CreationTxHash, &contract.CreationBlockNumber,
		&contract.CreationTimestamp, &contract.IsVerified, &contract.VerificationDate,
		&contract.CompilerVersion, &contract.OptimizationEnabled, &contract.OptimizationRuns,
		&contract.LicenseType, &contract.SourceCode, &contract.ABI, &contract.Bytecode,
		&contract.ConstructorArgs, &contract.Balance, &contract.Nonce, &contract.CodeSize,
		&contract.StorageSize, &contract.TotalTransactions, &contract.TotalInternalTransactions,
		&contract.TotalEvents, &contract.UniqueAddressesCount, &contract.TotalGasUsed,
		&contract.TotalValueTransferred, &contract.FirstTransactionAt, &contract.LastTransactionAt,
		&contract.LastActivityAt, &contract.IsActive, &contract.IsProxy, &contract.ProxyImplementation,
		&contract.IsToken, &contract.Description, &contract.WebsiteURL, &contract.GithubURL,
		&contract.DocumentationURL, pq.Array(&contract.Tags), &contract.CreatedAt, &contract.UpdatedAt,
		&contract.LastMetricsUpdate,
	)

	if err != nil {
		return nil, fmt.Errorf("erro ao buscar smart contract: %w", err)
	}

	return contract, nil
}

// GetSmartContractStats retorna estatísticas gerais dos smart contracts
func (s *SmartContractService) GetSmartContractStats() (*entities.SmartContractStats, error) {
	// Buscar estatísticas básicas
	query := `
		SELECT
			COUNT(*) as total_contracts,
			COUNT(*) FILTER (WHERE is_verified = true) as verified_contracts,
			COUNT(*) FILTER (WHERE is_active = true) as active_contracts,
			COUNT(*) FILTER (WHERE is_token = true) as token_contracts,
			COALESCE(SUM(total_transactions), 0) as total_transactions,
			COALESCE(SUM(total_gas_used::numeric), 0)::text as total_gas_used,
			COALESCE(SUM(total_value_transferred::numeric), 0)::text as total_value_transferred
		FROM smart_contracts`

	stats := &entities.SmartContractStats{}
	err := s.db.DB.QueryRow(query).Scan(
		&stats.TotalContracts,
		&stats.VerifiedContracts,
		&stats.ActiveContracts,
		&stats.TokenContracts,
		&stats.TotalTransactions,
		&stats.TotalGasUsed,
		&stats.TotalValueTransferred,
	)

	if err != nil {
		return nil, fmt.Errorf("erro ao buscar estatísticas: %w", err)
	}

	// Buscar deployments diários (últimos 30 dias)
	dailyQuery := `
		SELECT
			DATE(creation_timestamp) as date,
			COUNT(*) as count
		FROM smart_contracts
		WHERE creation_timestamp >= CURRENT_DATE - INTERVAL '30 days'
		GROUP BY DATE(creation_timestamp)
		ORDER BY date DESC`

	rows, err := s.db.DB.Query(dailyQuery)
	if err != nil {
		return nil, fmt.Errorf("erro ao buscar deployments diários: %w", err)
	}
	defer rows.Close()

	var dailyDeployments []entities.DailyDeployment
	for rows.Next() {
		var deployment entities.DailyDeployment
		err := rows.Scan(&deployment.Date, &deployment.Count)
		if err != nil {
			return nil, fmt.Errorf("erro ao escanear deployment diário: %w", err)
		}
		dailyDeployments = append(dailyDeployments, deployment)
	}

	// Buscar tipos de contratos
	typesQuery := `
		SELECT
			COALESCE(contract_type, 'Unknown') as type,
			COUNT(*) as count,
			ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM smart_contracts)), 2) as percentage
		FROM smart_contracts
		GROUP BY contract_type
		ORDER BY count DESC
		LIMIT 10`

	typeRows, err := s.db.DB.Query(typesQuery)
	if err != nil {
		return nil, fmt.Errorf("erro ao buscar tipos de contratos: %w", err)
	}
	defer typeRows.Close()

	var contractTypes []entities.ContractType
	for typeRows.Next() {
		var contractType entities.ContractType
		err := typeRows.Scan(&contractType.Type, &contractType.Count, &contractType.Percentage)
		if err != nil {
			return nil, fmt.Errorf("erro ao escanear tipo de contrato: %w", err)
		}
		contractTypes = append(contractTypes, contractType)
	}

	stats.DailyDeployments = dailyDeployments
	stats.ContractTypes = contractTypes

	return stats, nil
}

// GetSmartContractFunctions retorna as funções de um smart contract
func (s *SmartContractService) GetSmartContractFunctions(address string) ([]*entities.SmartContractFunction, error) {
	query := `
		SELECT
			id, contract_address, function_name, function_signature, function_type,
			state_mutability, inputs, outputs, call_count, last_called_at,
			created_at, updated_at
		FROM smart_contract_functions
		WHERE contract_address = $1
		ORDER BY function_name`

	rows, err := s.db.DB.Query(query, address)
	if err != nil {
		return nil, fmt.Errorf("erro ao buscar funções: %w", err)
	}
	defer rows.Close()

	var functions []*entities.SmartContractFunction
	for rows.Next() {
		function := &entities.SmartContractFunction{}
		err := rows.Scan(
			&function.ID, &function.ContractAddress, &function.FunctionName,
			&function.FunctionSignature, &function.FunctionType, &function.StateMutability,
			&function.Inputs, &function.Outputs, &function.CallCount, &function.LastCalledAt,
			&function.CreatedAt, &function.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("erro ao escanear função: %w", err)
		}
		functions = append(functions, function)
	}

	return functions, nil
}

// GetSmartContractEvents retorna os eventos de um smart contract
func (s *SmartContractService) GetSmartContractEvents(address string) ([]*entities.SmartContractEvent, error) {
	query := `
		SELECT
			id, contract_address, event_name, event_signature, inputs, anonymous,
			emission_count, last_emitted_at, created_at, updated_at
		FROM smart_contract_events
		WHERE contract_address = $1
		ORDER BY event_name`

	rows, err := s.db.DB.Query(query, address)
	if err != nil {
		return nil, fmt.Errorf("erro ao buscar eventos: %w", err)
	}
	defer rows.Close()

	var events []*entities.SmartContractEvent
	for rows.Next() {
		event := &entities.SmartContractEvent{}
		err := rows.Scan(
			&event.ID, &event.ContractAddress, &event.EventName, &event.EventSignature,
			&event.Inputs, &event.Anonymous, &event.EmissionCount, &event.LastEmittedAt,
			&event.CreatedAt, &event.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("erro ao escanear evento: %w", err)
		}
		events = append(events, event)
	}

	return events, nil
}

// GetSmartContractDailyMetrics retorna métricas diárias de um smart contract
func (s *SmartContractService) GetSmartContractDailyMetrics(address string, days int) ([]*entities.SmartContractDailyMetrics, error) {
	if days <= 0 {
		days = 30 // padrão de 30 dias
	}

	query := `
		SELECT
			id, contract_address, date, transactions_count, unique_addresses_count,
			gas_used, value_transferred, events_count, avg_gas_per_tx, success_rate,
			created_at
		FROM smart_contract_daily_metrics
		WHERE contract_address = $1
		AND date >= CURRENT_DATE - INTERVAL '%d days'
		ORDER BY date DESC`

	formattedQuery := fmt.Sprintf(query, days)
	rows, err := s.db.DB.Query(formattedQuery, address)
	if err != nil {
		return nil, fmt.Errorf("erro ao buscar métricas diárias: %w", err)
	}
	defer rows.Close()

	var metrics []*entities.SmartContractDailyMetrics
	for rows.Next() {
		metric := &entities.SmartContractDailyMetrics{}
		err := rows.Scan(
			&metric.ID, &metric.ContractAddress, &metric.Date, &metric.TransactionsCount,
			&metric.UniqueAddressesCount, &metric.GasUsed, &metric.ValueTransferred,
			&metric.EventsCount, &metric.AvgGasPerTx, &metric.SuccessRate, &metric.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("erro ao escanear métrica: %w", err)
		}
		metrics = append(metrics, metric)
	}

	return metrics, nil
}

// GetPopularSmartContracts retorna os smart contracts mais populares
func (s *SmartContractService) GetPopularSmartContracts(limit int) ([]*entities.SmartContract, error) {
	if limit <= 0 {
		limit = 10
	}

	filters := SmartContractFilters{
		SortBy:    "total_transactions",
		SortOrder: "desc",
		Limit:     limit,
		IsActive:  &[]bool{true}[0], // pointer to true
	}

	contracts, _, err := s.GetSmartContracts(filters)
	return contracts, err
}

// SearchSmartContracts busca smart contracts por texto
func (s *SmartContractService) SearchSmartContracts(searchTerm string, limit, offset int) ([]*entities.SmartContract, int64, error) {
	filters := SmartContractFilters{
		Search: &searchTerm,
		Limit:  limit,
		Offset: offset,
	}

	return s.GetSmartContracts(filters)
}

// SaveOrUpdateSmartContract salva ou atualiza um smart contract
func (s *SmartContractService) SaveOrUpdateSmartContract(contract *entities.SmartContract) error {
	// Verificar se o contrato já existe
	existing, err := s.GetSmartContractByAddress(contract.Address)
	if err != nil {
		// Contrato não existe, criar novo
		return s.createSmartContract(contract)
	}

	// Contrato existe, atualizar
	return s.updateSmartContract(existing, contract)
}

// createSmartContract cria um novo smart contract
func (s *SmartContractService) createSmartContract(contract *entities.SmartContract) error {
	query := `
		INSERT INTO smart_contracts (
			address, name, symbol, contract_type, creator_address, creation_tx_hash,
			creation_block_number, creation_timestamp, is_verified, verification_date,
			compiler_version, optimization_enabled, optimization_runs, license_type,
			source_code, abi, bytecode, constructor_args, balance, nonce, code_size,
			storage_size, total_transactions, total_internal_transactions, total_events,
			unique_addresses_count, total_gas_used, total_value_transferred,
			first_transaction_at, last_transaction_at, last_activity_at, is_active,
			is_proxy, proxy_implementation, is_token, description, website_url,
			github_url, documentation_url, tags, created_at, updated_at, last_metrics_update
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
			$19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34,
			$35, $36, $37, $38, $39, $40, $41, $42, $43
		)`

	_, err := s.db.DB.Exec(query,
		contract.Address, contract.Name, contract.Symbol, contract.Type,
		contract.CreatorAddress, contract.CreationTxHash, contract.CreationBlockNumber,
		contract.CreationTimestamp, contract.IsVerified, contract.VerificationDate,
		contract.CompilerVersion, contract.OptimizationEnabled, contract.OptimizationRuns,
		contract.LicenseType, contract.SourceCode, contract.ABI, contract.Bytecode,
		nil, // constructor_args (TODO: implement proper serialization)
		contract.Balance, contract.Nonce, contract.CodeSize, contract.StorageSize,
		contract.TotalTransactions, contract.TotalInternalTransactions, contract.TotalEvents,
		contract.UniqueAddressesCount, contract.TotalGasUsed, contract.TotalValueTransferred,
		contract.FirstTransactionAt, contract.LastTransactionAt, contract.LastActivityAt,
		contract.IsActive, contract.IsProxy, contract.ProxyImplementation, contract.IsToken,
		contract.Description, contract.WebsiteURL, contract.GithubURL, contract.DocumentationURL,
		pq.Array(contract.Tags), contract.CreatedAt, contract.UpdatedAt, contract.LastMetricsUpdate,
	)

	return err
}

// updateSmartContract atualiza um smart contract existente
func (s *SmartContractService) updateSmartContract(existing, updated *entities.SmartContract) error {
	// Usar valores existentes como fallback quando os novos valores são vazios ou nil
	name := updated.Name
	if name == nil || *name == "" {
		name = existing.Name
	}

	symbol := updated.Symbol
	if symbol == nil || *symbol == "" {
		symbol = existing.Symbol
	}

	contractType := updated.Type
	if contractType == nil || *contractType == "" {
		contractType = existing.Type
	}

	compilerVersion := updated.CompilerVersion
	if compilerVersion == nil || *compilerVersion == "" {
		compilerVersion = existing.CompilerVersion
	}

	licenseType := updated.LicenseType
	if licenseType == nil || *licenseType == "" {
		licenseType = existing.LicenseType
	}

	description := updated.Description
	if description == nil || *description == "" {
		description = existing.Description
	}

	websiteURL := updated.WebsiteURL
	if websiteURL == nil || *websiteURL == "" {
		websiteURL = existing.WebsiteURL
	}

	githubURL := updated.GithubURL
	if githubURL == nil || *githubURL == "" {
		githubURL = existing.GithubURL
	}

	documentationURL := updated.DocumentationURL
	if documentationURL == nil || *documentationURL == "" {
		documentationURL = existing.DocumentationURL
	}

	query := `
		UPDATE smart_contracts SET
			name = $2,
			symbol = $3,
			contract_type = $4,
			is_verified = $5,
			verification_date = $6,
			compiler_version = $7,
			optimization_enabled = $8,
			optimization_runs = $9,
			license_type = $10,
			source_code = COALESCE($11, source_code),
			abi = COALESCE($12, abi),
			bytecode = COALESCE($13, bytecode),
			description = $14,
			website_url = $15,
			github_url = $16,
			documentation_url = $17,
			tags = COALESCE($18, tags),
			updated_at = $19
		WHERE address = $1`

	_, err := s.db.DB.Exec(query,
		updated.Address, name, symbol, contractType,
		updated.IsVerified, updated.VerificationDate, compilerVersion,
		updated.OptimizationEnabled, updated.OptimizationRuns, licenseType,
		updated.SourceCode, updated.ABI, updated.Bytecode, description,
		websiteURL, githubURL, documentationURL,
		pq.Array(updated.Tags), updated.UpdatedAt,
	)

	return err
}
