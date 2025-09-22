package database

import (
	"context"
	"time"

	"github.com/jackc/pgx/v4/pgxpool"
)

// DB representa a conexão com o banco de dados
type DB struct {
	Pool *pgxpool.Pool
}

// Connect estabelece conexão com o banco de dados PostgreSQL
func Connect(databaseURL string) (*DB, error) {
	config, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, err
	}

	// Configurações de pool
	config.MaxConns = 30
	config.MinConns = 5
	config.MaxConnLifetime = time.Hour
	config.MaxConnIdleTime = time.Minute * 30

	pool, err := pgxpool.ConnectConfig(context.Background(), config)
	if err != nil {
		return nil, err
	}

	// Testar conexão
	if err := pool.Ping(context.Background()); err != nil {
		pool.Close()
		return nil, err
	}

	return &DB{Pool: pool}, nil
}

// Close fecha a conexão com o banco de dados
func (db *DB) Close() {
	if db.Pool != nil {
		db.Pool.Close()
	}
}

// Health verifica se a conexão com o banco está saudável
func (db *DB) Health(ctx context.Context) error {
	return db.Pool.Ping(ctx)
}
