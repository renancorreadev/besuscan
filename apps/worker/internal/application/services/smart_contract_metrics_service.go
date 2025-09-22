package services

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/hubweb3/worker/internal/domain/entities"
	"github.com/jackc/pgx/v4/pgxpool"
)

// SmartContractMetricsService gerencia métricas de smart contracts
type SmartContractMetricsService struct {
	db *pgxpool.Pool
}

// NewSmartContractMetricsService cria uma nova instância do serviço
func NewSmartContractMetricsService(db *pgxpool.Pool) *SmartContractMetricsService {
	return &SmartContractMetricsService{
		db: db,
	}
}

// UpdateContractMetricsFromTransaction atualiza métricas do contrato baseado em uma transação
func (s *SmartContractMetricsService) UpdateContractMetricsFromTransaction(ctx context.Context, tx *entities.Transaction) error {
	// Verificar se a transação é para um smart contract
	var contractAddress string
	var isContractInteraction bool

	// Caso 1: Criação de contrato
	if tx.ContractAddress != nil && *tx.ContractAddress != "" {
		contractAddress = *tx.ContractAddress
		isContractInteraction = true
		log.Printf("📊 Transação %s criou contrato %s", tx.Hash, contractAddress)
	}

	// Caso 2: Interação com contrato existente (to_address é um contrato)
	if tx.To != nil && *tx.To != "" && !isContractInteraction {
		// Verificar se o endereço de destino é um smart contract
		isContract, err := s.isSmartContract(ctx, *tx.To)
		if err != nil {
			log.Printf("⚠️ Erro ao verificar se %s é contrato: %v", *tx.To, err)
		} else if isContract {
			contractAddress = *tx.To
			isContractInteraction = true
			log.Printf("📊 Transação %s interagiu com contrato %s", tx.Hash, contractAddress)
		}
	}

	// Se não é interação com contrato, não fazer nada
	if !isContractInteraction {
		return nil
	}

	// Atualizar métricas do contrato
	if err := s.updateContractTotalMetrics(ctx, contractAddress, tx); err != nil {
		return fmt.Errorf("erro ao atualizar métricas totais do contrato %s: %w", contractAddress, err)
	}

	// Atualizar métricas diárias
	if err := s.updateContractDailyMetrics(ctx, contractAddress, tx); err != nil {
		return fmt.Errorf("erro ao atualizar métricas diárias do contrato %s: %w", contractAddress, err)
	}

	log.Printf("✅ Métricas atualizadas para contrato %s", contractAddress)
	return nil
}

