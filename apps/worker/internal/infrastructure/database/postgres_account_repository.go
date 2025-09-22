package database

import (
	"context"
	"database/sql"
	"fmt"
	"math/big"

	"github.com/hubweb3/worker/internal/domain/entities"
)

// PostgresAccountRepository implementa operações de escrita para accounts
type PostgresAccountRepository struct {
	db *sql.DB
}

// NewPostgresAccountRepository cria uma nova instância do repositório PostgreSQL
func NewPostgresAccountRepository(db *sql.DB) *PostgresAccountRepository {
	return &PostgresAccountRepository{db: db}
}

// Create salva uma nova account no banco de dados
func (r *PostgresAccountRepository) Create(ctx context.Context, account *entities.Account) error {
	query := `
		INSERT INTO accounts (
			address, account_type, balance, nonce, transaction_count,
			is_contract, contract_type, first_seen, last_activity,
			factory_address, implementation_address, owner_address,
			label, risk_score, compliance_status, compliance_notes,
			created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7, $8, $9,
			$10, $11, $12,
			$13, $14, $15, $16,
			NOW(), NOW()
		)
		ON CONFLICT (address) DO UPDATE SET
			account_type = EXCLUDED.account_type,
			balance = EXCLUDED.balance,
			nonce = EXCLUDED.nonce,
			transaction_count = EXCLUDED.transaction_count,
			is_contract = EXCLUDED.is_contract,
			contract_type = EXCLUDED.contract_type,
			last_activity = EXCLUDED.last_activity,
			factory_address = EXCLUDED.factory_address,
			implementation_address = EXCLUDED.implementation_address,
			owner_address = EXCLUDED.owner_address,
			label = EXCLUDED.label,
			risk_score = EXCLUDED.risk_score,
			compliance_status = EXCLUDED.compliance_status,
			compliance_notes = EXCLUDED.compliance_notes,
			updated_at = NOW()
	`

	// Preparar valores para inserção
	var balance string
	if account.Balance != nil {
		balance = account.Balance.String()
	} else {
		balance = "0"
	}

	var contractType *string
	if account.ContractType != nil && *account.ContractType != "" {
		contractType = account.ContractType
	}

	var factoryAddress, implementationAddress, ownerAddress *string
	if account.FactoryAddress != nil && *account.FactoryAddress != "" {
		factoryAddress = account.FactoryAddress
	}
	if account.ImplementationAddress != nil && *account.ImplementationAddress != "" {
		implementationAddress = account.ImplementationAddress
	}
	if account.OwnerAddress != nil && *account.OwnerAddress != "" {
		ownerAddress = account.OwnerAddress
	}

	var label *string
	if account.Label != nil && *account.Label != "" {
		label = account.Label
	}

	var riskScore *int
	if account.RiskScore != nil && *account.RiskScore > 0 {
		riskScore = account.RiskScore
	}

	var complianceStatus *string
	if account.ComplianceStatus != "" {
		status := string(account.ComplianceStatus)
		complianceStatus = &status
	}

	var complianceNotes *string
	if account.ComplianceNotes != nil && *account.ComplianceNotes != "" {
		complianceNotes = account.ComplianceNotes
	}

	_, err := r.db.ExecContext(ctx, query,
		account.Address,
		string(account.Type),
		balance,
		account.Nonce,
		account.TransactionCount,
		account.IsContract,
		contractType,
		account.FirstSeen,
		account.LastActivity,
		factoryAddress,
		implementationAddress,
		ownerAddress,
		label,
		riskScore,
		complianceStatus,
		complianceNotes,
	)

	if err != nil {
		return fmt.Errorf("erro ao criar account %s: %w", account.Address, err)
	}

	return nil
}

// GetByAddress busca uma account pelo endereço (método simples para verificação)
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

	row := r.db.QueryRowContext(ctx, query, address)

	account := &entities.Account{}
	var balance string
	var contractType, factoryAddress, implementationAddress, ownerAddress *string
	var label *string
	var riskScore *int
	var complianceStatus, complianceNotes *string

	err := row.Scan(
		&account.Address,
		&account.Type,
		&balance,
		&account.Nonce,
		&account.TransactionCount,
		&account.IsContract,
		&contractType,
		&account.FirstSeen,
		&account.LastActivity,
		&factoryAddress,
		&implementationAddress,
		&ownerAddress,
		&label,
		&riskScore,
		&complianceStatus,
		&complianceNotes,
		&account.CreatedAt,
		&account.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil // Account não encontrada
		}
		return nil, fmt.Errorf("erro ao buscar account: %w", err)
	}

	// Converter campos opcionais
	if contractType != nil {
		account.ContractType = contractType
	}
	if factoryAddress != nil {
		account.FactoryAddress = factoryAddress
	}
	if implementationAddress != nil {
		account.ImplementationAddress = implementationAddress
	}
	if ownerAddress != nil {
		account.OwnerAddress = ownerAddress
	}
	if label != nil {
		account.Label = label
	}
	if riskScore != nil {
		account.RiskScore = riskScore
	}
	if complianceStatus != nil {
		account.ComplianceStatus = entities.ComplianceStatus(*complianceStatus)
	}
	if complianceNotes != nil {
		account.ComplianceNotes = complianceNotes
	}

	// Converter balance string para big.Int
	if balance != "" && balance != "0" {
		account.Balance = new(big.Int)
		account.Balance.SetString(balance, 10)
	}

	return account, nil
}
