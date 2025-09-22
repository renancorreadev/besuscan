package database

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"explorer-api/internal/domain/entities"
	"explorer-api/internal/domain/repositories"
)

// PostgresAccountRepository implementa AccountRepository usando PostgreSQL
type PostgresAccountRepository struct {
	db *sql.DB
}

// NewPostgresAccountRepository cria uma nova instância do repositório PostgreSQL
func NewPostgresAccountRepository(db *sql.DB) repositories.AccountRepository {
	if db == nil {
		panic("PostgresAccountRepository: database connection cannot be nil")
	}
	return &PostgresAccountRepository{db: db}
}

// Operações de escrita - A API não deve executar, apenas o worker

func (r *PostgresAccountRepository) Create(ctx context.Context, account *entities.Account) error {
	return fmt.Errorf("operação não permitida: a API apenas consulta dados")
}

func (r *PostgresAccountRepository) Update(ctx context.Context, account *entities.Account) error {
	return fmt.Errorf("operação não permitida: a API apenas consulta dados")
}

func (r *PostgresAccountRepository) Delete(ctx context.Context, address string) error {
	return fmt.Errorf("operação não permitida: a API apenas consulta dados")
}

func (r *PostgresAccountRepository) CreateBatch(ctx context.Context, accounts []*entities.Account) error {
	return fmt.Errorf("operação não permitida: a API apenas consulta dados")
}

func (r *PostgresAccountRepository) UpdateBalances(ctx context.Context, updates map[string]string) error {
	return fmt.Errorf("operação não permitida: a API apenas consulta dados")
}

func (r *PostgresAccountRepository) UpdateTransactionCounts(ctx context.Context, updates map[string]int) error {
	return fmt.Errorf("operação não permitida: a API apenas consulta dados")
}

// Consultas - Implementação real

func (r *PostgresAccountRepository) GetByAddress(ctx context.Context, address string) (*entities.Account, error) {
	query := `
		SELECT address, account_type, balance, nonce, transaction_count, 
		       is_contract, contract_type, first_seen, last_activity,
		       factory_address, implementation_address, owner_address,
		       label, risk_score, compliance_status, compliance_notes,
		       created_at, updated_at
		FROM accounts 
		WHERE address = $1
	`

	return r.scanAccount(r.db.QueryRowContext(ctx, query, address))
}

func (r *PostgresAccountRepository) GetAll(ctx context.Context, filters *repositories.AccountFilters) ([]*entities.Account, int, error) {
	baseQuery := `
		SELECT address, account_type, balance, nonce, transaction_count, 
		       is_contract, contract_type, first_seen, last_activity,
		       factory_address, implementation_address, owner_address,
		       label, risk_score, compliance_status, compliance_notes,
		       created_at, updated_at
		FROM accounts
	`

	countQuery := "SELECT COUNT(*) FROM accounts"
	whereClause, args := r.buildWhereClause(filters)

	if whereClause != "" {
		baseQuery += whereClause
		countQuery += whereClause
	}

	// Contar total
	var total int
	err := r.db.QueryRowContext(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("erro ao contar accounts: %w", err)
	}

	// Adicionar ordenação e paginação
	orderBy := "created_at DESC"
	if filters != nil && filters.OrderBy != "" {
		orderBy = filters.OrderBy
		if filters.OrderDir != "" {
			orderBy += " " + filters.OrderDir
		}
	}
	baseQuery += " ORDER BY " + orderBy

	limit := 20
	offset := 0
	if filters != nil {
		if filters.Limit > 0 {
			limit = filters.Limit
		}
		if filters.Page > 1 {
			offset = (filters.Page - 1) * limit
		}
	}

	baseQuery += fmt.Sprintf(" LIMIT $%d OFFSET $%d", len(args)+1, len(args)+2)
	args = append(args, limit, offset)

	// Executar query
	rows, err := r.db.QueryContext(ctx, baseQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("erro ao buscar accounts: %w", err)
	}
	defer rows.Close()

	var accounts []*entities.Account
	for rows.Next() {
		account, err := r.scanAccountFromRows(rows)
		if err != nil {
			return nil, 0, err
		}
		accounts = append(accounts, account)
	}

	if err = rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("erro ao iterar accounts: %w", err)
	}

	return accounts, total, nil
}

