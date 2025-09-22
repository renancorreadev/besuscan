package database

import (
	"context"
	"database/sql"
	"fmt"
	"math/big"
	"strings"

	"github.com/hubweb3/worker/internal/domain/entities"
	"github.com/hubweb3/worker/internal/domain/repositories"
)

// PostgresBlockRepository implementa BlockRepository usando PostgreSQL
type PostgresBlockRepository struct {
	db *sql.DB
}

// NewPostgresBlockRepository cria uma nova instância do repositório
func NewPostgresBlockRepository(db *sql.DB) repositories.BlockRepository {
	return &PostgresBlockRepository{db: db}
}

// Save salva um bloco no banco de dados
func (r *PostgresBlockRepository) Save(ctx context.Context, block *entities.Block) error {
	query := `
		INSERT INTO blocks (
			number, hash, parent_hash, timestamp, miner, difficulty, total_difficulty,
			size, gas_limit, gas_used, base_fee_per_gas, tx_count, uncle_count,
			bloom, extra_data, mix_digest, nonce, receipt_hash, state_root, tx_hash,
			created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
			$14, $15, $16, $17, $18, $19, $20, $21, $22
		) ON CONFLICT (hash) DO UPDATE SET
			parent_hash = EXCLUDED.parent_hash,
			timestamp = EXCLUDED.timestamp,
			miner = EXCLUDED.miner,
			difficulty = EXCLUDED.difficulty,
			total_difficulty = EXCLUDED.total_difficulty,
			size = EXCLUDED.size,
			gas_limit = EXCLUDED.gas_limit,
			gas_used = EXCLUDED.gas_used,
			base_fee_per_gas = EXCLUDED.base_fee_per_gas,
			tx_count = EXCLUDED.tx_count,
			uncle_count = EXCLUDED.uncle_count,
			bloom = EXCLUDED.bloom,
			extra_data = EXCLUDED.extra_data,
			mix_digest = EXCLUDED.mix_digest,
			nonce = EXCLUDED.nonce,
			receipt_hash = EXCLUDED.receipt_hash,
			state_root = EXCLUDED.state_root,
			tx_hash = EXCLUDED.tx_hash,
			updated_at = EXCLUDED.updated_at`

	// Converter big.Int para string
	var difficulty, totalDifficulty, baseFeePerGas *string
	if block.Difficulty != nil {
		d := block.Difficulty.String()
		difficulty = &d
	}
	if block.TotalDifficulty != nil {
		td := block.TotalDifficulty.String()
		totalDifficulty = &td
	}
	if block.BaseFeePerGas != nil {
		bf := block.BaseFeePerGas.String()
		baseFeePerGas = &bf
	}

	_, err := r.db.ExecContext(ctx, query,
		block.Number, block.Hash, block.ParentHash, block.Timestamp, block.Miner,
		difficulty, totalDifficulty, block.Size, block.GasLimit, block.GasUsed,
		baseFeePerGas, block.TxCount, block.UncleCount,
		block.Bloom, block.ExtraData, block.MixDigest, block.Nonce,
		block.ReceiptHash, block.StateRoot, block.TxHash,
		block.CreatedAt, block.UpdatedAt,
	)

	return err
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
		FROM blocks WHERE number BETWEEN $1 AND $2 ORDER BY number ASC`

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

// Exists verifica se um bloco existe
func (r *PostgresBlockRepository) Exists(ctx context.Context, hash string) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM blocks WHERE hash = $1)`

	var exists bool
	err := r.db.QueryRowContext(ctx, query, hash).Scan(&exists)
	return exists, err
}

// Update atualiza um bloco existente
func (r *PostgresBlockRepository) Update(ctx context.Context, block *entities.Block) error {
	query := `
		UPDATE blocks SET
			parent_hash = $3, timestamp = $4, miner = $5, difficulty = $6,
			total_difficulty = $7, size = $8, gas_limit = $9, gas_used = $10,
			base_fee_per_gas = $11, tx_count = $12, uncle_count = $13,
			bloom = $14, extra_data = $15, mix_digest = $16, nonce = $17,
			receipt_hash = $18, state_root = $19, tx_hash = $20, updated_at = $21
		WHERE number = $1 AND hash = $2`

	var difficulty, totalDifficulty, baseFeePerGas *string
	if block.Difficulty != nil {
		d := block.Difficulty.String()
		difficulty = &d
	}
	if block.TotalDifficulty != nil {
		td := block.TotalDifficulty.String()
		totalDifficulty = &td
	}
	if block.BaseFeePerGas != nil {
		bf := block.BaseFeePerGas.String()
		baseFeePerGas = &bf
	}

	result, err := r.db.ExecContext(ctx, query,
		block.Number, block.Hash, block.ParentHash, block.Timestamp, block.Miner,
		difficulty, totalDifficulty, block.Size, block.GasLimit, block.GasUsed,
		baseFeePerGas, block.TxCount, block.UncleCount,
		block.Bloom, block.ExtraData, block.MixDigest, block.Nonce,
		block.ReceiptHash, block.StateRoot, block.TxHash, block.UpdatedAt,
	)

	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return fmt.Errorf("bloco não encontrado: %s", block.Hash)
	}

	return nil
}

// Delete remove um bloco (soft delete)
func (r *PostgresBlockRepository) Delete(ctx context.Context, hash string) error {
	query := `UPDATE blocks SET deleted_at = NOW() WHERE hash = $1`

	result, err := r.db.ExecContext(ctx, query, hash)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return fmt.Errorf("bloco não encontrado: %s", hash)
	}

	return nil
}

