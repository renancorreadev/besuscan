package events

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"math/big"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/ethclient"
	eventtypes "github.com/hubweb3/indexer/internal/modules/events/types"
	"github.com/hubweb3/indexer/internal/queues"
)

func RunEventListener() {
	// Event listener reativo - monitora eventos de smart contracts e publica para processamento
	ctx := context.Background()

	besuWS := os.Getenv("ETH_WS_URL")
	besuRPC := os.Getenv("ETH_RPC_URL")
	if besuWS == "" && besuRPC == "" {
		besuWS = "wss://wsrpc.hubweb3.com"
		besuRPC = "https://wsrpc.hubweb3.com"
	}
	amqpURL := os.Getenv("RABBITMQ_URL")
	if amqpURL == "" {
		amqpURL = "amqp://guest:guest@localhost:5672/"
	}

	// Configuração de bloco inicial para sincronização de eventos históricos
	startingBlock := os.Getenv("STARTING_BLOCK")
	var startFromBlock uint64
	if startingBlock != "" {
		if parsed, err := strconv.ParseUint(startingBlock, 10, 64); err == nil {
			startFromBlock = parsed
			log.Printf("[event_listener] 🎯 Configurado para iniciar eventos do bloco: %d", startFromBlock)
		}
	}

	// Contratos específicos para monitorar (opcional)
	contractAddresses := os.Getenv("MONITORED_CONTRACTS")
	var monitoredContracts []common.Address
	if contractAddresses != "" {
		addresses := strings.Split(contractAddresses, ",")
		for _, addr := range addresses {
			if common.IsHexAddress(strings.TrimSpace(addr)) {
				monitoredContracts = append(monitoredContracts, common.HexToAddress(strings.TrimSpace(addr)))
			}
		}
		log.Printf("[event_listener] 📋 Monitorando %d contratos específicos", len(monitoredContracts))
	}

	publisher, err := queues.NewPublisher(amqpURL)
	if err != nil {
		log.Fatalf("[event_listener] Erro ao conectar no RabbitMQ: %v", err)
	}
	defer publisher.Close()

	// Declarar as filas de eventos
	if err := publisher.DeclareQueue(queues.EventDiscoveredQueue); err != nil {
		log.Fatalf("[event_listener] Falha ao declarar fila event-discovered: %v", err)
	}

	// Função para conectar ao cliente Ethereum com retentativas
	connectClient := func() *ethclient.Client {
		for {
			var c *ethclient.Client
			var dialErr error

			if besuWS != "" {
				log.Printf("[event_listener] Tentando conectar via WebSocket: %s", besuWS)
				c, dialErr = ethclient.Dial(besuWS)
				if dialErr == nil {
					log.Println("[event_listener] Conectado via WebSocket")
					return c
				}
				log.Printf("[event_listener] WebSocket falhou (%v), tentando HTTP: %s", dialErr, besuRPC)
			}

			if besuRPC != "" {
				log.Printf("[event_listener] Tentando conectar via HTTP: %s", besuRPC)
				c, dialErr = ethclient.Dial(besuRPC)
				if dialErr == nil {
					log.Println("[event_listener] Conectado via HTTP (polling mode)")
					return c
				}
				log.Printf("[event_listener] Erro ao conectar via HTTP: %v. Tentando novamente em 5 segundos...", dialErr)
			} else {
				log.Printf("[event_listener] Erro ao conectar no Besu WS e HTTP não configurado. Tentando novamente em 5 segundos...")
			}
			time.Sleep(5 * time.Second)
		}
	}

	client := connectClient()

	// Obter último bloco da rede
	latestOnNode, err := client.BlockNumber(ctx)
	if err != nil {
		log.Fatalf("[event_listener] Erro ao obter último bloco do node: %v", err)
	}

	// Processar eventos históricos se configurado
	if startFromBlock > 0 && startFromBlock < latestOnNode {
		log.Printf("[event_listener] 📚 Processando eventos históricos de %d até %d...", startFromBlock, latestOnNode)

		// Processar em lotes para não sobrecarregar
		batchSize := uint64(1000) // Processar 1000 blocos por vez
		for fromBlock := startFromBlock; fromBlock <= latestOnNode; fromBlock += batchSize {
			toBlock := fromBlock + batchSize - 1
			if toBlock > latestOnNode {
				toBlock = latestOnNode
			}

			// Criar filtro para eventos
			query := ethereum.FilterQuery{
				FromBlock: big.NewInt(int64(fromBlock)),
				ToBlock:   big.NewInt(int64(toBlock)),
			}

			// Se há contratos específicos, filtrar por eles
			if len(monitoredContracts) > 0 {
				query.Addresses = monitoredContracts
			}

			// Buscar logs
			logs, err := client.FilterLogs(ctx, query)
			if err != nil {
				log.Printf("[event_listener] ⚠️ Erro ao buscar logs históricos (blocos %d-%d): %v", fromBlock, toBlock, err)
				continue
			}

			// Processar cada log encontrado
			for _, vLog := range logs {
				if err := processEventLog(vLog, publisher, client, ctx); err != nil {
					log.Printf("[event_listener] ⚠️ Erro ao processar log histórico: %v", err)
				}
			}

			log.Printf("[event_listener] 📦 Processados %d eventos dos blocos %d-%d", len(logs), fromBlock, toBlock)

			// Pequena pausa para não sobrecarregar
			time.Sleep(500 * time.Millisecond)
		}
		log.Printf("[event_listener] ✅ Processamento de eventos históricos concluído")
	}

	// Escutar eventos em tempo real com lógica de reconexão
	for {
		// Criar filtro para eventos em tempo real
		query := ethereum.FilterQuery{}
		if len(monitoredContracts) > 0 {
			query.Addresses = monitoredContracts
		}

		logsCh := make(chan types.Log)
		sub, err := client.SubscribeFilterLogs(ctx, query, logsCh)
		if err != nil {
			log.Printf("[event_listener] Erro ao assinar logs: %v. Tentando reconectar em 5 segundos...", err)
			time.Sleep(5 * time.Second)
			client = connectClient() // Tentar re-conectar o cliente
			continue                 // Tentar novamente a subscrição
		}

		log.Println("[event_listener] 🔴 Event listener iniciado (tempo real)...")

		// Buffer para processar eventos sequencialmente
		eventBuffer := make(chan types.Log, 1000) // Buffer de 1000 eventos

		// Goroutine para processar eventos do buffer sequencialmente
		go func() {
			for vLog := range eventBuffer {
				if err := processEventLog(vLog, publisher, client, ctx); err != nil {
					log.Printf("[event_listener] ⚠️ Erro ao processar evento em tempo real: %v", err)
				}

				// Pequena pausa para não sobrecarregar
				time.Sleep(50 * time.Millisecond)
			}
		}()

		// Loop principal de recebimento de logs da subscrição
		for {
			select {
			case err := <-sub.Err():
				log.Printf("[event_listener] Erro na subscription: %v. Re-conectando...", err)
				sub.Unsubscribe()           // Fechar subscrição anterior
				close(logsCh)               // Fechar o canal para limpar goroutines lendo dele
				time.Sleep(5 * time.Second) // Pequena pausa antes de tentar reconectar
				goto ReconnectEventListener // Vai para o label para tentar reconectar
			case vLog := <-logsCh:
				// Adicionar ao buffer para processamento sequencial
				select {
				case eventBuffer <- vLog:
					// Evento adicionado ao buffer com sucesso
				default:
					log.Printf("[event_listener] ⚠️ Buffer de eventos cheio! Evento pode ser perdido")
				}
			}
		}
	ReconnectEventListener:
		log.Println("[event_listener] Tentando reconectar o Event Listener...")
	}
}

