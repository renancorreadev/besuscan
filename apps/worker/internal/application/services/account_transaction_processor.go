package services

import (
	"context"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"math/big"
	"strings"
	"time"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/ethclient"
	"github.com/hubweb3/worker/internal/domain/entities"
	"github.com/jackc/pgx/v4/pgxpool"
)

// AccountTransactionProcessor processa transações e extrai dados de accounts
type AccountTransactionProcessor struct {
	db                       *pgxpool.Pool
	ethClient                *ethclient.Client
	taggingService           *AccountTaggingService
	transactionMethodService *TransactionMethodService
}

// NewAccountTransactionProcessor cria uma nova instância do processador
func NewAccountTransactionProcessor(db *pgxpool.Pool, ethClient *ethclient.Client) *AccountTransactionProcessor {
	return &AccountTransactionProcessor{
		db:                       db,
		ethClient:                ethClient,
		taggingService:           NewAccountTaggingService(db),
		transactionMethodService: NewTransactionMethodService(db),
	}
}

// TokenInfo representa informações de um token
type TokenInfo struct {
	Symbol      string
	Name        string
	Decimals    int
	Description string
}

// SmartContractInfo representa informações básicas de um smart contract
type SmartContractInfo struct {
	Address      string
	Name         string
	Symbol       string
	ContractType string
	IsToken      bool
	Description  string
}

// ProcessTransaction processa uma transação e extrai todos os dados relacionados a accounts
func (p *AccountTransactionProcessor) ProcessTransaction(ctx context.Context, tx *entities.Transaction) error {
	log.Printf("🔄 Processando dados de accounts para transação %s", tx.Hash)

	// 1. Processar accounts envolvidas na transação
	if err := p.processAccountsFromTransaction(ctx, tx); err != nil {
		log.Printf("❌ Erro ao processar accounts da transação %s: %v", tx.Hash, err)
		return err
	}

	// 2. Processar analytics diárias
	if err := p.processAccountAnalytics(ctx, tx); err != nil {
		log.Printf("❌ Erro ao processar analytics da transação %s: %v", tx.Hash, err)
		// Não retornar erro para não falhar o processamento principal
	}

	// 3. Processar interações com contratos
	if err := p.processContractInteractions(ctx, tx); err != nil {
		log.Printf("❌ Erro ao processar interações de contratos da transação %s: %v", tx.Hash, err)
		// Não retornar erro para não falhar o processamento principal
	}

	// 4. Processar token holdings (se aplicável)
	if err := p.processTokenHoldings(ctx, tx); err != nil {
		log.Printf("❌ Erro ao processar token holdings da transação %s: %v", tx.Hash, err)
		// Não retornar erro para não falhar o processamento principal
	}

	// 5. Processar tags automáticas para as accounts envolvidas
	if err := p.processAccountTags(ctx, tx); err != nil {
		log.Printf("❌ Erro ao processar tags da transação %s: %v", tx.Hash, err)
		// Não retornar erro para não falhar o processamento principal
	}

	// 6. Atualizar dados de smart contract se aplicável
	if err := p.processSmartContractData(ctx, tx); err != nil {
		log.Printf("❌ Erro ao processar dados de smart contract da transação %s: %v", tx.Hash, err)
		// Não retornar erro para não falhar o processamento principal
	}

	// 7. Processar transações detalhadas por conta
	if err := p.processAccountTransactions(ctx, tx); err != nil {
		log.Printf("❌ Erro ao processar transações da conta %s: %v", tx.Hash, err)
		// Não retornar erro para não falhar o processamento principal
	}

	// 8. Processar estatísticas de métodos
	if err := p.processAccountMethodStats(ctx, tx); err != nil {
		log.Printf("❌ Erro ao processar estatísticas de métodos da transação %s: %v", tx.Hash, err)
		// Não retornar erro para não falhar o processamento principal
	}

	// 9. Processar eventos relacionados à transação
	if err := p.processAccountEventsFromTransaction(ctx, tx); err != nil {
		log.Printf("❌ Erro ao processar eventos da transação %s: %v", tx.Hash, err)
		// Não retornar erro para não falhar o processamento principal
	}

	log.Printf("✅ Dados de accounts processados para transação %s", tx.Hash)
	return nil
}

// processSmartContractData processa e atualiza dados de smart contracts envolvidos na transação
func (p *AccountTransactionProcessor) processSmartContractData(ctx context.Context, tx *entities.Transaction) error {
	if tx.ContractAddress != nil && *tx.ContractAddress != "" {
		contractAddr := strings.ToLower(*tx.ContractAddress)
		log.Printf("🔍 Processando NOVO smart contract criado: %s", contractAddr)

		if err := p.updateSmartContractFromDB(ctx, contractAddr, tx); err != nil {
			log.Printf("⚠️ Erro ao criar dados do contrato %s: %v", contractAddr, err)
		} else {
			log.Printf("✅ Novo smart contract %s registrado com sucesso", contractAddr)
		}
	}
	return nil
}

// updateSmartContractFromDB atualiza dados do smart contract usando apenas o banco de dados
func (p *AccountTransactionProcessor) updateSmartContractFromDB(ctx context.Context, contractAddress string, tx *entities.Transaction) error {
	// Verificar se já existe na tabela smart_contracts
	exists, err := p.checkSmartContractExists(ctx, contractAddress)
	if err != nil {
		return fmt.Errorf("erro ao verificar existência do contrato: %w", err)
	}

	if exists {
		// Se já existe, apenas atualizar métricas básicas
		return p.updateSmartContractMetrics(ctx, contractAddress)
	}

	// Se não existe, criar entrada básica baseada na transação
	return p.createBasicSmartContractEntry(ctx, contractAddress, tx)
}

// createBasicSmartContractEntry cria uma entrada básica de smart contract
func (p *AccountTransactionProcessor) createBasicSmartContractEntry(ctx context.Context, contractAddress string, tx *entities.Transaction) error {
	// VALIDAÇÃO CRÍTICA: Verificar novamente se realmente é um contrato
	if !p.isContractAddress(ctx, contractAddress) {
		log.Printf("❌ Warning: %s is not a contract", contractAddress)
		return fmt.Errorf("address %s is not a contract", contractAddress)
	}

	// Buscar informações básicas da blockchain
	balance, err := p.getAccountBalance(ctx, contractAddress)
	if err != nil {
		balance = "0"
	}

	contractType := p.detectContractType(ctx, contractAddress)
	isToken := strings.Contains(contractType, "erc")

	// Validação adicional: se não conseguiu detectar tipo, pode ser falso positivo
	if contractType == "unknown" {
		log.Printf("⚠️ Não foi possível detectar tipo do contrato %s, verificando se é válido", contractAddress)

		// Se não é criação de contrato e não tem tipo detectado, pode ser falso positivo
		if tx.ContractAddress == nil || strings.ToLower(*tx.ContractAddress) != contractAddress {
			log.Printf("❌ Contrato %s não tem tipo detectado e não é criação, pode ser falso positivo", contractAddress)
			return fmt.Errorf("contrato %s parece ser falso positivo", contractAddress)
		}
	}

	// Tentar buscar informações de token se aplicável
	var name, symbol string
	if isToken {
		if tokenInfo, err := p.fetchTokenInfoFromBlockchain(ctx, contractAddress); err == nil {
			name = tokenInfo.Name
			symbol = tokenInfo.Symbol
		}
	}

	// Determinar dados de criação
	creatorAddress := tx.From
	creationTxHash := tx.Hash
	creationBlockNumber := int64(0)
	creationTimestamp := time.Now()

	if tx.BlockNumber != nil {
		creationBlockNumber = int64(*tx.BlockNumber)
	}
	if tx.MinedAt != nil {
		creationTimestamp = *tx.MinedAt
	}

	// Se é um contrato criado nesta transação
	if tx.ContractAddress != nil && strings.ToLower(*tx.ContractAddress) == contractAddress {
		// Dados de criação são desta transação
	} else {
		// Contrato já existia, buscar dados de criação se possível
		creationData, err := p.findContractCreationData(ctx, contractAddress)
		if err == nil && creationData != nil {
			creatorAddress = creationData.CreatorAddress
			creationTxHash = creationData.CreationTxHash
			creationBlockNumber = creationData.CreationBlockNumber
			creationTimestamp = creationData.CreationTimestamp
		}
	}

	query := `
		INSERT INTO smart_contracts (
			address, name, symbol, contract_type, creator_address, creation_tx_hash,
			creation_block_number, creation_timestamp, balance, is_token,
			is_active, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, NOW(), NOW()
		)
		ON CONFLICT (address) DO UPDATE SET
			name = COALESCE(EXCLUDED.name, smart_contracts.name),
			symbol = COALESCE(EXCLUDED.symbol, smart_contracts.symbol),
			contract_type = COALESCE(EXCLUDED.contract_type, smart_contracts.contract_type),
			balance = EXCLUDED.balance,
			is_token = EXCLUDED.is_token,
			updated_at = NOW()
	`

	_, err = p.db.Exec(ctx, query,
		contractAddress,     // $1
		name,                // $2
		symbol,              // $3
		contractType,        // $4
		creatorAddress,      // $5
		creationTxHash,      // $6
		creationBlockNumber, // $7
		creationTimestamp,   // $8
		balance,             // $9
		isToken,             // $10
	)

	if err != nil {
		return fmt.Errorf("erro ao criar entrada básica do smart contract: %w", err)
	}

	log.Printf("✅ Entrada básica do smart contract %s criada com sucesso", contractAddress)
	return nil
}

