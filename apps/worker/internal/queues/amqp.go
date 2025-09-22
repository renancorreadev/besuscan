package queues

import (
	"fmt"
	"log"
	"math/rand"
	"os"
	"strings"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
)

type Consumer struct {
	conn        *amqp.Connection
	channel     *amqp.Channel
	consumerTag string
	closed      bool
	amqpURL     string
}

type Publisher struct {
	conn    *amqp.Connection
	channel *amqp.Channel
	closed  bool
	amqpURL string // Armazenar URL para reconexão
}

// Channel retorna o canal AMQP subjacente do publisher.
// Útil para declarações customizadas de filas.
func (p *Publisher) Channel() *amqp.Channel {
	return p.channel
}

func NewPublisher(amqpURL string) (*Publisher, error) {
	conn, err := amqp.Dial(amqpURL)
	if err != nil {
		return nil, fmt.Errorf("falha ao conectar RabbitMQ: %w", err)
	}

	ch, err := conn.Channel()
	if err != nil {
		conn.Close()
		return nil, fmt.Errorf("falha ao criar canal: %w", err)
	}

	publisher := &Publisher{
		conn:    conn,
		channel: ch,
		closed:  false,
		amqpURL: amqpURL,
	}

	// Configurar notificações de fechamento
	go publisher.handleConnectionClose()

	return publisher, nil
}

func (p *Publisher) handleConnectionClose() {
	notifyClose := make(chan *amqp.Error)
	p.conn.NotifyClose(notifyClose)

	select {
	case err := <-notifyClose:
		if err != nil && !p.closed {
			log.Printf("⚠️ Publisher: Conexão RabbitMQ fechada: %v", err)
		}
	}
}

// reconnect tenta reconectar o publisher
func (p *Publisher) reconnect() error {
	if p.closed {
		return fmt.Errorf("publisher está fechado")
	}

	log.Println("🔄 Tentando reconectar Publisher...")

	conn, err := amqp.Dial(p.amqpURL)
	if err != nil {
		return fmt.Errorf("falha ao reconectar RabbitMQ: %w", err)
	}

	ch, err := conn.Channel()
	if err != nil {
		conn.Close()
		return fmt.Errorf("falha ao criar canal na reconexão: %w", err)
	}

	// Fechar conexões antigas se existirem
	if p.channel != nil {
		p.channel.Close()
	}
	if p.conn != nil {
		p.conn.Close()
	}

	p.conn = conn
	p.channel = ch

	// Reconfigurar notificações
	go p.handleConnectionClose()

	log.Println("✅ Publisher reconectado com sucesso")
	return nil
}

func (p *Publisher) Publish(queue string, body []byte) error {
	if p.closed {
		return fmt.Errorf("publisher está fechado")
	}

	// Tentar publicar com retry em caso de erro de conexão
	maxRetries := 3
	for attempt := 1; attempt <= maxRetries; attempt++ {
		err := p.channel.Publish(
			"",    // exchange
			queue, // routing key (queue name)
			false, // mandatory
			false, // immediate
			amqp.Publishing{
				ContentType: "application/json",
				Body:        body,
				Timestamp:   time.Now(),
			},
		)

		if err == nil {
			return nil
		}

		// Se erro de conexão, tentar reconectar
		if strings.Contains(err.Error(), "channel/connection is not open") ||
			strings.Contains(err.Error(), "INTERNAL_ERROR") {
			log.Printf("⚠️ Tentativa %d/%d: Erro de conexão no publish, tentando reconectar...", attempt, maxRetries)

			if reconnectErr := p.reconnect(); reconnectErr != nil {
				log.Printf("❌ Falha na reconexão: %v", reconnectErr)
				if attempt == maxRetries {
					return fmt.Errorf("falha ao publicar após %d tentativas: %w", maxRetries, err)
				}
				time.Sleep(time.Duration(attempt) * time.Second)
				continue
			}

			// Aguardar um pouco após reconexão
			time.Sleep(500 * time.Millisecond)
			continue
		}

		// Se não é erro de conexão, falhar imediatamente
		return err
	}

	return fmt.Errorf("falha ao publicar após %d tentativas", maxRetries)
}