// isSmartContract verifica se um endereço é um smart contract
func (s *SmartContractMetricsService) isSmartContract(ctx context.Context, address string) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM smart_contracts WHERE address = $1)`

	var exists bool
	err := s.db.QueryRow(ctx, query, address).Scan(&exists)
	if err != nil {
		return false, err
	}

	return exists, nil
}

// updateContractTotalMetrics atualiza as métricas totais do contrato
func (s *SmartContractMetricsService) updateContractTotalMetrics(ctx context.Context, contractAddress string, tx *entities.Transaction) error {
	// Calcular valores para atualização
	gasUsed := int64(0)
	if tx.GasUsed != nil {
		gasUsed = int64(*tx.GasUsed)
	}

	valueTransferred := "0"
	if tx.Value != nil {
		valueTransferred = tx.Value.String()
	}

	// Query para atualizar métricas totais
	query := `
		UPDATE smart_contracts SET
			total_transactions = total_transactions + 1,
			total_gas_used = total_gas_used + $2,
			total_value_transferred = total_value_transferred + $3,
			last_transaction_at = $4,
			last_activity_at = $4,
			updated_at = NOW()
		WHERE address = $1
	`

	minedAt := time.Now()
	if tx.MinedAt != nil {
		minedAt = *tx.MinedAt
	}

	_, err := s.db.Exec(ctx, query, contractAddress, gasUsed, valueTransferred, minedAt)
	if err != nil {
		return fmt.Errorf("erro ao atualizar métricas totais: %w", err)
	}

	// Atualizar first_transaction_at se for a primeira transação
	firstTxQuery := `
		UPDATE smart_contracts SET
			first_transaction_at = $2
		WHERE address = $1 AND first_transaction_at IS NULL
	`

	_, err = s.db.Exec(ctx, firstTxQuery, contractAddress, minedAt)
	if err != nil {
		return fmt.Errorf("erro ao atualizar primeira transação: %w", err)
	}

	return nil
}

// updateContractDailyMetrics atualiza as métricas diárias do contrato
func (s *SmartContractMetricsService) updateContractDailyMetrics(ctx context.Context, contractAddress string, tx *entities.Transaction) error {
	// Determinar a data da transação
	txDate := time.Now()
	if tx.MinedAt != nil {
		txDate = *tx.MinedAt
	}
	date := txDate.Format("2006-01-02")

	// Calcular valores
	gasUsed := int64(0)
	if tx.GasUsed != nil {
		gasUsed = int64(*tx.GasUsed)
	}

	valueTransferred := "0"
	if tx.Value != nil {
		valueTransferred = tx.Value.String()
	}

	// Determinar taxa de sucesso (1.0 para sucesso, 0.0 para falha)
	successRate := 1.0
	if tx.Status == entities.StatusFailed {
		successRate = 0.0
	}

	// Query para inserir ou atualizar métricas diárias
	query := `
		INSERT INTO smart_contract_daily_metrics (
			contract_address, date, transactions_count, gas_used, 
			value_transferred, avg_gas_per_tx, success_rate, created_at
		) VALUES (
			$1, $2, 1, $3, $4, $3, $5, NOW()
		)
		ON CONFLICT (contract_address, date) DO UPDATE SET
			transactions_count = smart_contract_daily_metrics.transactions_count + 1,
			gas_used = smart_contract_daily_metrics.gas_used + $3,
			value_transferred = smart_contract_daily_metrics.value_transferred + $4,
			avg_gas_per_tx = (smart_contract_daily_metrics.gas_used + $3) / (smart_contract_daily_metrics.transactions_count + 1),
			success_rate = (
				(smart_contract_daily_metrics.success_rate * smart_contract_daily_metrics.transactions_count) + $5
			) / (smart_contract_daily_metrics.transactions_count + 1)
	`

	_, err := s.db.Exec(ctx, query, contractAddress, date, gasUsed, valueTransferred, successRate)
	if err != nil {
		return fmt.Errorf("erro ao atualizar métricas diárias: %w", err)
	}

	// Atualizar contagem de endereços únicos (aproximação simples)
	if err := s.updateUniqueAddressesCount(ctx, contractAddress, date, tx.From); err != nil {
		log.Printf("⚠️ Erro ao atualizar contagem de endereços únicos: %v", err)
		// Não retornar erro para não falhar o processamento principal
	}

	return nil
}

// updateUniqueAddressesCount atualiza a contagem de endereços únicos (implementação simplificada)
func (s *SmartContractMetricsService) updateUniqueAddressesCount(ctx context.Context, contractAddress, date, fromAddress string) error {
	// Esta é uma implementação simplificada. Para uma implementação completa,
	// seria necessário manter uma tabela separada de endereços únicos por contrato/data

	// Por enquanto, vamos apenas incrementar se for um novo endereço para este contrato hoje
	checkQuery := `
		SELECT EXISTS(
			SELECT 1 FROM transactions t
			WHERE (t.to_address = $1 OR t.contract_address = $1)
			AND t.from_address = $2
			AND DATE(t.mined_at) = $3
			AND t.hash != (
				SELECT hash FROM transactions 
				WHERE (to_address = $1 OR contract_address = $1) 
				AND from_address = $2 
				AND DATE(mined_at) = $3 
				ORDER BY mined_at DESC 
				LIMIT 1
			)
		)
	`

	var hasOtherTxToday bool
	err := s.db.QueryRow(ctx, checkQuery, contractAddress, fromAddress, date).Scan(&hasOtherTxToday)
	if err != nil {
		return err
	}

	// Se não tem outras transações hoje, incrementar unique_addresses_count
	if !hasOtherTxToday {
		updateQuery := `
			UPDATE smart_contract_daily_metrics 
			SET unique_addresses_count = unique_addresses_count + 1
			WHERE contract_address = $1 AND date = $2
		`
		_, err = s.db.Exec(ctx, updateQuery, contractAddress, date)
		if err != nil {
			return err
		}
	}

	return nil
}

// GetContractDailyMetrics retorna métricas diárias de um contrato
func (s *SmartContractMetricsService) GetContractDailyMetrics(ctx context.Context, contractAddress string, days int) ([]map[string]interface{}, error) {
	query := `
		SELECT 
			date,
			transactions_count,
			unique_addresses_count,
			gas_used,
			value_transferred,
			avg_gas_per_tx,
			success_rate
		FROM smart_contract_daily_metrics
		WHERE contract_address = $1
		AND date >= CURRENT_DATE - INTERVAL '%d days'
		ORDER BY date DESC
	`

	rows, err := s.db.Query(ctx, fmt.Sprintf(query, days), contractAddress)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var metrics []map[string]interface{}
	for rows.Next() {
		var date time.Time
		var transactionsCount, uniqueAddressesCount int64
		var gasUsed, valueTransferred string
		var avgGasPerTx, successRate *float64

		err := rows.Scan(
			&date, &transactionsCount, &uniqueAddressesCount,
			&gasUsed, &valueTransferred, &avgGasPerTx, &successRate,
		)
		if err != nil {
			return nil, err
		}

		metric := map[string]interface{}{
			"date":                   date.Format("2006-01-02"),
			"transactions_count":     transactionsCount,
			"unique_addresses_count": uniqueAddressesCount,
			"gas_used":               gasUsed,
			"value_transferred":      valueTransferred,
		}

		if avgGasPerTx != nil {
			metric["avg_gas_per_tx"] = *avgGasPerTx
		}
		if successRate != nil {
			metric["success_rate"] = *successRate
		}

		metrics = append(metrics, metric)
	}

	return metrics, nil
}

// ExecuteQuery executa uma query personalizada (para uso pelo TransactionHandler)
func (s *SmartContractMetricsService) ExecuteQuery(ctx context.Context, query string, args ...interface{}) (interface{}, error) {
	return s.db.Exec(ctx, query, args...)
}