// ContractCreationData representa dados de criação de um contrato
type ContractCreationData struct {
	CreatorAddress      string
	CreationTxHash      string
	CreationBlockNumber int64
	CreationTimestamp   time.Time
}

// findContractCreationData busca dados de criação de um contrato
func (p *AccountTransactionProcessor) findContractCreationData(ctx context.Context, contractAddress string) (*ContractCreationData, error) {
	// Tentar buscar da tabela de transações onde o contrato foi criado
	query := `
		SELECT 
			"from" as creator_address,
			hash as creation_tx_hash,
			COALESCE(block_number, 0) as creation_block_number,
			COALESCE(mined_at, NOW()) as creation_timestamp
		FROM transactions 
		WHERE contract_address = $1 
		ORDER BY block_number ASC, transaction_index ASC 
		LIMIT 1
	`

	var data ContractCreationData
	err := p.db.QueryRow(ctx, query, contractAddress).Scan(
		&data.CreatorAddress,
		&data.CreationTxHash,
		&data.CreationBlockNumber,
		&data.CreationTimestamp,
	)

	if err != nil {
		return nil, err
	}

	return &data, nil
}

// checkSmartContractExists verifica se o smart contract já existe na tabela
func (p *AccountTransactionProcessor) checkSmartContractExists(ctx context.Context, contractAddress string) (bool, error) {
	var count int
	query := `SELECT COUNT(*) FROM smart_contracts WHERE address = $1`

	err := p.db.QueryRow(ctx, query, contractAddress).Scan(&count)
	if err != nil {
		return false, err
	}

	return count > 0, nil
}

// updateSmartContractMetrics atualiza apenas as métricas básicas do smart contract
func (p *AccountTransactionProcessor) updateSmartContractMetrics(ctx context.Context, contractAddress string) error {
	// Buscar saldo atual
	balance, err := p.getAccountBalance(ctx, contractAddress)
	if err != nil {
		balance = "0"
	}

	query := `
		UPDATE smart_contracts SET
			balance = $2,
			last_activity_at = NOW(),
			updated_at = NOW()
		WHERE address = $1
	`

	_, err = p.db.Exec(ctx, query, contractAddress, balance)
	if err != nil {
		return fmt.Errorf("erro ao atualizar métricas do smart contract: %w", err)
	}

	return nil
}

// processAccountTags processa tags automáticas para as accounts da transação
func (p *AccountTransactionProcessor) processAccountTags(ctx context.Context, tx *entities.Transaction) error {
	// Processar tags para conta remetente
	if err := p.taggingService.ProcessAccountForTags(ctx, tx.From, tx); err != nil {
		log.Printf("⚠️ Erro ao processar tags para conta remetente %s: %v", tx.From, err)
	}

	// Processar tags para conta destinatária (se existir)
	if tx.To != nil && *tx.To != "" {
		if err := p.taggingService.ProcessAccountForTags(ctx, *tx.To, tx); err != nil {
			log.Printf("⚠️ Erro ao processar tags para conta destinatária %s: %v", *tx.To, err)
		}
	}

	// Processar tags para contrato criado (se aplicável)
	if tx.ContractAddress != nil && *tx.ContractAddress != "" {
		if err := p.taggingService.ProcessAccountForTags(ctx, *tx.ContractAddress, tx); err != nil {
			log.Printf("⚠️ Erro ao processar tags para contrato criado %s: %v", *tx.ContractAddress, err)
		}
	}

	return nil
}

// processAccountsFromTransaction processa as accounts envolvidas na transação
func (p *AccountTransactionProcessor) processAccountsFromTransaction(ctx context.Context, tx *entities.Transaction) error {
	// Processar conta remetente (sempre é uma EOA, nunca contrato)
	if err := p.upsertAccount(ctx, tx.From, tx); err != nil {
		return fmt.Errorf("erro ao processar conta remetente %s: %w", tx.From, err)
	}

	// Processar conta destinatária APENAS se NÃO for contrato
	if tx.To != nil && *tx.To != "" && !p.isContractAddress(ctx, *tx.To) {
		if err := p.upsertAccount(ctx, *tx.To, tx); err != nil {
			return fmt.Errorf("erro ao processar conta destinatária %s: %w", *tx.To, err)
		}
	}

	// Processar contrato criado (se aplicável)
	if tx.ContractAddress != nil && *tx.ContractAddress != "" {
		if err := p.upsertContractAccount(ctx, *tx.ContractAddress, tx); err != nil {
			return fmt.Errorf("erro ao processar contrato criado %s: %w", *tx.ContractAddress, err)
		}
	}

	return nil
}

// upsertAccount cria ou atualiza uma account baseada na transação
func (p *AccountTransactionProcessor) upsertAccount(ctx context.Context, address string, tx *entities.Transaction) error {
	// Normalizar endereço para lowercase
	address = strings.ToLower(address)

	// Buscar saldo atual da conta
	balance, err := p.getAccountBalance(ctx, address)
	if err != nil {
		log.Printf("⚠️ Erro ao buscar saldo da conta %s: %v", address, err)
		balance = "0" // Usar 0 como fallback
	}

	// Determinar tipo de conta
	accountType := "eoa"
	isContract := false
	if p.isContractAddress(ctx, address) {
		accountType = "smart_account"
		isContract = true
	}

	// Query para upsert da account
	query := `
		INSERT INTO accounts (
			address, account_type, balance, nonce, transaction_count, 
			first_seen, last_activity, is_contract, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, 1, $5, $6, $7, NOW(), NOW()
		)
		ON CONFLICT (address) DO UPDATE SET
			balance = EXCLUDED.balance,
			transaction_count = accounts.transaction_count + 1,
			last_activity = EXCLUDED.last_activity,
			updated_at = NOW()
	`

	minedAt := time.Now()
	if tx.MinedAt != nil {
		minedAt = *tx.MinedAt
	}

	_, err = p.db.Exec(ctx, query,
		address,     // $1
		accountType, // $2
		balance,     // $3
		tx.Nonce,    // $4
		minedAt,     // $5 - first_seen
		minedAt,     // $6 - last_activity
		isContract,  // $7
	)

	if err != nil {
		return fmt.Errorf("erro ao fazer upsert da account %s: %w", address, err)
	}

	return nil
}

