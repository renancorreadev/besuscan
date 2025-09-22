package handlers

import (
	"crypto/rand"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"explorer-api/internal/app/services"
	"explorer-api/internal/domain/entities"
	"explorer-api/internal/domain/repositories"

	"github.com/gin-gonic/gin"
)

// generateRequestID gera um ID único para tracking
func generateRequestID() string {
	b := make([]byte, 16)
	rand.Read(b)
	return fmt.Sprintf("%x", b)
}

// AccountHandler gerencia as rotas HTTP relacionadas a accounts
type AccountHandler struct {
	accountService       *services.AccountService
	queueService         *services.QueueService
	smartContractService *services.SmartContractService
}

// NewAccountHandler cria uma nova instância do handler de accounts
func NewAccountHandler(accountService *services.AccountService, queueService *services.QueueService, smartContractService *services.SmartContractService) *AccountHandler {
	return &AccountHandler{
		accountService:       accountService,
		queueService:         queueService,
		smartContractService: smartContractService,
	}
}

// GetAccounts retorna uma lista de accounts com filtros
// GET /api/accounts?account_type=EOA&limit=20&page=1
func (h *AccountHandler) GetAccounts(c *gin.Context) {
	// Construir filtros a partir dos query parameters
	filters := &repositories.AccountFilters{}

	// Filtros básicos
	filters.AccountType = c.Query("account_type")
	filters.MinBalance = c.Query("min_balance")
	filters.MaxBalance = c.Query("max_balance")
	filters.ComplianceStatus = c.Query("compliance_status")
	filters.Search = c.Query("search")

	// Filtros de transações
	if minTxStr := c.Query("min_transactions"); minTxStr != "" {
		if minTx, err := strconv.Atoi(minTxStr); err == nil {
			filters.MinTransactions = minTx
		}
	}
	if maxTxStr := c.Query("max_transactions"); maxTxStr != "" {
		if maxTx, err := strconv.Atoi(maxTxStr); err == nil {
			filters.MaxTransactions = maxTx
		}
	}

	// Filtros de risco
	if minRiskStr := c.Query("min_risk_score"); minRiskStr != "" {
		if minRisk, err := strconv.Atoi(minRiskStr); err == nil {
			filters.MinRiskScore = minRisk
		}
	}
	if maxRiskStr := c.Query("max_risk_score"); maxRiskStr != "" {
		if maxRisk, err := strconv.Atoi(maxRiskStr); err == nil {
			filters.MaxRiskScore = maxRisk
		}
	}

	// Filtros booleanos
	if isContractStr := c.Query("is_contract"); isContractStr != "" {
		if isContract, err := strconv.ParseBool(isContractStr); err == nil {
			filters.IsContract = &isContract
		}
	}
	if hasActivityStr := c.Query("has_activity"); hasActivityStr != "" {
		if hasActivity, err := strconv.ParseBool(hasActivityStr); err == nil {
			filters.HasActivity = &hasActivity
		}
	}

	// Filtros de data
	filters.CreatedAfter = c.Query("created_after")
	filters.CreatedBefore = c.Query("created_before")

	// Tags
	if tagsStr := c.Query("tags"); tagsStr != "" {
		filters.Tags = strings.Split(tagsStr, ",")
	}

	// Ordenação
	filters.OrderBy = c.DefaultQuery("order_by", "created_at")
	filters.OrderDir = c.DefaultQuery("order_dir", "desc")

	// Paginação
	if pageStr := c.DefaultQuery("page", "1"); pageStr != "" {
		if page, err := strconv.Atoi(pageStr); err == nil {
			filters.Page = page
		}
	}
	if limitStr := c.DefaultQuery("limit", "20"); limitStr != "" {
		if limit, err := strconv.Atoi(limitStr); err == nil {
			filters.Limit = limit
		}
	}

	// Buscar accounts
	result, err := h.accountService.GetAccounts(c.Request.Context(), filters)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    result.Data,
		"pagination": gin.H{
			"page":        result.Page,
			"limit":       result.Limit,
			"total":       result.Total,
			"total_pages": result.TotalPages,
		},
		"filters": filters,
	})
}

