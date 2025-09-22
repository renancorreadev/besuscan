package services

import (
	"context"
	"fmt"
	"log"
	"math/big"
	"strings"
	"time"

	"github.com/hubweb3/worker/internal/domain/entities"
	"github.com/jackc/pgx/v4/pgxpool"
)

// AccountTaggingService gerencia tags automáticas para accounts
type AccountTaggingService struct {
	db *pgxpool.Pool
}

// NewAccountTaggingService cria uma nova instância do serviço
func NewAccountTaggingService(db *pgxpool.Pool) *AccountTaggingService {
	return &AccountTaggingService{
		db: db,
	}
}

// ProcessAccountForTags analisa uma account e adiciona tags automáticas
func (s *AccountTaggingService) ProcessAccountForTags(ctx context.Context, address string, tx *entities.Transaction) error {
	address = strings.ToLower(address)

	// Buscar dados da account
	accountData, err := s.getAccountData(ctx, address)
	if err != nil {
		return fmt.Errorf("erro ao buscar dados da account: %w", err)
	}

	// Analisar padrões e adicionar tags
	tags := s.analyzeAccountPatterns(accountData, tx)

	// Adicionar tags ao banco
	for _, tag := range tags {
		if err := s.addTag(ctx, address, tag); err != nil {
			log.Printf("⚠️ Erro ao adicionar tag '%s' para account %s: %v", tag, address, err)
		}
	}

	return nil
}

// AccountData representa dados de uma account para análise
type AccountData struct {
	Address                   string
	AccountType               string
	Balance                   string
	TransactionCount          int64
	ContractInteractions      int64
	SmartContractDeployments  int64
	IsContract                bool
	ContractType              string
	LastActivity              *time.Time
	UniqueContractsInteracted int64
	AvgTransactionValue       string
	MaxTransactionValue       string
	TotalValueTransferred     string
	SuccessRate               float64
	MostUsedMethod            string
	TokenHoldingsCount        int64
	HighestValueTokenHolding  string
}

// getAccountData busca dados completos de uma account
func (s *AccountTaggingService) getAccountData(ctx context.Context, address string) (*AccountData, error) {
	data := &AccountData{Address: address}

	// Buscar dados básicos da account
	query := `
		SELECT 
			account_type, balance, transaction_count, contract_interactions,
			smart_contract_deployments, is_contract, COALESCE(contract_type, ''),
			last_activity
		FROM accounts 
		WHERE address = $1
	`

	err := s.db.QueryRow(ctx, query, address).Scan(
		&data.AccountType, &data.Balance, &data.TransactionCount,
		&data.ContractInteractions, &data.SmartContractDeployments,
		&data.IsContract, &data.ContractType, &data.LastActivity,
	)
	if err != nil {
		return nil, err
	}

	// Buscar estatísticas de interações com contratos
	contractStatsQuery := `
		SELECT 
			COUNT(DISTINCT contract_address) as unique_contracts,
			COALESCE(MAX(interactions_count), 0) as max_interactions,
			COALESCE(
				(SELECT method FROM contract_interactions 
				 WHERE account_address = $1 
				 ORDER BY interactions_count DESC LIMIT 1), 
				''
			) as most_used_method
		FROM contract_interactions 
		WHERE account_address = $1
	`

	var maxInteractions int64
	err = s.db.QueryRow(ctx, contractStatsQuery, address).Scan(
		&data.UniqueContractsInteracted, &maxInteractions, &data.MostUsedMethod,
	)
	if err != nil {
		// Se não há interações, usar valores padrão
		data.UniqueContractsInteracted = 0
		data.MostUsedMethod = ""
	}

	// Buscar estatísticas de transações
	txStatsQuery := `
		SELECT 
			COALESCE(AVG(value_transferred::NUMERIC), 0) as avg_value,
			COALESCE(MAX(value_transferred::NUMERIC), 0) as max_value,
			COALESCE(SUM(value_transferred::NUMERIC), 0) as total_value,
			COALESCE(AVG(success_rate), 0) as success_rate
		FROM account_analytics 
		WHERE address = $1
	`

	err = s.db.QueryRow(ctx, txStatsQuery, address).Scan(
		&data.AvgTransactionValue, &data.MaxTransactionValue,
		&data.TotalValueTransferred, &data.SuccessRate,
	)
	if err != nil {
		// Se não há analytics, usar valores padrão
		data.AvgTransactionValue = "0"
		data.MaxTransactionValue = "0"
		data.TotalValueTransferred = "0"
		data.SuccessRate = 0
	}

	// Buscar estatísticas de token holdings
	tokenStatsQuery := `
		SELECT 
			COUNT(*) as token_count,
			COALESCE(MAX(balance::NUMERIC), 0) as highest_balance
		FROM token_holdings 
		WHERE account_address = $1 AND balance::NUMERIC > 0
	`

	err = s.db.QueryRow(ctx, tokenStatsQuery, address).Scan(
		&data.TokenHoldingsCount, &data.HighestValueTokenHolding,
	)
	if err != nil {
		// Se não há tokens, usar valores padrão
		data.TokenHoldingsCount = 0
		data.HighestValueTokenHolding = "0"
	}

	return data, nil
}