// upsertContractAccount cria ou atualiza uma account de contrato
func (p *AccountTransactionProcessor) upsertContractAccount(ctx context.Context, contractAddress string, tx *entities.Transaction) error {
	// Normalizar endereço para lowercase
	contractAddress = strings.ToLower(contractAddress)

	// Buscar saldo atual do contrato
	balance, err := p.getAccountBalance(ctx, contractAddress)
	if err != nil {
		log.Printf("⚠️ Erro ao buscar saldo do contrato %s: %v", contractAddress, err)
		balance = "0"
	}

	// Determinar tipo de contrato
	contractType := p.detectContractType(ctx, contractAddress)

	// Query para upsert do contrato
	query := `
		INSERT INTO accounts (
			address, account_type, balance, transaction_count, 
			first_seen, last_activity, is_contract, contract_type,
			smart_contract_deployments, created_at, updated_at
		) VALUES (
			$1, 'smart_account', $2, 1, $3, $4, true, $5, 1, NOW(), NOW()
		)
		ON CONFLICT (address) DO UPDATE SET
			balance = EXCLUDED.balance,
			transaction_count = accounts.transaction_count + 1,
			last_activity = EXCLUDED.last_activity,
			contract_type = COALESCE(EXCLUDED.contract_type, accounts.contract_type),
			updated_at = NOW()
	`

	minedAt := time.Now()
	if tx.MinedAt != nil {
		minedAt = *tx.MinedAt
	}

	_, err = p.db.Exec(ctx, query,
		contractAddress, // $1
		balance,         // $2
		minedAt,         // $3 - first_seen
		minedAt,         // $4 - last_activity
		contractType,    // $5
	)

	if err != nil {
		return fmt.Errorf("erro ao fazer upsert do contrato %s: %w", contractAddress, err)
	}

	// Incrementar contador de deployments da conta criadora
	if err := p.incrementContractDeployments(ctx, tx.From); err != nil {
		log.Printf("⚠️ Erro ao incrementar deployments da conta %s: %v", tx.From, err)
	}

	return nil
}

// processAccountAnalytics processa métricas analíticas diárias
func (p *AccountTransactionProcessor) processAccountAnalytics(ctx context.Context, tx *entities.Transaction) error {
	minedAt := time.Now()
	if tx.MinedAt != nil {
		minedAt = *tx.MinedAt
	}
	date := minedAt.Format("2006-01-02")

	// Processar analytics para conta remetente (sempre é EOA)
	if err := p.upsertAccountAnalytics(ctx, tx.From, date, tx); err != nil {
		return err
	}

	// Processar analytics para conta destinatária APENAS se NÃO for contrato
	if tx.To != nil && *tx.To != "" && !p.isContractAddress(ctx, *tx.To) {
		if err := p.upsertAccountAnalytics(ctx, *tx.To, date, tx); err != nil {
			return err
		}
	}

	return nil
}

// upsertAccountAnalytics cria ou atualiza analytics diárias de uma account
func (p *AccountTransactionProcessor) upsertAccountAnalytics(ctx context.Context, address, date string, tx *entities.Transaction) error {
	address = strings.ToLower(address)

	gasUsed := "0"
	if tx.GasUsed != nil {
		gasUsed = fmt.Sprintf("%d", *tx.GasUsed)
	}

	valueTransferred := "0"
	if tx.Value != nil {
		valueTransferred = tx.Value.String()
	}

	isSuccess := tx.Status == entities.StatusSuccess
	successRate := 0.0
	if isSuccess {
		successRate = 1.0
	}

	isContractCall := tx.To != nil && p.isContractAddress(ctx, *tx.To)
	contractCallsCount := 0
	if isContractCall {
		contractCallsCount = 1
	}

	query := `
		INSERT INTO account_analytics (
			address, date, transactions_count, gas_used, value_transferred,
			success_rate, contract_calls_count, created_at, updated_at
		) VALUES (
			$1, $2, 1, $3, $4, $5, $6, NOW(), NOW()
		)
		ON CONFLICT (address, date) DO UPDATE SET
			transactions_count = account_analytics.transactions_count + 1,
			gas_used = (account_analytics.gas_used::BIGINT + $3::BIGINT)::TEXT,
			value_transferred = (account_analytics.value_transferred::NUMERIC + $4::NUMERIC)::TEXT,
			success_rate = (
				(account_analytics.success_rate * account_analytics.transactions_count + $5) / 
				(account_analytics.transactions_count + 1)
			),
			contract_calls_count = account_analytics.contract_calls_count + $6,
			updated_at = NOW()
	`

	_, err := p.db.Exec(ctx, query,
		address,            // $1
		date,               // $2
		gasUsed,            // $3
		valueTransferred,   // $4
		successRate,        // $5
		contractCallsCount, // $6
	)

	return err
}

// processContractInteractions processa interações com contratos
func (p *AccountTransactionProcessor) processContractInteractions(ctx context.Context, tx *entities.Transaction) error {
	// Só processar se a transação tem destinatário e é para um contrato
	if tx.To == nil || *tx.To == "" || !p.isContractAddress(ctx, *tx.To) {
		return nil
	}

	contractAddress := strings.ToLower(*tx.To)
	accountAddress := strings.ToLower(tx.From)

	// Identificar método chamado
	method := p.identifyMethod(ctx, tx.Data, contractAddress)

	// Buscar nome do contrato (se disponível)
	contractName := p.getContractName(ctx, contractAddress)

	gasUsed := "0"
	if tx.GasUsed != nil {
		gasUsed = fmt.Sprintf("%d", *tx.GasUsed)
	}

	valueSent := "0"
	if tx.Value != nil {
		valueSent = tx.Value.String()
	}

	minedAt := time.Now()
	if tx.MinedAt != nil {
		minedAt = *tx.MinedAt
	}

	query := `
		INSERT INTO contract_interactions (
			account_address, contract_address, contract_name, method,
			interactions_count, last_interaction, first_interaction,
			total_gas_used, total_value_sent, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, 1, $5, $6, $7, $8, NOW(), NOW()
		)
		ON CONFLICT (account_address, contract_address, method) DO UPDATE SET
			interactions_count = contract_interactions.interactions_count + 1,
			last_interaction = EXCLUDED.last_interaction,
			total_gas_used = (contract_interactions.total_gas_used::BIGINT + $7::BIGINT)::TEXT,
			total_value_sent = (contract_interactions.total_value_sent::NUMERIC + $8::NUMERIC)::TEXT,
			updated_at = NOW()
	`

	_, err := p.db.Exec(ctx, query,
		accountAddress,  // $1
		contractAddress, // $2
		contractName,    // $3
		method,          // $4
		minedAt,         // $5 - last_interaction
		minedAt,         // $6 - first_interaction
		gasUsed,         // $7
		valueSent,       // $8
	)

	if err != nil {
		return fmt.Errorf("erro ao processar interação com contrato: %w", err)
	}

	// Incrementar contador de interações com contratos na account
	if err := p.incrementContractInteractions(ctx, accountAddress); err != nil {
		log.Printf("⚠️ Erro ao incrementar interações da conta %s: %v", accountAddress, err)
	}

	return nil
}

