package handlers

import (
	"net/http"
	"strconv"
	"strings"

	"explorer-api/internal/app/services"

	"github.com/gin-gonic/gin"
)

// TransactionHandler gerencia as rotas HTTP relacionadas a transações
type TransactionHandler struct {
	transactionService *services.TransactionService
}

// NewTransactionHandler cria uma nova instância do handler de transações
func NewTransactionHandler(transactionService *services.TransactionService) *TransactionHandler {
	return &TransactionHandler{
		transactionService: transactionService,
	}
}

// GetTransactions retorna uma lista de transações recentes
// GET /api/transactions?limit=10&page=1
func (h *TransactionHandler) GetTransactions(c *gin.Context) {
	// Obter parâmetros de paginação
	limitStr := c.DefaultQuery("limit", "10")
	limit, err := strconv.Atoi(limitStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Parâmetro 'limit' inválido",
		})
		return
	}

	pageStr := c.DefaultQuery("page", "1")
	page, err := strconv.Atoi(pageStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Parâmetro 'page' inválido",
		})
		return
	}

	// Criar filtros simples com paginação
	filters := &services.TransactionFilters{
		Page:     page,
		Limit:    limit,
		OrderBy:  "block_number",
		OrderDir: c.DefaultQuery("order", "desc"),
	}

	// Buscar transações com paginação
	result, err := h.transactionService.GetTransactionsWithFilters(c.Request.Context(), filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    result.Data,
		"count":   result.Limit,
		"pagination": gin.H{
			"page":        result.Page,
			"limit":       result.Limit,
			"total":       result.Total,
			"total_pages": result.TotalPages,
		},
	})
}

// GetTransactionsWithFilters retorna transações com filtros avançados
// GET /api/transactions/search?from=0x...&status=success&page=1&limit=20
func (h *TransactionHandler) GetTransactionsWithFilters(c *gin.Context) {
	// Construir filtros a partir dos query parameters
	filters := &services.TransactionFilters{}

	// Filtros básicos
	filters.From = c.Query("from")
	filters.To = c.Query("to")
	filters.Status = c.Query("status")

	// Filtros de valor
	filters.MinValue = c.Query("min_value")
	filters.MaxValue = c.Query("max_value")

	// Filtros de gas
	if minGasStr := c.Query("min_gas"); minGasStr != "" {
		if minGas, err := strconv.ParseUint(minGasStr, 10, 64); err == nil {
			filters.MinGas = minGas
		}
	}
	if maxGasStr := c.Query("max_gas"); maxGasStr != "" {
		if maxGas, err := strconv.ParseUint(maxGasStr, 10, 64); err == nil {
			filters.MaxGas = maxGas
		}
	}
	if minGasUsedStr := c.Query("min_gas_used"); minGasUsedStr != "" {
		if minGasUsed, err := strconv.ParseUint(minGasUsedStr, 10, 64); err == nil {
			filters.MinGasUsed = minGasUsed
		}
	}
	if maxGasUsedStr := c.Query("max_gas_used"); maxGasUsedStr != "" {
		if maxGasUsed, err := strconv.ParseUint(maxGasUsedStr, 10, 64); err == nil {
			filters.MaxGasUsed = maxGasUsed
		}
	}

	// Filtros de tipo
	if txTypeStr := c.Query("tx_type"); txTypeStr != "" {
		if txType, err := strconv.ParseUint(txTypeStr, 10, 8); err == nil {
			txTypeUint8 := uint8(txType)
			filters.TxType = &txTypeUint8
		}
	}

	// Filtros de data
	filters.FromDate = c.Query("from_date")
	filters.ToDate = c.Query("to_date")

	// Filtros de bloco
	if fromBlockStr := c.Query("from_block"); fromBlockStr != "" {
		if fromBlock, err := strconv.ParseUint(fromBlockStr, 10, 64); err == nil {
			filters.FromBlock = fromBlock
		}
	}
	if toBlockStr := c.Query("to_block"); toBlockStr != "" {
		if toBlock, err := strconv.ParseUint(toBlockStr, 10, 64); err == nil {
			filters.ToBlock = toBlock
		}
	}

	// Filtros especiais
	if contractCreationStr := c.Query("contract_creation"); contractCreationStr != "" {
		if contractCreation, err := strconv.ParseBool(contractCreationStr); err == nil {
			filters.ContractCreation = &contractCreation
		}
	}
	if hasDataStr := c.Query("has_data"); hasDataStr != "" {
		if hasData, err := strconv.ParseBool(hasDataStr); err == nil {
			filters.HasData = &hasData
		}
	}

	// Ordenação
	filters.OrderBy = c.DefaultQuery("order_by", "block_number")
	filters.OrderDir = c.DefaultQuery("order_dir", "desc")

	// Paginação
	if pageStr := c.DefaultQuery("page", "1"); pageStr != "" {
		if page, err := strconv.Atoi(pageStr); err == nil {
			filters.Page = page
		}
	}
	if limitStr := c.DefaultQuery("limit", "10"); limitStr != "" {
		if limit, err := strconv.Atoi(limitStr); err == nil {
			filters.Limit = limit
		}
	}

	// Buscar transações com filtros
	result, err := h.transactionService.GetTransactionsWithFilters(c.Request.Context(), filters)
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

// GetTransaction retorna uma transação específica por hash
// GET /api/transactions/:hash
func (h *TransactionHandler) GetTransaction(c *gin.Context) {
	hash := c.Param("hash")
	if hash == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Hash da transação é obrigatório",
		})
		return
	}

	// Validar e buscar transação
	_, err := h.transactionService.ParseTransactionIdentifier(hash)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	transaction, err := h.transactionService.GetTransactionByHash(c.Request.Context(), hash)
	if err != nil {
		if strings.Contains(err.Error(), "não encontrada") {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "Transação não encontrada",
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
		"data":    transaction,
	})
}

