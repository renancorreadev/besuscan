package services

import (
	"context"
	"explorer-api/internal/infrastructure/queue"
)

// QueueService gerencia o envio de mensagens para filas
type QueueService struct {
	amqpClient *queue.AMQPClient
}

// NewQueueService cria uma nova instância do serviço de fila
func NewQueueService(amqpClient *queue.AMQPClient) *QueueService {
	return &QueueService{
		amqpClient: amqpClient,
	}
}

// PublishAccountCreation publica uma mensagem de criação de account
func (s *QueueService) PublishAccountCreation(ctx context.Context, message interface{}) error {
	return s.amqpClient.PublishMessage(ctx, "account-creation", message)
}

// PublishAccountUpdate publica uma mensagem de atualização de account
func (s *QueueService) PublishAccountUpdate(ctx context.Context, message interface{}) error {
	return s.amqpClient.PublishMessage(ctx, "account-update", message)
}

// PublishAccountTagging publica uma mensagem de tagging de account
func (s *QueueService) PublishAccountTagging(ctx context.Context, message interface{}) error {
	return s.amqpClient.PublishMessage(ctx, "account-tagging", message)
}

// PublishComplianceUpdate publica uma mensagem de atualização de compliance
func (s *QueueService) PublishComplianceUpdate(ctx context.Context, message interface{}) error {
	return s.amqpClient.PublishMessage(ctx, "account-compliance-update", message)
}

// IsConnected verifica se a conexão com a fila está ativa
func (s *QueueService) IsConnected() bool {
	return s.amqpClient.IsConnected()
}

// Close fecha a conexão com a fila
func (s *QueueService) Close() error {
	return s.amqpClient.Close()
}