// processEventLog processa um log individual e envia para o worker
func processEventLog(vLog types.Log, publisher *queues.Publisher, client *ethclient.Client, ctx context.Context) error {
	// Buscar dados da transação para contexto adicional
	tx, _, err := client.TransactionByHash(ctx, vLog.TxHash)
	if err != nil {
		log.Printf("[event_listener] ⚠️ Erro ao buscar transação %s: %v", vLog.TxHash.Hex(), err)
		// Continuar mesmo sem dados da transação
	}

	// Buscar dados do bloco para timestamp
	block, err := client.BlockByNumber(ctx, big.NewInt(int64(vLog.BlockNumber)))
	if err != nil {
		log.Printf("[event_listener] ⚠️ Erro ao buscar bloco %d: %v", vLog.BlockNumber, err)
		// Continuar mesmo sem dados do bloco
	}

	// Criar job de evento
	job := eventtypes.EventJob{
		ID:               generateEventID(vLog),
		ContractAddress:  vLog.Address.Hex(),
		TransactionHash:  vLog.TxHash.Hex(),
		BlockNumber:      vLog.BlockNumber,
		BlockHash:        vLog.BlockHash.Hex(),
		LogIndex:         uint64(vLog.Index),
		TransactionIndex: uint64(vLog.TxIndex),
		Topics:           topicsToStrings(vLog.Topics),
		Data:             vLog.Data,
		Removed:          vLog.Removed,
	}

	// Adicionar dados da transação se disponível
	if tx != nil {
		job.FromAddress = getFromAddress(tx)
		job.ToAddress = getToAddress(tx)
		job.GasUsed = tx.Gas()
		job.GasPrice = tx.GasPrice().String()
	}

	// Adicionar timestamp do bloco se disponível
	if block != nil {
		job.Timestamp = int64(block.Time())
	}

	// Tentar identificar o tipo de evento baseado nos topics
	if len(vLog.Topics) > 0 {
		job.EventSignature = vLog.Topics[0].Hex()
		job.EventName = identifyEventName(vLog.Topics[0].Hex(), vLog.Address.Hex())
	}

	// Publicar evento
	body, err := json.Marshal(job)
	if err != nil {
		return err
	}

	if err := publisher.Publish(queues.EventDiscoveredQueue.Name, body); err != nil {
		return err
	}

	log.Printf("[event_listener] 📡 Evento %s publicado (contrato: %s, bloco: %d)",
		job.EventName, job.ContractAddress[:10]+"...", job.BlockNumber)

	return nil
}

