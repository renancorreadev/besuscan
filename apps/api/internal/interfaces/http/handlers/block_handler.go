package handlers

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"explorer-api/internal/app/services"
	"explorer-api/internal/domain/entities"
	"explorer-api/internal/infrastructure/cache"

	"github.com/gin-gonic/gin"
)

// BlockHandler gerencia as rotas HTTP relacionadas a blocos
type BlockHandler struct {
	blockService *services.BlockService
	redisCache   *cache.RedisCache
}

// NewBlockHandler cria uma nova instância do handler de blocos
func NewBlockHandler(blockService *services.BlockService) *BlockHandler {
	return &BlockHandler{
		blockService: blockService,
		redisCache:   cache.NewRedisCache(),
	}
}

// GetBlocks retorna uma lista de blocos recentes
// GET /api/blocks?limit=10
func (h *BlockHandler) GetBlocks(c *gin.Context) {
	// Obter parâmetro limit
	limitStr := c.DefaultQuery("limit", "10")
	limit, err := strconv.Atoi(limitStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Parâmetro 'limit' inválido",
		})
		return
	}

	// Buscar blocos recentes
	blocks, err := h.blockService.GetRecentBlocks(c.Request.Context(), limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	// Converter para resumos para listagem
	summaries := make([]interface{}, len(blocks))
	for i, block := range blocks {
		summaries[i] = block.ToSummary()
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    summaries,
		"count":   len(summaries),
	})
}

// GetBlocksWithFilters retorna blocos com filtros avançados
// GET /api/blocks/search?miner=0x...&min_gas_used=1000&order_by=timestamp&page=1&limit=20
func (h *BlockHandler) GetBlocksWithFilters(c *gin.Context) {
	// Construir filtros a partir dos query parameters
	filters := &services.BlockFilters{}

	// Filtros básicos
	filters.Miner = c.Query("miner")

	// Filtros de tamanho
	if minSizeStr := c.Query("min_size"); minSizeStr != "" {
		if minSize, err := strconv.ParseUint(minSizeStr, 10, 64); err == nil {
			filters.MinSize = minSize
		}
	}
	if maxSizeStr := c.Query("max_size"); maxSizeStr != "" {
		if maxSize, err := strconv.ParseUint(maxSizeStr, 10, 64); err == nil {
			filters.MaxSize = maxSize
		}
	}

	// Filtros de gas
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

	// Filtros de transações
	if minTxCountStr := c.Query("min_tx_count"); minTxCountStr != "" {
		if minTxCount, err := strconv.Atoi(minTxCountStr); err == nil {
			filters.MinTxCount = minTxCount
		}
	}
	if maxTxCountStr := c.Query("max_tx_count"); maxTxCountStr != "" {
		if maxTxCount, err := strconv.Atoi(maxTxCountStr); err == nil {
			filters.MaxTxCount = maxTxCount
		}
	}
	if hasTxStr := c.Query("has_tx"); hasTxStr != "" {
		if hasTx, err := strconv.ParseBool(hasTxStr); err == nil {
			filters.HasTx = &hasTx
		}
	}

	// Filtros de data
	filters.FromDate = c.Query("from_date")
	filters.ToDate = c.Query("to_date")

	// Filtros de intervalo de blocos
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

	// Ordenação
	filters.OrderBy = c.DefaultQuery("order_by", "number")
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

	// Buscar blocos com filtros
	result, err := h.blockService.GetBlocksWithFilters(c.Request.Context(), filters)
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

// GetBlock retorna um bloco específico por número ou hash
// GET /api/blocks/:identifier
func (h *BlockHandler) GetBlock(c *gin.Context) {
	identifier := c.Param("identifier")
	if identifier == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Identificador do bloco é obrigatório",
		})
		return
	}

	// Determinar se é número ou hash
	isNumber, number, hash, err := h.blockService.ParseBlockIdentifier(identifier)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	// 🚀 CACHE HÍBRIDO: Tentar buscar do Redis primeiro (apenas para números)
	if isNumber {
		if cachedBlock, err := h.redisCache.GetBlock(int64(number)); err == nil {
			c.Header("X-Cache", "HIT")
			c.Header("X-Cache-TTL", h.redisCache.TTL(fmt.Sprintf("block:%d", number)).String())

			c.JSON(http.StatusOK, gin.H{
				"success": true,
				"data":    cachedBlock,
				"cached":  true,
			})
			return
		}
	}

	// Fallback para PostgreSQL
	var block *entities.Block
	if isNumber {
		block, err = h.blockService.GetBlockByNumber(c.Request.Context(), number)
	} else {
		block, err = h.blockService.GetBlockByHash(c.Request.Context(), hash)
	}

	if err != nil {
		if strings.Contains(err.Error(), "não encontrado") {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "Bloco não encontrado",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.Header("X-Cache", "MISS")
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    block,
		"cached":  false,
	})
}

// GetLatestBlock retorna o último bloco
// GET /api/blocks/latest
func (h *BlockHandler) GetLatestBlock(c *gin.Context) {
	// 🚀 CACHE HÍBRIDO: Tentar buscar do Redis primeiro
	if cachedBlock, err := h.redisCache.GetLatestBlock(); err == nil {
		c.Header("X-Cache", "HIT")
		c.Header("X-Cache-TTL", h.redisCache.TTL("latest_block").String())

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data":    cachedBlock,
			"cached":  true,
		})
		return
	}

	// Fallback para PostgreSQL se cache não disponível
	block, err := h.blockService.GetLatestBlock(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.Header("X-Cache", "MISS")
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    block,
		"cached":  false,
	})
}