// processTokenHoldings processa holdings de tokens baseado nos logs da transação
func (p *AccountTransactionProcessor) processTokenHoldings(ctx context.Context, tx *entities.Transaction) error {
	// Buscar logs da transação para detectar transfers de tokens
	if tx.BlockNumber == nil {
		return nil // Não pode buscar logs sem número do bloco
	}

	// Buscar receipt da transação para obter logs
	txHash := common.HexToHash(tx.Hash)
	receipt, err := p.ethClient.TransactionReceipt(ctx, txHash)
	if err != nil {
		return fmt.Errorf("erro ao buscar receipt da transação: %w", err)
	}

	// Processar logs em busca de eventos Transfer de tokens ERC-20
	for _, logEntry := range receipt.Logs {
		if err := p.processTokenTransferLog(ctx, logEntry); err != nil {
			log.Printf("⚠️ Erro ao processar log de token transfer: %v", err)
		}
	}

	return nil
}

// processTokenTransferLog processa um log de transfer de token
func (p *AccountTransactionProcessor) processTokenTransferLog(ctx context.Context, logEntry *types.Log) error {
	// Verificar se é um evento Transfer ERC-20
	// Transfer(address indexed from, address indexed to, uint256 value)
	// Topic[0] = keccak256("Transfer(address,address,uint256)")
	transferEventSignature := "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"

	if len(logEntry.Topics) != 3 || logEntry.Topics[0].Hex() != transferEventSignature {
		return nil // Não é um evento Transfer ERC-20
	}

	tokenAddress := strings.ToLower(logEntry.Address.Hex())
	fromAddress := strings.ToLower(common.HexToAddress(logEntry.Topics[1].Hex()).Hex())
	toAddress := strings.ToLower(common.HexToAddress(logEntry.Topics[2].Hex()).Hex())

	// Decodificar valor transferido
	value := new(big.Int).SetBytes(logEntry.Data)

	// Buscar informações do token
	tokenInfo, err := p.getTokenInfo(ctx, tokenAddress)
	if err != nil {
		log.Printf("⚠️ Erro ao buscar informações do token %s: %v", tokenAddress, err)
		return nil
	}

	// Atualizar holdings do remetente (diminuir)
	if fromAddress != "0x0000000000000000000000000000000000000000" {
		if err := p.updateTokenHolding(ctx, fromAddress, tokenAddress, tokenInfo, value, false); err != nil {
			log.Printf("⚠️ Erro ao atualizar holding do remetente %s: %v", fromAddress, err)
		}
	}

	// Atualizar holdings do destinatário (aumentar)
	if toAddress != "0x0000000000000000000000000000000000000000" {
		if err := p.updateTokenHolding(ctx, toAddress, tokenAddress, tokenInfo, value, true); err != nil {
			log.Printf("⚠️ Erro ao atualizar holding do destinatário %s: %v", toAddress, err)
		}
	}

	return nil
}

// getTokenInfo busca informações de um token
func (p *AccountTransactionProcessor) getTokenInfo(ctx context.Context, tokenAddress string) (*TokenInfo, error) {
	tokenAddress = strings.ToLower(tokenAddress)

	// Primeiro, tentar buscar da tabela smart_contracts (dados mais ricos)
	var symbol, name string
	var decimals int
	var description string

	query := `
		SELECT 
			COALESCE(symbol, '') as symbol,
			COALESCE(name, '') as name,
			COALESCE(description, '') as description
		FROM smart_contracts 
		WHERE address = $1 AND is_token = true
		LIMIT 1
	`

	err := p.db.QueryRow(ctx, query, tokenAddress).Scan(&symbol, &name, &description)
	if err == nil && symbol != "" && name != "" {
		// Usar decimals padrão 18 para tokens ERC-20, mas tentar buscar da blockchain se necessário
		decimals = 18

		// Tentar buscar decimals da blockchain para precisão
		if blockchainDecimals, err := p.getTokenDecimalsFromBlockchain(ctx, tokenAddress); err == nil {
			decimals = blockchainDecimals
		}

		return &TokenInfo{
			Symbol:      symbol,
			Name:        name,
			Decimals:    decimals,
			Description: description,
		}, nil
	}

	// Segundo, tentar buscar da tabela token_holdings (cache de holdings)
	query = `
		SELECT token_symbol, token_name, token_decimals 
		FROM token_holdings 
		WHERE token_address = $1 
		LIMIT 1
	`

	err = p.db.QueryRow(ctx, query, tokenAddress).Scan(&symbol, &name, &decimals)
	if err == nil && symbol != "" && name != "" {
		return &TokenInfo{
			Symbol:   symbol,
			Name:     name,
			Decimals: decimals,
		}, nil
	}

	// Terceiro, buscar na blockchain diretamente
	blockchainTokenInfo, err := p.fetchTokenInfoFromBlockchain(ctx, tokenAddress)
	if err == nil && blockchainTokenInfo.Symbol != "" && blockchainTokenInfo.Name != "" {
		return blockchainTokenInfo, nil
	}

	// Quarto, buscar na blockchain como último recurso
	tokenInfo, err := p.fetchTokenInfoFromBlockchain(ctx, tokenAddress)
	if err != nil {
		// Fallback para valores padrão
		return &TokenInfo{
			Symbol:   "UNKNOWN",
			Name:     "Unknown Token",
			Decimals: 18,
		}, nil
	}

	return tokenInfo, nil
}

// getTokenDecimalsFromBlockchain busca apenas os decimals de um token na blockchain
func (p *AccountTransactionProcessor) getTokenDecimalsFromBlockchain(ctx context.Context, tokenAddress string) (int, error) {
	// ABI básica para o método decimals
	decimalsABI := `[{"constant":true,"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint8"}],"type":"function"}]`

	parsedABI, err := abi.JSON(strings.NewReader(decimalsABI))
	if err != nil {
		return 18, err
	}

	contractAddress := common.HexToAddress(tokenAddress)

	// Buscar decimals
	decimalsData, err := parsedABI.Pack("decimals")
	if err != nil {
		return 18, err
	}

	decimalsResult, err := p.ethClient.CallContract(ctx, ethereum.CallMsg{
		To:   &contractAddress,
		Data: decimalsData,
	}, nil)
	if err != nil {
		return 18, err
	}

	var decimals uint8
	if err := parsedABI.UnpackIntoInterface(&decimals, "decimals", decimalsResult); err != nil {
		return 18, err
	}

	return int(decimals), nil
}

// fetchTokenInfoFromBlockchain busca informações do token na blockchain
func (p *AccountTransactionProcessor) fetchTokenInfoFromBlockchain(ctx context.Context, tokenAddress string) (*TokenInfo, error) {
	// ABI básica para métodos ERC-20
	erc20ABI := `[
		{"constant":true,"inputs":[],"name":"symbol","outputs":[{"name":"","type":"string"}],"type":"function"},
		{"constant":true,"inputs":[],"name":"name","outputs":[{"name":"","type":"string"}],"type":"function"},
		{"constant":true,"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint8"}],"type":"function"}
	]`

	parsedABI, err := abi.JSON(strings.NewReader(erc20ABI))
	if err != nil {
		return nil, err
	}

	contractAddress := common.HexToAddress(tokenAddress)

	// Buscar symbol
	symbolData, err := parsedABI.Pack("symbol")
	if err != nil {
		return nil, err
	}

	symbolResult, err := p.ethClient.CallContract(ctx, ethereum.CallMsg{
		To:   &contractAddress,
		Data: symbolData,
	}, nil)
	if err != nil {
		return nil, err
	}

	var symbol string
	if err := parsedABI.UnpackIntoInterface(&symbol, "symbol", symbolResult); err != nil {
		symbol = "UNKNOWN"
	}

	// Buscar name
	nameData, err := parsedABI.Pack("name")
	if err != nil {
		return nil, err
	}

	nameResult, err := p.ethClient.CallContract(ctx, ethereum.CallMsg{
		To:   &contractAddress,
		Data: nameData,
	}, nil)
	if err != nil {
		return nil, err
	}

	var name string
	if err := parsedABI.UnpackIntoInterface(&name, "name", nameResult); err != nil {
		name = "Unknown Token"
	}

	// Buscar decimals
	decimalsData, err := parsedABI.Pack("decimals")
	if err != nil {
		return nil, err
	}

	decimalsResult, err := p.ethClient.CallContract(ctx, ethereum.CallMsg{
		To:   &contractAddress,
		Data: decimalsData,
	}, nil)
	if err != nil {
		return nil, err
	}

	var decimals uint8
	if err := parsedABI.UnpackIntoInterface(&decimals, "decimals", decimalsResult); err != nil {
		decimals = 18
	}

	return &TokenInfo{
		Symbol:      symbol,
		Name:        name,
		Decimals:    int(decimals),
		Description: "", // Blockchain não fornece descrição
	}, nil
}