func (r *PostgresAccountRepository) GetSummaries(ctx context.Context, filters *repositories.AccountFilters) ([]*entities.AccountSummary, int, error) {
	accounts, total, err := r.GetAll(ctx, filters)
	if err != nil {
		return nil, 0, err
	}

	summaries := make([]*entities.AccountSummary, len(accounts))
	for i, account := range accounts {
		summaries[i] = account.ToSummary()
	}

	return summaries, total, nil
}

func (r *PostgresAccountRepository) Search(ctx context.Context, query string, limit int) ([]*entities.AccountSummary, error) {
	sqlQuery := `
		SELECT address, account_type, balance, transaction_count, 
		       is_contract, risk_score, compliance_status, created_at
		FROM accounts 
		WHERE address ILIKE $1 OR label ILIKE $1
		ORDER BY 
			CASE 
				WHEN address = $2 THEN 1
				WHEN address ILIKE $2 || '%' THEN 2
				ELSE 3
			END,
			transaction_count DESC
		LIMIT $3
	`

	searchTerm := "%" + query + "%"
	rows, err := r.db.QueryContext(ctx, sqlQuery, searchTerm, query, limit)
	if err != nil {
		return nil, fmt.Errorf("erro ao buscar accounts: %w", err)
	}
	defer rows.Close()

	var summaries []*entities.AccountSummary
	for rows.Next() {
		var summary entities.AccountSummary
		err := rows.Scan(
			&summary.Address,
			&summary.AccountType,
			&summary.Balance,
			&summary.TransactionCount,
			&summary.IsContract,
			&summary.RiskScore,
			&summary.ComplianceStatus,
			&summary.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("erro ao fazer scan do summary: %w", err)
		}
		summaries = append(summaries, &summary)
	}

	return summaries, rows.Err()
}

func (r *PostgresAccountRepository) GetByType(ctx context.Context, accountType string, limit int) ([]*entities.Account, error) {
	query := `
		SELECT address, account_type, balance, nonce, transaction_count, 
		       is_contract, contract_type, first_seen, last_activity,
		       factory_address, implementation_address, owner_address,
		       label, risk_score, compliance_status, compliance_notes,
		       created_at, updated_at
		FROM accounts 
		WHERE account_type = $1
		ORDER BY transaction_count DESC
		LIMIT $2
	`

	rows, err := r.db.QueryContext(ctx, query, accountType, limit)
	if err != nil {
		return nil, fmt.Errorf("erro ao buscar accounts por tipo: %w", err)
	}
	defer rows.Close()

	var accounts []*entities.Account
	for rows.Next() {
		account, err := r.scanAccountFromRows(rows)
		if err != nil {
			return nil, err
		}
		accounts = append(accounts, account)
	}

	return accounts, rows.Err()
}

func (r *PostgresAccountRepository) GetTopByBalance(ctx context.Context, limit int) ([]*entities.Account, error) {
	query := `
		SELECT address, account_type, balance, nonce, transaction_count, 
		       is_contract, contract_type, first_seen, last_activity,
		       factory_address, implementation_address, owner_address,
		       label, risk_score, compliance_status, compliance_notes,
		       created_at, updated_at
		FROM accounts 
		ORDER BY CAST(balance AS NUMERIC) DESC
		LIMIT $1
	`

	rows, err := r.db.QueryContext(ctx, query, limit)
	if err != nil {
		return nil, fmt.Errorf("erro ao buscar top accounts por balance: %w", err)
	}
	defer rows.Close()

	var accounts []*entities.Account
	for rows.Next() {
		account, err := r.scanAccountFromRows(rows)
		if err != nil {
			return nil, err
		}
		accounts = append(accounts, account)
	}

	return accounts, rows.Err()
}

