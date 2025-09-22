package database

import (
	"context"
	"database/sql"
	"fmt"
	"math/big"

	"explorer-api/internal/domain/entities"
	"explorer-api/internal/domain/repositories"
)

// PostgresBlockRepository implementa BlockRepository usando PostgreSQL
type PostgresBlockRepository struct {
	db *sql.DB
}

// NewPostgresBlockRepository cria uma nova instância do repositório
func NewPostgresBlockRepository(db *sql.DB) repositories.BlockRepository {
	if db == nil {
		panic("PostgresBlockRepository: database connection cannot be nil")
	}
	return &PostgresBlockRepository{db: db}
}

// FindByNumber busca um bloco pelo número
func (r *PostgresBlockRepository) FindByNumber(ctx context.Context, number uint64) (*entities.Block, error) {
	query := `
		SELECT number, hash, parent_hash, timestamp, miner, difficulty, total_difficulty,
			   size, gas_limit, gas_used, base_fee_per_gas, tx_count, uncle_count,
			   bloom, extra_data, mix_digest, nonce, receipt_hash, state_root, tx_hash,
			   created_at, updated_at
		FROM blocks WHERE number = $1`

	return r.scanBlock(r.db.QueryRowContext(ctx, query, number))
}

// FindByHash busca um bloco pelo hash
func (r *PostgresBlockRepository) FindByHash(ctx context.Context, hash string) (*entities.Block, error) {
	query := `
		SELECT number, hash, parent_hash, timestamp, miner, difficulty, total_difficulty,
			   size, gas_limit, gas_used, base_fee_per_gas, tx_count, uncle_count,
			   bloom, extra_data, mix_digest, nonce, receipt_hash, state_root, tx_hash,
			   created_at, updated_at
		FROM blocks WHERE hash = $1`

	return r.scanBlock(r.db.QueryRowContext(ctx, query, hash))
}

// FindLatest busca o último bloco salvo
func (r *PostgresBlockRepository) FindLatest(ctx context.Context) (*entities.Block, error) {
	query := `
		SELECT number, hash, parent_hash, timestamp, miner, difficulty, total_difficulty,
			   size, gas_limit, gas_used, base_fee_per_gas, tx_count, uncle_count,
			   bloom, extra_data, mix_digest, nonce, receipt_hash, state_root, tx_hash,
			   created_at, updated_at
		FROM blocks ORDER BY number DESC LIMIT 1`

	return r.scanBlock(r.db.QueryRowContext(ctx, query))
}

// FindByRange busca blocos em um intervalo
func (r *PostgresBlockRepository) FindByRange(ctx context.Context, from, to uint64) ([]*entities.Block, error) {
	query := `
		SELECT number, hash, parent_hash, timestamp, miner, difficulty, total_difficulty,
			   size, gas_limit, gas_used, base_fee_per_gas, tx_count, uncle_count,
			   bloom, extra_data, mix_digest, nonce, receipt_hash, state_root, tx_hash,
			   created_at, updated_at
		FROM blocks WHERE number BETWEEN $1 AND $2 ORDER BY number DESC`

	rows, err := r.db.QueryContext(ctx, query, from, to)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var blocks []*entities.Block
	for rows.Next() {
		block, err := r.scanBlockFromRows(rows)
		if err != nil {
			return nil, err
		}
		blocks = append(blocks, block)
	}

	return blocks, rows.Err()
}

