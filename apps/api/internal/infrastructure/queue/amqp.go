package queue

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
)

// AMQPClient representa um cliente AMQP para envio de mensagens
type AMQPClient struct {
	connection *amqp.Connection
	channel    *amqp.Channel
	url        string
}

// NewAMQPClient cria uma nova instância do cliente AMQP
func NewAMQPClient(url string) (*AMQPClient, error) {
	client := &AMQPClient{
		url: url,
	}

	err := client.connect()
	if err != nil {
		return nil, fmt.Errorf("erro ao conectar com RabbitMQ: %w", err)
	}

	return client, nil
}

// connect estabelece conexão com RabbitMQ
func (c *AMQPClient) connect() error {
	var err error

	// Conectar ao RabbitMQ
	c.connection, err = amqp.Dial(c.url)
	if err != nil {
		return fmt.Errorf("erro ao conectar: %w", err)
	}

	// Criar canal
	c.channel, err = c.connection.Channel()
	if err != nil {
		return fmt.Errorf("erro ao criar canal: %w", err)
	}

	log.Println("Conectado ao RabbitMQ com sucesso")
	return nil
}

// PublishMessage publica uma mensagem em uma fila
func (c *AMQPClient) PublishMessage(ctx context.Context, queueName string, message interface{}) error {
	// Serializar mensagem para JSON
	body, err := json.Marshal(message)
	if err != nil {
		return fmt.Errorf("erro ao serializar mensagem: %w", err)
	}

	// Declarar fila (caso não exista)
	_, err = c.channel.QueueDeclare(
		queueName, // name
		true,      // durable
		false,     // delete when unused
		false,     // exclusive
		false,     // no-wait
		nil,       // arguments
	)
	if err != nil {
		return fmt.Errorf("erro ao declarar fila %s: %w", queueName, err)
	}

	// Publicar mensagem
	err = c.channel.PublishWithContext(
		ctx,
		"",        // exchange
		queueName, // routing key
		false,     // mandatory
		false,     // immediate
		amqp.Publishing{
			ContentType:  "application/json",
			Body:         body,
			Timestamp:    time.Now(),
			DeliveryMode: amqp.Persistent, // Persistir mensagem
		},
	)
	if err != nil {
		return fmt.Errorf("erro ao publicar mensagem na fila %s: %w", queueName, err)
	}

	log.Printf("Mensagem publicada na fila %s: %s", queueName, string(body))
	return nil
}

// Close fecha a conexão com RabbitMQ
func (c *AMQPClient) Close() error {
	if c.channel != nil {
		if err := c.channel.Close(); err != nil {
			log.Printf("Erro ao fechar canal: %v", err)
		}
	}
	if c.connection != nil {
		if err := c.connection.Close(); err != nil {
			log.Printf("Erro ao fechar conexão: %v", err)
		}
	}
	return nil
}

// IsConnected verifica se a conexão está ativa
func (c *AMQPClient) IsConnected() bool {
	return c.connection != nil && !c.connection.IsClosed()
}

// Reconnect tenta reconectar ao RabbitMQ
func (c *AMQPClient) Reconnect() error {
	c.Close()
	return c.connect()
}