func (r *PostgresAccountRepository) GetTopByTransactions(ctx context.Context, limit int) ([]*entities.Account, error) {
	query := `
		SELECT address, account_type, balance, nonce, transaction_count, 
		       is_contract, contract_type, first_seen, last_activity,
		       factory_address, implementation_address, owner_address,
		       label, risk_score, compliance_status, compliance_notes,
		       created_at, updated_at
		FROM accounts 
		ORDER BY transaction_count DESC
		LIMIT $1
	`

	rows, err := r.db.QueryContext(ctx, query, limit)
	if err != nil {
		return nil, fmt.Errorf("erro ao buscar top accounts por transações: %w", err)
	}
	defer rows.Close()

	var accounts []*entities.Account
	for rows.Next() {
		account, err := r.scanAccountFromRows(rows)
		if err != nil {
			return nil, err
		}
		accounts = append(accounts, account)
	}

	return accounts, rows.Err()
}

func (r *PostgresAccountRepository) GetRecentlyActive(ctx context.Context, limit int) ([]*entities.Account, error) {
	query := `
		SELECT address, account_type, balance, nonce, transaction_count, 
		       is_contract, contract_type, first_seen, last_activity,
		       factory_address, implementation_address, owner_address,
		       label, risk_score, compliance_status, compliance_notes,
		       created_at, updated_at
		FROM accounts 
		WHERE last_activity IS NOT NULL
		ORDER BY last_activity DESC
		LIMIT $1
	`

	rows, err := r.db.QueryContext(ctx, query, limit)
	if err != nil {
		return nil, fmt.Errorf("erro ao buscar accounts recentemente ativas: %w", err)
	}
	defer rows.Close()

	var accounts []*entities.Account
	for rows.Next() {
		account, err := r.scanAccountFromRows(rows)
		if err != nil {
			return nil, err
		}
		accounts = append(accounts, account)
	}

	return accounts, rows.Err()
}

func (r *PostgresAccountRepository) GetSmartAccounts(ctx context.Context, limit int) ([]*entities.Account, error) {
	return r.GetByType(ctx, "Smart Account", limit)
}

func (r *PostgresAccountRepository) GetByFactory(ctx context.Context, factoryAddress string, limit int) ([]*entities.Account, error) {
	query := `
		SELECT address, account_type, balance, nonce, transaction_count, 
		       is_contract, contract_type, first_seen, last_activity,
		       factory_address, implementation_address, owner_address,
		       label, risk_score, compliance_status, compliance_notes,
		       created_at, updated_at
		FROM accounts 
		WHERE factory_address = $1
		ORDER BY created_at DESC
		LIMIT $2
	`

	rows, err := r.db.QueryContext(ctx, query, factoryAddress, limit)
	if err != nil {
		return nil, fmt.Errorf("erro ao buscar accounts por factory: %w", err)
	}
	defer rows.Close()

	var accounts []*entities.Account
	for rows.Next() {
		account, err := r.scanAccountFromRows(rows)
		if err != nil {
			return nil, err
		}
		accounts = append(accounts, account)
	}

	return accounts, rows.Err()
}

func (r *PostgresAccountRepository) GetByOwner(ctx context.Context, ownerAddress string, limit int) ([]*entities.Account, error) {
	query := `
		SELECT address, account_type, balance, nonce, transaction_count, 
		       is_contract, contract_type, first_seen, last_activity,
		       factory_address, implementation_address, owner_address,
		       label, risk_score, compliance_status, compliance_notes,
		       created_at, updated_at
		FROM accounts 
		WHERE owner_address = $1
		ORDER BY created_at DESC
		LIMIT $2
	`

	rows, err := r.db.QueryContext(ctx, query, ownerAddress, limit)
	if err != nil {
		return nil, fmt.Errorf("erro ao buscar accounts por owner: %w", err)
	}
	defer rows.Close()

	var accounts []*entities.Account
	for rows.Next() {
		account, err := r.scanAccountFromRows(rows)
		if err != nil {
			return nil, err
		}
		accounts = append(accounts, account)
	}

	return accounts, rows.Err()
}