// GetAccount retorna uma account específica por endereço
// GET /api/accounts/:address
func (h *AccountHandler) GetAccount(c *gin.Context) {
	address := c.Param("address")
	if address == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Endereço da account é obrigatório",
		})
		return
	}

	// Validar e buscar account
	_, err := h.accountService.ParseAccountIdentifier(address)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	account, err := h.accountService.GetAccountByAddress(c.Request.Context(), address)
	if err != nil {
		if strings.Contains(err.Error(), "não encontrada") {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "Account não encontrada",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    account,
	})
}

// IsContract verifica se um endereço é um contrato inteligente
// GET /api/accounts/:address/is-contract
func (h *AccountHandler) IsContract(c *gin.Context) {
	address := c.Param("address")
	if address == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Endereço é obrigatório",
		})
		return
	}

	// Validar endereço
	_, err := h.accountService.ParseAccountIdentifier(address)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	// Verificar se o endereço existe na tabela smart_contracts
	smartContract, err := h.smartContractService.GetSmartContractByAddress(address)
	if err != nil {
		// Se não encontrou na tabela smart_contracts, não é um contrato (ou não está registrado)
		c.JSON(http.StatusOK, gin.H{
			"success":     true,
			"is_contract": false,
			"exists":      false,
			"message":     "Address not found in smart contracts registry",
		})
		return
	}

	// Se encontrou, é um contrato
	c.JSON(http.StatusOK, gin.H{
		"success":       true,
		"is_contract":   true,
		"contract_type": smartContract.Type,
		"contract_name": smartContract.Name,
		"is_verified":   smartContract.IsVerified,
		"is_token":      smartContract.IsToken,
		"is_proxy":      smartContract.IsProxy,
		"exists":        true,
	})
}

// SearchAccounts busca accounts por termo
// GET /api/accounts/search?q=0x123...&limit=10
func (h *AccountHandler) SearchAccounts(c *gin.Context) {
	query := c.Query("q")
	if query == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Parâmetro 'q' (query) é obrigatório",
		})
		return
	}

	// Obter limite
	limitStr := c.DefaultQuery("limit", "20")
	limit, err := strconv.Atoi(limitStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Parâmetro 'limit' inválido",
		})
		return
	}

	// Buscar accounts
	accounts, err := h.accountService.SearchAccounts(c.Request.Context(), query, limit)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    accounts,
		"count":   len(accounts),
		"query":   query,
	})
}

// GetAccountsByType retorna accounts por tipo
// GET /api/accounts/type/:type?limit=20
func (h *AccountHandler) GetAccountsByType(c *gin.Context) {
	accountType := c.Param("type")
	if accountType == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Tipo de account é obrigatório",
		})
		return
	}

	// Obter limite
	limitStr := c.DefaultQuery("limit", "20")
	limit, err := strconv.Atoi(limitStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Parâmetro 'limit' inválido",
		})
		return
	}

	// Buscar accounts
	accounts, err := h.accountService.GetAccountsByType(c.Request.Context(), accountType, limit)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    accounts,
		"count":   len(accounts),
		"type":    accountType,
	})
}

// GetTopAccountsByBalance retorna accounts com maior saldo
// GET /api/accounts/top/balance?limit=10
func (h *AccountHandler) GetTopAccountsByBalance(c *gin.Context) {
	// Obter limite
	limitStr := c.DefaultQuery("limit", "10")
	limit, err := strconv.Atoi(limitStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Parâmetro 'limit' inválido",
		})
		return
	}

	// Buscar accounts
	accounts, err := h.accountService.GetTopAccountsByBalance(c.Request.Context(), limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    accounts,
		"count":   len(accounts),
	})
}

// GetTopAccountsByTransactions retorna accounts com mais transações
// GET /api/accounts/top/transactions?limit=10
func (h *AccountHandler) GetTopAccountsByTransactions(c *gin.Context) {
	// Obter limite
	limitStr := c.DefaultQuery("limit", "10")
	limit, err := strconv.Atoi(limitStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Parâmetro 'limit' inválido",
		})
		return
	}

	// Buscar accounts
	accounts, err := h.accountService.GetTopAccountsByTransactions(c.Request.Context(), limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    accounts,
		"count":   len(accounts),
	})
}

