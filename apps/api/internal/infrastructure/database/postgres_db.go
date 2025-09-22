package database

import (
	"database/sql"
)

// PostgresDB wraps the sql.DB connection
type PostgresDB struct {
	DB *sql.DB
}

// NewPostgresDB creates a new PostgresDB instance
func NewPostgresDB(db *sql.DB) *PostgresDB {
	if db == nil {
		panic("PostgresDB: database connection cannot be nil")
	}
	return &PostgresDB{
		DB: db,
	}
}