func (r *PostgresAccountRepository) GetStats(ctx context.Context) (*repositories.AccountStats, error) {
	query := `
		SELECT 
			COUNT(*) as total_accounts,
			COUNT(CASE WHEN account_type = 'EOA' THEN 1 END) as eoa_accounts,
			COUNT(CASE WHEN account_type = 'smart_account' THEN 1 END) as smart_accounts,
			COUNT(CASE WHEN is_contract = true THEN 1 END) as contract_accounts,
			COUNT(CASE WHEN last_activity > NOW() - INTERVAL '30 days' THEN 1 END) as active_accounts,
			COALESCE(SUM(CAST(balance AS NUMERIC)), 0) as total_balance,
			COALESCE(AVG(CAST(balance AS NUMERIC)), 0) as avg_balance,
			COALESCE(AVG(transaction_count), 0) as avg_transactions
		FROM accounts
	`

	var stats repositories.AccountStats
	var totalBalance, avgBalance float64

	err := r.db.QueryRowContext(ctx, query).Scan(
		&stats.TotalAccounts,
		&stats.EOAAccounts,
		&stats.SmartAccounts,
		&stats.ContractAccounts,
		&stats.ActiveAccounts,
		&totalBalance,
		&avgBalance,
		&stats.AvgTransactions,
	)

	if err != nil {
		return nil, fmt.Errorf("erro ao buscar estatísticas: %w", err)
	}

	stats.TotalBalance = fmt.Sprintf("%.0f", totalBalance)
	stats.AvgBalance = fmt.Sprintf("%.0f", avgBalance)

	return &stats, nil
}

// Métodos não implementados que retornam erro

func (r *PostgresAccountRepository) GetByComplianceStatus(ctx context.Context, status string, limit int) ([]*entities.Account, error) {
	return nil, fmt.Errorf("não implementado")
}

func (r *PostgresAccountRepository) GetByRiskScore(ctx context.Context, minScore, maxScore int, limit int) ([]*entities.Account, error) {
	return nil, fmt.Errorf("não implementado")
}

func (r *PostgresAccountRepository) GetRecentlyCreated(ctx context.Context, limit int) ([]*entities.Account, error) {
	return nil, fmt.Errorf("não implementado")
}

func (r *PostgresAccountRepository) GetStatsByType(ctx context.Context) (map[string]*repositories.AccountTypeStats, error) {
	return nil, fmt.Errorf("não implementado")
}

func (r *PostgresAccountRepository) GetComplianceStats(ctx context.Context) (*repositories.ComplianceStats, error) {
	return nil, fmt.Errorf("não implementado")
}

// Métodos auxiliares

func (r *PostgresAccountRepository) buildWhereClause(filters *repositories.AccountFilters) (string, []interface{}) {
	if filters == nil {
		return "", nil
	}

	var whereClauses []string
	var args []interface{}
	argIndex := 1

	if filters.AccountType != "" {
		whereClauses = append(whereClauses, fmt.Sprintf("account_type = $%d", argIndex))
		args = append(args, filters.AccountType)
		argIndex++
	}

	if filters.IsContract != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("is_contract = $%d", argIndex))
		args = append(args, *filters.IsContract)
		argIndex++
	}

	if filters.ComplianceStatus != "" {
		whereClauses = append(whereClauses, fmt.Sprintf("compliance_status = $%d", argIndex))
		args = append(args, filters.ComplianceStatus)
		argIndex++
	}

	if filters.MinRiskScore > 0 {
		whereClauses = append(whereClauses, fmt.Sprintf("risk_score >= $%d", argIndex))
		args = append(args, filters.MinRiskScore)
		argIndex++
	}

	if filters.MaxRiskScore > 0 {
		whereClauses = append(whereClauses, fmt.Sprintf("risk_score <= $%d", argIndex))
		args = append(args, filters.MaxRiskScore)
		argIndex++
	}

	if filters.Search != "" {
		whereClauses = append(whereClauses, fmt.Sprintf("(address ILIKE $%d OR label ILIKE $%d)", argIndex, argIndex))
		args = append(args, "%"+filters.Search+"%")
		argIndex++
	}

	if len(whereClauses) == 0 {
		return "", nil
	}

	return " WHERE " + strings.Join(whereClauses, " AND "), args
}

