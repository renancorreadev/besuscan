package entities

import (
	"math/big"
	"time"
)

// Validator representa um validador QBFT
type Validator struct {
	Address                 string    `json:"address"`                    // Endereço do validador
	ProposedBlockCount      *big.Int  `json:"proposed_block_count"`       // Número de blocos propostos (hex)
	LastProposedBlockNumber *big.Int  `json:"last_proposed_block_number"` // Último bloco proposto (hex)
	Status                  string    `json:"status"`                     // ativo, inativo
	IsActive                bool      `json:"is_active"`                  // Se está ativo
	Uptime                  float64   `json:"uptime"`                     // Porcentagem de uptime
	FirstSeen               time.Time `json:"first_seen"`                 // Primeira vez visto
	LastSeen                time.Time `json:"last_seen"`                  // Última vez ativo
	CreatedAt               time.Time `json:"created_at"`
	UpdatedAt               time.Time `json:"updated_at"`
}

// ValidatorSummary representa um resumo de validador para listagens
type ValidatorSummary struct {
	Address                 string    `json:"address"`
	ProposedBlockCount      string    `json:"proposed_block_count"`       // Como string para frontend
	LastProposedBlockNumber string    `json:"last_proposed_block_number"` // Como string para frontend
	Status                  string    `json:"status"`
	IsActive                bool      `json:"is_active"`
	Uptime                  float64   `json:"uptime"`
	LastSeen                time.Time `json:"last_seen"`
}

// ToSummary converte um Validator para ValidatorSummary
func (v *Validator) ToSummary() *ValidatorSummary {
	return &ValidatorSummary{
		Address:                 v.Address,
		ProposedBlockCount:      v.ProposedBlockCount.String(),
		LastProposedBlockNumber: v.LastProposedBlockNumber.String(),
		Status:                  v.Status,
		IsActive:                v.IsActive,
		Uptime:                  v.Uptime,
		LastSeen:                v.LastSeen,
	}
}

// ValidatorMetrics representa métricas dos validadores
type ValidatorMetrics struct {
	TotalValidators    int     `json:"total_validators"`
	ActiveValidators   int     `json:"active_validators"`
	InactiveValidators int     `json:"inactive_validators"`
	ConsensusType      string  `json:"consensus_type"`
	CurrentEpoch       uint64  `json:"current_epoch"`
	EpochLength        uint64  `json:"epoch_length"`
	AverageUptime      float64 `json:"average_uptime"`
}

// QBFTSignerMetric representa os dados retornados pela API qbft_getSignerMetrics
type QBFTSignerMetric struct {
	Address                 string `json:"address"`
	ProposedBlockCount      string `json:"proposedBlockCount"`      // Hex string
	LastProposedBlockNumber string `json:"lastProposedBlockNumber"` // Hex string
}

// QBFTValidatorsResponse representa a resposta da API qbft_getValidatorsByBlockNumber
type QBFTValidatorsResponse struct {
	Validators []string `json:"validators"`
}
