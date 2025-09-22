package database

import (
	"context"
	"database/sql"
	"fmt"
	"math/big"
	"time"

	"explorer-api/internal/domain/entities"
	"explorer-api/internal/domain/repositories"
)

// PostgresValidatorRepository implementa ValidatorRepository usando PostgreSQL
type PostgresValidatorRepository struct {
	db *sql.DB
}

// NewPostgresValidatorRepository cria uma nova instância do repositório
func NewPostgresValidatorRepository(db *sql.DB) repositories.ValidatorRepository {
	return &PostgresValidatorRepository{db: db}
}

// FindByAddress busca um validador por endereço
func (r *PostgresValidatorRepository) FindByAddress(ctx context.Context, address string) (*entities.Validator, error) {
	query := `
		SELECT address, proposed_block_count, last_proposed_block_number, 
		       status, is_active, uptime, first_seen, last_seen, created_at, updated_at
		FROM validators 
		WHERE address = $1
	`

	row := r.db.QueryRowContext(ctx, query, address)

	var validator entities.Validator
	var proposedBlockCount, lastProposedBlockNumber string

	err := row.Scan(
		&validator.Address,
		&proposedBlockCount,
		&lastProposedBlockNumber,
		&validator.Status,
		&validator.IsActive,
		&validator.Uptime,
		&validator.FirstSeen,
		&validator.LastSeen,
		&validator.CreatedAt,
		&validator.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("erro ao buscar validador: %w", err)
	}

	// Converter strings para big.Int
	validator.ProposedBlockCount = new(big.Int)
	validator.ProposedBlockCount.SetString(proposedBlockCount, 10)

	validator.LastProposedBlockNumber = new(big.Int)
	validator.LastProposedBlockNumber.SetString(lastProposedBlockNumber, 10)

	return &validator, nil
}

// FindAll busca todos os validadores
func (r *PostgresValidatorRepository) FindAll(ctx context.Context) ([]*entities.Validator, error) {
	query := `
		SELECT address, proposed_block_count, last_proposed_block_number, 
		       status, is_active, uptime, first_seen, last_seen, created_at, updated_at
		FROM validators 
		ORDER BY last_seen DESC
	`

	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("erro ao buscar validadores: %w", err)
	}
	defer rows.Close()

	var validators []*entities.Validator

	for rows.Next() {
		var validator entities.Validator
		var proposedBlockCount, lastProposedBlockNumber string

		err := rows.Scan(
			&validator.Address,
			&proposedBlockCount,
			&lastProposedBlockNumber,
			&validator.Status,
			&validator.IsActive,
			&validator.Uptime,
			&validator.FirstSeen,
			&validator.LastSeen,
			&validator.CreatedAt,
			&validator.UpdatedAt,
		)

		if err != nil {
			return nil, fmt.Errorf("erro ao fazer scan do validador: %w", err)
		}

		// Converter strings para big.Int
		validator.ProposedBlockCount = new(big.Int)
		validator.ProposedBlockCount.SetString(proposedBlockCount, 10)

		validator.LastProposedBlockNumber = new(big.Int)
		validator.LastProposedBlockNumber.SetString(lastProposedBlockNumber, 10)

		validators = append(validators, &validator)
	}

	return validators, nil
}

// FindActive busca validadores ativos
func (r *PostgresValidatorRepository) FindActive(ctx context.Context) ([]*entities.Validator, error) {
	query := `
		SELECT address, proposed_block_count, last_proposed_block_number, 
		       status, is_active, uptime, first_seen, last_seen, created_at, updated_at
		FROM validators 
		WHERE is_active = true
		ORDER BY last_seen DESC
	`

	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("erro ao buscar validadores ativos: %w", err)
	}
	defer rows.Close()

	var validators []*entities.Validator

	for rows.Next() {
		var validator entities.Validator
		var proposedBlockCount, lastProposedBlockNumber string

		err := rows.Scan(
			&validator.Address,
			&proposedBlockCount,
			&lastProposedBlockNumber,
			&validator.Status,
			&validator.IsActive,
			&validator.Uptime,
			&validator.FirstSeen,
			&validator.LastSeen,
			&validator.CreatedAt,
			&validator.UpdatedAt,
		)

		if err != nil {
			return nil, fmt.Errorf("erro ao fazer scan do validador ativo: %w", err)
		}

		// Converter strings para big.Int
		validator.ProposedBlockCount = new(big.Int)
		validator.ProposedBlockCount.SetString(proposedBlockCount, 10)

		validator.LastProposedBlockNumber = new(big.Int)
		validator.LastProposedBlockNumber.SetString(lastProposedBlockNumber, 10)

		validators = append(validators, &validator)
	}

	return validators, nil
}

