package queues

import (
	amqp "github.com/rabbitmq/amqp091-go"
)

type Consumer struct {
	conn    *amqp.Connection
	channel *amqp.Channel
}

type Publisher struct {
	conn    *amqp.Connection
	channel *amqp.Channel
}

// Channel retorna o canal AMQP subjacente do publisher.
// Útil para declarações customizadas de filas.
func (p *Publisher) Channel() *amqp.Channel {
	return p.channel
}

func NewPublisher(amqpURL string) (*Publisher, error) {
	conn, err := amqp.Dial(amqpURL)
	if err != nil {
		return nil, err
	}
	ch, err := conn.Channel()
	if err != nil {
		conn.Close()
		return nil, err
	}
	return &Publisher{conn: conn, channel: ch}, nil
}

func (p *Publisher) Publish(queue string, body []byte) error {
	return p.channel.Publish(
		"",    // exchange
		queue, // routing key (queue name)
		false, // mandatory
		false, // immediate
		amqp.Publishing{
			ContentType: "application/json",
			Body:        body,
		},
	)
}

func (p *Publisher) DeclareQueue(decl QueueDeclaration) error {
	_, err := p.channel.QueueDeclare(
		decl.Name,
		decl.Durable,
		decl.AutoDelete,
		decl.Exclusive,
		decl.NoWait,
		decl.Args,
	)
	return err
}

func (p *Publisher) Close() {
	p.channel.Close()
	p.conn.Close()
}

func NewConsumer(amqpURL string) (*Consumer, error) {
	conn, err := amqp.Dial(amqpURL)
	if err != nil {
		return nil, err
	}
	ch, err := conn.Channel()
	if err != nil {
		conn.Close()
		return nil, err
	}

	// Configurar QoS para processar uma mensagem por vez
	// Isso garante que o consumer não perca mensagens
	err = ch.Qos(
		1,     // prefetchCount - processar apenas 1 mensagem por vez
		0,     // prefetchSize - sem limite de tamanho
		false, // global - aplicar apenas a este consumer
	)
	if err != nil {
		ch.Close()
		conn.Close()
		return nil, err
	}

	return &Consumer{conn: conn, channel: ch}, nil
}

func (c *Consumer) Consume(queue string) (<-chan amqp.Delivery, error) {
	msgs, err := c.channel.Consume(
		queue, "", false, false, false, false, nil, // Mudou auto-ack de true para false
	)
	return msgs, err
}

func (c *Consumer) Close() {
	c.channel.Close()
	c.conn.Close()
}
