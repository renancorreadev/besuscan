package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"math/big"
	"net/http"
	"time"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/crypto"

	"github.com/hubweb3/besucli/internal/blockchain"
	"github.com/hubweb3/besucli/internal/models"
)

type DeployService struct {
	client   *blockchain.Client
	apiURL   string
	gasLimit uint64
	gasPrice *big.Int
}

func NewDeployService(client *blockchain.Client, apiURL string, gasLimit uint64, gasPrice *big.Int) *DeployService {
	return &DeployService{
		client:   client,
		apiURL:   apiURL,
		gasLimit: gasLimit,
		gasPrice: gasPrice,
	}
}

func (s *DeployService) DeployContract(deployment *models.ContractDeployment) (string, string, *models.DeploymentInfo, error) {
	log.Info("Starting contract deployment...")

	// Parse ABI
	contractABI, err := abi.JSON(bytes.NewReader(deployment.ABI))
	if err != nil {
		return "", "", nil, fmt.Errorf("failed to parse ABI: %w", err)
	}

	// Prepare bytecode
	bytecode := common.FromHex(deployment.Bytecode)
	log.Info("Bytecode loaded", "size", len(bytecode))

	// Check account balance
	balance, err := s.client.CheckBalance()
	if err != nil {
		log.Warning("Failed to check balance", "error", err)
	} else {
		log.Info("Account balance", "balance", s.client.FormatEther(balance), "ETH")
	}

	// Configure transactor
	auth, err := bind.NewKeyedTransactorWithChainID(s.client.GetPrivateKey(), s.client.GetChainID())
	if err != nil {
		return "", "", nil, fmt.Errorf("failed to create transactor: %w", err)
	}

	// Configure gas
	if s.gasPrice.Cmp(big.NewInt(0)) == 0 {
		// Free gas - use legacy transaction MANDATORY for Besu
		auth.GasPrice = big.NewInt(0)
		auth.GasLimit = s.gasLimit
		// IMPORTANT: Disable EIP-1559 to force legacy mode
		auth.GasFeeCap = nil
		auth.GasTipCap = nil
		log.Info("Using free gas (legacy mode - Besu)")
	} else {
		// Paid gas - use normal configuration but still legacy
		auth.GasPrice = s.gasPrice
		auth.GasLimit = s.gasLimit
		// IMPORTANT: Disable EIP-1559 to force legacy mode
		auth.GasFeeCap = nil
		auth.GasTipCap = nil
		log.Info("Gas configuration", "price", s.gasPrice.String(), "limit", s.gasLimit)
	}

	// Check nonce
	nonce, err := s.client.GetClient().PendingNonceAt(context.Background(), s.client.GetFromAddress())
	if err != nil {
		log.Warning("Failed to get nonce", "error", err)
	} else {
		log.Info("Current nonce", "nonce", nonce)
		auth.Nonce = big.NewInt(int64(nonce))
	}

	// Log constructor arguments
	if len(deployment.ConstructorArgs) > 0 {
		log.Info("Constructor arguments", "args", deployment.ConstructorArgs)
	} else {
		log.Info("No constructor arguments")
	}

	// Deploy contract
	log.Info("Sending deployment transaction...")
	address, tx, _, err := bind.DeployContract(auth, contractABI, bytecode, s.client.GetClient(), deployment.ConstructorArgs...)
	if err != nil {
		return "", "", nil, fmt.Errorf("deployment failed: %w", err)
	}

	log.Success("Contract deployed", "address", address.Hex(), "txHash", tx.Hash().Hex())
	log.Info("Transaction details", "gasPrice", tx.GasPrice().String(), "gasLimit", tx.Gas())

	// Wait for confirmation
	log.Info("Waiting for transaction confirmation...")
	receipt, err := bind.WaitMined(context.Background(), s.client.GetClient(), tx)
	if err != nil {
		return "", "", nil, fmt.Errorf("failed to wait for confirmation: %w", err)
	}

	log.Info("Transaction status", "status", receipt.Status, "block", receipt.BlockNumber.Uint64(), "gasUsed", receipt.GasUsed)

	if receipt.Status != types.ReceiptStatusSuccessful {
		// Try to get more error details
		log.Info("Analyzing transaction failure...")

		// Check logs
		if len(receipt.Logs) > 0 {
			log.Info("Transaction logs found", "count", len(receipt.Logs))
			for i, logEntry := range receipt.Logs {
				log.Info("Log entry", "index", i, "address", logEntry.Address.Hex(), "topics", len(logEntry.Topics))
			}
		}

		// Try to get transaction trace
		log.Info("Attempting to get transaction trace...")
		traceResult, err := s.getTransactionTrace(tx.Hash().Hex())
		if err != nil {
			log.Warning("Failed to get trace", "error", err)
		} else if traceResult != "" {
			log.Error("Transaction trace", "trace", traceResult)
		}

		// Try to simulate transaction to get specific error
		log.Info("Simulating transaction to get error...")
		callMsg := ethereum.CallMsg{
			From:     s.client.GetFromAddress(),
			To:       nil, // Deploy
			Gas:      tx.Gas(),
			GasPrice: tx.GasPrice(),
			Value:    tx.Value(),
			Data:     tx.Data(),
		}

		_, err = s.client.GetClient().CallContract(context.Background(), callMsg, receipt.BlockNumber)
		if err != nil {
			log.Error("Simulated error", "error", err)
		}

		// Try to get revert reason
		revertReason, err := s.getRevertReason(tx.Hash().Hex())
		if err != nil {
			log.Warning("Failed to get revert reason", "error", err)
		} else if revertReason != "" {
			log.Error("Revert reason", "reason", revertReason)
		}

		return "", "", nil, fmt.Errorf("transaction failed - status: %d. Gas used: %d/%d. Check: 1) Valid bytecode, 2) Sufficient gas, 3) Correct arguments", receipt.Status, receipt.GasUsed, tx.Gas())
	}

	log.Success("Deployment confirmed", "block", receipt.BlockNumber.Uint64(), "gasUsed", receipt.GasUsed)

	// Get block information for timestamp
	block, err := s.client.GetClient().BlockByHash(context.Background(), receipt.BlockHash)
	if err != nil {
		log.Warning("Failed to get block", "error", err)
		block = nil
	}

	// Create deployment info
	deployInfo := &models.DeploymentInfo{
		CreatorAddress: auth.From.Hex(),
		TxHash:         tx.Hash().Hex(),
		BlockNumber:    receipt.BlockNumber.Int64(),
		GasUsed:        int64(receipt.GasUsed),
	}

	if block != nil {
		deployInfo.Timestamp = time.Unix(int64(block.Time()), 0)
	} else {
		deployInfo.Timestamp = time.Now()
	}

	return address.Hex(), tx.Hash().Hex(), deployInfo, nil
}