// GetRecentlyActiveAccounts retorna accounts com atividade recente
// GET /api/accounts/recent/active?limit=10
func (h *AccountHandler) GetRecentlyActiveAccounts(c *gin.Context) {
	// Obter limite
	limitStr := c.DefaultQuery("limit", "10")
	limit, err := strconv.Atoi(limitStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Parâmetro 'limit' inválido",
		})
		return
	}

	// Buscar accounts
	accounts, err := h.accountService.GetRecentlyActiveAccounts(c.Request.Context(), limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    accounts,
		"count":   len(accounts),
	})
}

// GetAccountStats retorna estatísticas gerais de accounts
// GET /api/accounts/stats
func (h *AccountHandler) GetAccountStats(c *gin.Context) {
	stats, err := h.accountService.GetAccountStats(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    stats,
	})
}

// GetAccountStatsByType retorna estatísticas por tipo de account
// GET /api/accounts/stats/type
func (h *AccountHandler) GetAccountStatsByType(c *gin.Context) {
	stats, err := h.accountService.GetAccountStatsByType(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    stats,
	})
}

// GetComplianceStats retorna estatísticas de compliance
// GET /api/accounts/stats/compliance
func (h *AccountHandler) GetComplianceStats(c *gin.Context) {
	stats, err := h.accountService.GetComplianceStats(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    stats,
	})
}

// GetAccountTags retorna tags de uma account
// GET /api/accounts/:address/tags
func (h *AccountHandler) GetAccountTags(c *gin.Context) {
	address := c.Param("address")
	if address == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Endereço da account é obrigatório",
		})
		return
	}

	tags, err := h.accountService.GetAccountTags(c.Request.Context(), address)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    tags,
		"count":   len(tags),
	})
}

// NOTA: Operações de escrita (POST, PUT, DELETE) foram removidas
// A API apenas consulta dados - todas as operações de escrita são feitas pelo worker
// que processa as filas do RabbitMQ e atualiza o PostgreSQL

// GetAccountAnalytics retorna analytics de uma account
// GET /api/accounts/:address/analytics?days=30
func (h *AccountHandler) GetAccountAnalytics(c *gin.Context) {
	address := c.Param("address")
	if address == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Endereço da account é obrigatório",
		})
		return
	}

	// Obter número de dias
	daysStr := c.DefaultQuery("days", "30")
	days, err := strconv.Atoi(daysStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Parâmetro 'days' inválido",
		})
		return
	}

	analytics, err := h.accountService.GetAccountAnalytics(c.Request.Context(), address, days)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    analytics,
		"count":   len(analytics),
		"days":    days,
	})
}

// GetContractInteractions retorna interações com contratos de uma account
// GET /api/accounts/:address/interactions?limit=20
func (h *AccountHandler) GetContractInteractions(c *gin.Context) {
	address := c.Param("address")
	if address == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Endereço da account é obrigatório",
		})
		return
	}

	// Obter limite
	limitStr := c.DefaultQuery("limit", "20")
	limit, err := strconv.Atoi(limitStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Parâmetro 'limit' inválido",
		})
		return
	}

	interactions, err := h.accountService.GetContractInteractions(c.Request.Context(), address, limit)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    interactions,
		"count":   len(interactions),
	})
}

// GetTokenHoldings retorna holdings de tokens de uma account
// GET /api/accounts/:address/tokens
func (h *AccountHandler) GetTokenHoldings(c *gin.Context) {
	address := c.Param("address")
	if address == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Endereço da account é obrigatório",
		})
		return
	}

	holdings, err := h.accountService.GetTokenHoldings(c.Request.Context(), address)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    holdings,
		"count":   len(holdings),
	})
}

