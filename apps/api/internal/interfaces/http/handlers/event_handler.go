package handlers

import (
	"net/http"
	"strconv"
	"time"

	"explorer-api/internal/app/services"
	"explorer-api/internal/domain/entities"

	"github.com/gin-gonic/gin"
)

// EventHandler gerencia requisições HTTP relacionadas a eventos
type EventHandler struct {
	eventService services.EventService
}

// NewEventHandler cria uma nova instância do handler de eventos
func NewEventHandler(eventService services.EventService) *EventHandler {
	return &EventHandler{
		eventService: eventService,
	}
}

// GetEvents retorna lista de eventos com filtros e paginação
func (h *EventHandler) GetEvents(c *gin.Context) {
	// Parsear parâmetros de query
	filters := h.parseEventFilters(c)

	// Buscar eventos
	events, total, err := h.eventService.GetEvents(c.Request.Context(), filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Erro ao buscar eventos: " + err.Error(),
		})
		return
	}

	// Garantir que events nunca seja nil (para evitar null no JSON)
	if events == nil {
		events = []*entities.EventSummary{}
	}

	// Calcular paginação
	totalPages := (int(total) + filters.Limit - 1) / filters.Limit

	// Resposta
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    events,
		"count":   len(events),
		"pagination": gin.H{
			"page":        filters.Page,
			"limit":       filters.Limit,
			"total":       total,
			"total_pages": totalPages,
		},
	})
}

// GetEvent retorna detalhes de um evento específico
func (h *EventHandler) GetEvent(c *gin.Context) {
	eventID := c.Param("id")

	if eventID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "ID do evento é obrigatório",
		})
		return
	}

	// Buscar evento
	event, err := h.eventService.GetEventByID(c.Request.Context(), eventID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Erro ao buscar evento: " + err.Error(),
		})
		return
	}

	if event == nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "Evento não encontrado",
		})
		return
	}

	// Resposta
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    event,
	})
}

// GetEventStats retorna estatísticas de eventos
func (h *EventHandler) GetEventStats(c *gin.Context) {
	stats, err := h.eventService.GetEventStats(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Erro ao buscar estatísticas: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    stats,
	})
}

// SearchEvents busca eventos por termo
func (h *EventHandler) SearchEvents(c *gin.Context) {
	// Parsear filtros da query string
	filters := h.parseEventFilters(c)

	// Buscar eventos com filtros
	events, total, err := h.eventService.GetEvents(c.Request.Context(), filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Erro ao buscar eventos: " + err.Error(),
		})
		return
	}

	// Garantir que events nunca seja nil (para evitar null no JSON)
	if events == nil {
		events = []*entities.EventSummary{}
	}

	// Calcular paginação
	totalPages := (int(total) + filters.Limit - 1) / filters.Limit

	// Resposta
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    events,
		"count":   len(events),
		"pagination": gin.H{
			"page":        filters.Page,
			"limit":       filters.Limit,
			"total":       total,
			"total_pages": totalPages,
		},
	})
}

// GetEventsByContract retorna eventos de um contrato específico
func (h *EventHandler) GetEventsByContract(c *gin.Context) {
	contractAddress := c.Param("address")

	if contractAddress == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Endereço do contrato é obrigatório",
		})
		return
	}

	// Parsear parâmetros de paginação
	page := 1
	if p := c.Query("page"); p != "" {
		if parsed, err := strconv.Atoi(p); err == nil && parsed > 0 {
			page = parsed
		}
	}

	limit := 25
	if l := c.Query("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 && parsed <= 100 {
			limit = parsed
		}
	}

	// Buscar eventos
	events, err := h.eventService.GetEventsByContract(c.Request.Context(), contractAddress, limit, (page-1)*limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Erro ao buscar eventos: " + err.Error(),
		})
		return
	}

	// Garantir que events nunca seja nil (para evitar null no JSON)
	if events == nil {
		events = []*entities.Event{}
	}

	// Contar total
	total, err := h.eventService.CountEventsByContract(c.Request.Context(), contractAddress)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Erro ao contar eventos: " + err.Error(),
		})
		return
	}

	// Calcular paginação
	totalPages := (int(total) + limit - 1) / limit

	// Resposta
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    events,
		"count":   len(events),
		"pagination": gin.H{
			"page":        page,
			"limit":       limit,
			"total":       total,
			"total_pages": totalPages,
		},
	})
}

// GetEventsByTransaction retorna eventos de uma transação específica
func (h *EventHandler) GetEventsByTransaction(c *gin.Context) {
	txHash := c.Param("hash")

	if txHash == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Hash da transação é obrigatório",
		})
		return
	}

	// Buscar eventos
	events, err := h.eventService.GetEventsByTransaction(c.Request.Context(), txHash)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Erro ao buscar eventos: " + err.Error(),
		})
		return
	}

	// Garantir que events nunca seja nil (para evitar null no JSON)
	if events == nil {
		events = []*entities.Event{}
	}

	// Resposta
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    events,
		"count":   len(events),
	})
}