func (s *DeployService) VerifyContract(address string, deployment *models.ContractDeployment, deployInfo *models.DeploymentInfo) error {
	log.Info("Sending for verification...")

	// If we don't have source code, use a placeholder or skip verification
	sourceCode := deployment.SourceCode
	if sourceCode == "" {
		log.Warning("Source code not available, using placeholder for verification")
		sourceCode = "// Source code not available - Deploy via ABI/Bytecode"
	}

	request := &models.ContractVerificationRequest{
		Address:             address,
		Name:                deployment.Name,
		Symbol:              deployment.Symbol,
		Description:         deployment.Description,
		ContractType:        deployment.ContractType,
		SourceCode:          sourceCode,
		ABI:                 deployment.ABI,
		Bytecode:            deployment.Bytecode,
		ConstructorArgs:     deployment.ConstructorArgs,
		CompilerVersion:     deployment.CompilerVersion,
		OptimizationEnabled: deployment.OptimizationEnabled,
		OptimizationRuns:    deployment.OptimizationRuns,
		LicenseType:         deployment.LicenseType,
		WebsiteURL:          deployment.WebsiteURL,
		GithubURL:           deployment.GithubURL,
		DocumentationURL:    deployment.DocumentationURL,
		Tags:                deployment.Tags,
		Metadata:            deployment.Metadata,
		DeployedViaCLI:      true,
	}

	// Add deployment info if available
	if deployInfo != nil {
		request.CreatorAddress = deployInfo.CreatorAddress
		request.CreationTxHash = deployInfo.TxHash
		request.CreationBlockNumber = deployInfo.BlockNumber
		request.CreationTimestamp = deployInfo.Timestamp
		request.GasUsed = deployInfo.GasUsed
	}

	jsonData, err := json.Marshal(request)
	if err != nil {
		return fmt.Errorf("failed to serialize data: %w", err)
	}

	// Send to API
	url := fmt.Sprintf("%s/smart-contracts/verify", s.apiURL)
	resp, err := http.Post(url, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := ioutil.ReadAll(resp.Body)
		return fmt.Errorf("verification failed (status %d): %s", resp.StatusCode, string(body))
	}

	log.Success("Contract verified successfully")
	return nil
}