// GetSmartAccounts retorna Smart Accounts
// GET /api/accounts/smart?limit=20
func (h *AccountHandler) GetSmartAccounts(c *gin.Context) {
	// Obter limite
	limitStr := c.DefaultQuery("limit", "20")
	limit, err := strconv.Atoi(limitStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Parâmetro 'limit' inválido",
		})
		return
	}

	accounts, err := h.accountService.GetSmartAccounts(c.Request.Context(), limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    accounts,
		"count":   len(accounts),
	})
}

// GetAccountsByFactory retorna accounts criadas por uma factory
// GET /api/accounts/factory/:factory_address?limit=20
func (h *AccountHandler) GetAccountsByFactory(c *gin.Context) {
	factoryAddress := c.Param("factory_address")
	if factoryAddress == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Endereço da factory é obrigatório",
		})
		return
	}

	// Obter limite
	limitStr := c.DefaultQuery("limit", "20")
	limit, err := strconv.Atoi(limitStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Parâmetro 'limit' inválido",
		})
		return
	}

	accounts, err := h.accountService.GetAccountsByFactory(c.Request.Context(), factoryAddress, limit)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    accounts,
		"count":   len(accounts),
		"factory": factoryAddress,
	})
}

// GetAccountsByOwner retorna Smart Accounts de um owner
// GET /api/accounts/owner/:owner_address?limit=20
func (h *AccountHandler) GetAccountsByOwner(c *gin.Context) {
	ownerAddress := c.Param("owner_address")
	if ownerAddress == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Endereço do owner é obrigatório",
		})
		return
	}

	// Obter limite
	limitStr := c.DefaultQuery("limit", "20")
	limit, err := strconv.Atoi(limitStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Parâmetro 'limit' inválido",
		})
		return
	}

	accounts, err := h.accountService.GetAccountsByOwner(c.Request.Context(), ownerAddress, limit)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    accounts,
		"count":   len(accounts),
		"owner":   ownerAddress,
	})
}

// CreateAccount cria uma nova account via fila
// POST /api/accounts
func (h *AccountHandler) CreateAccount(c *gin.Context) {
	var request entities.AccountCreationMessage

	// Bind JSON request
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Dados inválidos: " + err.Error(),
		})
		return
	}

	// Validar endereço obrigatório
	if request.Address == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Endereço da account é obrigatório",
		})
		return
	}

	// Validar tipo de account
	if request.AccountType == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Tipo de account é obrigatório (EOA ou Smart Account)",
		})
		return
	}

	if !request.IsValidAccountType() {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Tipo de account inválido. Use 'EOA' ou 'Smart Account'",
		})
		return
	}

	// Validar dados de Smart Account se necessário
	if request.IsSmartAccount() && !request.HasSmartAccountData() {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Smart Account deve ter pelo menos factory_address, implementation_address ou owner_address",
		})
		return
	}

	// Validar risk score se fornecido
	if request.RiskScore != nil && (*request.RiskScore < 0 || *request.RiskScore > 10) {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Risk score deve estar entre 0 e 10",
		})
		return
	}

	// Validar compliance status se fornecido
	if request.ComplianceStatus != nil {
		validStatuses := []string{"compliant", "non_compliant", "pending", "under_review"}
		isValid := false
		for _, status := range validStatuses {
			if *request.ComplianceStatus == status {
				isValid = true
				break
			}
		}
		if !isValid {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Compliance status inválido. Use: compliant, non_compliant, pending, under_review",
			})
			return
		}
	}

	// Verificar se account já existe
	existingAccount, err := h.accountService.GetAccountByAddress(c.Request.Context(), request.Address)
	if err == nil && existingAccount != nil {
		c.JSON(http.StatusConflict, gin.H{
			"error": "Account já existe",
			"data":  existingAccount,
		})
		return
	}

	// Definir valores padrão
	request.SetDefaults()

	// Adicionar metadata da requisição
	if userID := c.GetHeader("X-User-ID"); userID != "" {
		request.CreatedBy = &userID
	}

	// Gerar ID único para tracking
	requestID := generateRequestID()
	c.Header("X-Request-ID", requestID)

	// Verificar se queue service está disponível e conectado
	if h.queueService == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error": "Operações de escrita não estão disponíveis. Serviço de fila não configurado.",
		})
		return
	}
	if !h.queueService.IsConnected() {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error": "Serviço de fila indisponível. Tente novamente em alguns instantes.",
		})
		return
	}

	// Enviar para fila
	err = h.queueService.PublishAccountCreation(c.Request.Context(), request)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Erro ao processar solicitação: " + err.Error(),
		})
		return
	}

	// Resposta de sucesso
	c.JSON(http.StatusAccepted, gin.H{
		"success":    true,
		"message":    "Account será criada em breve",
		"request_id": requestID,
		"data": gin.H{
			"address":              request.Address,
			"account_type":         request.AccountType,
			"status":               "processing",
			"estimated_completion": time.Now().Add(30 * time.Second).Format(time.RFC3339),
		},
	})
}