// Funções auxiliares
func generateEventID(vLog types.Log) string {
	return vLog.TxHash.Hex() + "-" + strconv.Itoa(int(vLog.Index))
}

func topicsToStrings(topics []common.Hash) []string {
	result := make([]string, len(topics))
	for i, topic := range topics {
		result[i] = topic.Hex()
	}
	return result
}

func getFromAddress(tx *types.Transaction) string {
	// Para obter o from address, precisamos fazer recover da assinatura
	// Obter chainID da variável de ambiente
	chainIDStr := os.Getenv("CHAIN_ID")
	if chainIDStr == "" {
		chainIDStr = "1337" // Default para Besu local
	}

	chainIDInt, err := strconv.ParseInt(chainIDStr, 10, 64)
	if err != nil {
		log.Printf("[event_listener] ⚠️ Erro ao converter CHAIN_ID '%s': %v, usando 1337", chainIDStr, err)
		chainIDInt = 1337
	}

	chainID := big.NewInt(chainIDInt)

	signer := types.NewEIP155Signer(chainID)
	from, err := types.Sender(signer, tx)
	if err != nil {
		// Se falhar com EIP155, tentar com signer mais simples
		homesteadSigner := types.HomesteadSigner{}
		from, err = types.Sender(homesteadSigner, tx)
		if err != nil {
			return ""
		}
	}

	return from.Hex()
}

func getToAddress(tx *types.Transaction) string {
	if tx.To() != nil {
		return tx.To().Hex()
	}
	return ""
}