func (r *PostgresAccountRepository) scanAccount(row *sql.Row) (*entities.Account, error) {
	var account entities.Account
	var contractType sql.NullString
	var lastActivity sql.NullTime
	var factoryAddress, implementationAddress, ownerAddress sql.NullString
	var label, complianceNotes sql.NullString
	var riskScore sql.NullInt32

	err := row.Scan(
		&account.Address,
		&account.AccountType,
		&account.Balance,
		&account.Nonce,
		&account.TransactionCount,
		&account.IsContract,
		&contractType,
		&account.FirstSeenAt,
		&lastActivity,
		&factoryAddress,
		&implementationAddress,
		&ownerAddress,
		&label,
		&riskScore,
		&account.ComplianceStatus,
		&complianceNotes,
		&account.CreatedAt,
		&account.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("account não encontrada")
		}
		return nil, fmt.Errorf("erro ao fazer scan da account: %w", err)
	}

	// Converter campos nullable
	if lastActivity.Valid {
		account.LastActivityAt = &lastActivity.Time
	}
	if factoryAddress.Valid {
		account.FactoryAddress = &factoryAddress.String
	}
	if implementationAddress.Valid {
		account.ImplementationAddress = &implementationAddress.String
	}
	if ownerAddress.Valid {
		account.OwnerAddress = &ownerAddress.String
	}
	if label.Valid {
		account.Label = &label.String
	}
	if complianceNotes.Valid {
		account.ComplianceNotes = &complianceNotes.String
	}
	if riskScore.Valid {
		account.RiskScore = int(riskScore.Int32)
	}

	return &account, nil
}

func (r *PostgresAccountRepository) scanAccountFromRows(rows *sql.Rows) (*entities.Account, error) {
	var account entities.Account
	var contractType sql.NullString
	var lastActivity sql.NullTime
	var factoryAddress, implementationAddress, ownerAddress sql.NullString
	var label, complianceNotes sql.NullString
	var riskScore sql.NullInt32

	err := rows.Scan(
		&account.Address,
		&account.AccountType,
		&account.Balance,
		&account.Nonce,
		&account.TransactionCount,
		&account.IsContract,
		&contractType,
		&account.FirstSeenAt,
		&lastActivity,
		&factoryAddress,
		&implementationAddress,
		&ownerAddress,
		&label,
		&riskScore,
		&account.ComplianceStatus,
		&complianceNotes,
		&account.CreatedAt,
		&account.UpdatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("erro ao fazer scan da account: %w", err)
	}

	// Converter campos nullable
	if lastActivity.Valid {
		account.LastActivityAt = &lastActivity.Time
	}
	if factoryAddress.Valid {
		account.FactoryAddress = &factoryAddress.String
	}
	if implementationAddress.Valid {
		account.ImplementationAddress = &implementationAddress.String
	}
	if ownerAddress.Valid {
		account.OwnerAddress = &ownerAddress.String
	}
	if label.Valid {
		account.Label = &label.String
	}
	if complianceNotes.Valid {
		account.ComplianceNotes = &complianceNotes.String
	}
	if riskScore.Valid {
		account.RiskScore = int(riskScore.Int32)
	}

	return &account, nil
}

// Repositórios auxiliares simplificados (apenas consultas essenciais)

type PostgresAccountTagRepository struct {
	db *sql.DB
}

func NewPostgresAccountTagRepository(db *sql.DB) repositories.AccountTagRepository {
	if db == nil {
		panic("PostgresAccountTagRepository: database connection cannot be nil")
	}
	return &PostgresAccountTagRepository{db: db}
}

func (r *PostgresAccountTagRepository) Create(ctx context.Context, tag *entities.AccountTag) error {
	return fmt.Errorf("operação não permitida: a API apenas consulta dados")
}