// updateTokenHolding atualiza o holding de token de uma account
func (p *AccountTransactionProcessor) updateTokenHolding(ctx context.Context, accountAddress, tokenAddress string, tokenInfo *TokenInfo, amount *big.Int, isIncrease bool) error {
	// Buscar saldo atual do token para a account
	currentBalance, err := p.getTokenBalance(ctx, accountAddress, tokenAddress)
	if err != nil {
		currentBalance = big.NewInt(0)
	}

	// Calcular novo saldo
	newBalance := new(big.Int).Set(currentBalance)
	if isIncrease {
		newBalance.Add(newBalance, amount)
	} else {
		newBalance.Sub(newBalance, amount)
		// Garantir que não fique negativo
		if newBalance.Sign() < 0 {
			newBalance.SetInt64(0)
		}
	}

	// Upsert do token holding com dados enriquecidos
	query := `
		INSERT INTO token_holdings (
			account_address, token_address, token_symbol, token_name, 
			token_decimals, balance, last_updated, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, NOW(), NOW(), NOW()
		)
		ON CONFLICT (account_address, token_address) DO UPDATE SET
			balance = EXCLUDED.balance,
			token_symbol = EXCLUDED.token_symbol,
			token_name = EXCLUDED.token_name,
			token_decimals = EXCLUDED.token_decimals,
			last_updated = NOW(),
			updated_at = NOW()
	`

	// Usar nome mais descritivo se disponível
	displayName := tokenInfo.Name
	if tokenInfo.Description != "" && tokenInfo.Description != tokenInfo.Name {
		displayName = fmt.Sprintf("%s (%s)", tokenInfo.Name, tokenInfo.Description)
	}

	_, err = p.db.Exec(ctx, query,
		accountAddress,      // $1
		tokenAddress,        // $2
		tokenInfo.Symbol,    // $3
		displayName,         // $4 - Nome mais descritivo
		tokenInfo.Decimals,  // $5
		newBalance.String(), // $6
	)

	return err
}

// Métodos auxiliares

// getAccountBalance busca o saldo atual de uma account na blockchain
func (p *AccountTransactionProcessor) getAccountBalance(ctx context.Context, address string) (string, error) {
	balance, err := p.ethClient.BalanceAt(ctx, common.HexToAddress(address), nil)
	if err != nil {
		return "0", err
	}
	return balance.String(), nil
}

// getTokenBalance busca o saldo atual de token de uma account
func (p *AccountTransactionProcessor) getTokenBalance(ctx context.Context, accountAddress, tokenAddress string) (*big.Int, error) {
	var balance string
	query := `SELECT balance FROM token_holdings WHERE account_address = $1 AND token_address = $2`

	err := p.db.QueryRow(ctx, query, accountAddress, tokenAddress).Scan(&balance)
	if err != nil {
		return big.NewInt(0), err
	}

	result, ok := new(big.Int).SetString(balance, 10)
	if !ok {
		return big.NewInt(0), fmt.Errorf("invalid balance format: %s", balance)
	}

	return result, nil
}

// isContractAddress verifica se um endereço é um contrato com validações adicionais
func (p *AccountTransactionProcessor) isContractAddress(ctx context.Context, address string) bool {
	// Verificar se o endereço existe na tabela smart_contracts
	var exists bool
	query := `SELECT EXISTS(SELECT 1 FROM smart_contracts WHERE LOWER(address) = LOWER($1))`
	err := p.db.QueryRow(ctx, query, address).Scan(&exists)
	if err != nil {
		log.Printf("Erro ao verificar se %s é contrato: %v", address, err)
		return false
	}

	return exists
}

// isZeroBytes verifica se todos os bytes são zero
func isZeroBytes(data []byte) bool {
	for _, b := range data {
		if b != 0 {
			return false
		}
	}
	return true
}

// detectContractType detecta o tipo de contrato baseado no código
func (p *AccountTransactionProcessor) detectContractType(ctx context.Context, contractAddress string) string {
	// Implementação básica - pode ser expandida
	code, err := p.ethClient.CodeAt(ctx, common.HexToAddress(contractAddress), nil)
	if err != nil || len(code) == 0 {
		return "unknown"
	}

	// Detectar padrões conhecidos no bytecode
	codeHex := hex.EncodeToString(code)

	// ERC-20 Token
	if strings.Contains(codeHex, "a9059cbb") && strings.Contains(codeHex, "23b872dd") {
		return "erc20"
	}

	// ERC-721 NFT
	if strings.Contains(codeHex, "42842e0e") && strings.Contains(codeHex, "b88d4fde") {
		return "erc721"
	}

	// ERC-1155 Multi-Token
	if strings.Contains(codeHex, "f242432a") && strings.Contains(codeHex, "2eb2c2d6") {
		return "erc1155"
	}

	return "contract"
}

// identifyMethod identifica o método chamado baseado nos dados da transação
// identifyMethod identifica o método usando ABI do contrato quando disponível
func (p *AccountTransactionProcessor) identifyMethod(ctx context.Context, data []byte, contractAddress string) string {
	if len(data) < 4 {
		return "transfer"
	}

	// Se temos um endereço de contrato, tentar usar ABI para decodificar
	if contractAddress != "" {
		methodName := p.identifyMethodFromABI(ctx, data, contractAddress)
		if methodName != "" && methodName != "Unknown Method" {
			return methodName
		}
	}

	// Se não conseguiu decodificar via ABI, retornar a signature hex
	methodSignature := hex.EncodeToString(data[:4])
	return fmt.Sprintf("0x%s", methodSignature)
}

// identifyMethodFromABI identifica método usando ABI do contrato
func (p *AccountTransactionProcessor) identifyMethodFromABI(ctx context.Context, data []byte, contractAddress string) string {
	if len(data) < 4 {
		return ""
	}

	// Buscar ABI do contrato na tabela smart_contracts
	var abiJSON string
	query := `SELECT abi FROM smart_contracts WHERE LOWER(address) = LOWER($1) AND abi IS NOT NULL`
	err := p.db.QueryRow(ctx, query, contractAddress).Scan(&abiJSON)

	if err != nil {
		log.Printf("🔍 ABI não encontrada para contrato %s: %v", contractAddress, err)
		return ""
	}

	log.Printf("✅ ABI encontrada para contrato %s (tamanho: %d chars)", contractAddress, len(abiJSON))

	// Parse da ABI
	contractABI, err := abi.JSON(strings.NewReader(abiJSON))
	if err != nil {
		log.Printf("❌ Erro ao fazer parse da ABI do contrato %s: %v", contractAddress, err)
		return ""
	}

	// Extrair signature do método (primeiros 4 bytes)
	methodSignature := hex.EncodeToString(data[:4])
	log.Printf("🔍 Procurando método com signature 0x%s no contrato %s", methodSignature, contractAddress)

	// Buscar método pela signature na ABI
	for _, method := range contractABI.Methods {
		methodID := hex.EncodeToString(method.ID)
		log.Printf("🔍 Comparando: 0x%s vs 0x%s (%s)", methodSignature, methodID, method.Name)
		if methodID == methodSignature {
			log.Printf("✅ Método encontrado: %s (0x%s)", method.Name, methodSignature)
			return method.Name
		}
	}

	log.Printf("❌ Método 0x%s não encontrado na ABI do contrato %s", methodSignature, contractAddress)
	return "" // Método não encontrado na ABI
}