func (s *DeployService) SaveDeploymentInfo(address, txHash string, deployment *models.ContractDeployment, deployInfo *models.DeploymentInfo) {
	// Implementation for saving deployment info to local file
	// This would save to deployments/ directory as JSON
	log.Info("Saving deployment info", "address", address, "txHash", txHash)
}

// Helper functions
func formatEther(wei *big.Int) string {
	if wei == nil {
		return "0"
	}

	ether := new(big.Float)
	ether.SetInt(wei)
	ether.Quo(ether, big.NewFloat(1e18))

	return ether.Text('f', 6)
}

func (s *DeployService) getTransactionTrace(txHash string) (string, error) {
	// Implementation for getting transaction trace using debug_traceTransaction
	// This would make RPC call to get detailed trace
	return "", nil
}

func (s *DeployService) getRevertReason(txHash string) (string, error) {
	// Implementation for getting revert reason
	return "", fmt.Errorf("not implemented")
}

// Remove the entire Deploy function from line 290-364
func (s *DeployService) Deploy(deployment *models.ContractDeployment) (string, string, error) {
	// Validate bytecode
	if len(deployment.Bytecode) == 0 {
		return "", "", fmt.Errorf("bytecode is empty")
	}

	bytecode := common.FromHex(deployment.Bytecode)
	log.Info("Bytecode loaded", "size", fmt.Sprintf("%d bytes", len(bytecode)))

	// Check account balance
	balance, err := s.client.CheckBalance()
	if err != nil {
		log.Warning("Failed to check balance", "error", err)
	} else {
		log.Info("Account balance", "balance", s.client.FormatEther(balance))
	}

	// Configure gas settings
	if s.gasPrice.Cmp(big.NewInt(0)) == 0 {
		log.Info("Using free gas (legacy mode - Besu)")
	} else {
		log.Info("Gas configuration", "price", s.gasPrice.String(), "limit", s.gasLimit)
	}

	// Get nonce
	nonce, err := s.client.GetClient().PendingNonceAt(context.Background(), s.client.GetFromAddress())
	if err != nil {
		log.Warning("Failed to get nonce", "error", err)
		nonce = 0
	}
	log.Info("Current nonce", "nonce", nonce)

	// Handle constructor arguments
	if len(deployment.ConstructorArgs) > 0 {
		log.Info("Constructor arguments", "count", len(deployment.ConstructorArgs))
	} else {
		log.Info("No constructor arguments")
	}

	log.Progress("Sending deployment transaction...")

	// Create and send transaction
	tx := types.NewContractCreation(nonce, big.NewInt(0), s.gasLimit, s.gasPrice, bytecode)
	signedTx, err := types.SignTx(tx, types.NewEIP155Signer(s.client.GetChainID()), s.client.GetPrivateKey())
	if err != nil {
		return "", "", fmt.Errorf("failed to sign transaction: %w", err)
	}

	err = s.client.GetClient().SendTransaction(context.Background(), signedTx)
	if err != nil {
		return "", "", fmt.Errorf("failed to send transaction: %w", err)
	}

	address := crypto.CreateAddress(s.client.GetFromAddress(), nonce)
	log.Success("Contract deployed", "address", address.Hex(), "txHash", signedTx.Hash().Hex())
	log.Info("Transaction details", "gasPrice", signedTx.GasPrice().String(), "gasLimit", signedTx.Gas())

	// Wait for confirmation
	log.Progress("Waiting for transaction confirmation...")
	receipt, err := bind.WaitMined(context.Background(), s.client.GetClient(), signedTx)
	if err != nil {
		return "", "", fmt.Errorf("failed to wait for transaction: %w", err)
	}

	log.Info("Transaction status", "status", receipt.Status, "block", receipt.BlockNumber.Uint64(), "gasUsed", receipt.GasUsed)

	if receipt.Status == 0 {
		log.Error("Transaction failed")
		return "", "", fmt.Errorf("transaction failed")
	}

	log.Success("Deployment confirmed", "block", receipt.BlockNumber.Uint64(), "gasUsed", receipt.GasUsed)

	return address.Hex(), signedTx.Hash().Hex(), nil
}