func (r *PostgresAccountTagRepository) GetByID(ctx context.Context, id uint64) (*entities.AccountTag, error) {
	return nil, fmt.Errorf("não implementado")
}

func (r *PostgresAccountTagRepository) Update(ctx context.Context, tag *entities.AccountTag) error {
	return fmt.Errorf("operação não permitida: a API apenas consulta dados")
}

func (r *PostgresAccountTagRepository) Delete(ctx context.Context, id uint64) error {
	return fmt.Errorf("operação não permitida: a API apenas consulta dados")
}

func (r *PostgresAccountTagRepository) GetByAddress(ctx context.Context, address string) ([]*entities.AccountTag, error) {
	query := `
		SELECT address, tag, created_by, created_at
		FROM account_tags 
		WHERE address = $1
		ORDER BY created_at DESC
	`

	rows, err := r.db.QueryContext(ctx, query, address)
	if err != nil {
		return nil, fmt.Errorf("erro ao buscar tags: %w", err)
	}
	defer rows.Close()

	var tags []*entities.AccountTag
	for rows.Next() {
		var tag entities.AccountTag
		var createdBy sql.NullString

		err := rows.Scan(
			&tag.Address,
			&tag.Tag,
			&createdBy,
			&tag.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("erro ao fazer scan da tag: %w", err)
		}

		if createdBy.Valid {
			tag.CreatedBy = &createdBy.String
		}

		tags = append(tags, &tag)
	}

	return tags, rows.Err()
}

func (r *PostgresAccountTagRepository) CreateForAddress(ctx context.Context, address, tag string, value *string, createdBy *string) error {
	return fmt.Errorf("operação não permitida: a API apenas consulta dados")
}

func (r *PostgresAccountTagRepository) DeleteByAddress(ctx context.Context, address, tag string) error {
	return fmt.Errorf("operação não permitida: a API apenas consulta dados")
}

func (r *PostgresAccountTagRepository) GetAccountsByTag(ctx context.Context, tag string, limit int) ([]*entities.Account, error) {
	return nil, fmt.Errorf("não implementado")
}

func (r *PostgresAccountTagRepository) GetPopularTags(ctx context.Context, limit int) ([]repositories.TagCount, error) {
	return nil, fmt.Errorf("não implementado")
}

// Outros repositórios auxiliares com implementações mínimas

type PostgresAccountAnalyticsRepository struct {
	db *sql.DB
}

func NewPostgresAccountAnalyticsRepository(db *sql.DB) repositories.AccountAnalyticsRepository {
	if db == nil {
		panic("PostgresAccountAnalyticsRepository: database connection cannot be nil")
	}
	return &PostgresAccountAnalyticsRepository{db: db}
}

func (r *PostgresAccountAnalyticsRepository) Create(ctx context.Context, analytics *entities.AccountAnalytics) error {
	return fmt.Errorf("operação não permitida: a API apenas consulta dados")
}

func (r *PostgresAccountAnalyticsRepository) GetByAddressAndDate(ctx context.Context, address string, date string) (*entities.AccountAnalytics, error) {
	return nil, fmt.Errorf("não implementado")
}

func (r *PostgresAccountAnalyticsRepository) Update(ctx context.Context, analytics *entities.AccountAnalytics) error {
	return fmt.Errorf("operação não permitida: a API apenas consulta dados")
}

