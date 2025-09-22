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
		log.Println("Conectado ao Redis com sucesso")
	}

	return &RedisCache{
		client: client,
		ctx:    ctx,
	}
}

// Cache para último bloco (TTL: 2 segundos)
func (r *RedisCache) SetLatestBlock(blockNumber int64, blockHash string, timestamp int64) error {
	log.Printf("🔍 DEBUG: Tentando fazer SET no Redis para latest_block")

	data := map[string]interface{}{
		"number":    blockNumber,
		"hash":      blockHash,
		"timestamp": timestamp,
		"cached_at": time.Now().Unix(),
	}

	jsonData, err := json.Marshal(data)
	if err != nil {
		log.Printf("❌ Erro ao serializar dados do bloco: %v", err)
		return fmt.Errorf("erro ao serializar dados do bloco: %v", err)
	}

	err = r.client.Set(r.ctx, "latest_block", jsonData, 30*time.Second).Err()
	if err != nil {
		log.Printf("❌ Erro ao fazer SET no Redis: %v", err)
		return err
	}

	log.Printf("✅ SET no Redis executado com sucesso")
	return nil
}

func (r *RedisCache) GetLatestBlock() (map[string]interface{}, error) {
	val, err := r.client.Get(r.ctx, "latest_block").Result()
	if err != nil {
		return nil, err
	}

	var data map[string]interface{}
	err = json.Unmarshal([]byte(val), &data)
	return data, err
}

// Cache para estatísticas da rede (TTL: 5 segundos)
func (r *RedisCache) SetNetworkStats(totalBlocks, totalTransactions int64, avgBlockTime float64) error {
	stats := map[string]interface{}{
		"total_blocks":       totalBlocks,
		"total_transactions": totalTransactions,
		"avg_block_time":     avgBlockTime,
		"cached_at":          time.Now().Unix(),
	}

	jsonData, err := json.Marshal(stats)
	if err != nil {
		return fmt.Errorf("erro ao serializar estatísticas: %v", err)
	}

	return r.client.Set(r.ctx, "network_stats", jsonData, 30*time.Second).Err()
}

func (r *RedisCache) GetNetworkStats() (map[string]interface{}, error) {
	val, err := r.client.Get(r.ctx, "network_stats").Result()
	if err != nil {
		return nil, err
	}

	var stats map[string]interface{}
	err = json.Unmarshal([]byte(val), &stats)
	return stats, err
}

// Cache para últimas transações (TTL: 3 segundos)
func (r *RedisCache) SetLatestTransactions(transactions []map[string]interface{}) error {
	data := map[string]interface{}{
		"transactions": transactions,
		"cached_at":    time.Now().Unix(),
	}

	jsonData, err := json.Marshal(data)
	if err != nil {
		return fmt.Errorf("erro ao serializar transações: %v", err)
	}

	return r.client.Set(r.ctx, "latest_transactions", jsonData, 3*time.Second).Err()
}

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

// Cache para bloco específico (TTL: 30 minutos - dados imutáveis)
func (r *RedisCache) SetBlock(blockNumber int64, blockData map[string]interface{}) error {
	key := fmt.Sprintf("block:%d", blockNumber)

	blockData["cached_at"] = time.Now().Unix()
	jsonData, err := json.Marshal(blockData)
	if err != nil {
		return fmt.Errorf("erro ao serializar bloco: %v", err)
	}

	return r.client.Set(r.ctx, key, jsonData, 30*time.Minute).Err()
}

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

// Cache para transação específica (TTL: 30 minutos - dados imutáveis)
func (r *RedisCache) SetTransaction(txHash string, txData map[string]interface{}) error {
	key := fmt.Sprintf("tx:%s", txHash)

	txData["cached_at"] = time.Now().Unix()
	jsonData, err := json.Marshal(txData)
	if err != nil {
		return fmt.Errorf("erro ao serializar transação: %v", err)
	}

	return r.client.Set(r.ctx, key, jsonData, 30*time.Minute).Err()
}

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

// Invalidar cache específico
func (r *RedisCache) InvalidateKey(key string) error {
	return r.client.Del(r.ctx, key).Err()
}

// Limpar todo o cache
func (r *RedisCache) FlushAll() error {
	return r.client.FlushAll(r.ctx).Err()
}

// Verificar conexão
func (r *RedisCache) Ping() error {
	return r.client.Ping(r.ctx).Err()
}

// Fechar conexão
func (r *RedisCache) Close() error {
	return r.client.Close()
}
