package cache

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/redis/go-redis/v9"
)

type RedisCache struct {
	client *redis.Client
	ctx    context.Context
}

func NewRedisCache() *RedisCache {
	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		redisURL = "redis://redis:6379"
	}

	opt, err := redis.ParseURL(redisURL)
	if err != nil {
		log.Printf("Erro ao parsear Redis URL: %v", err)
		// Fallback para configuração padrão (Docker hostname)
		opt = &redis.Options{
			Addr: "redis:6379",
		}
	}

	client := redis.NewClient(opt)
	ctx := context.Background()

	// Testar conexão
	_, err = client.Ping(ctx).Result()
	if err != nil {
		log.Printf("Erro ao conectar com Redis: %v", err)
	} else {
		log.Println("API conectado ao Redis com sucesso")
	}

	return &RedisCache{
		client: client,
		ctx:    ctx,
	}
}

// GetLatestBlock retorna o último bloco do cache
func (r *RedisCache) GetLatestBlock() (map[string]interface{}, error) {
	val, err := r.client.Get(r.ctx, "latest_block").Result()
	if err != nil {
		return nil, err
	}

	var data map[string]interface{}
	err = json.Unmarshal([]byte(val), &data)
	return data, err
}

// GetNetworkStats retorna estatísticas da rede
func (r *RedisCache) GetNetworkStats() (map[string]interface{}, error) {
	val, err := r.client.Get(r.ctx, "network_stats").Result()
	if err != nil {
		return nil, err
	}

	var stats map[string]interface{}
	err = json.Unmarshal([]byte(val), &stats)
	return stats, err
}

// GetLatestTransactions retorna as últimas transações
func (r *RedisCache) GetLatestTransactions() ([]map[string]interface{}, error) {
	val, err := r.client.Get(r.ctx, "latest_transactions").Result()
	if err != nil {
		return nil, err
	}

	var data map[string]interface{}
	err = json.Unmarshal([]byte(val), &data)
	if err != nil {
		return nil, err
	}

	transactions, ok := data["transactions"].([]interface{})
	if !ok {
		return nil, fmt.Errorf("formato inválido de transações")
	}

	result := make([]map[string]interface{}, len(transactions))
	for i, tx := range transactions {
		if txMap, ok := tx.(map[string]interface{}); ok {
			result[i] = txMap
		}
	}

	return result, nil
}

// GetBlock retorna um bloco específico do cache
func (r *RedisCache) GetBlock(blockNumber int64) (map[string]interface{}, error) {
	key := fmt.Sprintf("block:%d", blockNumber)
	val, err := r.client.Get(r.ctx, key).Result()
	if err != nil {
		return nil, err
	}

	var blockData map[string]interface{}
	err = json.Unmarshal([]byte(val), &blockData)
	return blockData, err
}

// GetTransaction retorna uma transação específica do cache
func (r *RedisCache) GetTransaction(txHash string) (map[string]interface{}, error) {
	key := fmt.Sprintf("tx:%s", txHash)
	val, err := r.client.Get(r.ctx, key).Result()
	if err != nil {
		return nil, err
	}

	var txData map[string]interface{}
	err = json.Unmarshal([]byte(val), &txData)
	return txData, err
}

// SetDashboardCache armazena dados do dashboard com TTL curto
func (r *RedisCache) SetDashboardCache(data map[string]interface{}) error {
	jsonData, err := json.Marshal(data)
	if err != nil {
		return fmt.Errorf("erro ao serializar dados do dashboard: %v", err)
	}

	return r.client.Set(r.ctx, "dashboard_data", jsonData, 1*time.Second).Err()
}

// GetDashboardCache retorna dados em cache do dashboard
func (r *RedisCache) GetDashboardCache() (map[string]interface{}, error) {
	val, err := r.client.Get(r.ctx, "dashboard_data").Result()
	if err != nil {
		return nil, err
	}

	var data map[string]interface{}
	err = json.Unmarshal([]byte(val), &data)
	return data, err
}

// Verificar se uma chave existe
func (r *RedisCache) Exists(key string) bool {
	result, err := r.client.Exists(r.ctx, key).Result()
	return err == nil && result > 0
}

// TTL de uma chave
func (r *RedisCache) TTL(key string) time.Duration {
	ttl, err := r.client.TTL(r.ctx, key).Result()
	if err != nil {
		return -1
	}
	return ttl
}

// Verificar conexão
func (r *RedisCache) Ping() error {
	return r.client.Ping(r.ctx).Err()
}

// Fechar conexão
func (r *RedisCache) Close() error {
	return r.client.Close()
}
