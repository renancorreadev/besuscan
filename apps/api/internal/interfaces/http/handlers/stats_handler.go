package handlers

import (
	"context"
	"database/sql"
	"fmt"
	"net/http"

	"explorer-api/internal/app/services"
	"explorer-api/internal/infrastructure/cache"

	"github.com/gin-gonic/gin"
)

// StatsHandler gerencia as rotas HTTP relacionadas a estatísticas gerais
type StatsHandler struct {
	blockService         *services.BlockService
	transactionService   *services.TransactionService
	smartContractService *services.SmartContractService
	accountService       *services.AccountService
	redisCache           *cache.RedisCache
	db                   *sql.DB
}

// NewStatsHandler cria uma nova instância do handler de estatísticas
func NewStatsHandler(
	blockService *services.BlockService,
	transactionService *services.TransactionService,
	smartContractService *services.SmartContractService,
	accountService *services.AccountService,
	db *sql.DB,
) *StatsHandler {
	return &StatsHandler{
		blockService:         blockService,
		transactionService:   transactionService,
		smartContractService: smartContractService,
		accountService:       accountService,
		redisCache:           cache.NewRedisCache(),
		db:                   db,
	}
}

// GeneralStatsResponse representa a resposta das estatísticas gerais
type GeneralStatsResponse struct {
	TotalBlocks        int64                  `json:"total_blocks"`
	LatestBlockNumber  int64                  `json:"latest_block_number"`
	TotalTransactions  int64                  `json:"total_transactions"`
	TotalContracts     int64                  `json:"total_contracts"`
	AvgBlockTime       float64                `json:"avg_block_time"`
	NetworkUtilization string                 `json:"network_utilization"`
	AvgGasUsed         int64                  `json:"avg_gas_used"`
	ActiveValidators   int                    `json:"active_validators"`
	TopMethods         []services.MethodStats `json:"top_methods"`
}

// GetGeneralStats retorna estatísticas gerais da rede
// GET /api/stats
func (h *StatsHandler) GetGeneralStats(c *gin.Context) {
	// Buscar estatísticas de diferentes serviços
	stats := &GeneralStatsResponse{}

	// 1. Estatísticas de blocos
	if blockStats, err := h.blockService.GetBlocksStats(c.Request.Context()); err == nil {
		stats.TotalBlocks = blockStats.TotalBlocks
		stats.LatestBlockNumber = int64(blockStats.LatestBlockNumber)
		// Campos que não existem no BlockStats - usar valores padrão ou deixar zero
		stats.AvgBlockTime = 2.0         // QBFT default
		stats.NetworkUtilization = "75%" // Placeholder
		stats.AvgGasUsed = 21000         // Placeholder
	}

	// 2. Estatísticas de transações
	if txStats, err := h.transactionService.GetTransactionStats(c.Request.Context()); err == nil {
		stats.TotalTransactions = txStats.TotalTransactions
	}

	// 3. Estatísticas de smart contracts
	if contractStats, err := h.smartContractService.GetSmartContractStats(); err == nil {
		stats.TotalContracts = contractStats.TotalContracts
	}

	// 4. Top métodos de account_method_stats
	if methodStats, err := h.accountService.GetTopMethodStats(c.Request.Context(), 10); err == nil {
		stats.TopMethods = methodStats
	}

	// 5. Número de validadores ativos (usando placeholder por enquanto)
	stats.ActiveValidators = 4 // QBFT default

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    stats,
	})
}

// GetRecentActivity retorna atividade recente da rede (24h)
// GET /api/stats/recent-activity
func (h *StatsHandler) GetRecentActivity(c *gin.Context) {
	activity, err := h.getRecentActivityData(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Erro ao buscar atividade recente",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    activity,
	})
}

// getRecentActivityData busca dados de atividade das últimas 24h
func (h *StatsHandler) getRecentActivityData(ctx context.Context) (map[string]interface{}, error) {
	activity := make(map[string]interface{})

	// 1. Growth das últimas 24h (transações)
	growthQuery := `
		WITH yesterday AS (
			SELECT COUNT(*) as count
			FROM transactions t
			JOIN blocks b ON t.block_hash = b.hash
			WHERE b.timestamp >= CURRENT_TIMESTAMP - INTERVAL '2 days'
				AND b.timestamp < CURRENT_TIMESTAMP - INTERVAL '1 day'
		),
		today AS (
			SELECT COUNT(*) as count
			FROM transactions t
			JOIN blocks b ON t.block_hash = b.hash
			WHERE b.timestamp >= CURRENT_TIMESTAMP - INTERVAL '1 day'
		)
		SELECT
			t.count as today_count,
			y.count as yesterday_count,
			CASE
				WHEN y.count = 0 THEN 100.0
				ELSE ROUND(((t.count - y.count) * 100.0 / y.count), 1)
			END as growth_percentage
		FROM today t, yesterday y`

	var todayCount, yesterdayCount int64
	var growthPercentage float64
	err := h.db.QueryRowContext(ctx, growthQuery).Scan(&todayCount, &yesterdayCount, &growthPercentage)
	if err != nil {
		growthPercentage = 0.0
	}

	activity["last_24h_growth"] = fmt.Sprintf("%+.1f%%", growthPercentage)

	// 2. Peak TPS das últimas 24h
	tpsQuery := `
		WITH hourly_tx AS (
			SELECT
				EXTRACT(HOUR FROM b.timestamp) as hour,
				COUNT(*) as tx_count
			FROM transactions t
			JOIN blocks b ON t.block_hash = b.hash
			WHERE b.timestamp >= CURRENT_TIMESTAMP - INTERVAL '1 day'
			GROUP BY EXTRACT(HOUR FROM b.timestamp)
		)
		SELECT COALESCE(MAX(tx_count), 0) / 3600.0 as peak_tps
		FROM hourly_tx`

	var peakTPS float64
	err = h.db.QueryRowContext(ctx, tpsQuery).Scan(&peakTPS)
	if err != nil {
		peakTPS = 0.0
	}

	activity["peak_tps"] = int64(peakTPS)

	// 3. Novos contratos das últimas 24h
	newContractsQuery := `
		SELECT COUNT(*)
		FROM smart_contracts
		WHERE creation_timestamp >= CURRENT_TIMESTAMP - INTERVAL '1 day'`

	var newContracts int64
	err = h.db.QueryRowContext(ctx, newContractsQuery).Scan(&newContracts)
	if err != nil {
		newContracts = 0
	}

	activity["new_contracts"] = newContracts

	// 4. Endereços únicos ativos nas últimas 24h
	activeAddressesQuery := `
		SELECT COUNT(DISTINCT t.from_address)
		FROM transactions t
		JOIN blocks b ON t.block_hash = b.hash
		WHERE b.timestamp >= CURRENT_TIMESTAMP - INTERVAL '1 day'`

	var activeAddresses int64
	err = h.db.QueryRowContext(ctx, activeAddressesQuery).Scan(&activeAddresses)
	if err != nil {
		activeAddresses = 0
	}

	activity["active_addresses"] = activeAddresses

	return activity, nil
}