// UpdateAccount atualiza uma account via fila
// PUT /api/accounts/:address
func (h *AccountHandler) UpdateAccount(c *gin.Context) {
	address := c.Param("address")
	if address == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Endereço da account é obrigatório",
		})
		return
	}

	var request entities.AccountUpdateMessage

	// Bind JSON request
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Dados inválidos: " + err.Error(),
		})
		return
	}

	// Definir endereço da URL
	request.Address = address

	// Validar risk score se fornecido
	if request.RiskScore != nil && (*request.RiskScore < 0 || *request.RiskScore > 10) {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Risk score deve estar entre 0 e 10",
		})
		return
	}

	// Verificar se account existe
	existingAccount, err := h.accountService.GetAccountByAddress(c.Request.Context(), address)
	if err != nil || existingAccount == nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Account não encontrada",
		})
		return
	}

	// Adicionar metadata
	if userID := c.GetHeader("X-User-ID"); userID != "" {
		request.UpdatedBy = &userID
	}
	request.Source = "api"
	request.Timestamp = time.Now()

	// Gerar ID único para tracking
	requestID := generateRequestID()
	c.Header("X-Request-ID", requestID)

	// Verificar se queue service está disponível e conectado
	if h.queueService == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error": "Operações de escrita não estão disponíveis. Serviço de fila não configurado.",
		})
		return
	}
	if !h.queueService.IsConnected() {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error": "Serviço de fila indisponível. Tente novamente em alguns instantes.",
		})
		return
	}

	// Enviar para fila
	err = h.queueService.PublishAccountUpdate(c.Request.Context(), request)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Erro ao processar solicitação: " + err.Error(),
		})
		return
	}

	// Resposta de sucesso
	c.JSON(http.StatusAccepted, gin.H{
		"success":    true,
		"message":    "Account será atualizada em breve",
		"request_id": requestID,
		"data": gin.H{
			"address":              address,
			"status":               "processing",
			"estimated_completion": time.Now().Add(15 * time.Second).Format(time.RFC3339),
		},
	})
}

// AddAccountTags adiciona tags a uma account via fila
// POST /api/accounts/:address/tags
func (h *AccountHandler) AddAccountTags(c *gin.Context) {
	address := c.Param("address")
	if address == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Endereço da account é obrigatório",
		})
		return
	}

	var request struct {
		Tags      []string `json:"tags" binding:"required,min=1"`
		Operation string   `json:"operation"` // add, remove, replace
	}

	// Bind JSON request
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Dados inválidos: " + err.Error(),
		})
		return
	}

	// Definir operação padrão
	if request.Operation == "" {
		request.Operation = "add"
	}

	// Validar operação
	validOperations := []string{"add", "remove", "replace"}
	isValidOp := false
	for _, op := range validOperations {
		if request.Operation == op {
			isValidOp = true
			break
		}
	}
	if !isValidOp {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Operação inválida. Use: add, remove, replace",
		})
		return
	}

	// Verificar se account existe
	existingAccount, err := h.accountService.GetAccountByAddress(c.Request.Context(), address)
	if err != nil || existingAccount == nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Account não encontrada",
		})
		return
	}

	// Criar mensagem de tagging
	message := entities.AccountTaggingMessage{
		Address:   address,
		Tags:      request.Tags,
		Operation: request.Operation,
		Source:    "api",
		Timestamp: time.Now(),
	}

	// Adicionar metadata
	if userID := c.GetHeader("X-User-ID"); userID != "" {
		message.CreatedBy = &userID
	}

	// Gerar ID único para tracking
	requestID := generateRequestID()
	c.Header("X-Request-ID", requestID)

	// Verificar se queue service está disponível e conectado
	if h.queueService == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error": "Operações de escrita não estão disponíveis. Serviço de fila não configurado.",
		})
		return
	}
	if !h.queueService.IsConnected() {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error": "Serviço de fila indisponível. Tente novamente em alguns instantes.",
		})
		return
	}

	// Enviar para fila
	err = h.queueService.PublishAccountTagging(c.Request.Context(), message)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Erro ao processar solicitação: " + err.Error(),
		})
		return
	}

	// Resposta de sucesso
	c.JSON(http.StatusAccepted, gin.H{
		"success":    true,
		"message":    "Tags serão processadas em breve",
		"request_id": requestID,
		"data": gin.H{
			"address":              address,
			"tags":                 request.Tags,
			"operation":            request.Operation,
			"status":               "processing",
			"estimated_completion": time.Now().Add(10 * time.Second).Format(time.RFC3339),
		},
	})
}