// FindRecent busca os N blocos mais recentes
func (r *PostgresBlockRepository) FindRecent(ctx context.Context, limit int) ([]*entities.Block, error) {
	query := `
		SELECT number, hash, parent_hash, timestamp, miner, difficulty, total_difficulty,
			   size, gas_limit, gas_used, base_fee_per_gas, tx_count, uncle_count,
			   bloom, extra_data, mix_digest, nonce, receipt_hash, state_root, tx_hash,
			   created_at, updated_at
		FROM blocks ORDER BY number DESC LIMIT $1`

	rows, err := r.db.QueryContext(ctx, query, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var blocks []*entities.Block
	for rows.Next() {
		block, err := r.scanBlockFromRows(rows)
		if err != nil {
			return nil, err
		}
		blocks = append(blocks, block)
	}

	return blocks, rows.Err()
}

// Count retorna o número total de blocos
func (r *PostgresBlockRepository) Count(ctx context.Context) (int64, error) {
	query := `SELECT COUNT(*) FROM blocks WHERE deleted_at IS NULL`

	var count int64
	err := r.db.QueryRowContext(ctx, query).Scan(&count)
	return count, err
}

// Exists verifica se um bloco existe
func (r *PostgresBlockRepository) Exists(ctx context.Context, hash string) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM blocks WHERE hash = $1)`

	var exists bool
	err := r.db.QueryRowContext(ctx, query, hash).Scan(&exists)
	return exists, err
}

// scanBlock converte uma linha do banco em uma entidade Block
func (r *PostgresBlockRepository) scanBlock(row *sql.Row) (*entities.Block, error) {
	var block entities.Block
	var difficulty, totalDifficulty, baseFeePerGas *string

	err := row.Scan(
		&block.Number, &block.Hash, &block.ParentHash, &block.Timestamp, &block.Miner,
		&difficulty, &totalDifficulty, &block.Size, &block.GasLimit, &block.GasUsed,
		&baseFeePerGas, &block.TxCount, &block.UncleCount,
		&block.Bloom, &block.ExtraData, &block.MixDigest, &block.Nonce,
		&block.ReceiptHash, &block.StateRoot, &block.TxHash,
		&block.CreatedAt, &block.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	// Converter strings para big.Int
	if difficulty != nil {
		block.Difficulty = new(big.Int)
		block.Difficulty.SetString(*difficulty, 10)
	}
	if totalDifficulty != nil {
		block.TotalDifficulty = new(big.Int)
		block.TotalDifficulty.SetString(*totalDifficulty, 10)
	}
	if baseFeePerGas != nil {
		block.BaseFeePerGas = new(big.Int)
		block.BaseFeePerGas.SetString(*baseFeePerGas, 10)
	}

	return &block, nil
}

// scanBlockFromRows converte uma linha de rows em uma entidade Block
func (r *PostgresBlockRepository) scanBlockFromRows(rows *sql.Rows) (*entities.Block, error) {
	var block entities.Block
	var difficulty, totalDifficulty, baseFeePerGas *string

	err := rows.Scan(
		&block.Number, &block.Hash, &block.ParentHash, &block.Timestamp, &block.Miner,
		&difficulty, &totalDifficulty, &block.Size, &block.GasLimit, &block.GasUsed,
		&baseFeePerGas, &block.TxCount, &block.UncleCount,
		&block.Bloom, &block.ExtraData, &block.MixDigest, &block.Nonce,
		&block.ReceiptHash, &block.StateRoot, &block.TxHash,
		&block.CreatedAt, &block.UpdatedAt,
	)

	if err != nil {
		return nil, err
	}

	// Converter strings para big.Int
	if difficulty != nil {
		block.Difficulty = new(big.Int)
		block.Difficulty.SetString(*difficulty, 10)
	}
	if totalDifficulty != nil {
		block.TotalDifficulty = new(big.Int)
		block.TotalDifficulty.SetString(*totalDifficulty, 10)
	}
	if baseFeePerGas != nil {
		block.BaseFeePerGas = new(big.Int)
		block.BaseFeePerGas.SetString(*baseFeePerGas, 10)
	}

	return &block, nil
}

// FindWithFilters busca blocos com filtros avançados
func (r *PostgresBlockRepository) FindWithFilters(ctx context.Context, whereClause string, args []interface{}, orderClause string, limit, offset int) ([]*entities.Block, error) {
	baseQuery := `
		SELECT number, hash, parent_hash, timestamp, miner, difficulty, total_difficulty,
			   size, gas_limit, gas_used, base_fee_per_gas, tx_count, uncle_count,
			   bloom, extra_data, mix_digest, nonce, receipt_hash, state_root, tx_hash,
			   created_at, updated_at
		FROM blocks`

	query := baseQuery
	if whereClause != "" {
		query += " " + whereClause
	}
	query += " " + orderClause
	query += fmt.Sprintf(" LIMIT %d OFFSET %d", limit, offset)

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var blocks []*entities.Block
	for rows.Next() {
		block, err := r.scanBlockFromRows(rows)
		if err != nil {
			return nil, err
		}
		blocks = append(blocks, block)
	}

	return blocks, rows.Err()
}

// CountWithFilters conta blocos com filtros
func (r *PostgresBlockRepository) CountWithFilters(ctx context.Context, whereClause string, args []interface{}) (int64, error) {
	query := "SELECT COUNT(*) FROM blocks"
	if whereClause != "" {
		query += " " + whereClause
	}

	var count int64
	err := r.db.QueryRowContext(ctx, query, args...).Scan(&count)
	return count, err
}

// GetUniqueMiners retorna lista de mineradores únicos
func (r *PostgresBlockRepository) GetUniqueMiners(ctx context.Context) ([]string, error) {
	query := `
		SELECT DISTINCT miner
		FROM blocks
		WHERE miner IS NOT NULL AND miner != ''
		ORDER BY miner`

	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var miners []string
	for rows.Next() {
		var miner string
		if err := rows.Scan(&miner); err != nil {
			return nil, err
		}
		miners = append(miners, miner)
	}

	return miners, rows.Err()
}

// GetGasTrends retorna tendências de gas price por período
func (r *PostgresBlockRepository) GetGasTrends(ctx context.Context, days int) ([]entities.GasTrend, error) {
	query := `
		WITH daily_gas_stats AS (
			SELECT
				DATE(b.timestamp) as date,
				AVG(t.gas_price::numeric) as avg_price,
				MIN(t.gas_price::numeric) as min_price,
				MAX(t.gas_price::numeric) as max_price,
				SUM(t.value::numeric) as volume,
				COUNT(*) as tx_count
			FROM blocks b
			JOIN transactions t ON b.hash = t.block_hash
			WHERE b.timestamp >= CURRENT_DATE - INTERVAL '%d days'
				AND t.gas_price IS NOT NULL
				AND t.gas_price != '0'
			GROUP BY DATE(b.timestamp)
		)
		SELECT
			date,
			COALESCE(avg_price::text, '0') as avg_price,
			COALESCE(min_price::text, '0') as min_price,
			COALESCE(max_price::text, '0') as max_price,
			COALESCE(volume::text, '0') as volume,
			tx_count
		FROM daily_gas_stats
		ORDER BY date DESC
		LIMIT 30`

	formattedQuery := fmt.Sprintf(query, days)
	rows, err := r.db.QueryContext(ctx, formattedQuery)
	if err != nil {
		return nil, fmt.Errorf("erro ao buscar gas trends: %w", err)
	}
	defer rows.Close()

	var trends []entities.GasTrend
	for rows.Next() {
		var trend entities.GasTrend
		err := rows.Scan(
			&trend.Date,
			&trend.AvgPrice,
			&trend.MinPrice,
			&trend.MaxPrice,
			&trend.Volume,
			&trend.TxCount,
		)
		if err != nil {
			return nil, fmt.Errorf("erro ao escanear gas trend: %w", err)
		}
		trends = append(trends, trend)
	}

	return trends, rows.Err()
}

// GetVolumeDistribution retorna distribuição de volume por período
func (r *PostgresBlockRepository) GetVolumeDistribution(ctx context.Context, period string) (*entities.VolumeDistribution, error) {
	distribution := &entities.VolumeDistribution{
		Period: period,
	}

	// Determinar intervalo baseado no período
	var interval string
	var timeFormat string
	switch period {
	case "24h":
		interval = "24 hours"
		timeFormat = "HH24:00"
	case "7d":
		interval = "7 days"
		timeFormat = "YYYY-MM-DD"
	case "30d":
		interval = "30 days"
		timeFormat = "YYYY-MM-DD"
	default:
		interval = "24 hours"
		timeFormat = "HH24:00"
	}

	// Buscar totais gerais
	totalQuery := `
		SELECT
			COALESCE(SUM(t.value::numeric), 0)::text as total_volume,
			COUNT(*) as total_transactions
		FROM transactions t
		JOIN blocks b ON t.block_hash = b.hash
		WHERE b.timestamp >= CURRENT_TIMESTAMP - INTERVAL '%s'`

	formattedTotalQuery := fmt.Sprintf(totalQuery, interval)
	err := r.db.QueryRowContext(ctx, formattedTotalQuery).Scan(
		&distribution.TotalVolume,
		&distribution.TotalTransactions,
	)
	if err != nil {
		return nil, fmt.Errorf("erro ao buscar totais de volume: %w", err)
	}

	// Buscar distribuição por tempo
	timeQuery := `
		SELECT
			TO_CHAR(b.timestamp, '%s') as time_bucket,
			COALESCE(SUM(t.value::numeric), 0)::text as volume,
			COUNT(*) as count
		FROM transactions t
		JOIN blocks b ON t.block_hash = b.hash
		WHERE b.timestamp >= CURRENT_TIMESTAMP - INTERVAL '%s'
		GROUP BY TO_CHAR(b.timestamp, '%s')
		ORDER BY time_bucket`

	formattedTimeQuery := fmt.Sprintf(timeQuery, timeFormat, interval, timeFormat)
	timeRows, err := r.db.QueryContext(ctx, formattedTimeQuery)
	if err != nil {
		return nil, fmt.Errorf("erro ao buscar distribuição por tempo: %w", err)
	}
	defer timeRows.Close()

	var volumeByTime []entities.VolumeByTime
	for timeRows.Next() {
		var vbt entities.VolumeByTime
		err := timeRows.Scan(&vbt.Time, &vbt.Volume, &vbt.Count)
		if err != nil {
			return nil, fmt.Errorf("erro ao escanear volume por tempo: %w", err)
		}
		volumeByTime = append(volumeByTime, vbt)
	}

	if period == "24h" {
		distribution.ByHour = volumeByTime
	} else {
		distribution.ByDay = volumeByTime
	}

	// Buscar distribuição por tipo de contrato
	contractQuery := `
		WITH contract_volumes AS (
			SELECT
				COALESCE(sc.contract_type, 'EOA') as contract_type,
				COALESCE(SUM(t.value::numeric), 0) as volume,
				COUNT(*) as count
			FROM transactions t
			JOIN blocks b ON t.block_hash = b.hash
			LEFT JOIN smart_contracts sc ON t.to_address = sc.address
			WHERE b.timestamp >= CURRENT_TIMESTAMP - INTERVAL '%s'
			GROUP BY COALESCE(sc.contract_type, 'EOA')
		),
		total_volume AS (
			SELECT SUM(volume) as total FROM contract_volumes
		)
		SELECT
			cv.contract_type,
			cv.volume::text as volume,
			cv.count,
			ROUND((cv.volume * 100.0 / NULLIF(tv.total, 0)), 2) as percentage
		FROM contract_volumes cv
		CROSS JOIN total_volume tv
		ORDER BY cv.volume DESC`

	formattedContractQuery := fmt.Sprintf(contractQuery, interval)
	contractRows, err := r.db.QueryContext(ctx, formattedContractQuery)
	if err != nil {
		return nil, fmt.Errorf("erro ao buscar distribuição por contrato: %w", err)
	}
	defer contractRows.Close()

	for contractRows.Next() {
		var vbct entities.VolumeByContractType
		err := contractRows.Scan(&vbct.ContractType, &vbct.Volume, &vbct.Count, &vbct.Percentage)
		if err != nil {
			return nil, fmt.Errorf("erro ao escanear volume por contrato: %w", err)
		}
		distribution.ByContractType = append(distribution.ByContractType, vbct)
	}

	return distribution, nil
}