func (r *PostgresAccountAnalyticsRepository) GetByAddress(ctx context.Context, address string, days int) ([]*entities.AccountAnalytics, error) {
	query := `
		SELECT address, date, transactions_count, unique_addresses_count, 
		       gas_used, value_transferred, avg_gas_per_tx, success_rate,
		       contract_calls_count, token_transfers_count, created_at
		FROM account_analytics 
		WHERE address = $1 AND date >= CURRENT_DATE - INTERVAL '%d days'
		ORDER BY date DESC
		LIMIT 100
	`

	formattedQuery := fmt.Sprintf(query, days)
	rows, err := r.db.QueryContext(ctx, formattedQuery, address)
	if err != nil {
		return nil, fmt.Errorf("erro ao buscar analytics: %w", err)
	}
	defer rows.Close()

	var analytics []*entities.AccountAnalytics
	for rows.Next() {
		var a entities.AccountAnalytics

		var successRate sql.NullFloat64
		var contractCalls, tokenTransfers sql.NullInt64

		err := rows.Scan(
			&a.Address, &a.Date, &a.TransactionsCount, &a.UniqueCounterparties,
			&a.GasUsed, &a.VolumeIn, &a.AvgTransactionValue, &successRate,
			&contractCalls, &tokenTransfers, &a.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("erro ao fazer scan do analytics: %w", err)
		}

		analytics = append(analytics, &a)
	}

	return analytics, rows.Err()
}

func (r *PostgresAccountAnalyticsRepository) GetByDateRange(ctx context.Context, address string, startDate, endDate string) ([]*entities.AccountAnalytics, error) {
	return nil, fmt.Errorf("não implementado")
}

func (r *PostgresAccountAnalyticsRepository) GetDailyStats(ctx context.Context, days int) ([]*repositories.DailyAccountStats, error) {
	return nil, fmt.Errorf("não implementado")
}

func (r *PostgresAccountAnalyticsRepository) GetTopAccountsByVolume(ctx context.Context, days int, limit int) ([]*repositories.AccountVolumeStats, error) {
	return nil, fmt.Errorf("não implementado")
}

func (r *PostgresAccountAnalyticsRepository) GetTopAccountsByTransactions(ctx context.Context, days int, limit int) ([]*repositories.AccountTransactionStats, error) {
	return nil, fmt.Errorf("não implementado")
}

func (r *PostgresAccountAnalyticsRepository) CreateBatch(ctx context.Context, analytics []*entities.AccountAnalytics) error {
	return fmt.Errorf("operação não permitida: a API apenas consulta dados")
}

type PostgresContractInteractionRepository struct {
	db *sql.DB
}

func NewPostgresContractInteractionRepository(db *sql.DB) repositories.ContractInteractionRepository {
	if db == nil {
		panic("PostgresContractInteractionRepository: database connection cannot be nil")
	}
	return &PostgresContractInteractionRepository{db: db}
}

func (r *PostgresContractInteractionRepository) Create(ctx context.Context, interaction *entities.ContractInteraction) error {
	return fmt.Errorf("operação não permitida: a API apenas consulta dados")
}

func (r *PostgresContractInteractionRepository) GetByID(ctx context.Context, id uint64) (*entities.ContractInteraction, error) {
	return nil, fmt.Errorf("não implementado")
}

func (r *PostgresContractInteractionRepository) GetByAccount(ctx context.Context, accountAddress string, limit int) ([]*entities.ContractInteraction, error) {
	// Por enquanto retorna lista vazia - a estrutura da tabela não corresponde à entidade
	// TODO: Ajustar estrutura da entidade ou criar DTO específico
	return []*entities.ContractInteraction{}, nil
}

func (r *PostgresContractInteractionRepository) GetByAccountAndContract(ctx context.Context, accountAddress, contractAddress string, limit int) ([]*entities.ContractInteraction, error) {
	return nil, fmt.Errorf("não implementado")
}

func (r *PostgresContractInteractionRepository) GetByContract(ctx context.Context, contractAddress string, limit int) ([]*entities.ContractInteraction, error) {
	return nil, fmt.Errorf("não implementado")
}

func (r *PostgresContractInteractionRepository) GetInteractionStats(ctx context.Context, accountAddress string) (*repositories.InteractionStats, error) {
	return nil, fmt.Errorf("não implementado")
}

func (r *PostgresContractInteractionRepository) GetTopContracts(ctx context.Context, accountAddress string, limit int) ([]*repositories.ContractStats, error) {
	return nil, fmt.Errorf("não implementado")
}

func (r *PostgresContractInteractionRepository) CreateBatch(ctx context.Context, interactions []*entities.ContractInteraction) error {
	return fmt.Errorf("operação não permitida: a API apenas consulta dados")
}

