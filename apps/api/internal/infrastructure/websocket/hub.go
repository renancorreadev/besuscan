package websocket

import (
	"encoding/json"
	"log"
	"sync"
	"time"
)

// Hub mantém o conjunto de clientes ativos e faz broadcast de mensagens
type Hub struct {
	// Clientes registrados
	clients map[*Client]bool

	// Canal para registrar clientes
	register chan *Client

	// Canal para desregistrar clientes
	unregister chan *Client

	// Canal para broadcast de mensagens
	broadcast chan []byte

	// Mutex para operações thread-safe
	mutex sync.RWMutex
}

// Message representa uma mensagem WebSocket
type Message struct {
	Type      string      `json:"type"`
	Data      interface{} `json:"data"`
	Timestamp int64       `json:"timestamp"`
}

// NewHub cria uma nova instância do hub
func NewHub() *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		broadcast:  make(chan []byte),
	}
}

// Run inicia o hub e processa eventos
func (h *Hub) Run() {
	log.Println("🔌 WebSocket Hub iniciado")

	for {
		select {
		case client := <-h.register:
			h.mutex.Lock()
			h.clients[client] = true
			h.mutex.Unlock()
			log.Printf("✅ Cliente WebSocket conectado. Total: %d", len(h.clients))

		case client := <-h.unregister:
			h.mutex.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
			}
			h.mutex.Unlock()
			log.Printf("❌ Cliente WebSocket desconectado. Total: %d", len(h.clients))

		case message := <-h.broadcast:
			h.mutex.RLock()
			for client := range h.clients {
				select {
				case client.send <- message:
				default:
					delete(h.clients, client)
					close(client.send)
				}
			}
			h.mutex.RUnlock()
		}
	}
}

// BroadcastMessage envia uma mensagem para todos os clientes conectados
func (h *Hub) BroadcastMessage(msgType string, data interface{}) {
	message := Message{
		Type:      msgType,
		Data:      data,
		Timestamp: getCurrentTimestamp(),
	}

	jsonData, err := json.Marshal(message)
	if err != nil {
		log.Printf("❌ Erro ao serializar mensagem WebSocket: %v", err)
		return
	}

	select {
	case h.broadcast <- jsonData:
	default:
		log.Println("⚠️ Canal de broadcast cheio, mensagem descartada")
	}
}

// GetClientCount retorna o número de clientes conectados
func (h *Hub) GetClientCount() int {
	h.mutex.RLock()
	defer h.mutex.RUnlock()
	return len(h.clients)
}

// getCurrentTimestamp retorna o timestamp atual em milissegundos
func getCurrentTimestamp() int64 {
	return time.Now().UnixMilli()
}