// Count retorna o número total de blocos
func (r *PostgresBlockRepository) Count(ctx context.Context) (int64, error) {
	query := `SELECT COUNT(*) FROM blocks WHERE deleted_at IS NULL`

	var count int64
	err := r.db.QueryRowContext(ctx, query).Scan(&count)
	return count, err
}

// FindWithTransactions busca um bloco com suas transações
func (r *PostgresBlockRepository) FindWithTransactions(ctx context.Context, hash string) (*entities.Block, error) {
	// Por enquanto, apenas retorna o bloco
	// TODO: Implementar join com transações quando necessário
	return r.FindByHash(ctx, hash)
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

// CheckExistsBatch verifica quais blocos já existem (retorna slice de bool na mesma ordem)
func (r *PostgresBlockRepository) CheckExistsBatch(ctx context.Context, blocks []*entities.Block) ([]bool, error) {
	if len(blocks) == 0 {
		return []bool{}, nil
	}

	// Construir query com IN clause para verificar múltiplos hashes
	hashes := make([]interface{}, len(blocks))
	for i, block := range blocks {
		hashes[i] = block.Hash
	}

	// Criar placeholders ($1, $2, ..., $n)
	placeholders := make([]string, len(hashes))
	for i := range placeholders {
		placeholders[i] = fmt.Sprintf("$%d", i+1)
	}

	query := fmt.Sprintf("SELECT hash FROM blocks WHERE hash IN (%s)",
		strings.Join(placeholders, ","))

	rows, err := r.db.QueryContext(ctx, query, hashes...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	// Criar mapa dos hashes existentes
	existingHashes := make(map[string]bool)
	for rows.Next() {
		var hash string
		if err := rows.Scan(&hash); err != nil {
			return nil, err
		}
		existingHashes[hash] = true
	}

	// Criar slice de resultados na mesma ordem dos blocos de entrada
	results := make([]bool, len(blocks))
	for i, block := range blocks {
		results[i] = existingHashes[block.Hash]
	}

	return results, rows.Err()
}

// SaveBatch salva múltiplos blocos em uma única operação usando prepared statements
func (r *PostgresBlockRepository) SaveBatch(ctx context.Context, blocks []*entities.Block) error {
	if len(blocks) == 0 {
		return nil
	}

	// Usar transaction para garantir atomicidade
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Preparar statement para inserção em lote
	query := `
		INSERT INTO blocks (
			number, hash, parent_hash, timestamp, miner, difficulty, total_difficulty,
			size, gas_limit, gas_used, base_fee_per_gas, tx_count, uncle_count,
			bloom, extra_data, mix_digest, nonce, receipt_hash, state_root, tx_hash,
			created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)`

	stmt, err := tx.PrepareContext(ctx, query)
	if err != nil {
		return err
	}
	defer stmt.Close()

	// Executar inserção para cada bloco
	for _, block := range blocks {
		var difficulty, totalDifficulty, baseFeePerGas *string
		if block.Difficulty != nil {
			d := block.Difficulty.String()
			difficulty = &d
		}
		if block.TotalDifficulty != nil {
			td := block.TotalDifficulty.String()
			totalDifficulty = &td
		}
		if block.BaseFeePerGas != nil {
			bf := block.BaseFeePerGas.String()
			baseFeePerGas = &bf
		}

		_, err := stmt.ExecContext(ctx,
			block.Number, block.Hash, block.ParentHash, block.Timestamp, block.Miner,
			difficulty, totalDifficulty, block.Size, block.GasLimit, block.GasUsed,
			baseFeePerGas, block.TxCount, block.UncleCount,
			block.Bloom, block.ExtraData, block.MixDigest, block.Nonce,
			block.ReceiptHash, block.StateRoot, block.TxHash,
			block.CreatedAt, block.UpdatedAt,
		)

		if err != nil {
			return err
		}
	}

	return tx.Commit()
}

// UpdateBatch atualiza múltiplos blocos em uma única operação
func (r *PostgresBlockRepository) UpdateBatch(ctx context.Context, blocks []*entities.Block) error {
	if len(blocks) == 0 {
		return nil
	}

	// Usar transaction para garantir atomicidade
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Preparar statement para atualização em lote
	query := `
		UPDATE blocks SET
			parent_hash = $3, timestamp = $4, miner = $5, difficulty = $6,
			total_difficulty = $7, size = $8, gas_limit = $9, gas_used = $10,
			base_fee_per_gas = $11, tx_count = $12, uncle_count = $13,
			bloom = $14, extra_data = $15, mix_digest = $16, nonce = $17,
			receipt_hash = $18, state_root = $19, tx_hash = $20, updated_at = $21
		WHERE number = $1 AND hash = $2`

	stmt, err := tx.PrepareContext(ctx, query)
	if err != nil {
		return err
	}
	defer stmt.Close()

	// Executar atualização para cada bloco
	for _, block := range blocks {
		var difficulty, totalDifficulty, baseFeePerGas *string
		if block.Difficulty != nil {
			d := block.Difficulty.String()
			difficulty = &d
		}
		if block.TotalDifficulty != nil {
			td := block.TotalDifficulty.String()
			totalDifficulty = &td
		}
		if block.BaseFeePerGas != nil {
			bf := block.BaseFeePerGas.String()
			baseFeePerGas = &bf
		}

		_, err := stmt.ExecContext(ctx,
			block.Number, block.Hash, block.ParentHash, block.Timestamp, block.Miner,
			difficulty, totalDifficulty, block.Size, block.GasLimit, block.GasUsed,
			baseFeePerGas, block.TxCount, block.UncleCount,
			block.Bloom, block.ExtraData, block.MixDigest, block.Nonce,
			block.ReceiptHash, block.StateRoot, block.TxHash, block.UpdatedAt,
		)

		if err != nil {
			return err
		}
	}

	return tx.Commit()
}
