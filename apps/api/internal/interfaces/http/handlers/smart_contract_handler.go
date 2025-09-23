package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"

	"explorer-api/internal/app/services"
	"explorer-api/internal/domain/entities"
)

// SmartContractHandler gerencia endpoints relacionados a smart contracts
type SmartContractHandler struct {
	smartContractService *services.SmartContractService
}

// NewSmartContractHandler cria uma nova instância do handler
func NewSmartContractHandler(smartContractService *services.SmartContractService) *SmartContractHandler {
	return &SmartContractHandler{
		smartContractService: smartContractService,
	}
}

// GetSmartContracts retorna lista de smart contracts com filtros
// GET /api/smart-contracts?limit=10&page=1&type=ERC-20&verified=true
func (h *SmartContractHandler) GetSmartContracts(c *gin.Context) {
	// Parâmetros de paginação
	limitStr := c.DefaultQuery("limit", "10")
	pageStr := c.DefaultQuery("page", "1")

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 {
		limit = 10
	}
	if limit > 100 {
		limit = 100 // máximo de 100 por página
	}

	page, err := strconv.Atoi(pageStr)
	if err != nil || page <= 0 {
		page = 1
	}

	offset := (page - 1) * limit

	// Construir filtros
	filters := services.SmartContractFilters{
		Limit:  limit,
		Offset: offset,
	}

	// Filtro por tipo
	if contractType := c.Query("type"); contractType != "" {
		filters.ContractType = &contractType
	}

	// Filtro por verificação
	if verifiedStr := c.Query("verified"); verifiedStr != "" {
		if verified, err := strconv.ParseBool(verifiedStr); err == nil {
			filters.IsVerified = &verified
		}
	}

	// Filtro por ativo
	if activeStr := c.Query("active"); activeStr != "" {
		if active, err := strconv.ParseBool(activeStr); err == nil {
			filters.IsActive = &active
		}
	}

	// Filtro por token
	if tokenStr := c.Query("token"); tokenStr != "" {
		if token, err := strconv.ParseBool(tokenStr); err == nil {
			filters.IsToken = &token
		}
	}

	// Filtro por proxy
	if proxyStr := c.Query("proxy"); proxyStr != "" {
		if proxy, err := strconv.ParseBool(proxyStr); err == nil {
			filters.IsProxy = &proxy
		}
	}

	// Filtro por criador
	if creator := c.Query("creator"); creator != "" {
		filters.CreatorAddress = &creator
	}

	// Filtros por transações
	if minTxStr := c.Query("min_transactions"); minTxStr != "" {
		if minTx, err := strconv.ParseInt(minTxStr, 10, 64); err == nil {
			filters.MinTransactions = &minTx
		}
	}

	if maxTxStr := c.Query("max_transactions"); maxTxStr != "" {
		if maxTx, err := strconv.ParseInt(maxTxStr, 10, 64); err == nil {
			filters.MaxTransactions = &maxTx
		}
	}

	// Filtros por eventos
	if minEventsStr := c.Query("min_events"); minEventsStr != "" {
		if minEvents, err := strconv.ParseInt(minEventsStr, 10, 64); err == nil {
			filters.MinEvents = &minEvents
		}
	}

	if maxEventsStr := c.Query("max_events"); maxEventsStr != "" {
		if maxEvents, err := strconv.ParseInt(maxEventsStr, 10, 64); err == nil {
			filters.MaxEvents = &maxEvents
		}
	}

	// Filtros por data
	if createdAfterStr := c.Query("created_after"); createdAfterStr != "" {
		if createdAfter, err := time.Parse("2006-01-02", createdAfterStr); err == nil {
			filters.CreatedAfter = &createdAfter
		}
	}

	if createdBeforeStr := c.Query("created_before"); createdBeforeStr != "" {
		if createdBefore, err := time.Parse("2006-01-02", createdBeforeStr); err == nil {
			filters.CreatedBefore = &createdBefore
		}
	}

	// Filtros por bloco
	if fromBlockStr := c.Query("from_block"); fromBlockStr != "" {
		if fromBlock, err := strconv.ParseInt(fromBlockStr, 10, 64); err == nil {
			filters.FromBlock = &fromBlock
		}
	}

	if toBlockStr := c.Query("to_block"); toBlockStr != "" {
		if toBlock, err := strconv.ParseInt(toBlockStr, 10, 64); err == nil {
			filters.ToBlock = &toBlock
		}
	}

	// Busca por texto
	if search := c.Query("search"); search != "" {
		filters.Search = &search
	}

	// Ordenação
	if sortBy := c.Query("sort_by"); sortBy != "" {
		filters.SortBy = sortBy
	}

	if sortOrder := c.Query("sort_order"); sortOrder != "" {
		filters.SortOrder = sortOrder
	}

	// Debug: Log dos filtros aplicados
	log.Printf("[DEBUG] GetSmartContracts - Filtros aplicados: %+v", filters)

	// Buscar smart contracts
	log.Printf("[DEBUG] GetSmartContracts - Chamando smartContractService.GetSmartContracts")
	contracts, total, err := h.smartContractService.GetSmartContracts(filters)
	if err != nil {
		log.Printf("[ERROR] GetSmartContracts - Erro no serviço: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Erro interno do servidor",
			"details": err.Error(),
		})
		return
	}

	log.Printf("[DEBUG] GetSmartContracts - Sucesso: %d contratos encontrados, total: %d", len(contracts), total)

	// Calcular informações de paginação
	totalPages := (total + int64(limit) - 1) / int64(limit)
	hasNext := page < int(totalPages)
	hasPrev := page > 1

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    contracts,
		"pagination": gin.H{
			"current_page":   page,
			"total_pages":    totalPages,
			"total_items":    total,
			"items_per_page": limit,
			"has_next":       hasNext,
			"has_previous":   hasPrev,
		},
		"filters": gin.H{
			"type":     filters.ContractType,
			"verified": filters.IsVerified,
			"active":   filters.IsActive,
			"token":    filters.IsToken,
			"search":   filters.Search,
		},
	})
}