// UpdateAccountCompliance atualiza compliance de uma account via fila
// PUT /api/accounts/:address/compliance
func (h *AccountHandler) UpdateAccountCompliance(c *gin.Context) {
	address := c.Param("address")
	if address == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Endereço da account é obrigatório",
		})
		return
	}

	var request entities.AccountComplianceUpdateMessage

	// Bind JSON request
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Dados inválidos: " + err.Error(),
		})
		return
	}

	// Definir endereço da URL
	request.Address = address

	// Validar compliance status
	validStatuses := []string{"compliant", "non_compliant", "pending", "under_review"}
	isValid := false
	for _, status := range validStatuses {
		if request.ComplianceStatus == status {
			isValid = true
			break
		}
	}
	if !isValid {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Compliance status inválido. Use: compliant, non_compliant, pending, under_review",
		})
		return
	}

	// Validar risk score se fornecido
	if request.RiskScore != nil && (*request.RiskScore < 0 || *request.RiskScore > 10) {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Risk score deve estar entre 0 e 10",
		})
		return
	}

	// Verificar se account existe
	existingAccount, err := h.accountService.GetAccountByAddress(c.Request.Context(), address)
	if err != nil || existingAccount == nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Account não encontrada",
		})
		return
	}

	// Adicionar metadata
	if userID := c.GetHeader("X-User-ID"); userID != "" {
		request.ReviewedBy = &userID
	}
	request.Source = "api"
	request.Timestamp = time.Now()

	// Gerar ID único para tracking
	requestID := generateRequestID()
	c.Header("X-Request-ID", requestID)

	// Verificar se queue service está disponível e conectado
	if h.queueService == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error": "Operações de escrita não estão disponíveis. Serviço de fila não configurado.",
		})
		return
	}
	if !h.queueService.IsConnected() {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error": "Serviço de fila indisponível. Tente novamente em alguns instantes.",
		})
		return
	}

	// Enviar para fila
	err = h.queueService.PublishComplianceUpdate(c.Request.Context(), request)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Erro ao processar solicitação: " + err.Error(),
		})
		return
	}

	// Resposta de sucesso
	c.JSON(http.StatusAccepted, gin.H{
		"success":    true,
		"message":    "Compliance será atualizada em breve",
		"request_id": requestID,
		"data": gin.H{
			"address":              address,
			"compliance_status":    request.ComplianceStatus,
			"status":               "processing",
			"estimated_completion": time.Now().Add(20 * time.Second).Format(time.RFC3339),
		},
	})
}

