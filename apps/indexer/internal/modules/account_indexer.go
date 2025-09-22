package modules

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/ethclient"
)

// AccountType representa o tipo de conta
type AccountType string

const (
	AccountTypeEOA          AccountType = "eoa"
	AccountTypeSmartAccount AccountType = "smart_account"
)

// AccountIndexer é responsável por detectar e indexar contas
type AccountIndexer struct {
	client    *ethclient.Client
	publisher MessagePublisher
}

// MessagePublisher interface para publicar mensagens nas queues
type MessagePublisher interface {
	PublishAccountDiscovered(msg AccountDiscoveredMessage) error
	PublishAccountBalanceUpdate(msg AccountBalanceUpdateMessage) error
	PublishSmartAccountProcessing(msg SmartAccountProcessingMessage) error
	PublishContractInteraction(msg ContractInteractionMessage) error
	PublishTokenHoldingUpdate(msg TokenHoldingUpdateMessage) error
}

// Estruturas de mensagens
type AccountDiscoveredMessage struct {
	Address     string      `json:"address"`
	Type        AccountType `json:"type"`
	BlockNumber uint64      `json:"block_number"`
	TxHash      string      `json:"tx_hash"`
	Timestamp   time.Time   `json:"timestamp"`
}

type AccountBalanceUpdateMessage struct {
	Address     string    `json:"address"`
	Balance     string    `json:"balance"`
	BlockNumber uint64    `json:"block_number"`
	Timestamp   time.Time `json:"timestamp"`
}

type SmartAccountProcessingMessage struct {
	Address               string    `json:"address"`
	FactoryAddress        *string   `json:"factory_address"`
	ImplementationAddress *string   `json:"implementation_address"`
	OwnerAddress          *string   `json:"owner_address"`
	BlockNumber           uint64    `json:"block_number"`
	TxHash                string    `json:"tx_hash"`
	Timestamp             time.Time `json:"timestamp"`
}

type ContractInteractionMessage struct {
	AccountAddress  string    `json:"account_address"`
	ContractAddress string    `json:"contract_address"`
	Method          *string   `json:"method"`
	GasUsed         string    `json:"gas_used"`
	ValueSent       string    `json:"value_sent"`
	BlockNumber     uint64    `json:"block_number"`
	TxHash          string    `json:"tx_hash"`
	Timestamp       time.Time `json:"timestamp"`
}

type TokenHoldingUpdateMessage struct {
	AccountAddress string    `json:"account_address"`
	TokenAddress   string    `json:"token_address"`
	TokenSymbol    string    `json:"token_symbol"`
	TokenName      string    `json:"token_name"`
	TokenDecimals  uint8     `json:"token_decimals"`
	Balance        string    `json:"balance"`
	ValueUSD       string    `json:"value_usd"`
	BlockNumber    uint64    `json:"block_number"`
	TxHash         string    `json:"tx_hash"`
	Timestamp      time.Time `json:"timestamp"`
}

// NewAccountIndexer cria uma nova instância do AccountIndexer
func NewAccountIndexer(client *ethclient.Client, publisher MessagePublisher) *AccountIndexer {
	return &AccountIndexer{
		client:    client,
		publisher: publisher,
	}
}

// ProcessBlock processa um bloco para detectar contas e atividades relacionadas
func (ai *AccountIndexer) ProcessBlock(ctx context.Context, block *types.Block) error {
	log.Printf("Processing block %d for account indexing", block.NumberU64())

	// Processar transações do bloco
	for _, tx := range block.Transactions() {
		if err := ai.ProcessTransaction(ctx, tx, block); err != nil {
			log.Printf("Error processing transaction %s for accounts: %v", tx.Hash().Hex(), err)
			continue
		}
	}

	return nil
}