// GetSmartContractByAddress retorna detalhes de um smart contract específico
// GET /api/smart-contracts/:address
func (h *SmartContractHandler) GetSmartContractByAddress(c *gin.Context) {
	address := c.Param("address")
	if address == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Endereço do contrato é obrigatório",
		})
		return
	}

	contract, err := h.smartContractService.GetSmartContractByAddress(address)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "Smart contract não encontrado",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    contract,
	})
}

// GetSmartContractStats retorna estatísticas gerais dos smart contracts
// GET /api/smart-contracts/stats
func (h *SmartContractHandler) GetSmartContractStats(c *gin.Context) {
	stats, err := h.smartContractService.GetSmartContractStats()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Erro ao buscar estatísticas",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    stats,
	})
}

// GetSmartContractFunctions retorna as funções de um smart contract
// GET /api/smart-contracts/:address/functions
func (h *SmartContractHandler) GetSmartContractFunctions(c *gin.Context) {
	address := c.Param("address")
	if address == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Endereço do contrato é obrigatório",
		})
		return
	}

	functions, err := h.smartContractService.GetSmartContractFunctions(address)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Erro ao buscar funções",
			"details": err.Error(),
		})
		return
	}

	// Separar funções por tipo
	readFunctions := []*entities.SmartContractFunction{}
	writeFunctions := []*entities.SmartContractFunction{}

	for _, function := range functions {
		if function.IsReadOnly() {
			readFunctions = append(readFunctions, function)
		} else {
			writeFunctions = append(writeFunctions, function)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"all_functions":   functions,
			"read_functions":  readFunctions,
			"write_functions": writeFunctions,
			"total_count":     len(functions),
			"read_count":      len(readFunctions),
			"write_count":     len(writeFunctions),
		},
	})
}

// GetSmartContractEvents retorna os eventos de um smart contract
// GET /api/smart-contracts/:address/events
func (h *SmartContractHandler) GetSmartContractEvents(c *gin.Context) {
	address := c.Param("address")
	if address == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Endereço do contrato é obrigatório",
		})
		return
	}

	events, err := h.smartContractService.GetSmartContractEvents(address)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Erro ao buscar eventos",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"events": events,
			"count":  len(events),
		},
	})
}

// GetSmartContractABI retorna o ABI de um smart contract
// GET /api/smart-contracts/:address/abi
func (h *SmartContractHandler) GetSmartContractABI(c *gin.Context) {
	address := c.Param("address")
	if address == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Endereço do contrato é obrigatório",
		})
		return
	}

	contract, err := h.smartContractService.GetSmartContractByAddress(address)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "Smart contract não encontrado",
			"details": err.Error(),
		})
		return
	}

	if contract.ABI == nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "ABI não disponível para este contrato",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"address": contract.Address,
			"abi":     contract.ABI,
		},
	})
}

