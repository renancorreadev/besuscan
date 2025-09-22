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

// Fila para transações mineradas (detectadas em blocos)
var TransactionMinedQueue = QueueDeclaration{
	Name:       "transaction-mined",
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

// Fila para processamento de contratos
var ContractQueue = QueueDeclaration{
	Name:       "contract-processing",
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

// Fila para transações processadas com dados completos (para WebSocket)
var TransactionProcessedQueue = QueueDeclaration{
	Name:       "transaction-processed",
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

// ===== NOVAS FILAS PARA OPERAÇÕES DE ACCOUNT VIA API =====

// Fila para criação de accounts via API
var AccountCreationQueue = QueueDeclaration{
	Name:       "account-creation",
	Durable:    true,
	AutoDelete: false,
	Exclusive:  false,
	NoWait:     false,
	Args:       nil,
}

// Fila para atualização de accounts via API
var AccountUpdateQueue = QueueDeclaration{
	Name:       "account-update",
	Durable:    true,
	AutoDelete: false,
	Exclusive:  false,
	NoWait:     false,
	Args:       nil,
}

// Fila para tagging de accounts via API
var AccountTaggingQueue = QueueDeclaration{
	Name:       "account-tagging",
	Durable:    true,
	AutoDelete: false,
	Exclusive:  false,
	NoWait:     false,
	Args:       nil,
}

// Fila para atualização de compliance via API
var AccountComplianceUpdateQueue = QueueDeclaration{
	Name:       "account-compliance-update",
	Durable:    true,
	AutoDelete: false,
	Exclusive:  false,
	NoWait:     false,
	Args:       nil,
}

// Fila para operações em lote de accounts
var AccountBulkOperationQueue = QueueDeclaration{
	Name:       "account-bulk-operation",
	Durable:    true,
	AutoDelete: false,
	Exclusive:  false,
	NoWait:     false,
	Args:       nil,
}

// Fila para eventos WebSocket
var WebSocketQueue = QueueDeclaration{
	Name:       "websocket-events",
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