// GetTransactionsByBlock retorna transações de um bloco específico
// GET /api/transactions/block/:blockNumber
func (h *TransactionHandler) GetTransactionsByBlock(c *gin.Context) {
	blockNumberStr := c.Param("blockNumber")
	if blockNumberStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Número do bloco é obrigatório",
		})
		return
	}

	blockNumber, err := strconv.ParseUint(blockNumberStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Número do bloco inválido",
		})
		return
	}

	transactions, err := h.transactionService.GetTransactionsByBlock(c.Request.Context(), blockNumber)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	// Converter para resumos
	summaries := make([]interface{}, len(transactions))
	for i, transaction := range transactions {
		summaries[i] = transaction.ToSummary()
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    summaries,
		"count":   len(summaries),
		"block":   blockNumber,
	})
}

// GetTransactionsByAddress retorna transações de um endereço específico
// GET /api/transactions/address/:address?limit=10&offset=0
func (h *TransactionHandler) GetTransactionsByAddress(c *gin.Context) {
	address := c.Param("address")
	if address == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Endereço é obrigatório",
		})
		return
	}

	// Obter parâmetros de paginação
	limitStr := c.DefaultQuery("limit", "10")
	limit, err := strconv.Atoi(limitStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Parâmetro 'limit' inválido",
		})
		return
	}

	offsetStr := c.DefaultQuery("offset", "0")
	offset, err := strconv.Atoi(offsetStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Parâmetro 'offset' inválido",
		})
		return
	}

	transactions, err := h.transactionService.GetTransactionsByAddress(c.Request.Context(), address, limit, offset)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	// Converter para resumos
	summaries := make([]interface{}, len(transactions))
	for i, transaction := range transactions {
		summaries[i] = transaction.ToSummary()
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    summaries,
		"count":   len(summaries),
		"address": address,
		"pagination": gin.H{
			"limit":  limit,
			"offset": offset,
		},
	})
}

// GetTransactionsByStatus retorna transações por status
// GET /api/transactions/status/:status?limit=10&offset=0
func (h *TransactionHandler) GetTransactionsByStatus(c *gin.Context) {
	status := c.Param("status")
	if status == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Status é obrigatório",
		})
		return
	}

	// Obter parâmetros de paginação
	limitStr := c.DefaultQuery("limit", "10")
	limit, err := strconv.Atoi(limitStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Parâmetro 'limit' inválido",
		})
		return
	}

	offsetStr := c.DefaultQuery("offset", "0")
	offset, err := strconv.Atoi(offsetStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Parâmetro 'offset' inválido",
		})
		return
	}

	transactions, err := h.transactionService.GetTransactionsByStatus(c.Request.Context(), status, limit, offset)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	// Converter para resumos
	summaries := make([]interface{}, len(transactions))
	for i, transaction := range transactions {
		summaries[i] = transaction.ToSummary()
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    summaries,
		"count":   len(summaries),
		"status":  status,
		"pagination": gin.H{
			"limit":  limit,
			"offset": offset,
		},
	})
}