// GetSmartContractSourceCode retorna o código fonte de um smart contract
// GET /api/smart-contracts/:address/source
func (h *SmartContractHandler) GetSmartContractSourceCode(c *gin.Context) {
	address := c.Param("address")
	if address == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Endereço do contrato é obrigatório",
		})
		return
	}

	contract, err := h.smartContractService.GetSmartContractByAddress(address)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "Smart contract não encontrado",
			"details": err.Error(),
		})
		return
	}

	if contract.SourceCode == nil || *contract.SourceCode == "" {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Código fonte não disponível para este contrato",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"address":              contract.Address,
			"source_code":          contract.SourceCode,
			"compiler_version":     contract.CompilerVersion,
			"optimization_enabled": contract.OptimizationEnabled,
			"optimization_runs":    contract.OptimizationRuns,
			"license_type":         contract.LicenseType,
			"is_verified":          contract.IsVerified,
			"verification_date":    contract.VerificationDate,
		},
	})
}

// GetSmartContractMetrics retorna métricas diárias de um smart contract
// GET /api/smart-contracts/:address/metrics?days=30
func (h *SmartContractHandler) GetSmartContractMetrics(c *gin.Context) {
	address := c.Param("address")
	if address == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Endereço do contrato é obrigatório",
		})
		return
	}

	daysStr := c.DefaultQuery("days", "30")
	days, err := strconv.Atoi(daysStr)
	if err != nil || days <= 0 {
		days = 30
	}
	if days > 365 {
		days = 365 // máximo de 1 ano
	}

	metrics, err := h.smartContractService.GetSmartContractDailyMetrics(address, days)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Erro ao buscar métricas",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"address": address,
			"days":    days,
			"metrics": metrics,
			"count":   len(metrics),
		},
	})
}

// SearchSmartContracts busca smart contracts por texto
// GET /api/smart-contracts/search?q=uniswap&limit=10&page=1
func (h *SmartContractHandler) SearchSmartContracts(c *gin.Context) {
	query := c.Query("q")
	if query == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Parâmetro de busca 'q' é obrigatório",
		})
		return
	}

	// Parâmetros de paginação
	limitStr := c.DefaultQuery("limit", "10")
	pageStr := c.DefaultQuery("page", "1")

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 {
		limit = 10
	}
	if limit > 50 {
		limit = 50 // máximo de 50 para busca
	}

	page, err := strconv.Atoi(pageStr)
	if err != nil || page <= 0 {
		page = 1
	}

	offset := (page - 1) * limit

	contracts, total, err := h.smartContractService.SearchSmartContracts(query, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Erro na busca",
			"details": err.Error(),
		})
		return
	}

	// Calcular informações de paginação
	totalPages := (total + int64(limit) - 1) / int64(limit)
	hasNext := page < int(totalPages)
	hasPrev := page > 1

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    contracts,
		"pagination": gin.H{
			"current_page":   page,
			"total_pages":    totalPages,
			"total_items":    total,
			"items_per_page": limit,
			"has_next":       hasNext,
			"has_previous":   hasPrev,
		},
		"search": gin.H{
			"query": query,
		},
	})
}

// GetVerifiedSmartContracts retorna apenas contratos verificados
// GET /api/smart-contracts/verified?limit=10&page=1
func (h *SmartContractHandler) GetVerifiedSmartContracts(c *gin.Context) {
	// Parâmetros de paginação
	limitStr := c.DefaultQuery("limit", "10")
	pageStr := c.DefaultQuery("page", "1")

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 {
		limit = 10
	}
	if limit > 100 {
		limit = 100
	}

	page, err := strconv.Atoi(pageStr)
	if err != nil || page <= 0 {
		page = 1
	}

	offset := (page - 1) * limit

	verified := true
	filters := services.SmartContractFilters{
		IsVerified: &verified,
		Limit:      limit,
		Offset:     offset,
		SortBy:     "verification_date",
		SortOrder:  "desc",
	}

	contracts, total, err := h.smartContractService.GetSmartContracts(filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Erro interno do servidor",
			"details": err.Error(),
		})
		return
	}

	// Calcular informações de paginação
	totalPages := (total + int64(limit) - 1) / int64(limit)
	hasNext := page < int(totalPages)
	hasPrev := page > 1

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    contracts,
		"pagination": gin.H{
			"current_page":   page,
			"total_pages":    totalPages,
			"total_items":    total,
			"items_per_page": limit,
			"has_next":       hasNext,
			"has_previous":   hasPrev,
		},
		"filter": "verified",
	})
}

