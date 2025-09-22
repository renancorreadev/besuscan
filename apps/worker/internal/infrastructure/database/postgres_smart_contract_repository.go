package database

import (
	"context"
	"database/sql"

	"github.com/hubweb3/worker/internal/domain/repositories"
)

// PostgresSmartContractRepository implementação PostgreSQL do repositório de smart contracts
type PostgresSmartContractRepository struct {
	db *sql.DB
}

// NewPostgresSmartContractRepository cria uma nova instância do repositório
func NewPostgresSmartContractRepository(db *sql.DB) repositories.SmartContractRepository {
	return &PostgresSmartContractRepository{
		db: db,
	}
}

// GetContractName busca o nome do contrato na tabela smart_contracts
func (r *PostgresSmartContractRepository) GetContractName(ctx context.Context, address string) (string, error) {
	var name sql.NullString

	query := `SELECT name FROM smart_contracts WHERE address = $1`

	err := r.db.QueryRowContext(ctx, query, address).Scan(&name)
	if err != nil {
		if err == sql.ErrNoRows {
			// Contrato não encontrado, retornar string vazia
			return "", nil
		}
		return "", err
	}

	if name.Valid {
		return name.String, nil
	}

	return "", nil
}