// GetTransactionStats retorna estatísticas das transações
// GET /api/transactions/stats
func (h *TransactionHandler) GetTransactionStats(c *gin.Context) {
	stats, err := h.transactionService.GetTransactionStats(c.Request.Context())
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

// GetTransactionsByValue retorna transações por faixa de valor
// GET /api/transactions/value?min=1000000000000000000&max=5000000000000000000&limit=10
func (h *TransactionHandler) GetTransactionsByValue(c *gin.Context) {
	minValueStr := c.Query("min")
	maxValueStr := c.Query("max")

	if minValueStr == "" && maxValueStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Pelo menos um dos parâmetros 'min' ou 'max' é obrigatório",
		})
		return
	}

	// Criar filtros
	filters := &services.TransactionFilters{
		MinValue: minValueStr,
		MaxValue: maxValueStr,
	}

	// Obter parâmetros de paginação
	if limitStr := c.DefaultQuery("limit", "10"); limitStr != "" {
		if limit, err := strconv.Atoi(limitStr); err == nil {
			filters.Limit = limit
		}
	}
	if pageStr := c.DefaultQuery("page", "1"); pageStr != "" {
		if page, err := strconv.Atoi(pageStr); err == nil {
			filters.Page = page
		}
	}

	// Buscar transações
	result, err := h.transactionService.GetTransactionsWithFilters(c.Request.Context(), filters)
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
		"filters": gin.H{
			"min_value": minValueStr,
			"max_value": maxValueStr,
		},
	})
}

// GetTransactionsByType retorna transações por tipo
// GET /api/transactions/type/:type?limit=10&page=1
func (h *TransactionHandler) GetTransactionsByType(c *gin.Context) {
	typeStr := c.Param("type")
	if typeStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Tipo de transação é obrigatório",
		})
		return
	}

	txType, err := strconv.ParseUint(typeStr, 10, 8)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Tipo de transação inválido",
		})
		return
	}

	// Criar filtros
	txTypeUint8 := uint8(txType)
	filters := &services.TransactionFilters{
		TxType: &txTypeUint8,
	}

	// Obter parâmetros de paginação
	if limitStr := c.DefaultQuery("limit", "10"); limitStr != "" {
		if limit, err := strconv.Atoi(limitStr); err == nil {
			filters.Limit = limit
		}
	}
	if pageStr := c.DefaultQuery("page", "1"); pageStr != "" {
		if page, err := strconv.Atoi(pageStr); err == nil {
			filters.Page = page
		}
	}

	// Buscar transações
	result, err := h.transactionService.GetTransactionsWithFilters(c.Request.Context(), filters)
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
		"type": txType,
	})
}

// GetContractCreations retorna transações de criação de contratos
// GET /api/transactions/contracts?limit=10&page=1
func (h *TransactionHandler) GetContractCreations(c *gin.Context) {
	contractCreation := true
	filters := &services.TransactionFilters{
		ContractCreation: &contractCreation,
	}

	// Obter parâmetros de paginação
	if limitStr := c.DefaultQuery("limit", "10"); limitStr != "" {
		if limit, err := strconv.Atoi(limitStr); err == nil {
			filters.Limit = limit
		}
	}
	if pageStr := c.DefaultQuery("page", "1"); pageStr != "" {
		if page, err := strconv.Atoi(pageStr); err == nil {
			filters.Page = page
		}
	}

	// Buscar transações
	result, err := h.transactionService.GetTransactionsWithFilters(c.Request.Context(), filters)
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
		"filter": "contract_creation",
	})
}

// GetTransactionsByDateRange retorna transações em um intervalo de datas
// GET /api/transactions/date-range?from=2024-01-01&to=2024-01-31&limit=10
func (h *TransactionHandler) GetTransactionsByDateRange(c *gin.Context) {
	fromDate := c.Query("from")
	toDate := c.Query("to")

	if fromDate == "" && toDate == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Pelo menos um dos parâmetros 'from' ou 'to' é obrigatório (formato: YYYY-MM-DD)",
		})
		return
	}

	// Criar filtros
	filters := &services.TransactionFilters{
		FromDate: fromDate,
		ToDate:   toDate,
	}

	// Obter parâmetros de paginação
	if limitStr := c.DefaultQuery("limit", "10"); limitStr != "" {
		if limit, err := strconv.Atoi(limitStr); err == nil {
			filters.Limit = limit
		}
	}
	if pageStr := c.DefaultQuery("page", "1"); pageStr != "" {
		if page, err := strconv.Atoi(pageStr); err == nil {
			filters.Page = page
		}
	}

	// Buscar transações
	result, err := h.transactionService.GetTransactionsWithFilters(c.Request.Context(), filters)
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
		"date_range": gin.H{
			"from": fromDate,
			"to":   toDate,
		},
	})
}