// getContractName busca o nome de um contrato (se disponível)
func (p *AccountTransactionProcessor) getContractName(ctx context.Context, contractAddress string) string {
	contractAddress = strings.ToLower(contractAddress)

	// Tentar buscar da tabela smart_contracts com dados enriquecidos
	var name, symbol, description string
	query := `
		SELECT 
			COALESCE(name, '') as name,
			COALESCE(symbol, '') as symbol,
			COALESCE(description, '') as description
		FROM smart_contracts 
		WHERE address = $1
	`

	err := p.db.QueryRow(ctx, query, contractAddress).Scan(&name, &symbol, &description)
	if err == nil {
		// Priorizar nome mais descritivo
		if name != "" {
			if symbol != "" && symbol != name {
				return fmt.Sprintf("%s (%s)", name, symbol)
			}
			return name
		}
		if symbol != "" {
			return symbol
		}
		if description != "" {
			return description
		}
	}

	// Se não encontrou na tabela, tentar buscar informações básicas da blockchain
	if p.isContractAddress(ctx, contractAddress) {
		// Tentar detectar se é um token e buscar informações básicas
		contractType := p.detectContractType(ctx, contractAddress)
		if strings.Contains(contractType, "erc") {
			if tokenInfo, err := p.fetchTokenInfoFromBlockchain(ctx, contractAddress); err == nil {
				if tokenInfo.Name != "" {
					if tokenInfo.Symbol != "" && tokenInfo.Symbol != tokenInfo.Name {
						return fmt.Sprintf("%s (%s)", tokenInfo.Name, tokenInfo.Symbol)
					}
					return tokenInfo.Name
				}
			}
		}
	}

	// Fallback para endereço truncado
	return fmt.Sprintf("Contract %s...%s", contractAddress[:6], contractAddress[len(contractAddress)-4:])
}

// incrementContractInteractions incrementa o contador de interações com contratos
func (p *AccountTransactionProcessor) incrementContractInteractions(ctx context.Context, accountAddress string) error {
	query := `
		UPDATE accounts 
		SET contract_interactions = contract_interactions + 1, updated_at = NOW()
		WHERE address = $1
	`

	_, err := p.db.Exec(ctx, query, accountAddress)
	return err
}

// incrementContractDeployments incrementa o contador de deployments de contratos
func (p *AccountTransactionProcessor) incrementContractDeployments(ctx context.Context, accountAddress string) error {
	query := `
		UPDATE accounts 
		SET smart_contract_deployments = smart_contract_deployments + 1, updated_at = NOW()
		WHERE address = $1
	`

	_, err := p.db.Exec(ctx, query, accountAddress)
	return err
}

// processAccountTransactions processa e registra transações detalhadas por conta
func (p *AccountTransactionProcessor) processAccountTransactions(ctx context.Context, tx *entities.Transaction) error {
	// Determinar endereço do contrato para decodificação (sempre tentar, independente de estar registrado)
	var contractAddress string
	if tx.To != nil && *tx.To != "" {
		contractAddress = *tx.To
	}
	if tx.ContractAddress != nil && *tx.ContractAddress != "" {
		contractAddress = *tx.ContractAddress
	}

	// Determinar método executado (sempre tentar decodificar via ABI)
	methodName, methodSignature := p.extractMethodInfo(ctx, tx.Data, contractAddress)

	// Buscar nome do contrato apenas se estiver registrado
	var contractName string
	if contractAddress != "" && p.isContractAddress(ctx, contractAddress) {
		contractName = p.getContractName(ctx, contractAddress)
	}

	// Determinar timestamp
	timestamp := time.Now()
	if tx.MinedAt != nil {
		timestamp = *tx.MinedAt
	}

	// Processar para conta remetente
	if err := p.insertAccountTransaction(ctx, tx.From, tx, "sent", methodName, methodSignature, contractAddress, contractName, timestamp); err != nil {
		return err
	}

	// Processar para conta destinatária (se existir e for diferente do remetente)
	if tx.To != nil && *tx.To != "" && !strings.EqualFold(*tx.To, tx.From) {
		txType := "received"
		if p.isContractAddress(ctx, *tx.To) {
			txType = "contract_call"
		}

		if err := p.insertAccountTransaction(ctx, *tx.To, tx, txType, methodName, methodSignature, contractAddress, contractName, timestamp); err != nil {
			log.Printf("⚠️ Erro ao inserir transação para destinatário %s: %v", *tx.To, err)
		}
	}

	// Processar para contrato criado (se aplicável)
	if tx.ContractAddress != nil && *tx.ContractAddress != "" {
		if err := p.insertAccountTransaction(ctx, *tx.ContractAddress, tx, "contract_creation", methodName, methodSignature, contractAddress, contractName, timestamp); err != nil {
			log.Printf("⚠️ Erro ao inserir transação para contrato criado %s: %v", *tx.ContractAddress, err)
		}
	}

	return nil
}

// insertAccountTransaction insere uma transação detalhada para uma conta
func (p *AccountTransactionProcessor) insertAccountTransaction(ctx context.Context, accountAddress string, tx *entities.Transaction, txType, methodName, methodSignature, contractAddress, contractName string, timestamp time.Time) error {
	accountAddress = strings.ToLower(accountAddress)

	// Decodificar input se possível
	var decodedInput map[string]interface{}
	if len(tx.Data) > 4 && methodName != "" {
		// Aqui você pode implementar decodificação mais sofisticada se necessário
		decodedInput = map[string]interface{}{
			"method":    methodName,
			"signature": methodSignature,
			"raw_data":  fmt.Sprintf("0x%x", tx.Data),
		}
	}

	decodedInputJSON, _ := json.Marshal(decodedInput)

	query := `
		INSERT INTO account_transactions (
			account_address, transaction_hash, block_number, transaction_index,
			transaction_type, from_address, to_address, value, gas_limit, gas_used,
			gas_price, status, method_name, method_signature, contract_address,
			contract_name, decoded_input, timestamp, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW(), NOW()
		)
		ON CONFLICT (account_address, transaction_hash) DO UPDATE SET
			transaction_type = EXCLUDED.transaction_type,
			status = EXCLUDED.status,
			gas_used = EXCLUDED.gas_used,
			method_name = EXCLUDED.method_name,
			method_signature = EXCLUDED.method_signature,
			contract_name = EXCLUDED.contract_name,
			decoded_input = EXCLUDED.decoded_input,
			updated_at = NOW()
	`

	blockNumber := int64(0)
	if tx.BlockNumber != nil {
		blockNumber = int64(*tx.BlockNumber)
	}

	transactionIndex := 0
	if tx.TransactionIndex != nil {
		transactionIndex = int(*tx.TransactionIndex)
	}

	gasUsed := int64(0)
	if tx.GasUsed != nil {
		gasUsed = int64(*tx.GasUsed)
	}

	gasPrice := "0"
	if tx.GasPrice != nil {
		gasPrice = tx.GasPrice.String()
	}

	valueStr := "0"
	if tx.Value != nil {
		valueStr = tx.Value.String()
	}

	_, err := p.db.Exec(ctx, query,
		accountAddress,           // $1
		tx.Hash,                  // $2
		blockNumber,              // $3
		transactionIndex,         // $4
		txType,                   // $5
		tx.From,                  // $6
		tx.To,                    // $7
		valueStr,                 // $8
		tx.Gas,                   // $9
		gasUsed,                  // $10
		gasPrice,                 // $11
		tx.Status,                // $12
		methodName,               // $13
		methodSignature,          // $14
		contractAddress,          // $15
		contractName,             // $16
		string(decodedInputJSON), // $17
		timestamp,                // $18
	)

	return err
}

