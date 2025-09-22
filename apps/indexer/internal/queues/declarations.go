package queues

import (
	amqp "github.com/rabbitmq/amqp091-go"
)

// QueueDeclaration representa os parâmetros para declarar uma fila.
type QueueDeclaration struct {
	Name       string
	Durable    bool
	AutoDelete bool
	Exclusive  bool
	NoWait     bool
	Args       amqp.Table
}

// Declara uma fila com os parâmetros informados.
func (c *Consumer) DeclareQueue(decl QueueDeclaration) error {
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

// Sugestão de declaração padrão para jobs de blocos minerados
var BlockMinedQueue = QueueDeclaration{
	Name:       "block-mined",
	Durable:    true,
	AutoDelete: false,
	Exclusive:  false,
	NoWait:     false,
	Args:       nil,
}

// Fila para jobs de transações pendentes (mempool)
var PendingTxQueue = QueueDeclaration{
	Name:       "pending-tx",
	Durable:    true,
	AutoDelete: false,
	Exclusive:  false,
	NoWait:     false,
	Args:       nil,
}

// Fila para processamento de transações
var TransactionQueue = QueueDeclaration{
	Name:       "transaction-processing",
	Durable:    true,
	AutoDelete: false,
	Exclusive:  false,
	NoWait:     false,
	Args:       nil,
}

// Fila para blocos processados com dados completos (para WebSocket)
var BlockProcessedQueue = QueueDeclaration{
	Name:       "block-processed",
	Durable:    true,
	AutoDelete: false,
	Exclusive:  false,
	NoWait:     false,
	Args:       nil,
}

// Fila para processamento de contas descobertas
var AccountDiscoveredQueue = QueueDeclaration{
	Name:       "account-discovered",
	Durable:    true,
	AutoDelete: false,
	Exclusive:  false,
	NoWait:     false,
	Args:       nil,
}

// Fila para atualização de saldos de contas
var AccountBalanceUpdateQueue = QueueDeclaration{
	Name:       "account-balance-update",
	Durable:    true,
	AutoDelete: false,
	Exclusive:  false,
	NoWait:     false,
	Args:       nil,
}

// Fila para processamento de Smart Accounts (ERC-4337)
var SmartAccountProcessingQueue = QueueDeclaration{
	Name:       "smart-account-processing",
	Durable:    true,
	AutoDelete: false,
	Exclusive:  false,
	NoWait:     false,
	Args:       nil,
}

// Fila para análise de compliance de contas
var AccountComplianceQueue = QueueDeclaration{
	Name:       "account-compliance",
	Durable:    true,
	AutoDelete: false,
	Exclusive:  false,
	NoWait:     false,
	Args:       nil,
}

// Fila para processamento de analytics de contas
var AccountAnalyticsQueue = QueueDeclaration{
	Name:       "account-analytics",
	Durable:    true,
	AutoDelete: false,
	Exclusive:  false,
	NoWait:     false,
	Args:       nil,
}

// Fila para detecção de interações com contratos
var ContractInteractionQueue = QueueDeclaration{
	Name:       "contract-interaction",
	Durable:    true,
	AutoDelete: false,
	Exclusive:  false,
	NoWait:     false,
	Args:       nil,
}

// Fila para processamento de holdings de tokens
var TokenHoldingUpdateQueue = QueueDeclaration{
	Name:       "token-holding-update",
	Durable:    true,
	AutoDelete: false,
	Exclusive:  false,
	NoWait:     false,
	Args:       nil,
}

// Fila para eventos de smart contracts descobertos
var EventDiscoveredQueue = QueueDeclaration{
	Name:       "event-discovered",
	Durable:    true,
	AutoDelete: false,
	Exclusive:  false,
	NoWait:     false,
	Args:       nil,
}

// Fila para eventos processados (para WebSocket e notificações)
var EventProcessedQueue = QueueDeclaration{
	Name:       "event-processed",
	Durable:    true,
	AutoDelete: false,
	Exclusive:  false,
	NoWait:     false,
	Args:       nil,
}