// identifyEventName consulta a API para buscar a ABI do contrato e identificar o evento
func identifyEventName(signature string, contractAddress string) string {
	// Primeiro, tentar buscar o evento via API usando a ABI do contrato
	if eventName := getEventNameFromAPI(signature, contractAddress); eventName != "" {
		return eventName
	}

	// Fallback para eventos comuns (apenas como último recurso)
	commonEvents := map[string]string{
		// ERC20/ERC721 Events
		"0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef": "Transfer",
		"0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925": "Approval",
		"0x17307eab39ab6107e8899845ad3d59bd9653f200f220920489ca2b5937696c31": "ApprovalForAll",

		// Ownership Events
		"0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0": "OwnershipTransferred",

		// Pausable Events
		"0x62e78cea01bee320cd4e420270b5ea74000d11b0c9f74754ebdbfc544b05a258": "Paused",
		"0x5db9ee0a495bf2e6ff9c91a7834c1ba4fdd244a5e8aa4e537bd38aeae4b073aa": "Unpaused",

		// Role Events
		"0x2f8788117e7eff1d82e926ec794901d17c78024a50270940304540a733656f0d": "RoleGranted",
		"0xf6391f5c32d9c69d2a47ea670b442974b53935d1edc7fd64eb21e047a839171b": "RoleRevoked",

		// Mint/Burn Events
		"0x0f6798a560793a54c3bcfe86a93cde1e73087d944c0ea20544137d4121396885": "Mint",
		"0xcc16f5dbb4873280815c1ee09dbd06736cffcc184412cf7a71a0fdb75d397ca5": "Burn",

		// Counter Contract Events
		"0x9ec8254969d1974eac8c74afb0c03595b4ffe0a1d7ad8a7f82ed31b9c8542591": "NumberSet",
		"0x209c6035516d19d8e68fcdb2bf5bd0a95b70e35f6ca85925c34b9cdfdd713960": "NumberIncremented",
	}

	if name, exists := commonEvents[signature]; exists {
		return name
	}

	return "Unknown"
}

// getEventNameFromAPI consulta a API para buscar a ABI do contrato e identificar o evento
func getEventNameFromAPI(signature string, contractAddress string) string {
	// Configurar URL da API
	apiBaseURL := os.Getenv("API_BASE_URL")
	if apiBaseURL == "" {
		log.Printf("[event_listener] ❌ API_BASE_URL não definida no ambiente (.env). Configure a URL da API para buscar ABI dos contratos!")
		return ""
	}

	// Buscar ABI do contrato na API usando o endpoint específico
	url := fmt.Sprintf("%s/smart-contracts/%s/abi", apiBaseURL, contractAddress)

	client := &http.Client{
		Timeout: 5 * time.Second, // Timeout rápido para não atrasar o processamento
	}

	resp, err := client.Get(url)
	if err != nil {
		log.Printf("[event_listener] ⚠️ Erro ao consultar API para contrato %s: %v", contractAddress, err)
		return ""
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Printf("[event_listener] ⚠️ Contrato %s não encontrado na API (status: %d)", contractAddress, resp.StatusCode)
		return ""
	}

	// Parsear resposta da API do endpoint /abi
	var apiResponse struct {
		Data struct {
			Address string          `json:"address"`
			ABI     json.RawMessage `json:"abi"`
		} `json:"data"`
		Success bool `json:"success"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&apiResponse); err != nil {
		log.Printf("[event_listener] ⚠️ Erro ao decodificar resposta da API para contrato %s: %v", contractAddress, err)
		return ""
	}

	if !apiResponse.Success || apiResponse.Data.ABI == nil {
		log.Printf("[event_listener] ⚠️ ABI não disponível para contrato %s", contractAddress)
		return ""
	}

	// Parsear ABI do campo abi dentro de data
	contractABI, err := abi.JSON(bytes.NewReader(apiResponse.Data.ABI))
	if err != nil {
		log.Printf("[event_listener] ⚠️ Erro ao parsear ABI do contrato %s: %v", contractAddress, err)
		return ""
	}

	// Buscar evento na ABI que corresponda à assinatura
	for eventName, event := range contractABI.Events {
		eventSignature := event.ID
		if eventSignature.Hex() == signature {
			log.Printf("[event_listener] ✅ Evento identificado via API: %s (contrato: %s)", eventName, contractAddress[:10]+"...")
			return eventName
		}
	}

	log.Printf("[event_listener] ⚠️ Evento com assinatura %s não encontrado na ABI do contrato %s", signature, contractAddress)
	return ""
}
