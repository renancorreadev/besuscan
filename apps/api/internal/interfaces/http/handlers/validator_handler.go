package handlers

import (
	"net/http"
	"strings"

	"explorer-api/internal/app/services"

	"github.com/gin-gonic/gin"
)

// ValidatorHandler gerencia as rotas HTTP relacionadas a validadores QBFT
type ValidatorHandler struct {
	validatorService *services.ValidatorService
}

// NewValidatorHandler cria uma nova instância do handler de validadores
func NewValidatorHandler(validatorService *services.ValidatorService) *ValidatorHandler {
	return &ValidatorHandler{
		validatorService: validatorService,
	}
}

// GetValidators retorna lista de todos os validadores
// GET /api/validators
func (h *ValidatorHandler) GetValidators(c *gin.Context) {
	validators, err := h.validatorService.GetValidators(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	// Converter para resumos para listagem
	summaries := make([]interface{}, len(validators))
	for i, validator := range validators {
		summaries[i] = validator.ToSummary()
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    summaries,
		"count":   len(summaries),
	})
}

// GetActiveValidators retorna lista de validadores ativos
// GET /api/validators/active
func (h *ValidatorHandler) GetActiveValidators(c *gin.Context) {
	validators, err := h.validatorService.GetActiveValidators(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	// Converter para resumos para listagem
	summaries := make([]interface{}, len(validators))
	for i, validator := range validators {
		summaries[i] = validator.ToSummary()
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    summaries,
		"count":   len(summaries),
	})
}

// GetInactiveValidators retorna lista de validadores inativos
// GET /api/validators/inactive
func (h *ValidatorHandler) GetInactiveValidators(c *gin.Context) {
	validators, err := h.validatorService.GetInactiveValidators(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	// Converter para resumos para listagem
	summaries := make([]interface{}, len(validators))
	for i, validator := range validators {
		summaries[i] = validator.ToSummary()
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    summaries,
		"count":   len(summaries),
	})
}

// GetValidator retorna um validador específico por endereço
// GET /api/validators/:address
func (h *ValidatorHandler) GetValidator(c *gin.Context) {
	address := c.Param("address")
	if address == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Endereço do validador é obrigatório",
		})
		return
	}

	// Validar formato do endereço
	if len(address) != 42 || !strings.HasPrefix(address, "0x") {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Formato de endereço inválido",
		})
		return
	}

	validator, err := h.validatorService.GetValidatorByAddress(c.Request.Context(), address)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	if validator == nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Validador não encontrado",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    validator,
	})
}

// GetValidatorMetrics retorna métricas dos validadores
// GET /api/validators/metrics
func (h *ValidatorHandler) GetValidatorMetrics(c *gin.Context) {
	metrics, err := h.validatorService.GetValidatorMetrics(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    metrics,
	})
}

// SyncValidators força sincronização dos validadores com a rede QBFT
// POST /api/validators/sync
func (h *ValidatorHandler) SyncValidators(c *gin.Context) {
	err := h.validatorService.SyncValidators(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Sincronização de validadores realizada com sucesso",
	})
}