// processAccountMethodStats processa estatísticas de métodos executados
func (p *AccountTransactionProcessor) processAccountMethodStats(ctx context.Context, tx *entities.Transaction) error {
	// Determinar endereço do contrato para decodificação (sempre tentar)
	var contractAddress string
	if tx.To != nil && *tx.To != "" {
		contractAddress = *tx.To
	}

	// Sempre tentar decodificar método
	methodName, methodSignature := p.extractMethodInfo(ctx, tx.Data, contractAddress)
	if methodName == "" {
		return nil
	}

	// Buscar nome do contrato apenas se estiver registrado
	var contractName string
	if contractAddress != "" && p.isContractAddress(ctx, contractAddress) {
		contractName = p.getContractName(ctx, contractAddress)
	}

	// Determinar timestamp
	timestamp := time.Now()
	if tx.MinedAt != nil {
		timestamp = *tx.MinedAt
	}

	// Calcular métricas
	isSuccess := tx.Status == entities.StatusSuccess
	gasUsed := int64(0)
	if tx.GasUsed != nil {
		gasUsed = int64(*tx.GasUsed)
	}

	valueStr := "0"
	if tx.Value != nil {
		valueStr = tx.Value.String()
	}

	// Atualizar estatísticas para conta remetente
	if err := p.upsertMethodStats(ctx, tx.From, methodName, methodSignature, contractAddress, contractName, isSuccess, gasUsed, valueStr, timestamp); err != nil {
		return err
	}

	return nil
}

// upsertMethodStats atualiza ou insere estatísticas de método
func (p *AccountTransactionProcessor) upsertMethodStats(ctx context.Context, accountAddress, methodName, methodSignature, contractAddress, contractName string, isSuccess bool, gasUsed int64, valueSent string, timestamp time.Time) error {
	accountAddress = strings.ToLower(accountAddress)

	successIncrement := int64(0)
	failedIncrement := int64(0)
	if isSuccess {
		successIncrement = 1
	} else {
		failedIncrement = 1
	}

	// Usar UPSERT manual para evitar problemas com ON CONFLICT
	// Primeiro, tentar fazer UPDATE
	var updateQuery string
	var updateParams []interface{}

	if contractAddress != "" {
		updateQuery = `
			UPDATE account_method_stats SET
				execution_count = execution_count + 1,
				success_count = success_count + $4,
				failed_count = failed_count + $5,
				total_gas_used = (total_gas_used::BIGINT + $6::BIGINT)::TEXT,
				total_value_sent = (total_value_sent::NUMERIC + $7::NUMERIC)::TEXT,
				avg_gas_used = (total_gas_used::BIGINT + $6::BIGINT) / (execution_count + 1),
				last_executed_at = $8,
				contract_name = COALESCE($9, contract_name),
				updated_at = NOW()
			WHERE account_address = $1 AND method_name = $2 AND contract_address = $3
		`
		updateParams = []interface{}{
			accountAddress, methodName, contractAddress, successIncrement, failedIncrement,
			fmt.Sprintf("%d", gasUsed), valueSent, timestamp, contractName,
		}
	} else {
		updateQuery = `
			UPDATE account_method_stats SET
				execution_count = execution_count + 1,
				success_count = success_count + $3,
				failed_count = failed_count + $4,
				total_gas_used = (total_gas_used::BIGINT + $5::BIGINT)::TEXT,
				total_value_sent = (total_value_sent::NUMERIC + $6::NUMERIC)::TEXT,
				avg_gas_used = (total_gas_used::BIGINT + $5::BIGINT) / (execution_count + 1),
				last_executed_at = $7,
				contract_name = COALESCE($8, contract_name),
				updated_at = NOW()
			WHERE account_address = $1 AND method_name = $2 AND contract_address IS NULL
		`
		updateParams = []interface{}{
			accountAddress, methodName, successIncrement, failedIncrement,
			fmt.Sprintf("%d", gasUsed), valueSent, timestamp, contractName,
		}
	}

	// Executar UPDATE
	result, err := p.db.Exec(ctx, updateQuery, updateParams...)
	if err != nil {
		return err
	}

	// Se não atualizou nenhuma linha, fazer INSERT
	if result.RowsAffected() == 0 {
		insertQuery := `
			INSERT INTO account_method_stats (
				account_address, method_name, method_signature, contract_address,
				contract_name, execution_count, success_count, failed_count,
				total_gas_used, total_value_sent, avg_gas_used, first_executed_at,
				last_executed_at, created_at, updated_at
			) VALUES (
				$1, $2, $3, $4, $5, 1, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW()
			)
		`

		var contractAddr interface{}
		if contractAddress != "" {
			contractAddr = contractAddress
		} else {
			contractAddr = nil
		}

		_, err = p.db.Exec(ctx, insertQuery,
			accountAddress,             // $1
			methodName,                 // $2
			methodSignature,            // $3
			contractAddr,               // $4
			contractName,               // $5
			successIncrement,           // $6
			failedIncrement,            // $7
			fmt.Sprintf("%d", gasUsed), // $8
			valueSent,                  // $9
			gasUsed,                    // $10 - para avg_gas_used inicial
			timestamp,                  // $11 - first_executed_at
			timestamp,                  // $12 - last_executed_at
		)
		return err
	}

	return nil
}

// extractMethodInfo extrai informações do método dos dados da transação
func (p *AccountTransactionProcessor) extractMethodInfo(ctx context.Context, data []byte, contractAddress string) (string, string) {
	if len(data) < 4 {
		return "transfer", "" // ETH transfer
	}

	methodSignature := fmt.Sprintf("0x%x", data[:4])
	methodName := p.identifyMethod(ctx, data, contractAddress)

	return methodName, methodSignature
}

