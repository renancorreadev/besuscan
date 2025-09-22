package services

import (
	"context"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"strings"

	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/jackc/pgx/v4"
	"github.com/jackc/pgx/v4/pgxpool"
)

// TransactionMethodService gerencia a identificação de métodos de transações
type TransactionMethodService struct {
	db *pgxpool.Pool
}

// NewTransactionMethodService cria uma nova instância do serviço
func NewTransactionMethodService(db *pgxpool.Pool) *TransactionMethodService {
	return &TransactionMethodService{
		db: db,
	}
}

// TransactionMethod representa um método identificado
type TransactionMethod struct {
	ID              int64           `json:"id"`
	TransactionHash string          `json:"transaction_hash"`
	MethodName      string          `json:"method_name"`
	MethodSignature *string         `json:"method_signature"`
	MethodType      string          `json:"method_type"`
	ContractAddress *string         `json:"contract_address"`
	DecodedParams   json.RawMessage `json:"decoded_params"`
}

// IdentifyTransactionMethod identifica o método de uma transação
func (s *TransactionMethodService) IdentifyTransactionMethod(ctx context.Context, txHash, fromAddress, toAddress *string, value, data []byte, contractAddress *string) (*TransactionMethod, error) {
	// Se não tem endereço de destino, é criação de contrato
	if toAddress == nil || *toAddress == "" {
		return &TransactionMethod{
			TransactionHash: *txHash,
			MethodName:      "Deploy Contract",
			MethodType:      "deploy",
			ContractAddress: contractAddress,
		}, nil
	}

	// Se não tem dados, é transferência de ETH
	if len(data) == 0 || len(data) < 4 {
		return &TransactionMethod{
			TransactionHash: *txHash,
			MethodName:      "Transfer ETH",
			MethodType:      "transferETH",
			ContractAddress: toAddress,
		}, nil
	}

	// Extrair signature do método (primeiros 4 bytes)
	methodSignature := "0x" + hex.EncodeToString(data[:4])

	// Tentar identificar o método usando a ABI do contrato customizado
	methodName, methodType, decodedParams := s.identifyCustomContractMethod(ctx, *toAddress, methodSignature, data)

	return &TransactionMethod{
		TransactionHash: *txHash,
		MethodName:      methodName,
		MethodSignature: &methodSignature,
		MethodType:      methodType,
		ContractAddress: toAddress,
		DecodedParams:   decodedParams,
	}, nil
}

// identifyCustomContractMethod identifica métodos de contratos customizados
func (s *TransactionMethodService) identifyCustomContractMethod(ctx context.Context, contractAddress, methodSignature string, data []byte) (string, string, json.RawMessage) {
	// Buscar ABI do contrato na tabela smart_contracts
	var abiJSON string
	query := `SELECT abi FROM smart_contracts WHERE address = $1 AND abi IS NOT NULL`
	err := s.db.QueryRow(ctx, query, contractAddress).Scan(&abiJSON)

	if err != nil {
		log.Printf("Erro ao buscar ABI do contrato %s: %v", contractAddress, err)
		return "Unknown Method", "unknown", nil
	}

	// Parse da ABI
	contractABI, err := abi.JSON(strings.NewReader(abiJSON))
	if err != nil {
		log.Printf("Erro ao fazer parse da ABI do contrato %s: %v", contractAddress, err)
		return "Unknown Method", "unknown", nil
	}

	// Buscar método pela signature
	for _, method := range contractABI.Methods {
		if hex.EncodeToString(method.ID) == methodSignature[2:] { // Remove 0x prefix
			// Tentar decodificar os parâmetros
			decodedParams := s.decodeMethodParams(method, data[4:]) // Remove os 4 bytes da signature

			// Determinar o tipo do método baseado no nome
			methodType := s.categorizeMethodType(method.Name)

			return method.Name, methodType, decodedParams
		}
	}

	return "Unknown Method", "unknown", nil
}