// GetSmartContractsByType retorna contratos por tipo
// GET /api/smart-contracts/type/:type?limit=10&page=1
func (h *SmartContractHandler) GetSmartContractsByType(c *gin.Context) {
	contractType := c.Param("type")
	if contractType == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Tipo do contrato é obrigatório",
		})
		return
	}

	// Parâmetros de paginação
	limitStr := c.DefaultQuery("limit", "10")
	pageStr := c.DefaultQuery("page", "1")

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 {
		limit = 10
	}
	if limit > 100 {
		limit = 100
	}

	page, err := strconv.Atoi(pageStr)
	if err != nil || page <= 0 {
		page = 1
	}

	offset := (page - 1) * limit

	filters := services.SmartContractFilters{
		ContractType: &contractType,
		Limit:        limit,
		Offset:       offset,
		SortBy:       "total_transactions",
		SortOrder:    "desc",
	}

	contracts, total, err := h.smartContractService.GetSmartContracts(filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Erro interno do servidor",
			"details": err.Error(),
		})
		return
	}

	// Calcular informações de paginação
	totalPages := (total + int64(limit) - 1) / int64(limit)
	hasNext := page < int(totalPages)
	hasPrev := page > 1

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    contracts,
		"pagination": gin.H{
			"current_page":   page,
			"total_pages":    totalPages,
			"total_items":    total,
			"items_per_page": limit,
			"has_next":       hasNext,
			"has_previous":   hasPrev,
		},
		"filter": gin.H{
			"type": contractType,
		},
	})
}

// GetPopularSmartContracts retorna os contratos mais populares
// GET /api/smart-contracts/popular?limit=10
func (h *SmartContractHandler) GetPopularSmartContracts(c *gin.Context) {
	limitStr := c.DefaultQuery("limit", "10")
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 {
		limit = 10
	}
	if limit > 50 {
		limit = 50
	}

	contracts, err := h.smartContractService.GetPopularSmartContracts(limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Erro ao buscar contratos populares",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    contracts,
		"count":   len(contracts),
		"filter":  "popular",
	})
}