// analyzeAccountPatterns analisa padrões da account e retorna tags apropriadas
func (s *AccountTaggingService) analyzeAccountPatterns(data *AccountData, tx *entities.Transaction) []string {
	var tags []string

	// Tags baseadas no tipo de account
	if data.IsContract {
		tags = append(tags, "contract")

		// Tags específicas por tipo de contrato
		switch data.ContractType {
		case "erc20":
			tags = append(tags, "token", "erc20")
		case "erc721":
			tags = append(tags, "nft", "erc721")
		case "erc1155":
			tags = append(tags, "multi-token", "erc1155")
		}
	} else {
		tags = append(tags, "eoa")
	}

	// Tags baseadas no volume de transações
	if data.TransactionCount > 1000 {
		tags = append(tags, "high-activity")
	} else if data.TransactionCount > 100 {
		tags = append(tags, "active")
	} else if data.TransactionCount < 10 {
		tags = append(tags, "low-activity")
	}

	// Tags baseadas no saldo
	balance, ok := new(big.Int).SetString(data.Balance, 10)
	if ok {
		// Converter para ETH (dividir por 10^18)
		ethBalance := new(big.Float).SetInt(balance)
		ethBalance.Quo(ethBalance, big.NewFloat(1e18))

		ethFloat, _ := ethBalance.Float64()

		if ethFloat > 1000 {
			tags = append(tags, "whale")
		} else if ethFloat > 100 {
			tags = append(tags, "high-balance")
		} else if ethFloat > 10 {
			tags = append(tags, "medium-balance")
		} else if ethFloat < 0.01 {
			tags = append(tags, "low-balance")
		}
	}

	// Tags baseadas em interações com contratos
	if data.ContractInteractions > 100 {
		tags = append(tags, "defi-user")
	}

	if data.UniqueContractsInteracted > 20 {
		tags = append(tags, "multi-protocol")
	}

	// Tags baseadas em deployments de contratos
	if data.SmartContractDeployments > 0 {
		tags = append(tags, "developer")

		if data.SmartContractDeployments > 10 {
			tags = append(tags, "prolific-developer")
		}
	}

	// Tags baseadas no método mais usado
	switch data.MostUsedMethod {
	case "transfer":
		tags = append(tags, "frequent-sender")
	case "approve":
		tags = append(tags, "defi-approver")
	case "swap", "swapExactTokensForTokens":
		tags = append(tags, "trader")
	}

	// Tags baseadas em holdings de tokens
	if data.TokenHoldingsCount > 50 {
		tags = append(tags, "token-collector")
	} else if data.TokenHoldingsCount > 10 {
		tags = append(tags, "token-holder")
	}

	// Tags baseadas na taxa de sucesso
	if data.SuccessRate > 0.95 {
		tags = append(tags, "reliable")
	} else if data.SuccessRate < 0.8 {
		tags = append(tags, "error-prone")
	}

	// Tags baseadas na transação atual
	if tx != nil {
		// Se é criação de contrato
		if tx.ContractAddress != nil && *tx.ContractAddress != "" {
			tags = append(tags, "contract-creator")
		}

		// Se é transação de alto valor
		if tx.Value != nil {
			value := new(big.Float).SetInt(tx.Value)
			value.Quo(value, big.NewFloat(1e18))
			ethValue, _ := value.Float64()

			if ethValue > 100 {
				tags = append(tags, "high-value-tx")
			}
		}

		// Se falhou
		if tx.Status == entities.StatusFailed {
			tags = append(tags, "failed-tx")
		}
	}

	// Remover duplicatas
	return s.removeDuplicates(tags)
}

// addTag adiciona uma tag para uma account (se não existir)
func (s *AccountTaggingService) addTag(ctx context.Context, address, tag string) error {
	query := `
		INSERT INTO account_tags (address, tag, created_by, created_at)
		VALUES ($1, $2, 'system', NOW())
		ON CONFLICT (address, tag) DO NOTHING
	`

	_, err := s.db.Exec(ctx, query, address, tag)
	return err
}

// removeDuplicates remove tags duplicadas
func (s *AccountTaggingService) removeDuplicates(tags []string) []string {
	seen := make(map[string]bool)
	result := []string{}

	for _, tag := range tags {
		if !seen[tag] {
			seen[tag] = true
			result = append(result, tag)
		}
	}

	return result
}

// ProcessBatchTags processa tags para múltiplas accounts em lote
func (s *AccountTaggingService) ProcessBatchTags(ctx context.Context, addresses []string) error {
	for _, address := range addresses {
		if err := s.ProcessAccountForTags(ctx, address, nil); err != nil {
			log.Printf("⚠️ Erro ao processar tags para account %s: %v", address, err)
		}
	}
	return nil
}

// UpdateTagsBasedOnAnalytics atualiza tags baseadas em analytics recentes
func (s *AccountTaggingService) UpdateTagsBasedOnAnalytics(ctx context.Context) error {
	// Buscar accounts com atividade recente
	query := `
		SELECT DISTINCT address 
		FROM account_analytics 
		WHERE date >= CURRENT_DATE - INTERVAL '7 days'
		ORDER BY address
	`

	rows, err := s.db.Query(ctx, query)
	if err != nil {
		return err
	}
	defer rows.Close()

	var addresses []string
	for rows.Next() {
		var address string
		if err := rows.Scan(&address); err != nil {
			continue
		}
		addresses = append(addresses, address)
	}

	// Processar em lotes de 100
	batchSize := 100
	for i := 0; i < len(addresses); i += batchSize {
		end := i + batchSize
		if end > len(addresses) {
			end = len(addresses)
		}

		batch := addresses[i:end]
		if err := s.ProcessBatchTags(ctx, batch); err != nil {
			log.Printf("⚠️ Erro ao processar lote de tags: %v", err)
		}
	}

	return nil
}