// ProcessTransaction processa uma transação para detectar contas e atividades
func (ai *AccountIndexer) ProcessTransaction(ctx context.Context, tx *types.Transaction, block *types.Block) error {
	txHash := tx.Hash().Hex()
	blockNumber := block.NumberU64()
	timestamp := time.Unix(int64(block.Time()), 0)

	// Processar conta remetente
	fromAddress := ai.getSenderAddress(tx)
	if fromAddress != "" {
		if err := ai.processAccount(ctx, fromAddress, blockNumber, txHash, timestamp); err != nil {
			return fmt.Errorf("failed to process sender account: %w", err)
		}
	}

	// Processar conta destinatária
	if tx.To() != nil {
		toAddress := tx.To().Hex()
		if err := ai.processAccount(ctx, toAddress, blockNumber, txHash, timestamp); err != nil {
			return fmt.Errorf("failed to process recipient account: %w", err)
		}

		// Verificar se é interação com contrato
		if err := ai.checkContractInteraction(ctx, fromAddress, toAddress, tx, blockNumber, timestamp); err != nil {
			log.Printf("Error checking contract interaction: %v", err)
		}
	}

	// Verificar se é criação de contrato
	if tx.To() == nil {
		contractAddress := ai.getContractAddress(tx, fromAddress)
		if contractAddress != "" {
			if err := ai.processContractCreation(ctx, contractAddress, fromAddress, blockNumber, txHash, timestamp); err != nil {
				log.Printf("Error processing contract creation: %v", err)
			}
		}
	}

	return nil
}

// processAccount processa uma conta descoberta
func (ai *AccountIndexer) processAccount(ctx context.Context, address string, blockNumber uint64, txHash string, timestamp time.Time) error {
	address = strings.ToLower(address)

	// Detectar tipo de conta
	accountType, err := ai.detectAccountType(ctx, address)
	if err != nil {
		log.Printf("Warning: failed to detect account type for %s: %v", address, err)
		accountType = AccountTypeEOA // Default para EOA
	}

	// Publicar mensagem de conta descoberta
	msg := AccountDiscoveredMessage{
		Address:     address,
		Type:        accountType,
		BlockNumber: blockNumber,
		TxHash:      txHash,
		Timestamp:   timestamp,
	}

	if err := ai.publisher.PublishAccountDiscovered(msg); err != nil {
		return fmt.Errorf("failed to publish account discovered message: %w", err)
	}

	// Atualizar saldo da conta
	if err := ai.updateAccountBalance(ctx, address, blockNumber, timestamp); err != nil {
		log.Printf("Warning: failed to update balance for %s: %v", address, err)
	}

	return nil
}

// detectAccountType detecta se uma conta é EOA ou Smart Account
func (ai *AccountIndexer) detectAccountType(ctx context.Context, address string) (AccountType, error) {
	addr := common.HexToAddress(address)

	// Verificar se tem código (é contrato)
	code, err := ai.client.CodeAt(ctx, addr, nil)
	if err != nil {
		return AccountTypeEOA, err
	}

	if len(code) == 0 {
		return AccountTypeEOA, nil
	}

	// Se tem código, verificar se é Smart Account (ERC-4337)
	if ai.isSmartAccount(code) {
		return AccountTypeSmartAccount, nil
	}

	// Por enquanto, se tem código mas não é Smart Account, ainda considera EOA
	// TODO: Implementar lógica mais sofisticada para detectar diferentes tipos de contratos
	return AccountTypeEOA, nil
}

// isSmartAccount verifica se o código indica que é uma Smart Account ERC-4337
func (ai *AccountIndexer) isSmartAccount(code []byte) bool {
	// TODO: Implementar verificação de assinaturas de métodos ERC-4337
	// Por exemplo, verificar se implementa validateUserOp, execute, etc.

	// Por enquanto, retorna false
	return false
}

// updateAccountBalance atualiza o saldo de uma conta
func (ai *AccountIndexer) updateAccountBalance(ctx context.Context, address string, blockNumber uint64, timestamp time.Time) error {
	addr := common.HexToAddress(address)

	balance, err := ai.client.BalanceAt(ctx, addr, nil)
	if err != nil {
		return err
	}

	msg := AccountBalanceUpdateMessage{
		Address:     address,
		Balance:     balance.String(),
		BlockNumber: blockNumber,
		Timestamp:   timestamp,
	}

	return ai.publisher.PublishAccountBalanceUpdate(msg)
}