// FindInactive busca validadores inativos
func (r *PostgresValidatorRepository) FindInactive(ctx context.Context) ([]*entities.Validator, error) {
	query := `
		SELECT address, proposed_block_count, last_proposed_block_number, 
		       status, is_active, uptime, first_seen, last_seen, created_at, updated_at
		FROM validators 
		WHERE is_active = false
		ORDER BY last_seen DESC
	`

	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("erro ao buscar validadores inativos: %w", err)
	}
	defer rows.Close()

	var validators []*entities.Validator

	for rows.Next() {
		var validator entities.Validator
		var proposedBlockCount, lastProposedBlockNumber string

		err := rows.Scan(
			&validator.Address,
			&proposedBlockCount,
			&lastProposedBlockNumber,
			&validator.Status,
			&validator.IsActive,
			&validator.Uptime,
			&validator.FirstSeen,
			&validator.LastSeen,
			&validator.CreatedAt,
			&validator.UpdatedAt,
		)

		if err != nil {
			return nil, fmt.Errorf("erro ao fazer scan do validador inativo: %w", err)
		}

		// Converter strings para big.Int
		validator.ProposedBlockCount = new(big.Int)
		validator.ProposedBlockCount.SetString(proposedBlockCount, 10)

		validator.LastProposedBlockNumber = new(big.Int)
		validator.LastProposedBlockNumber.SetString(lastProposedBlockNumber, 10)

		validators = append(validators, &validator)
	}

	return validators, nil
}

// Save salva ou atualiza um validador
func (r *PostgresValidatorRepository) Save(ctx context.Context, validator *entities.Validator) error {
	query := `
		INSERT INTO validators (
			address, proposed_block_count, last_proposed_block_number,
			status, is_active, uptime, first_seen, last_seen, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		ON CONFLICT (address) DO UPDATE SET
			proposed_block_count = EXCLUDED.proposed_block_count,
			last_proposed_block_number = EXCLUDED.last_proposed_block_number,
			status = EXCLUDED.status,
			is_active = EXCLUDED.is_active,
			uptime = EXCLUDED.uptime,
			last_seen = EXCLUDED.last_seen,
			updated_at = EXCLUDED.updated_at
	`

	now := time.Now()
	if validator.CreatedAt.IsZero() {
		validator.CreatedAt = now
	}
	validator.UpdatedAt = now

	_, err := r.db.ExecContext(ctx, query,
		validator.Address,
		validator.ProposedBlockCount.String(),
		validator.LastProposedBlockNumber.String(),
		validator.Status,
		validator.IsActive,
		validator.Uptime,
		validator.FirstSeen,
		validator.LastSeen,
		validator.CreatedAt,
		validator.UpdatedAt,
	)

	if err != nil {
		return fmt.Errorf("erro ao salvar validador: %w", err)
	}

	return nil
}

// Count conta o total de validadores
func (r *PostgresValidatorRepository) Count(ctx context.Context) (int64, error) {
	var count int64
	query := "SELECT COUNT(*) FROM validators"

	err := r.db.QueryRowContext(ctx, query).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("erro ao contar validadores: %w", err)
	}

	return count, nil
}

// CountActive conta validadores ativos
func (r *PostgresValidatorRepository) CountActive(ctx context.Context) (int64, error) {
	var count int64
	query := "SELECT COUNT(*) FROM validators WHERE is_active = true"

	err := r.db.QueryRowContext(ctx, query).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("erro ao contar validadores ativos: %w", err)
	}

	return count, nil
}

// CountInactive conta validadores inativos
func (r *PostgresValidatorRepository) CountInactive(ctx context.Context) (int64, error) {
	var count int64
	query := "SELECT COUNT(*) FROM validators WHERE is_active = false"

	err := r.db.QueryRowContext(ctx, query).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("erro ao contar validadores inativos: %w", err)
	}

	return count, nil
}

// CalculateAverageUptime calcula o uptime médio dos validadores
func (r *PostgresValidatorRepository) CalculateAverageUptime(ctx context.Context) (float64, error) {
	var avgUptime sql.NullFloat64
	query := "SELECT AVG(uptime) FROM validators WHERE is_active = true"

	err := r.db.QueryRowContext(ctx, query).Scan(&avgUptime)
	if err != nil {
		return 0, fmt.Errorf("erro ao calcular uptime médio: %w", err)
	}

	if !avgUptime.Valid {
		return 0, nil
	}

	return avgUptime.Float64, nil
}

// UpdateAllStatus atualiza o status de todos os validadores
func (r *PostgresValidatorRepository) UpdateAllStatus(ctx context.Context, status string, isActive bool) error {
	query := "UPDATE validators SET status = $1, is_active = $2, updated_at = $3"

	_, err := r.db.ExecContext(ctx, query, status, isActive, time.Now())
	if err != nil {
		return fmt.Errorf("erro ao atualizar status dos validadores: %w", err)
	}

	return nil
}
