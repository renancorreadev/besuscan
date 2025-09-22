package websocket

import (
	"encoding/json"
	"log"

	amqp "github.com/rabbitmq/amqp091-go"
)

// RabbitMQConsumer consome mensagens do RabbitMQ e as envia via WebSocket
type RabbitMQConsumer struct {
	conn    *amqp.Connection
	channel *amqp.Channel
	hub     *Hub
}

// NewRabbitMQConsumer cria uma nova instância do consumer
func NewRabbitMQConsumer(rabbitmqURL string, hub *Hub) (*RabbitMQConsumer, error) {
	conn, err := amqp.Dial(rabbitmqURL)
	if err != nil {
		return nil, err
	}

	ch, err := conn.Channel()
	if err != nil {
		conn.Close()
		return nil, err
	}

	return &RabbitMQConsumer{
		conn:    conn,
		channel: ch,
		hub:     hub,
	}, nil
}

// Start inicia o consumer e escuta as filas
func (c *RabbitMQConsumer) Start() error {
	log.Println("🔄 Iniciando RabbitMQ Consumer para WebSocket...")

	// Declarar filas que vamos escutar
	queues := []string{
		"block-processed",
		"transaction-processed",
		"transaction-processing",
		"pending-tx",
	}

	for _, queueName := range queues {
		// Declarar fila
		_, err := c.channel.QueueDeclare(
			queueName, // name
			true,      // durable
			false,     // delete when unused
			false,     // exclusive
			false,     // no-wait
			nil,       // arguments
		)
		if err != nil {
			log.Printf("❌ Erro ao declarar fila %s: %v", queueName, err)
			continue
		}

		// Consumir mensagens da fila
		msgs, err := c.channel.Consume(
			queueName, // queue
			"",        // consumer
			true,      // auto-ack
			false,     // exclusive
			false,     // no-local
			false,     // no-wait
			nil,       // args
		)
		if err != nil {
			log.Printf("❌ Erro ao consumir fila %s: %v", queueName, err)
			continue
		}

		// Processar mensagens em goroutine separada
		go c.processMessages(queueName, msgs)
		log.Printf("✅ Escutando fila: %s", queueName)
	}

	return nil
}

// processMessages processa mensagens de uma fila específica
func (c *RabbitMQConsumer) processMessages(queueName string, msgs <-chan amqp.Delivery) {
	for msg := range msgs {
		// Determinar tipo de evento baseado na fila
		eventType := c.getEventType(queueName)

		// Parse da mensagem JSON
		var data interface{}
		if err := json.Unmarshal(msg.Body, &data); err != nil {
			log.Printf("❌ Erro ao fazer parse da mensagem da fila %s: %v", queueName, err)
			continue
		}

		// Enviar via WebSocket
		c.hub.BroadcastMessage(eventType, data)
		log.Printf("📡 Evento %s enviado via WebSocket", eventType)
	}
}

func (c *RabbitMQConsumer) getEventType(queueName string) string {
	switch queueName {
	case "block-processed":
		return "new_block"
	case "transaction-processed":
		return "new_transaction"
	case "transaction-processing":
		return "processing_transaction"
	case "pending-tx":
		return "pending_transaction"
	default:
		return "unknown"
	}
}

// Close fecha as conexões
func (c *RabbitMQConsumer) Close() {
	if c.channel != nil {
		c.channel.Close()
	}
	if c.conn != nil {
		c.conn.Close()
	}
}