// VerifySmartContract verifica e registra um smart contract
// POST /api/smart-contracts/verify
func (h *SmartContractHandler) VerifySmartContract(c *gin.Context) {
	var request struct {
		Address             string                 `json:"address" binding:"required"`
		Name                string                 `json:"name" binding:"required"`
		Symbol              string                 `json:"symbol,omitempty"`
		Description         string                 `json:"description"`
		ContractType        string                 `json:"contract_type"`
		SourceCode          string                 `json:"source_code" binding:"required"`
		ABI                 json.RawMessage        `json:"abi" binding:"required"`
		Bytecode            string                 `json:"bytecode"`
		ConstructorArgs     []interface{}          `json:"constructor_args"`
		CompilerVersion     string                 `json:"compiler_version" binding:"required"`
		OptimizationEnabled bool                   `json:"optimization_enabled"`
		OptimizationRuns    int                    `json:"optimization_runs"`
		LicenseType         string                 `json:"license_type"`
		WebsiteURL          string                 `json:"website_url,omitempty"`
		GithubURL           string                 `json:"github_url,omitempty"`
		DocumentationURL    string                 `json:"documentation_url,omitempty"`
		Tags                []string               `json:"tags"`
		Metadata            map[string]interface{} `json:"metadata"`
		// Informações do deploy (opcionais para verificação manual)
		CreatorAddress      string    `json:"creator_address,omitempty"`
		CreationTxHash      string    `json:"creation_tx_hash,omitempty"`
		CreationBlockNumber int64     `json:"creation_block_number,omitempty"`
		CreationTimestamp   time.Time `json:"creation_timestamp,omitempty"`
		GasUsed             int64     `json:"gas_used,omitempty"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Dados inválidos",
			"details": err.Error(),
		})
		return
	}

	// Verificar se o contrato já existe
	existingContract, err := h.smartContractService.GetSmartContractByAddress(request.Address)
	if err == nil && existingContract.IsVerified {
		c.JSON(http.StatusConflict, gin.H{
			"error": "Contrato já está verificado",
			"data":  existingContract,
		})
		return
	}

	// TODO: Implementar verificação do bytecode
	// 1. Compilar o código fonte fornecido
	// 2. Comparar com o bytecode on-chain
	// 3. Validar argumentos do construtor
	// 4. Parsear ABI para extrair funções e eventos

	// Usar informações do deploy se fornecidas, senão usar placeholders
	now := time.Now()
	creatorAddress := request.CreatorAddress
	if creatorAddress == "" {
		creatorAddress = "0x0000000000000000000000000000000000000000" // Placeholder para verificação manual
	}

	creationTxHash := request.CreationTxHash
	if creationTxHash == "" {
		creationTxHash = "0x0000000000000000000000000000000000000000000000000000000000000000" // Placeholder
	}

	creationTimestamp := request.CreationTimestamp
	if creationTimestamp.IsZero() {
		creationTimestamp = now
	}

	contract := &entities.SmartContract{
		Address:             request.Address,
		Name:                &request.Name,
		Symbol:              &request.Symbol,
		Type:                &request.ContractType,
		IsVerified:          true,
		VerificationDate:    &now,
		CompilerVersion:     &request.CompilerVersion,
		OptimizationEnabled: &request.OptimizationEnabled,
		OptimizationRuns:    &request.OptimizationRuns,
		LicenseType:         &request.LicenseType,
		SourceCode:          &request.SourceCode,
		ABI:                 &request.ABI,
		Bytecode:            &request.Bytecode,
		Description:         &request.Description,
		WebsiteURL:          &request.WebsiteURL,
		GithubURL:           &request.GithubURL,
		DocumentationURL:    &request.DocumentationURL,
		Tags:                request.Tags,
		IsActive:            true,
		CreatedAt:           now,
		UpdatedAt:           now,
		// Usar informações reais do deploy
		CreatorAddress:            creatorAddress,
		CreationTxHash:            creationTxHash,
		CreationBlockNumber:       request.CreationBlockNumber,
		CreationTimestamp:         creationTimestamp,
		Balance:                   "0", // Será atualizado pelo indexer
		Nonce:                     0,
		TotalTransactions:         0,
		TotalInternalTransactions: 0,
		TotalEvents:               0,
		UniqueAddressesCount:      0,
		TotalGasUsed:              "0",
		TotalValueTransferred:     "0",
		IsProxy:                   false,
		IsToken:                   request.ContractType == "ERC-20" || request.ContractType == "ERC-721",
	}

	// Salvar ou atualizar o contrato
	if err := h.smartContractService.SaveOrUpdateSmartContract(contract); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Erro ao salvar contrato verificado",
			"details": err.Error(),
		})
		return
	}

	// TODO: Processar ABI para extrair funções e eventos
	// h.processContractABI(request.Address, request.ABI)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Contrato verificado com sucesso",
		"data":    contract,
	})
}

// RegisterSmartContract registra um novo smart contract após deploy
// POST /api/smart-contracts/register
func (h *SmartContractHandler) RegisterSmartContract(c *gin.Context) {
	var request struct {
		Address          string    `json:"address" binding:"required"`
		CreatorAddress   string    `json:"creator_address" binding:"required"`
		TxHash           string    `json:"tx_hash" binding:"required"`
		BlockNumber      int64     `json:"block_number" binding:"required"`
		Timestamp        time.Time `json:"timestamp" binding:"required"`
		Name             string    `json:"name"`
		Symbol           string    `json:"symbol,omitempty"`
		Description      string    `json:"description"`
		ContractType     string    `json:"contract_type"`
		Tags             []string  `json:"tags"`
		WebsiteURL       string    `json:"website_url,omitempty"`
		GithubURL        string    `json:"github_url,omitempty"`
		DocumentationURL string    `json:"documentation_url,omitempty"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Dados inválidos",
			"details": err.Error(),
		})
		return
	}

	// Verificar se o contrato já existe
	_, err := h.smartContractService.GetSmartContractByAddress(request.Address)
	if err == nil {
		c.JSON(http.StatusConflict, gin.H{
			"error": "Contrato já está registrado",
		})
		return
	}

	// Criar novo contrato com informações do deploy
	now := time.Now()
	contract := &entities.SmartContract{
		Address:             request.Address,
		CreatorAddress:      request.CreatorAddress,
		CreationTxHash:      request.TxHash,
		CreationBlockNumber: request.BlockNumber,
		CreationTimestamp:   request.Timestamp,
		Name:                &request.Name,
		Symbol:              &request.Symbol,
		Type:                &request.ContractType,
		Description:         &request.Description,
		WebsiteURL:          &request.WebsiteURL,
		GithubURL:           &request.GithubURL,
		DocumentationURL:    &request.DocumentationURL,
		Tags:                request.Tags,
		IsActive:            true,
		IsVerified:          false,
		// Valores iniciais - serão atualizados pelo indexer
		Balance:                   "0",
		Nonce:                     0,
		TotalTransactions:         0,
		TotalInternalTransactions: 0,
		TotalEvents:               0,
		UniqueAddressesCount:      0,
		TotalGasUsed:              "0",
		TotalValueTransferred:     "0",
		IsProxy:                   false,
		IsToken:                   request.ContractType == "ERC-20" || request.ContractType == "ERC-721",
		CreatedAt:                 now,
		UpdatedAt:                 now,
	}

	// Salvar o contrato
	if err := h.smartContractService.SaveOrUpdateSmartContract(contract); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Erro ao registrar contrato",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Contrato registrado com sucesso",
		"data":    contract,
	})
}