// decodeMethodParams decodifica os parâmetros do método
func (s *TransactionMethodService) decodeMethodParams(method abi.Method, data []byte) json.RawMessage {
	if len(data) == 0 {
		return nil
	}

	// Tentar decodificar os parâmetros
	values, err := method.Inputs.Unpack(data)
	if err != nil {
		log.Printf("Erro ao decodificar parâmetros do método %s: %v", method.Name, err)
		return nil
	}

	// Converter para map para JSON
	params := make(map[string]interface{})
	for i, input := range method.Inputs {
		if i < len(values) {
			params[input.Name] = values[i]
		}
	}

	// Converter para JSON
	jsonData, err := json.Marshal(params)
	if err != nil {
		log.Printf("Erro ao converter parâmetros para JSON: %v", err)
		return nil
	}

	return json.RawMessage(jsonData)
}

// categorizeMethodType categoriza o tipo do método baseado no nome
func (s *TransactionMethodService) categorizeMethodType(methodName string) string {
	methodNameLower := strings.ToLower(methodName)

	// Categorias baseadas no nome do método
	switch {
	case strings.Contains(methodNameLower, "transfer"):
		return "transfer"
	case strings.Contains(methodNameLower, "approve"):
		return "approve"
	case strings.Contains(methodNameLower, "mint"):
		return "mint"
	case strings.Contains(methodNameLower, "burn"):
		return "burn"
	case strings.Contains(methodNameLower, "swap"):
		return "swap"
	case strings.Contains(methodNameLower, "stake"):
		return "stake"
	case strings.Contains(methodNameLower, "unstake"):
		return "unstake"
	case strings.Contains(methodNameLower, "claim"):
		return "claim"
	case strings.Contains(methodNameLower, "deposit"):
		return "deposit"
	case strings.Contains(methodNameLower, "withdraw"):
		return "withdraw"
	case strings.Contains(methodNameLower, "set"):
		return "setter"
	case strings.Contains(methodNameLower, "get"):
		return "getter"
	default:
		return "custom"
	}
}

// SaveTransactionMethod salva o método identificado no banco
func (s *TransactionMethodService) SaveTransactionMethod(ctx context.Context, method *TransactionMethod) error {
	query := `
		INSERT INTO transaction_methods (
			transaction_hash, method_name, method_signature, method_type, 
			contract_address, decoded_params
		) VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (transaction_hash) DO UPDATE SET
			method_name = EXCLUDED.method_name,
			method_signature = EXCLUDED.method_signature,
			method_type = EXCLUDED.method_type,
			contract_address = EXCLUDED.contract_address,
			decoded_params = EXCLUDED.decoded_params,
			updated_at = NOW()
	`

	_, err := s.db.Exec(ctx, query,
		method.TransactionHash,
		method.MethodName,
		method.MethodSignature,
		method.MethodType,
		method.ContractAddress,
		method.DecodedParams,
	)

	if err != nil {
		return fmt.Errorf("erro ao salvar método da transação: %w", err)
	}

	return nil
}

// GetTransactionMethod busca o método de uma transação
func (s *TransactionMethodService) GetTransactionMethod(ctx context.Context, txHash string) (*TransactionMethod, error) {
	query := `
		SELECT id, transaction_hash, method_name, method_signature, method_type, 
			   contract_address, decoded_params
		FROM transaction_methods 
		WHERE transaction_hash = $1
	`

	method := &TransactionMethod{}
	err := s.db.QueryRow(ctx, query, txHash).Scan(
		&method.ID,
		&method.TransactionHash,
		&method.MethodName,
		&method.MethodSignature,
		&method.MethodType,
		&method.ContractAddress,
		&method.DecodedParams,
	)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil // Não encontrado
		}
		return nil, fmt.Errorf("erro ao buscar método da transação: %w", err)
	}

	return method, nil
}

// ExecuteQuery executa uma query SQL no banco de dados
func (s *TransactionMethodService) ExecuteQuery(ctx context.Context, query string, args ...interface{}) (interface{}, error) {
	result, err := s.db.Exec(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("erro ao executar query: %w", err)
	}
	return result, nil
}