// GetAccountTransactions busca todas as transações detalhadas de uma conta com filtros
func (h *AccountHandler) GetAccountTransactions(c *gin.Context) {
	address := c.Param("address")
	if address == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Address parameter is required",
		})
		return
	}

	// Construir filtros a partir dos query parameters
	filters := &services.AccountTransactionFilters{}

	// Filtros básicos
	filters.Status = c.Query("status")
	filters.To = c.Query("contractAddress")
	filters.FromDate = c.Query("dateFrom")
	filters.ToDate = c.Query("dateTo")
	filters.MinValue = c.Query("minValue")
	filters.MaxValue = c.Query("maxValue")
	filters.Method = c.Query("method")
	filters.ContractType = c.Query("contract_type")

	// Paginação
	if pageStr := c.DefaultQuery("page", "1"); pageStr != "" {
		if page, err := strconv.Atoi(pageStr); err == nil {
			filters.Page = page
		}
	}
	if limitStr := c.DefaultQuery("limit", "20"); limitStr != "" {
		if limit, err := strconv.Atoi(limitStr); err == nil {
			filters.Limit = limit
		}
	}

	// Buscar transações usando o serviço com filtros
	result, err := h.accountService.GetAccountTransactionsWithFilters(c.Request.Context(), address, filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to fetch account transactions: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    result.Data,
		"pagination": gin.H{
			"page":        result.Page,
			"limit":       result.Limit,
			"total":       result.Total,
			"total_pages": result.TotalPages,
		},
	})
}

// GetAccountEvents busca todos os eventos relacionados a uma conta
func (h *AccountHandler) GetAccountEvents(c *gin.Context) {
	address := c.Param("address")
	if address == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Address parameter is required",
		})
		return
	}

	// Construir filtros a partir dos query parameters
	filters := &services.AccountEventsFilters{}

	// Filtros básicos
	filters.EventName = c.Query("eventName")
	filters.ContractAddress = c.Query("contractAddress")
	filters.InvolvementType = c.Query("involvementType")
	filters.FromDate = c.Query("fromDate")
	filters.ToDate = c.Query("toDate")
	filters.SortBy = c.DefaultQuery("sortBy", "timestamp")
	filters.SortDir = c.DefaultQuery("sortDir", "desc")

	// Paginação
	if pageStr := c.DefaultQuery("page", "1"); pageStr != "" {
		if page, err := strconv.Atoi(pageStr); err == nil {
			filters.Page = page
		}
	}
	if limitStr := c.DefaultQuery("limit", "20"); limitStr != "" {
		if limit, err := strconv.Atoi(limitStr); err == nil {
			filters.Limit = limit
		}
	}

	// Buscar eventos usando o serviço com filtros
	result, err := h.accountService.GetAccountEventsWithFilters(c.Request.Context(), address, filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to fetch account events: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    result.Data,
		"pagination": gin.H{
			"page":        result.Page,
			"limit":       result.Limit,
			"total":       result.Total,
			"total_pages": result.TotalPages,
		},
	})
}

// GetAccountMethodStats busca estatísticas de métodos executados por uma conta
func (h *AccountHandler) GetAccountMethodStats(c *gin.Context) {
	address := c.Param("address")
	if address == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Address parameter is required",
		})
		return
	}

	// Construir filtros a partir dos query parameters
	filters := &services.AccountMethodStatsFilters{}

	// Filtros básicos
	filters.MethodName = c.Query("methodName")
	filters.ContractAddress = c.Query("contractAddress")
	filters.SortBy = c.DefaultQuery("sortBy", "executions")
	filters.SortDir = c.DefaultQuery("sortDir", "desc")

	// Paginação
	if pageStr := c.DefaultQuery("page", "1"); pageStr != "" {
		if page, err := strconv.Atoi(pageStr); err == nil {
			filters.Page = page
		}
	}
	if limitStr := c.DefaultQuery("limit", "20"); limitStr != "" {
		if limit, err := strconv.Atoi(limitStr); err == nil {
			filters.Limit = limit
		}
	}

	// Buscar estatísticas de métodos usando o serviço com filtros
	result, err := h.accountService.GetAccountMethodStatsWithFilters(c.Request.Context(), address, filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to fetch account method statistics: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    result.Data,
		"pagination": gin.H{
			"page":        result.Page,
			"limit":       result.Limit,
			"total":       result.Total,
			"total_pages": result.TotalPages,
		},
	})
}