type PostgresTokenHoldingRepository struct {
	db *sql.DB
}

func NewPostgresTokenHoldingRepository(db *sql.DB) repositories.TokenHoldingRepository {
	if db == nil {
		panic("PostgresTokenHoldingRepository: database connection cannot be nil")
	}
	return &PostgresTokenHoldingRepository{db: db}
}

func (r *PostgresTokenHoldingRepository) Create(ctx context.Context, holding *entities.TokenHolding) error {
	return fmt.Errorf("operação não permitida: a API apenas consulta dados")
}

func (r *PostgresTokenHoldingRepository) GetByID(ctx context.Context, id uint64) (*entities.TokenHolding, error) {
	return nil, fmt.Errorf("não implementado")
}

func (r *PostgresTokenHoldingRepository) Update(ctx context.Context, holding *entities.TokenHolding) error {
	return fmt.Errorf("operação não permitida: a API apenas consulta dados")
}

func (r *PostgresTokenHoldingRepository) Delete(ctx context.Context, id uint64) error {
	return fmt.Errorf("operação não permitida: a API apenas consulta dados")
}

func (r *PostgresTokenHoldingRepository) GetByAccount(ctx context.Context, accountAddress string) ([]*entities.TokenHolding, error) {
	query := `
		SELECT account_address, token_address, token_symbol, token_name,
		       token_decimals, balance, last_updated, created_at
		FROM token_holdings 
		WHERE account_address = $1 AND balance != '0'
		ORDER BY last_updated DESC
		LIMIT 100
	`

	rows, err := r.db.QueryContext(ctx, query, accountAddress)
	if err != nil {
		return nil, fmt.Errorf("erro ao buscar token holdings: %w", err)
	}
	defer rows.Close()

	var holdings []*entities.TokenHolding
	for rows.Next() {
		var th entities.TokenHolding
		var symbol, name sql.NullString
		var decimals sql.NullInt32

		err := rows.Scan(
			&th.AccountAddress, &th.TokenAddress, &symbol, &name,
			&decimals, &th.Balance, &th.LastUpdated, &th.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("erro ao fazer scan do token holding: %w", err)
		}

		if symbol.Valid {
			th.TokenSymbol = &symbol.String
		}
		if name.Valid {
			th.TokenName = &name.String
		}
		if decimals.Valid {
			decInt := int(decimals.Int32)
			th.TokenDecimals = &decInt
		}

		holdings = append(holdings, &th)
	}

	return holdings, rows.Err()
}

func (r *PostgresTokenHoldingRepository) GetByAccountAndToken(ctx context.Context, accountAddress, tokenAddress string) (*entities.TokenHolding, error) {
	return nil, fmt.Errorf("não implementado")
}

func (r *PostgresTokenHoldingRepository) GetByToken(ctx context.Context, tokenAddress string, limit int) ([]*entities.TokenHolding, error) {
	return nil, fmt.Errorf("não implementado")
}

func (r *PostgresTokenHoldingRepository) GetHoldersByToken(ctx context.Context, tokenAddress string, limit int) ([]*entities.Account, error) {
	return nil, fmt.Errorf("não implementado")
}

func (r *PostgresTokenHoldingRepository) GetPortfolioValue(ctx context.Context, accountAddress string) (*repositories.PortfolioStats, error) {
	return nil, fmt.Errorf("não implementado")
}

func (r *PostgresTokenHoldingRepository) GetTopHolders(ctx context.Context, tokenAddress string, limit int) ([]*repositories.TokenHolderStats, error) {
	return nil, fmt.Errorf("não implementado")
}

func (r *PostgresTokenHoldingRepository) CreateBatch(ctx context.Context, holdings []*entities.TokenHolding) error {
	return fmt.Errorf("operação não permitida: a API apenas consulta dados")
}

func (r *PostgresTokenHoldingRepository) UpdateBalances(ctx context.Context, updates map[string]map[string]string) error {
	return fmt.Errorf("operação não permitida: a API apenas consulta dados")
}