func (p *Publisher) DeclareQueue(decl QueueDeclaration) error {
	if p.closed {
		return fmt.Errorf("publisher está fechado")
	}

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
	if p.closed {
		return
	}

	p.closed = true
	log.Println("🔒 Fechando Publisher RabbitMQ...")

	if p.channel != nil {
		p.channel.Close()
	}
	if p.conn != nil {
		p.conn.Close()
	}
}

func NewConsumer(amqpURL string) (*Consumer, error) {
	conn, err := amqp.Dial(amqpURL)
	if err != nil {
		return nil, fmt.Errorf("falha ao conectar RabbitMQ: %w", err)
	}

	ch, err := conn.Channel()
	if err != nil {
		conn.Close()
		return nil, fmt.Errorf("falha ao criar canal: %w", err)
	}

	// Gerar consumer tag único mais robusto para evitar conflitos durante hot-reload
	// Combina hostname, PID, timestamp em nanosegundos e número aleatório
	rand.Seed(time.Now().UnixNano())
	hostname, _ := os.Hostname()
	if hostname == "" {
		hostname = "unknown"
	}
	consumerTag := fmt.Sprintf("worker-%s-%d-%d-%d",
		hostname,
		os.Getpid(),
		time.Now().UnixNano(),
		rand.Intn(999999))

	consumer := &Consumer{
		conn:        conn,
		channel:     ch,
		consumerTag: consumerTag,
		closed:      false,
		amqpURL:     amqpURL,
	}

	// Configurar notificações de fechamento
	go consumer.handleConnectionClose()

	log.Printf("✅ Consumer criado com tag: %s", consumerTag)
	return consumer, nil
}

func (c *Consumer) handleConnectionClose() {
	notifyClose := make(chan *amqp.Error)
	c.conn.NotifyClose(notifyClose)

	select {
	case err := <-notifyClose:
		if err != nil && !c.closed {
			log.Printf("⚠️ Consumer [%s]: Conexão RabbitMQ fechada: %v", c.consumerTag, err)
		}
	}
}

// reconnect tenta reconectar o consumer
func (c *Consumer) reconnect() error {
	if c.closed {
		return fmt.Errorf("consumer está fechado")
	}

	log.Printf("🔄 Tentando reconectar Consumer [%s]...", c.consumerTag)

	conn, err := amqp.Dial(c.amqpURL)
	if err != nil {
		return fmt.Errorf("falha ao reconectar RabbitMQ: %w", err)
	}

	ch, err := conn.Channel()
	if err != nil {
		conn.Close()
		return fmt.Errorf("falha ao criar canal na reconexão: %w", err)
	}

	// Fechar conexões antigas se existirem
	if c.channel != nil {
		c.channel.Close()
	}
	if c.conn != nil {
		c.conn.Close()
	}

	c.conn = conn
	c.channel = ch

	// Gerar nova consumer tag para evitar conflitos
	c.regenerateConsumerTag()

	// Reconfigurar notificações
	go c.handleConnectionClose()

	log.Printf("✅ Consumer [%s] reconectado com sucesso", c.consumerTag)
	return nil
}

// regenerateConsumerTag gera uma nova consumer tag única
func (c *Consumer) regenerateConsumerTag() {
	rand.Seed(time.Now().UnixNano())
	hostname, _ := os.Hostname()
	if hostname == "" {
		hostname = "unknown"
	}
	c.consumerTag = fmt.Sprintf("worker-%s-%d-%d-%d",
		hostname,
		os.Getpid(),
		time.Now().UnixNano(),
		rand.Intn(999999))
}

