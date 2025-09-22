package handlers

import (
	"net/http"

	"explorer-api/internal/infrastructure/websocket"

	"github.com/gin-gonic/gin"
)

// WebSocketHandler gerencia as conexões WebSocket
type WebSocketHandler struct {
	hub *websocket.Hub
}

// NewWebSocketHandler cria uma nova instância do handler WebSocket
func NewWebSocketHandler(hub *websocket.Hub) *WebSocketHandler {
	return &WebSocketHandler{
		hub: hub,
	}
}

// HandleWebSocket lida com requisições de upgrade para WebSocket
func (h *WebSocketHandler) HandleWebSocket(c *gin.Context) {
	websocket.ServeWS(h.hub, c.Writer, c.Request)
}

// GetStats retorna estatísticas das conexões WebSocket
func (h *WebSocketHandler) GetStats(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"success":           true,
		"connected_clients": h.hub.GetClientCount(),
		"service":           "WebSocket Stats",
	})
}
