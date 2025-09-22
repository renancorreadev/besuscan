package entities

import (
	"math/big"
	"time"
)

// Validator representa um validador QBFT no worker
type Validator struct {
	Address                 string    `json:"address"`                    // Endereço do validador
	ProposedBlockCount      *big.Int  `json:"proposed_block_count"`       // Número de blocos propostos
	LastProposedBlockNumber *big.Int  `json:"last_proposed_block_number"` // Último bloco proposto
	Status                  string    `json:"status"`                     // ativo, inativo
	IsActive                bool      `json:"is_active"`                  // Se está ativo
	Uptime                  float64   `json:"uptime"`                     // Porcentagem de uptime
	FirstSeen               time.Time `json:"first_seen"`                 // Primeira vez visto
	LastSeen                time.Time `json:"last_seen"`                  // Última vez ativo
	CreatedAt               time.Time `json:"created_at"`
	UpdatedAt               time.Time `json:"updated_at"`
}

// NewValidator cria uma nova instância de Validator
func NewValidator(address string) *Validator {
	now := time.Now()
	return &Validator{
		Address:                 address,
		ProposedBlockCount:      big.NewInt(0),
		LastProposedBlockNumber: big.NewInt(0),
		Status:                  "inactive",
		IsActive:                false,
		Uptime:                  0.0,
		FirstSeen:               now,
		LastSeen:                now,
		CreatedAt:               now,
		UpdatedAt:               now,
	}
}