func (c *Consumer) Consume(queue string) (<-chan amqp.Delivery, error) {
	if c.closed {
		return nil, fmt.Errorf("consumer está fechado")
	}

	// Tentar cancelar qualquer consumer anterior com tag similar (cleanup preventivo)
	// Isso ajuda durante hot-reload quando conexões antigas podem não ter sido limpas
	if err := c.channel.Cancel(c.consumerTag, false); err != nil {
		// Ignorar erro se consumer não existir - é esperado na primeira execução
		log.Printf("🧹 Cleanup preventivo do consumer [%s]: %v", c.consumerTag, err)
	}

	// Tentar consumir com retry em caso de conflito de consumer tag ou erro de conexão
	var msgs <-chan amqp.Delivery
	var err error
	maxRetries := 5 // Aumentado para lidar com problemas de conexão

	for attempt := 1; attempt <= maxRetries; attempt++ {
		msgs, err = c.channel.Consume(
			queue,         // queue
			c.consumerTag, // consumer tag único
			false,         // auto-ack = false para controle manual
			false,         // exclusive
			false,         // no-local
			false,         // no-wait
			nil,           // args
		)

		if err == nil {
			log.Printf("✅ Consumer [%s] iniciado para fila: %s", c.consumerTag, queue)
			return msgs, nil
		}

		// Se erro de consumer tag reuse, gerar nova tag
		if strings.Contains(err.Error(), "reuse consumer tag") || strings.Contains(err.Error(), "NOT_ALLOWED") {
			log.Printf("⚠️ Tentativa %d/%d: Consumer tag em uso, gerando nova tag...", attempt, maxRetries)
			c.regenerateConsumerTag()
			log.Printf("🔄 Nova consumer tag gerada: %s", c.consumerTag)
			time.Sleep(time.Duration(attempt) * 100 * time.Millisecond)
			continue
		}

		// Se erro de conexão, tentar reconectar
		if strings.Contains(err.Error(), "channel/connection is not open") ||
			strings.Contains(err.Error(), "INTERNAL_ERROR") {
			log.Printf("⚠️ Tentativa %d/%d: Erro de conexão, tentando reconectar...", attempt, maxRetries)

			if reconnectErr := c.reconnect(); reconnectErr != nil {
				log.Printf("❌ Falha na reconexão: %v", reconnectErr)
				if attempt == maxRetries {
					return nil, fmt.Errorf("falha ao consumir após %d tentativas: %w", maxRetries, err)
				}
				time.Sleep(time.Duration(attempt) * time.Second)
				continue
			}

			// Aguardar um pouco após reconexão
			time.Sleep(500 * time.Millisecond)
			continue
		}

		// Se não é erro conhecido, falhar imediatamente
		break
	}

	return nil, fmt.Errorf("falha ao iniciar consumo após %d tentativas: %w", maxRetries, err)
}

func (c *Consumer) DeclareQueue(decl QueueDeclaration) error {
	if c.closed {
		return fmt.Errorf("consumer está fechado")
	}

	_, err := c.channel.QueueDeclare(
		decl.Name,
		decl.Durable,
		decl.AutoDelete,
		decl.Exclusive,
		decl.NoWait,
		decl.Args,
	)
	return err
}

func (c *Consumer) Close() {
	if c.closed {
		return
	}

	c.closed = true
	log.Printf("🔒 Fechando Consumer [%s]...", c.consumerTag)

	// Cancelar consumer específico com timeout
	if c.channel != nil {
		if err := c.channel.Cancel(c.consumerTag, false); err != nil {
			log.Printf("⚠️ Erro ao cancelar consumer [%s]: %v", c.consumerTag, err)
		} else {
			log.Printf("✅ Consumer [%s] cancelado", c.consumerTag)
		}

		// Aguardar um pouco para garantir que o cancelamento seja processado
		time.Sleep(100 * time.Millisecond)

		c.channel.Close()
	}

	if c.conn != nil {
		c.conn.Close()
	}

	log.Printf("✅ Consumer [%s] fechado", c.consumerTag)
}
