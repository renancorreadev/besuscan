package websocket

import (
	"log"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
)

const (
	// Tempo limite para escrever mensagem
	writeWait = 10 * time.Second

	// Tempo limite para ler próxima mensagem pong
	pongWait = 60 * time.Second

	// Enviar pings para peer com este período. Deve ser menor que pongWait
	pingPeriod = (pongWait * 9) / 10

	// Tamanho máximo da mensagem permitida
	maxMessageSize = 512
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		// Permitir todas as origens por enquanto
		// Em produção, implementar verificação adequada
		return true
	},
}

// Client representa um cliente WebSocket
type Client struct {
	// Hub WebSocket
	hub *Hub

	// Conexão WebSocket
	conn *websocket.Conn

	// Canal para enviar mensagens
	send chan []byte
}

// NewClient cria uma nova instância do cliente
func NewClient(hub *Hub, conn *websocket.Conn) *Client {
	return &Client{
		hub:  hub,
		conn: conn,
		send: make(chan []byte, 256),
	}
}

// readPump bombeia mensagens da conexão WebSocket para o hub
func (c *Client) readPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadLimit(maxMessageSize)
	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, _, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("❌ Erro WebSocket: %v", err)
			}
			break
		}
	}
}

// writePump bombeia mensagens do hub para a conexão WebSocket
func (c *Client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			// Adicionar mensagens enfileiradas ao writer atual
			n := len(c.send)
			for i := 0; i < n; i++ {
				w.Write([]byte{'\n'})
				w.Write(<-c.send)
			}

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// Start inicia as goroutines de leitura e escrita do cliente
func (c *Client) Start() {
	go c.writePump()
	go c.readPump()
}

// ServeWS lida com requisições WebSocket do cliente
func ServeWS(hub *Hub, w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("❌ Erro ao fazer upgrade WebSocket: %v", err)
		return
	}

	client := NewClient(hub, conn)
	client.hub.register <- client

	// Iniciar goroutines em uma nova goroutine para permitir que a função retorne
	go client.Start()
}
