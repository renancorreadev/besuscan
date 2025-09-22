package repositories

import (
	"context"
)

// SmartContractRepository interface para operações com smart contracts
type SmartContractRepository interface {
	// GetContractName busca o nome de um contrato pelo endereço
	GetContractName(ctx context.Context, address string) (string, error)
}