// checkContractInteraction verifica se uma transação é uma interação com contrato
func (ai *AccountIndexer) checkContractInteraction(ctx context.Context, fromAddress, toAddress string, tx *types.Transaction, blockNumber uint64, timestamp time.Time) error {
	// Verificar se o destinatário é um contrato
	toAddr := common.HexToAddress(toAddress)
	code, err := ai.client.CodeAt(ctx, toAddr, nil)
	if err != nil {
		return err
	}

	if len(code) == 0 {
		return nil // Não é contrato
	}

	// Extrair método da transação (primeiros 4 bytes dos dados)
	var method *string
	if len(tx.Data()) >= 4 {
		methodBytes := tx.Data()[:4]
		methodHex := fmt.Sprintf("0x%x", methodBytes)
		method = &methodHex
	}

	// Obter receipt para gas usado
	receipt, err := ai.client.TransactionReceipt(ctx, tx.Hash())
	if err != nil {
		log.Printf("Warning: failed to get receipt for tx %s: %v", tx.Hash().Hex(), err)
	}

	gasUsed := "0"
	if receipt != nil {
		gasUsed = fmt.Sprintf("%d", receipt.GasUsed)
	}

	msg := ContractInteractionMessage{
		AccountAddress:  fromAddress,
		ContractAddress: toAddress,
		Method:          method,
		GasUsed:         gasUsed,
		ValueSent:       tx.Value().String(),
		BlockNumber:     blockNumber,
		TxHash:          tx.Hash().Hex(),
		Timestamp:       timestamp,
	}

	return ai.publisher.PublishContractInteraction(msg)
}

// processContractCreation processa a criação de um contrato
func (ai *AccountIndexer) processContractCreation(ctx context.Context, contractAddress, creatorAddress string, blockNumber uint64, txHash string, timestamp time.Time) error {
	// Verificar se é Smart Account
	accountType, err := ai.detectAccountType(ctx, contractAddress)
	if err != nil {
		log.Printf("Warning: failed to detect contract type for %s: %v", contractAddress, err)
		accountType = AccountTypeSmartAccount // Assume Smart Account para contratos criados
	}

	// Publicar conta descoberta
	msg := AccountDiscoveredMessage{
		Address:     contractAddress,
		Type:        accountType,
		BlockNumber: blockNumber,
		TxHash:      txHash,
		Timestamp:   timestamp,
	}

	if err := ai.publisher.PublishAccountDiscovered(msg); err != nil {
		return fmt.Errorf("failed to publish contract account discovered: %w", err)
	}

	// Se é Smart Account, processar informações específicas
	if accountType == AccountTypeSmartAccount {
		// TODO: Extrair informações de factory, implementation, owner
		smartMsg := SmartAccountProcessingMessage{
			Address:               contractAddress,
			FactoryAddress:        nil, // TODO: detectar factory
			ImplementationAddress: nil, // TODO: detectar implementation
			OwnerAddress:          nil, // TODO: detectar owner
			BlockNumber:           blockNumber,
			TxHash:                txHash,
			Timestamp:             timestamp,
		}

		if err := ai.publisher.PublishSmartAccountProcessing(smartMsg); err != nil {
			return fmt.Errorf("failed to publish smart account processing: %w", err)
		}
	}

	return nil
}

// getSenderAddress obtém o endereço do remetente de uma transação
func (ai *AccountIndexer) getSenderAddress(tx *types.Transaction) string {
	// TODO: Implementar extração do endereço do remetente
	// Isso requer acesso ao signer da transação
	return ""
}

// getContractAddress calcula o endereço do contrato criado
func (ai *AccountIndexer) getContractAddress(tx *types.Transaction, fromAddress string) string {
	// TODO: Implementar cálculo do endereço do contrato
	// Endereço = keccak256(rlp([sender, nonce]))[12:]
	return ""
}

// Implementação básica do MessagePublisher para exemplo
type BasicMessagePublisher struct{}

func (p *BasicMessagePublisher) PublishAccountDiscovered(msg AccountDiscoveredMessage) error {
	data, _ := json.Marshal(msg)
	log.Printf("Publishing account discovered: %s", string(data))
	return nil
}

func (p *BasicMessagePublisher) PublishAccountBalanceUpdate(msg AccountBalanceUpdateMessage) error {
	data, _ := json.Marshal(msg)
	log.Printf("Publishing balance update: %s", string(data))
	return nil
}

func (p *BasicMessagePublisher) PublishSmartAccountProcessing(msg SmartAccountProcessingMessage) error {
	data, _ := json.Marshal(msg)
	log.Printf("Publishing smart account processing: %s", string(data))
	return nil
}

func (p *BasicMessagePublisher) PublishContractInteraction(msg ContractInteractionMessage) error {
	data, _ := json.Marshal(msg)
	log.Printf("Publishing contract interaction: %s", string(data))
	return nil
}

func (p *BasicMessagePublisher) PublishTokenHoldingUpdate(msg TokenHoldingUpdateMessage) error {
	data, _ := json.Marshal(msg)
	log.Printf("Publishing token holding update: %s", string(data))
	return nil
}