// processAccountEventsFromTransaction busca eventos da transação e os processa para account_events
func (p *AccountTransactionProcessor) processAccountEventsFromTransaction(ctx context.Context, tx *entities.Transaction) error {
	log.Printf("🔍 Buscando eventos da transação %s", tx.Hash)

	// Buscar eventos relacionados a esta transação
	query := `
		SELECT id, contract_address, event_name, event_signature, transaction_hash,
		       block_number, log_index, from_address, to_address, topics, decoded_data,
		       data, timestamp
		FROM events 
		WHERE transaction_hash = $1
		ORDER BY log_index
	`

	rows, err := p.db.Query(ctx, query, tx.Hash)
	if err != nil {
		log.Printf("❌ Erro ao buscar eventos da transação %s: %v", tx.Hash, err)
		return fmt.Errorf("erro ao buscar eventos da transação: %w", err)
	}
	defer rows.Close()

	eventCount := 0
	for rows.Next() {
		var event entities.Event
		var topicsJSON []byte
		var decodedDataJSON []byte
		var dataBytes []byte

		err := rows.Scan(
			&event.ID,
			&event.ContractAddress,
			&event.EventName,
			&event.EventSignature,
			&event.TransactionHash,
			&event.BlockNumber,
			&event.LogIndex,
			&event.FromAddress,
			&event.ToAddress,
			&topicsJSON,
			&decodedDataJSON,
			&dataBytes,
			&event.Timestamp,
		)
		if err != nil {
			log.Printf("⚠️ Erro ao escanear evento: %v", err)
			continue
		}

		log.Printf("📝 Processando evento %s (nome: %s) do contrato %s", event.ID, event.EventName, event.ContractAddress)

		// Converter topics JSON para slice
		if len(topicsJSON) > 0 {
			var topics []string
			if err := json.Unmarshal(topicsJSON, &topics); err == nil {
				event.Topics = entities.TopicsArray(topics)
			}
		}

		// Converter decoded data JSON
		if len(decodedDataJSON) > 0 {
			var decodedData entities.DecodedData
			if err := json.Unmarshal(decodedDataJSON, &decodedData); err == nil {
				event.DecodedData = &decodedData
			}
		}

		event.Data = dataBytes

		// Processar evento para todas as contas envolvidas
		involvedAccounts := p.getInvolvedAccountsFromEvent(&event)
		log.Printf("👥 Contas envolvidas no evento %s: %v", event.ID, involvedAccounts)

		for _, accountAddress := range involvedAccounts {
			if err := p.processAccountEvent(ctx, accountAddress, &event); err != nil {
				log.Printf("❌ Erro ao processar evento %s para conta %s: %v", event.ID, accountAddress, err)
			} else {
				log.Printf("✅ Evento %s processado para conta %s", event.ID, accountAddress)
			}
		}

		eventCount++
	}

	if eventCount > 0 {
		log.Printf("✅ Processados %d eventos da transação %s para account_events", eventCount, tx.Hash)
	} else {
		log.Printf("ℹ️ Nenhum evento encontrado para a transação %s", tx.Hash)
	}

	return nil
}

// processAccountEvent processa um evento específico para uma conta
func (p *AccountTransactionProcessor) processAccountEvent(ctx context.Context, accountAddress string, event *entities.Event) error {
	accountAddress = strings.ToLower(accountAddress)

	// Determinar tipo de envolvimento
	involvementType := p.determineEventInvolvement(accountAddress, event)
	if involvementType == "" {
		log.Printf("ℹ️ Conta %s não está envolvida no evento %s", accountAddress, event.ID)
		return nil // Conta não está envolvida neste evento
	}

	log.Printf("🔄 Processando evento %s para conta %s (tipo: %s)", event.ID, accountAddress, involvementType)

	// Buscar nome do contrato
	contractName := p.getContractName(ctx, event.ContractAddress)

	// Converter topics para JSONB
	topicsJSON, _ := json.Marshal(event.Topics)

	// Converter decoded data para JSONB se disponível
	var decodedDataJSON []byte
	if event.DecodedData != nil {
		decodedDataJSON, _ = json.Marshal(event.DecodedData)
	}

	query := `
		INSERT INTO account_events (
			account_address, event_id, transaction_hash, block_number, log_index,
			contract_address, contract_name, event_name, event_signature,
			involvement_type, topics, decoded_data, raw_data, timestamp,
			created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW()
		)
		ON CONFLICT (account_address, event_id) DO UPDATE SET
			contract_name = EXCLUDED.contract_name,
			involvement_type = EXCLUDED.involvement_type,
			decoded_data = EXCLUDED.decoded_data,
			raw_data = EXCLUDED.raw_data,
			updated_at = NOW()
	`

	_, err := p.db.Exec(ctx, query,
		accountAddress,          // $1
		event.ID,                // $2
		event.TransactionHash,   // $3
		event.BlockNumber,       // $4
		event.LogIndex,          // $5
		event.ContractAddress,   // $6
		contractName,            // $7
		event.EventName,         // $8
		event.EventSignature,    // $9
		involvementType,         // $10
		string(topicsJSON),      // $11
		string(decodedDataJSON), // $12
		event.Data,              // $13 - já é []byte, compatível com BYTEA
		event.Timestamp,         // $14
	)

	if err != nil {
		log.Printf("❌ Erro ao inserir evento %s para conta %s: %v", event.ID, accountAddress, err)
		return fmt.Errorf("erro ao inserir evento: %w", err)
	}

	log.Printf("✅ Evento %s inserido com sucesso para conta %s", event.ID, accountAddress)
	return nil
}

// determineEventInvolvement determina como uma conta está envolvida em um evento
func (p *AccountTransactionProcessor) determineEventInvolvement(accountAddress string, event *entities.Event) string {
	accountAddress = strings.ToLower(accountAddress)

	// Verificar se é o endereço do contrato que emitiu o evento
	if strings.ToLower(event.ContractAddress) == accountAddress {
		return "emitter"
	}

	// Verificar se a conta aparece nos topics
	for _, topic := range event.Topics {
		if strings.Contains(strings.ToLower(topic), strings.ToLower(accountAddress[2:])) {
			return "participant"
		}
	}

	// Verificar se aparece nos dados decodificados
	if event.DecodedData != nil {
		decodedStr := fmt.Sprintf("%v", event.DecodedData)
		if strings.Contains(strings.ToLower(decodedStr), accountAddress) {
			return "participant"
		}
	}

	// Verificar transações relacionadas (from/to)
	if strings.ToLower(event.FromAddress) == accountAddress {
		return "participant"
	}

	if event.ToAddress != nil && strings.ToLower(*event.ToAddress) == accountAddress {
		return "recipient"
	}

	return "" // Não está envolvida
}

// getInvolvedAccountsFromEvent extrai todas as contas envolvidas em um evento
func (p *AccountTransactionProcessor) getInvolvedAccountsFromEvent(event *entities.Event) []string {
	accountsSet := make(map[string]bool)

	// Adicionar endereço do contrato
	accountsSet[strings.ToLower(event.ContractAddress)] = true

	// Adicionar from address se disponível
	if event.FromAddress != "" {
		accountsSet[strings.ToLower(event.FromAddress)] = true
	}

	// Adicionar to address se disponível
	if event.ToAddress != nil && *event.ToAddress != "" {
		accountsSet[strings.ToLower(*event.ToAddress)] = true
	}

	// Extrair endereços dos topics (para eventos como Transfer, Approval)
	for _, topic := range event.Topics {
		if len(topic) == 66 && strings.HasPrefix(topic, "0x") {
			// Pode ser um endereço (32 bytes com padding)
			cleanAddr := p.cleanAddress(topic)
			if len(cleanAddr) == 42 && strings.HasPrefix(cleanAddr, "0x") {
				accountsSet[strings.ToLower(cleanAddr)] = true
			}
		}
	}

	// Extrair endereços dos dados decodificados
	if event.DecodedData != nil {
		for key, value := range *event.DecodedData {
			if strings.Contains(key, "from") || strings.Contains(key, "to") || strings.Contains(key, "owner") || strings.Contains(key, "spender") {
				if addr, ok := value.(string); ok && len(addr) == 42 && strings.HasPrefix(addr, "0x") {
					accountsSet[strings.ToLower(addr)] = true
				}
			}
		}
	}

	// Converter set para slice
	accounts := make([]string, 0, len(accountsSet))
	for account := range accountsSet {
		accounts = append(accounts, account)
	}

	return accounts
}

// cleanAddress remove padding de zeros de endereços
func (p *AccountTransactionProcessor) cleanAddress(paddedAddress string) string {
	if len(paddedAddress) == 66 && strings.HasPrefix(paddedAddress, "0x") {
		// Remove os zeros do padding (26 caracteres) e mantém apenas os últimos 40
		return "0x" + paddedAddress[26:]
	}
	return paddedAddress
}
