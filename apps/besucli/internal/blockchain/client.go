package blockchain

import (
	"context"
	"crypto/ecdsa"
	"fmt"
	"math/big"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"
	"github.com/hubweb3/besucli/pkg/logger"
)

var log = logger.New()

type Client struct {
	ethClient   *ethclient.Client
	privateKey  *ecdsa.PrivateKey
	fromAddress common.Address
	chainID     *big.Int
	rpcURL      string
	log         *logger.Logger
}

func NewClient(rpcURL, privateKeyHex string) (*Client, error) {
	log := logger.New()
	
	// Connect to Ethereum/Besu node
	client, err := ethclient.Dial(rpcURL)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to node: %w", err)
	}

	c := &Client{
		ethClient: client,
		rpcURL:    rpcURL,
		log:       log,
	}

	// Configure private key if provided
	if privateKeyHex != "" {
		key, err := crypto.HexToECDSA(privateKeyHex)
		if err != nil {
			return nil, fmt.Errorf("failed to load private key: %w", err)
		}
		c.privateKey = key
		c.fromAddress = crypto.PubkeyToAddress(key.PublicKey)
	}

	// Auto-detect Chain ID
	chainID, err := client.NetworkID(context.Background())
	if err != nil {
		log.Warning("Failed to detect Chain ID, using default", "error", err)
		chainID = big.NewInt(1337) // Fallback for local Besu
	}
	c.chainID = chainID

	log.Success("Connected to blockchain", "rpc", rpcURL, "chainID", chainID.String())
	if c.privateKey != nil {
		log.Success("Wallet configured", "address", c.fromAddress.Hex())
	}

	return c, nil
}

func (c *Client) GetClient() *ethclient.Client {
	return c.ethClient
}

func (c *Client) GetPrivateKey() *ecdsa.PrivateKey {
	return c.privateKey
}

func (c *Client) GetFromAddress() common.Address {
	return c.fromAddress
}

func (c *Client) GetChainID() *big.Int {
	return c.chainID
}

func (c *Client) CheckBalance() (*big.Int, error) {
	if c.privateKey == nil {
		return nil, fmt.Errorf("private key not configured")
	}

	balance, err := c.ethClient.BalanceAt(context.Background(), c.fromAddress, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to get balance: %w", err)
	}

	return balance, nil
}

func (c *Client) FormatEther(wei *big.Int) string {
	if wei == nil {
		return "0"
	}

	ether := new(big.Float)
	ether.SetInt(wei)
	ether.Quo(ether, big.NewFloat(1e18))

	return ether.Text('f', 6)
}

func (c *Client) Close() {
	if c.ethClient != nil {
		c.ethClient.Close()
	}
}