// GetBlocksByRange retorna blocos em um intervalo
// GET /api/blocks/range?from=100&to=110
func (h *BlockHandler) GetBlocksByRange(c *gin.Context) {
	fromStr := c.Query("from")
	toStr := c.Query("to")

	if fromStr == "" || toStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Parâmetros 'from' e 'to' são obrigatórios",
		})
		return
	}

	from, err := strconv.ParseUint(fromStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Parâmetro 'from' inválido",
		})
		return
	}

	to, err := strconv.ParseUint(toStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Parâmetro 'to' inválido",
		})
		return
	}

	blocks, err := h.blockService.GetBlocksByRange(c.Request.Context(), from, to)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	// Converter para resumos
	summaries := make([]interface{}, len(blocks))
	for i, block := range blocks {
		summaries[i] = block.ToSummary()
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    summaries,
		"count":   len(summaries),
		"range": gin.H{
			"from": from,
			"to":   to,
		},
	})
}

// GetBlocksStats retorna estatísticas dos blocos
// GET /api/blocks/stats
func (h *BlockHandler) GetBlocksStats(c *gin.Context) {
	// 🚀 CACHE HÍBRIDO: Tentar buscar estatísticas do Redis primeiro
	if cachedStats, err := h.redisCache.GetNetworkStats(); err == nil {
		c.Header("X-Cache", "HIT")
		c.Header("X-Cache-TTL", h.redisCache.TTL("network_stats").String())

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data":    cachedStats,
			"cached":  true,
		})
		return
	}

	// Fallback para PostgreSQL se cache não disponível
	stats, err := h.blockService.GetBlocksStats(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.Header("X-Cache", "MISS")
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    stats,
		"cached":  false,
	})
}

// GetUniqueMiners retorna lista de mineradores únicos
// GET /api/blocks/miners
func (h *BlockHandler) GetUniqueMiners(c *gin.Context) {
	miners, err := h.blockService.GetUniqueMiners(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    miners,
		"count":   len(miners),
	})
}

// GetDashboardData retorna dados críticos do dashboard com cache híbrido
// GET /api/dashboard/data
func (h *BlockHandler) GetDashboardData(c *gin.Context) {
	// 🚀 CACHE HÍBRIDO: Tentar buscar dados combinados do Redis primeiro
	if cachedData, err := h.redisCache.GetDashboardCache(); err == nil {
		c.Header("X-Cache", "HIT")
		c.Header("X-Cache-TTL", h.redisCache.TTL("dashboard_data").String())

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data":    cachedData,
			"cached":  true,
		})
		return
	}

	// Buscar dados em paralelo para construir dashboard
	dashboardData := make(map[string]interface{})

	// 1. Último bloco (prioridade alta)
	if latestBlock, err := h.redisCache.GetLatestBlock(); err == nil {
		dashboardData["latest_block"] = latestBlock
	} else if block, err := h.blockService.GetLatestBlock(c.Request.Context()); err == nil {
		dashboardData["latest_block"] = block
	}

	// 2. Estatísticas da rede
	if stats, err := h.redisCache.GetNetworkStats(); err == nil {
		dashboardData["network_stats"] = stats
	} else if stats, err := h.blockService.GetBlocksStats(c.Request.Context()); err == nil {
		dashboardData["network_stats"] = stats
	}

	// 3. Últimas transações (se disponível)
	if transactions, err := h.redisCache.GetLatestTransactions(); err == nil {
		dashboardData["latest_transactions"] = transactions
	}

	// 4. Blocos recentes (limitado)
	if blocks, err := h.blockService.GetRecentBlocks(c.Request.Context(), 5); err == nil {
		summaries := make([]interface{}, len(blocks))
		for i, block := range blocks {
			summaries[i] = block.ToSummary()
		}
		dashboardData["recent_blocks"] = summaries
	}

	// Cachear dados combinados por 1 segundo
	if err := h.redisCache.SetDashboardCache(dashboardData); err != nil {
		// Log error mas não falha a requisição
		// log.Printf("Erro ao cachear dados do dashboard: %v", err)
	}

	c.Header("X-Cache", "MISS")
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    dashboardData,
		"cached":  false,
	})
}

// GetGasTrends retorna tendências de gas price da rede
// GET /api/blocks/gas-trends?days=7
func (h *BlockHandler) GetGasTrends(c *gin.Context) {
	daysStr := c.DefaultQuery("days", "7")
	days, err := strconv.Atoi(daysStr)
	if err != nil || days <= 0 {
		days = 7
	}
	if days > 365 {
		days = 365 // máximo de 1 ano
	}

	trends, err := h.blockService.GetGasTrends(c.Request.Context(), days)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Erro ao buscar tendências de gas",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"days":   days,
			"trends": trends,
			"count":  len(trends),
		},
	})
}

// GetVolumeDistribution retorna distribuição de volume por diferentes métricas
// GET /api/blocks/volume-distribution?period=24h
func (h *BlockHandler) GetVolumeDistribution(c *gin.Context) {
	period := c.DefaultQuery("period", "24h")

	distribution, err := h.blockService.GetVolumeDistribution(c.Request.Context(), period)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Erro ao buscar distribuição de volume",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"period":       period,
			"distribution": distribution,
		},
	})
}