// GetEventsByBlock retorna eventos de um bloco específico
func (h *EventHandler) GetEventsByBlock(c *gin.Context) {
	blockNumberStr := c.Param("number")

	if blockNumberStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Número do bloco é obrigatório",
		})
		return
	}

	blockNumber, err := strconv.ParseUint(blockNumberStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Número do bloco inválido",
		})
		return
	}

	// Buscar eventos
	events, err := h.eventService.GetEventsByBlock(c.Request.Context(), blockNumber)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Erro ao buscar eventos: " + err.Error(),
		})
		return
	}

	// Garantir que events nunca seja nil (para evitar null no JSON)
	if events == nil {
		events = []*entities.Event{}
	}

	// Resposta
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    events,
		"count":   len(events),
	})
}

// GetUniqueContracts retorna lista de contratos únicos que emitiram eventos
func (h *EventHandler) GetUniqueContracts(c *gin.Context) {
	contracts, err := h.eventService.GetUniqueContracts(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Erro ao buscar contratos: " + err.Error(),
		})
		return
	}

	if contracts == nil {
		contracts = []string{}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    contracts,
		"count":   len(contracts),
	})
}

// GetEventNames retorna lista de nomes de eventos únicos
func (h *EventHandler) GetEventNames(c *gin.Context) {
	eventNames, err := h.eventService.GetEventNames(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Erro ao buscar nomes de eventos: " + err.Error(),
		})
		return
	}

	// Garantir que eventNames nunca seja nil (para evitar null no JSON)
	if eventNames == nil {
		eventNames = []string{}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    eventNames,
		"count":   len(eventNames),
	})
}

// parseEventFilters parseia filtros da query string
func (h *EventHandler) parseEventFilters(c *gin.Context) entities.EventFilters {
	filters := entities.EventFilters{
		Page:     1,
		Limit:    25,
		OrderBy:  "timestamp",
		OrderDir: "desc",
	}

	// Paginação
	if p := c.Query("page"); p != "" {
		if parsed, err := strconv.Atoi(p); err == nil && parsed > 0 {
			filters.Page = parsed
		}
	}

	if l := c.Query("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 && parsed <= 100 {
			filters.Limit = parsed
		}
	}

	// Ordenação
	if orderBy := c.Query("order_by"); orderBy != "" {
		filters.OrderBy = orderBy
	}

	if orderDir := c.Query("order_dir"); orderDir != "" {
		if orderDir == "asc" || orderDir == "desc" {
			filters.OrderDir = orderDir
		}
	}

	// Filtros de busca
	if search := c.Query("search"); search != "" {
		filters.Search = &search
	}

	if contractAddr := c.Query("contract_address"); contractAddr != "" {
		filters.ContractAddress = &contractAddr
	}

	if eventName := c.Query("event_name"); eventName != "" {
		filters.EventName = &eventName
	}

	if fromAddr := c.Query("from_address"); fromAddr != "" {
		filters.FromAddress = &fromAddr
	}

	if toAddr := c.Query("to_address"); toAddr != "" {
		filters.ToAddress = &toAddr
	}

	if txHash := c.Query("transaction_hash"); txHash != "" {
		filters.TransactionHash = &txHash
	}

	if status := c.Query("status"); status != "" {
		filters.Status = &status
	}

	// Filtros de bloco
	if fromBlock := c.Query("from_block"); fromBlock != "" {
		if parsed, err := strconv.ParseUint(fromBlock, 10, 64); err == nil {
			filters.FromBlock = &parsed
		}
	}

	if toBlock := c.Query("to_block"); toBlock != "" {
		if parsed, err := strconv.ParseUint(toBlock, 10, 64); err == nil {
			filters.ToBlock = &parsed
		}
	}

	// Filtros de data
	if fromDate := c.Query("from_date"); fromDate != "" {
		if _, err := time.Parse("2006-01-02", fromDate); err == nil {
			filters.FromDate = &fromDate
		}
	}

	if toDate := c.Query("to_date"); toDate != "" {
		if _, err := time.Parse("2006-01-02", toDate); err == nil {
			filters.ToDate = &toDate
		}
	}

	return filters
}

// RegisterRoutes registra as rotas de eventos
func (h *EventHandler) RegisterRoutes(router *gin.RouterGroup) {
	// Rotas principais
	router.GET("/events", h.GetEvents)
	router.GET("/events/stats", h.GetEventStats)
	router.GET("/events/search", h.SearchEvents)
	router.GET("/events/contracts", h.GetUniqueContracts)
	router.GET("/events/names", h.GetEventNames)
	router.GET("/events/:id", h.GetEvent)

	// Rotas por relacionamento
	router.GET("/events/contract/:address", h.GetEventsByContract)
	router.GET("/events/transaction/:hash", h.GetEventsByTransaction)
	router.GET("/events/block/:number", h.GetEventsByBlock)
}
