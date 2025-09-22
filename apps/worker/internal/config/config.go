package config

import (
	"os"
	"strconv"
	"time"
)

// Config contém todas as configurações do worker
type Config struct {
	DatabaseURL       string
	RabbitMQURL       string
	RabbitMQExchange  string
	EthereumRPCURL    string
	EthereumWSURL     string
	BesuRPCURL        string
	WorkerConcurrency int
	RetryAttempts     int
	RetryDelay        time.Duration
	EthereumChainID   string
}

// Load carrega as configurações das variáveis de ambiente
func Load() *Config {
	cfg := &Config{
		DatabaseURL:       getEnv("DATABASE_URL", "postgres://explorer:explorer@localhost:5432/blockexplorer?sslmode=disable"),
		RabbitMQURL:       getEnv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/"),
		RabbitMQExchange:  getEnv("RABBITMQ_EXCHANGE", "blockchain_events"),
		EthereumRPCURL:    getEnv("ETH_RPC_URL", ""),
		EthereumWSURL:     getEnv("ETH_WS_URL", ""),
		BesuRPCURL:        getEnv("BESU_RPC_URL", ""),
		WorkerConcurrency: getEnvInt("WORKER_CONCURRENCY", 5),
		RetryAttempts:     getEnvInt("RETRY_ATTEMPTS", 3),
		RetryDelay:        getEnvDuration("RETRY_DELAY", "5s"),
		EthereumChainID:   getEnv("CHAIN_ID", "1337"),
	}

	return cfg
}

// getEnv retorna o valor da variável de ambiente ou o valor padrão
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// getEnvInt retorna o valor da variável de ambiente como int ou o valor padrão
func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}

// getEnvDuration retorna o valor da variável de ambiente como duration ou o valor padrão
func getEnvDuration(key, defaultValue string) time.Duration {
	if value := os.Getenv(key); value != "" {
		if duration, err := time.ParseDuration(value); err == nil {
			return duration
		}
	}
	duration, _ := time.ParseDuration(defaultValue)
	return duration
}
