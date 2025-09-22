package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math/big"
	"net/http"
	"time"

	"github.com/hubweb3/worker/internal/domain/entities"
	"github.com/hubweb3/worker/internal/domain/services"
	"github.com/hubweb3/worker/internal/queues"
)

// ValidatorHandler gerencia a sincronização dos validadores QBFT
type ValidatorHandler struct {
	validatorService *services.ValidatorService
	publisher        *queues.Publisher
	rpcURL           string
	httpClient       *http.Client
	syncInterval     time.Duration
}

// NewValidatorHandler cria uma nova instância do handler de validadores
func NewValidatorHandler(validatorService *services.ValidatorService, publisher *queues.Publisher, rpcURL string) *ValidatorHandler {
	return &ValidatorHandler{
		validatorService: validatorService,
		publisher:        publisher,
		rpcURL:           rpcURL,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
		syncInterval: 30 * time.Second, // Sincronizar a cada 30 segundos
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

// QBFTSignerMetric representa os dados retornados pela API qbft_getSignerMetrics
type QBFTSignerMetric struct {
	Address                 string `json:"address"`
	ProposedBlockCount      string `json:"proposedBlockCount"`      // Hex string
	LastProposedBlockNumber string `json:"lastProposedBlockNumber"` // Hex string
}

// Start inicia a sincronização periódica dos validadores
func (h *ValidatorHandler) Start(ctx context.Context) error {
	log.Println("🔄 Iniciando Validator Handler...")

	// Fazer sincronização inicial
	if err := h.syncValidators(ctx); err != nil {
		log.Printf("⚠️ Erro na sincronização inicial de validadores: %v", err)
	}

	// Iniciar timer para sincronização periódica
	ticker := time.NewTicker(h.syncInterval)
	defer ticker.Stop()

	log.Printf("✅ Validator Handler iniciado, sincronizando a cada %v", h.syncInterval)

	for {
		select {
		case <-ctx.Done():
			log.Println("🛑 Validator Handler encerrado")
			return nil
		case <-ticker.C:
			if err := h.syncValidators(ctx); err != nil {
				log.Printf("❌ Erro na sincronização de validadores: %v", err)
			}
		}
	}
}

// syncValidators sincroniza dados dos validadores da rede QBFT
func (h *ValidatorHandler) syncValidators(ctx context.Context) error {
	log.Println("🔄 Sincronizando validadores QBFT...")

	// 1. Obter lista de validadores atuais
	validators, err := h.getQBFTValidators(ctx)
	if err != nil {
		return fmt.Errorf("erro ao obter validadores QBFT: %w", err)
	}

	if len(validators) == 0 {
		log.Println("⚠️ Nenhum validador encontrado na rede")
		return nil
	}

	// 2. Obter métricas dos validadores
	metrics, err := h.getQBFTSignerMetrics(ctx)
	if err != nil {
		return fmt.Errorf("erro ao obter métricas QBFT: %w", err)
	}

	// 3. Processar cada validador
	now := time.Now()
	var validatorEntities []*entities.Validator

	for _, address := range validators {
		validator := &entities.Validator{
			Address:                 address,
			ProposedBlockCount:      big.NewInt(0),
			LastProposedBlockNumber: big.NewInt(0),
			Status:                  "active",
			IsActive:                true,
			Uptime:                  99.0, // Assumir 99% para validadores ativos
			LastSeen:                now,
		}

		// Buscar métricas específicas do validador
		for _, metric := range metrics {
			if metric.Address == address {
				// Converter hex strings para big.Int
				proposedCount := new(big.Int)
				if len(metric.ProposedBlockCount) > 2 {
					proposedCount.SetString(metric.ProposedBlockCount[2:], 16) // Remove 0x prefix
				}

				lastBlock := new(big.Int)
				if len(metric.LastProposedBlockNumber) > 2 {
					lastBlock.SetString(metric.LastProposedBlockNumber[2:], 16) // Remove 0x prefix
				}

				validator.ProposedBlockCount = proposedCount
				validator.LastProposedBlockNumber = lastBlock
				break
			}
		}

		validatorEntities = append(validatorEntities, validator)
	}

	// 4. Processar através do serviço de domínio
	if err := h.validatorService.SyncValidators(ctx, validatorEntities); err != nil {
		return fmt.Errorf("erro ao processar validadores: %w", err)
	}

	// 5. Publicar evento de sincronização para WebSocket
	if err := h.publishValidatorSync(validatorEntities); err != nil {
		log.Printf("⚠️ Erro ao publicar sincronização de validadores: %v", err)
	}

	log.Printf("✅ Sincronização de validadores concluída - %d validadores processados", len(validatorEntities))
	return nil
}

// getQBFTValidators faz chamada RPC para obter lista de validadores
func (h *ValidatorHandler) getQBFTValidators(ctx context.Context) ([]string, error) {
	request := JSONRPCRequest{
		JSONRPC: "2.0",
		Method:  "qbft_getValidatorsByBlockNumber",
		Params:  []string{"latest"},
		ID:      1,
	}

	var response JSONRPCResponse
	err := h.makeRPCCall(ctx, request, &response)
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
func (h *ValidatorHandler) getQBFTSignerMetrics(ctx context.Context) ([]*QBFTSignerMetric, error) {
	request := JSONRPCRequest{
		JSONRPC: "2.0",
		Method:  "qbft_getSignerMetrics",
		Params:  []interface{}{},
		ID:      1,
	}

	var response JSONRPCResponse
	err := h.makeRPCCall(ctx, request, &response)
	if err != nil {
		return nil, err
	}

	if response.Error != nil {
		return nil, fmt.Errorf("erro RPC: %s", response.Error.Message)
	}

	var metrics []*QBFTSignerMetric
	err = json.Unmarshal(response.Result, &metrics)
	if err != nil {
		return nil, fmt.Errorf("erro ao fazer unmarshal das métricas: %w", err)
	}

	return metrics, nil
}

// makeRPCCall faz uma chamada JSON-RPC
func (h *ValidatorHandler) makeRPCCall(ctx context.Context, request JSONRPCRequest, response *JSONRPCResponse) error {
	jsonData, err := json.Marshal(request)
	if err != nil {
		return fmt.Errorf("erro ao fazer marshal da requisição: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", h.rpcURL, bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("erro ao criar requisição HTTP: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")

	resp, err := h.httpClient.Do(req)
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

// publishValidatorSync publica evento de sincronização de validadores
func (h *ValidatorHandler) publishValidatorSync(validators []*entities.Validator) error {
	// Preparar dados para o WebSocket
	validatorData := make([]map[string]interface{}, len(validators))
	for i, validator := range validators {
		validatorData[i] = map[string]interface{}{
			"address":                    validator.Address,
			"proposed_block_count":       validator.ProposedBlockCount.String(),
			"last_proposed_block_number": validator.LastProposedBlockNumber.String(),
			"status":                     validator.Status,
			"is_active":                  validator.IsActive,
			"uptime":                     validator.Uptime,
			"last_seen":                  validator.LastSeen.Unix(),
		}
	}

	event := map[string]interface{}{
		"type":      "validator_sync",
		"timestamp": time.Now().Unix(),
		"data": map[string]interface{}{
			"validators": validatorData,
			"count":      len(validators),
		},
	}

	// Serializar evento
	eventBytes, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("erro ao serializar evento: %w", err)
	}

	// Publicar na fila de WebSocket
	return h.publisher.Publish(queues.WebSocketQueue.Name, eventBytes)
}
