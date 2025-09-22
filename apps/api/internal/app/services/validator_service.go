package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"math/big"
	"net/http"
	"time"

	"explorer-api/internal/domain/entities"
	"explorer-api/internal/domain/repositories"
)

// ValidatorService gerencia a lógica de negócio relacionada a validadores QBFT
type ValidatorService struct {
	validatorRepo repositories.ValidatorRepository
	blockRepo     repositories.BlockRepository
	rpcURL        string
	httpClient    *http.Client
}

// NewValidatorService cria uma nova instância do serviço de validadores
func NewValidatorService(validatorRepo repositories.ValidatorRepository, blockRepo repositories.BlockRepository, rpcURL string) *ValidatorService {
	return &ValidatorService{
		validatorRepo: validatorRepo,
		blockRepo:     blockRepo,
		rpcURL:        rpcURL,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// JSONRPCRequest representa uma requisição JSON-RPC
type JSONRPCRequest struct {
	JSONRPC string      `json:"jsonrpc"`
	Method  string      `json:"method"`
	Params  interface{} `json:"params"`
	ID      int         `json:"id"`
}

// JSONRPCResponse representa uma resposta JSON-RPC
type JSONRPCResponse struct {
	JSONRPC string          `json:"jsonrpc"`
	Result  json.RawMessage `json:"result"`
	Error   *JSONRPCError   `json:"error"`
	ID      int             `json:"id"`
}

// JSONRPCError representa um erro JSON-RPC
type JSONRPCError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
}

// GetValidators retorna todos os validadores
func (s *ValidatorService) GetValidators(ctx context.Context) ([]*entities.Validator, error) {
	return s.validatorRepo.FindAll(ctx)
}

// GetActiveValidators retorna validadores ativos
func (s *ValidatorService) GetActiveValidators(ctx context.Context) ([]*entities.Validator, error) {
	return s.validatorRepo.FindActive(ctx)
}

// GetInactiveValidators retorna validadores inativos
func (s *ValidatorService) GetInactiveValidators(ctx context.Context) ([]*entities.Validator, error) {
	return s.validatorRepo.FindInactive(ctx)
}

// GetValidatorByAddress busca um validador por endereço
func (s *ValidatorService) GetValidatorByAddress(ctx context.Context, address string) (*entities.Validator, error) {
	return s.validatorRepo.FindByAddress(ctx, address)
}

// GetValidatorMetrics retorna métricas dos validadores
func (s *ValidatorService) GetValidatorMetrics(ctx context.Context) (*entities.ValidatorMetrics, error) {
	totalCount, err := s.validatorRepo.Count(ctx)
	if err != nil {
		return nil, fmt.Errorf("erro ao contar total de validadores: %w", err)
	}

	activeCount, err := s.validatorRepo.CountActive(ctx)
	if err != nil {
		return nil, fmt.Errorf("erro ao contar validadores ativos: %w", err)
	}

	inactiveCount, err := s.validatorRepo.CountInactive(ctx)
	if err != nil {
		return nil, fmt.Errorf("erro ao contar validadores inativos: %w", err)
	}

	avgUptime, err := s.validatorRepo.CalculateAverageUptime(ctx)
	if err != nil {
		return nil, fmt.Errorf("erro ao calcular uptime médio: %w", err)
	}

	// Calcular epoch atual
	currentEpoch, epochLength, err := s.calculateCurrentEpoch(ctx)
	if err != nil {
		// Se não conseguir calcular epoch, usar valores padrão
		currentEpoch = 0
		epochLength = 30000
	}

	return &entities.ValidatorMetrics{
		TotalValidators:    int(totalCount),
		ActiveValidators:   int(activeCount),
		InactiveValidators: int(inactiveCount),
		ConsensusType:      "QBFT",
		CurrentEpoch:       currentEpoch,
		EpochLength:        epochLength,
		AverageUptime:      avgUptime,
	}, nil
}

// SyncValidators sincroniza validadores da rede QBFT
func (s *ValidatorService) SyncValidators(ctx context.Context) error {
	// 1. Obter lista de validadores atuais
	validators, err := s.getQBFTValidators(ctx)
	if err != nil {
		return fmt.Errorf("erro ao obter validadores QBFT: %w", err)
	}

	// 2. Obter métricas dos validadores
	metrics, err := s.getQBFTSignerMetrics(ctx)
	if err != nil {
		return fmt.Errorf("erro ao obter métricas QBFT: %w", err)
	}

	// 3. Marcar todos como inativos primeiro
	err = s.validatorRepo.UpdateAllStatus(ctx, "inactive", false)
	if err != nil {
		return fmt.Errorf("erro ao marcar validadores como inativos: %w", err)
	}

	// 4. Processar cada validador
	now := time.Now()
	for _, address := range validators {
		validator, err := s.validatorRepo.FindByAddress(ctx, address)
		if err != nil {
			return fmt.Errorf("erro ao buscar validador %s: %w", address, err)
		}

		// Se não existe, criar novo
		if validator == nil {
			validator = &entities.Validator{
				Address:                 address,
				ProposedBlockCount:      big.NewInt(0),
				LastProposedBlockNumber: big.NewInt(0),
				Status:                  "active",
				IsActive:                true,
				Uptime:                  100.0,
				FirstSeen:               now,
				LastSeen:                now,
			}
		} else {
			// Atualizar existente
			validator.Status = "active"
			validator.IsActive = true
			validator.LastSeen = now
		}

		// Buscar métricas específicas do validador
		for _, metric := range metrics {
			if metric.Address == address {
				// Converter hex strings para big.Int
				proposedCount := new(big.Int)
				proposedCount.SetString(metric.ProposedBlockCount[2:], 16) // Remove 0x prefix

				lastBlock := new(big.Int)
				lastBlock.SetString(metric.LastProposedBlockNumber[2:], 16) // Remove 0x prefix

				validator.ProposedBlockCount = proposedCount
				validator.LastProposedBlockNumber = lastBlock
				break
			}
		}

		// Calcular uptime (simplificado - baseado em atividade recente)
		if !validator.FirstSeen.IsZero() {
			totalTime := now.Sub(validator.FirstSeen).Hours()
			if totalTime > 0 {
				// Assumir 99% de uptime para validadores ativos
				validator.Uptime = 99.0
			}
		}

		// Salvar no banco
		err = s.validatorRepo.Save(ctx, validator)
		if err != nil {
			return fmt.Errorf("erro ao salvar validador %s: %w", address, err)
		}
	}

	return nil
}

// getQBFTValidators faz chamada RPC para obter lista de validadores
func (s *ValidatorService) getQBFTValidators(ctx context.Context) ([]string, error) {
	request := JSONRPCRequest{
		JSONRPC: "2.0",
		Method:  "qbft_getValidatorsByBlockNumber",
		Params:  []string{"latest"},
		ID:      1,
	}

	var response JSONRPCResponse
	err := s.makeRPCCall(ctx, request, &response)
	if err != nil {
		return nil, err
	}

	if response.Error != nil {
		return nil, fmt.Errorf("erro RPC: %s", response.Error.Message)
	}

	var validators []string
	err = json.Unmarshal(response.Result, &validators)
	if err != nil {
		return nil, fmt.Errorf("erro ao fazer unmarshal dos validadores: %w", err)
	}

	return validators, nil
}

// getQBFTSignerMetrics faz chamada RPC para obter métricas dos validadores
func (s *ValidatorService) getQBFTSignerMetrics(ctx context.Context) ([]*entities.QBFTSignerMetric, error) {
	request := JSONRPCRequest{
		JSONRPC: "2.0",
		Method:  "qbft_getSignerMetrics",
		Params:  []interface{}{},
		ID:      1,
	}

	var response JSONRPCResponse
	err := s.makeRPCCall(ctx, request, &response)
	if err != nil {
		return nil, err
	}

	if response.Error != nil {
		return nil, fmt.Errorf("erro RPC: %s", response.Error.Message)
	}

	var metrics []*entities.QBFTSignerMetric
	err = json.Unmarshal(response.Result, &metrics)
	if err != nil {
		return nil, fmt.Errorf("erro ao fazer unmarshal das métricas: %w", err)
	}

	return metrics, nil
}

// makeRPCCall faz uma chamada JSON-RPC
func (s *ValidatorService) makeRPCCall(ctx context.Context, request JSONRPCRequest, response *JSONRPCResponse) error {
	jsonData, err := json.Marshal(request)
	if err != nil {
		return fmt.Errorf("erro ao fazer marshal da requisição: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", s.rpcURL, bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("erro ao criar requisição HTTP: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("erro ao fazer requisição HTTP: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("status HTTP inválido: %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("erro ao ler resposta: %w", err)
	}

	err = json.Unmarshal(body, response)
	if err != nil {
		return fmt.Errorf("erro ao fazer unmarshal da resposta: %w", err)
	}

	return nil
}

// calculateCurrentEpoch calcula o epoch atual baseado no último bloco
func (s *ValidatorService) calculateCurrentEpoch(ctx context.Context) (uint64, uint64, error) {
	latestBlock, err := s.blockRepo.FindLatest(ctx)
	if err != nil {
		return 0, 0, err
	}

	if latestBlock == nil {
		return 0, 0, fmt.Errorf("nenhum bloco encontrado")
	}

	// EpochLength padrão do QBFT é 30000 blocos
	epochLength := uint64(30000)
	currentEpoch := latestBlock.Number / epochLength

	return currentEpoch, epochLength, nil
}
