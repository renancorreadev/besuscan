package commands

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"math/big"
	"os"
	"path/filepath"
	"strings"

	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/spf13/cobra"
	"gopkg.in/yaml.v3"

	"github.com/hubweb3/besucli/internal/blockchain"
	"github.com/hubweb3/besucli/internal/config"
	"github.com/hubweb3/besucli/internal/models"
	"github.com/hubweb3/besucli/internal/services"
)

// Removendo a redeclaração do log - já existe em config.go

func NewDeployCommand(cfg *config.Config) *cobra.Command {
	var (
		contractFile        string
		abiFile             string
		bytecodeFile        string
		name                string
		symbol              string
		description         string
		contractType        string
		constructorArgs     []string
		compilerVersion     string
		optimizationEnabled bool
		optimizationRuns    int
		licenseType         string
		websiteURL          string
		githubURL           string
		documentationURL    string
		tags                []string
		autoVerify          bool
	)

	cmd := &cobra.Command{
		Use:   "deploy [config-file | flags]",
		Short: "Deploy a smart contract",
		Long: `Deploy a smart contract on Hyperledger Besu with automatic verification.

YAML mode (recommended):
  besucli deploy token.yml
  besucli deploy templates/counter.yml

Traditional mode with flags:
  besucli deploy --contract MyToken.sol --name "My Token" --symbol "MTK" --type ERC-20`,
		RunE: func(cmd *cobra.Command, args []string) error {
			// Recarregar configuração para garantir que temos a versão mais atual
			currentCfg, err := config.Load()
			if err != nil {
				log.Warning("Using default configuration", "error", err)
				currentCfg = config.Default()
			}

			// Initialize blockchain client
			client, err := blockchain.NewClient(currentCfg.Network.RPCURL, currentCfg.Wallet.PrivateKey)
			if err != nil {
				return fmt.Errorf("failed to initialize blockchain client: %w", err)
			}
			defer client.Close()

			if client.GetPrivateKey() == nil {
				return fmt.Errorf("private key not configured. Use 'besucli config set-wallet' first")
			}

			// Check if the first argument is a YAML file
			if len(args) == 1 {
				configFile := args[0]
				if strings.HasSuffix(strings.ToLower(configFile), ".yml") || strings.HasSuffix(strings.ToLower(configFile), ".yaml") {
					// YAML mode
					return deployFromYAML(client, currentCfg, configFile)
				}
			}

			// Traditional mode with flags
			return deployFromFlags(client, currentCfg, contractFile, abiFile, bytecodeFile, name, symbol, description,
				contractType, constructorArgs, compilerVersion, optimizationEnabled, optimizationRuns,
				licenseType, websiteURL, githubURL, documentationURL, tags, autoVerify)
		},
	}

	cmd.Flags().StringVar(&contractFile, "contract", "", "Contract .sol file")
	cmd.Flags().StringVar(&abiFile, "abi", "", "Contract .abi file")
	cmd.Flags().StringVar(&bytecodeFile, "bytecode", "", "Bytecode .bin file")
	cmd.Flags().StringVar(&name, "name", "", "Contract name (required for flags mode)")
	cmd.Flags().StringVar(&symbol, "symbol", "", "Token symbol (for tokens)")
	cmd.Flags().StringVar(&description, "description", "", "Contract description")
	cmd.Flags().StringVar(&contractType, "type", "Unknown", "Contract type (ERC-20, ERC-721, DeFi, etc.)")
	cmd.Flags().StringSliceVar(&constructorArgs, "args", []string{}, "Constructor arguments")
	cmd.Flags().StringVar(&compilerVersion, "compiler", "v0.8.19", "Solidity compiler version")
	cmd.Flags().BoolVar(&optimizationEnabled, "optimization", true, "Optimization enabled")
	cmd.Flags().IntVar(&optimizationRuns, "optimization-runs", 200, "Number of optimization runs")
	cmd.Flags().StringVar(&licenseType, "license", "MIT", "License type")
	cmd.Flags().StringVar(&websiteURL, "website", "", "Website URL")
	cmd.Flags().StringVar(&githubURL, "github", "", "GitHub URL")
	cmd.Flags().StringVar(&documentationURL, "docs", "", "Documentation URL")
	cmd.Flags().StringSliceVar(&tags, "tags", []string{}, "Tags for categorization")
	cmd.Flags().BoolVar(&autoVerify, "auto-verify", true, "Automatically verify after deployment")

	return cmd
}

func deployFromYAML(client *blockchain.Client, cfg *config.Config, configFile string) error {
	log.Section("Contract Configuration")
	log.Info("Loading contract configuration", "file", configFile)

	// Load contract configuration
	contractConfig, err := loadContractConfig(configFile)
	if err != nil {
		log.Error("Failed to load contract configuration", "error", err)
		return err
	}

	// Convert constructor args from []string to []interface{}
	var constructorArgs []interface{}
	for _, arg := range contractConfig.ConstructorArgs {
		constructorArgs = append(constructorArgs, arg)
	}

	// Create deployment object
	deployment := &models.ContractDeployment{
		Name:                contractConfig.Contract.Name,
		Symbol:              contractConfig.Contract.Symbol,
		Description:         contractConfig.Contract.Description,
		ContractType:        contractConfig.Contract.Type,
		ConstructorArgs:     constructorArgs,
		CompilerVersion:     contractConfig.Compiler.Version,
		OptimizationEnabled: contractConfig.Compiler.OptimizationEnabled,
		OptimizationRuns:    contractConfig.Compiler.OptimizationRuns,
		LicenseType:         contractConfig.Metadata.License,
		WebsiteURL:          contractConfig.Metadata.WebsiteURL,
		GithubURL:           contractConfig.Metadata.GithubURL,
		DocumentationURL:    contractConfig.Metadata.DocumentationURL,
		Tags:                contractConfig.Metadata.Tags,
	}

	log.Section("Contract Files")
	log.Info("Loading contract files...")

	// Load contract files
	err = loadContractFiles(deployment, contractConfig.Files.Contract, contractConfig.Files.ABI, contractConfig.Files.Bytecode)
	if err != nil {
		log.Error("Failed to load contract files", "error", err)
		return err
	}

	log.Success("Source code loaded", "file", contractConfig.Files.Contract)
	log.Success("ABI loaded", "file", contractConfig.Files.ABI)
	log.Success("Bytecode loaded", "file", contractConfig.Files.Bytecode)

	// Convert gas price from string to *big.Int
	gasPrice, _ := new(big.Int).SetString(cfg.Gas.Price, 10)

	// Create deploy service
	deployService := services.NewDeployService(client, cfg.API.BaseURL, cfg.Gas.Limit, gasPrice)

	log.Section("Contract Deployment")

	// Deploy contract
	address, txHash, deployInfo, err := deployService.DeployContract(deployment)
	if err != nil {
		log.Error("Deployment failed", "error", err)
		return err
	}

	log.Success("Contract deployed successfully", "address", address, "txHash", txHash)

	// Save deployment info
	deployService.SaveDeploymentInfo(address, txHash, deployment, deployInfo)
	log.Success("Deployment info saved", "file", fmt.Sprintf("deployments/%s_%s.json", deployment.Name, address[:10]))

	// Verify contract if auto-verify is enabled
	if contractConfig.Deploy.AutoVerify {
		log.Section("Contract Verification")
		log.Info("Sending contract for verification...")

		err = deployService.VerifyContract(address, deployment, deployInfo)
		if err != nil {
			log.Warning("Contract verification failed", "error", err)
		} else {
			log.Success("Contract verified successfully")
		}
	}

	return nil
}

func deployFromFlags(client *blockchain.Client, cfg *config.Config, contractFile, abiFile, bytecodeFile, name, symbol, description,
	contractType string, constructorArgs []string, compilerVersion string,
	optimizationEnabled bool, optimizationRuns int, licenseType, websiteURL,
	githubURL, documentationURL string, tags []string, autoVerify bool) error {

	// Create deployment
	deployment := &models.ContractDeployment{
		Name:                name,
		Symbol:              symbol,
		Description:         description,
		ContractType:        contractType,
		CompilerVersion:     compilerVersion,
		OptimizationEnabled: optimizationEnabled,
		OptimizationRuns:    optimizationRuns,
		LicenseType:         licenseType,
		WebsiteURL:          websiteURL,
		GithubURL:           githubURL,
		DocumentationURL:    documentationURL,
		Tags:                tags,
		Metadata:            make(map[string]interface{}),
	}

	// Load contract files
	if err := loadContractFiles(deployment, contractFile, abiFile, bytecodeFile); err != nil {
		return fmt.Errorf("failed to load contract files: %w", err)
	}

	// Process constructor arguments
	if len(constructorArgs) > 0 {
		// Parse ABI to convert arguments correctly
		contractABI, err := abi.JSON(bytes.NewReader(deployment.ABI))
		if err != nil {
			return fmt.Errorf("failed to parse ABI for arguments: %w", err)
		}

		parsedArgs, err := parseConstructorArgs(contractABI, constructorArgs)
		if err != nil {
			return fmt.Errorf("failed to process constructor arguments: %w", err)
		}
		deployment.ConstructorArgs = parsedArgs
	}

	// Deploy contract
	gasPrice, _ := new(big.Int).SetString(cfg.Gas.Price, 10)
	deployService := services.NewDeployService(client, cfg.API.BaseURL, cfg.Gas.Limit, gasPrice)

	address, txHash, deployInfo, err := deployService.DeployContract(deployment)
	if err != nil {
		return fmt.Errorf("deployment failed: %w", err)
	}

	log.Success("Contract deployed successfully", "address", address, "txHash", txHash)

	// Save deployment info
	saveDeploymentInfo(address, txHash, deployment, deployInfo)

	// Auto-verify if requested
	if autoVerify {
		log.Section("Contract Verification")
		log.Info("Starting automatic verification...")
		err = deployService.VerifyContract(address, deployment, deployInfo)
		if err != nil {
			log.Error("Automatic verification failed", "error", err)
		} else {
			log.Success("Contract verified automatically!")
		}
	}

	return nil
}

// Helper functions
func loadContractConfig(configFile string) (*models.ContractConfig, error) {
	data, err := ioutil.ReadFile(configFile)
	if err != nil {
		return nil, fmt.Errorf("failed to read config file: %w", err)
	}

	var config models.ContractConfig
	if err := yaml.Unmarshal(data, &config); err != nil {
		return nil, fmt.Errorf("failed to parse YAML: %w", err)
	}

	return &config, nil
}

func loadContractFiles(deployment *models.ContractDeployment, contractFile, abiFile, bytecodeFile string) error {
	log.Info("Loading contract files...")

	if contractFile != "" {
		// Load and compile .sol file (optional)
		sourceCode, err := ioutil.ReadFile(contractFile)
		if err != nil {
			return fmt.Errorf("failed to read contract file: %w", err)
		}
		deployment.SourceCode = string(sourceCode)
		log.Info("Source code loaded", "file", contractFile)
	}

	if abiFile != "" {
		// Load ABI file
		abiData, err := ioutil.ReadFile(abiFile)
		if err != nil {
			return fmt.Errorf("failed to read ABI file: %w", err)
		}
		deployment.ABI = json.RawMessage(abiData)
		log.Info("ABI loaded", "file", abiFile)
	}

	if bytecodeFile != "" {
		// Load bytecode file
		bytecodeData, err := ioutil.ReadFile(bytecodeFile)
		if err != nil {
			return fmt.Errorf("failed to read bytecode file: %w", err)
		}
		deployment.Bytecode = strings.TrimSpace(string(bytecodeData))
		log.Info("Bytecode loaded", "file", bytecodeFile)
	}

	// Validate required files
	if len(deployment.ABI) == 0 {
		return fmt.Errorf("ABI is required")
	}
	if deployment.Bytecode == "" {
		return fmt.Errorf("bytecode is required")
	}

	return nil
}

func parseConstructorArgs(contractABI abi.ABI, args []string) ([]interface{}, error) {
	// Find constructor
	constructor := contractABI.Constructor
	if constructor.Inputs == nil {
		if len(args) > 0 {
			return nil, fmt.Errorf("contract has no constructor but arguments provided")
		}
		return []interface{}{}, nil
	}

	if len(args) != len(constructor.Inputs) {
		return nil, fmt.Errorf("expected %d constructor arguments, got %d", len(constructor.Inputs), len(args))
	}

	// This is a simplified version - in a real implementation, you'd need
	// proper type parsing for all Solidity types
	var parsedArgs []interface{}
	for i, input := range constructor.Inputs {
		arg := args[i]

		switch input.Type.String() {
		case "string":
			parsedArgs = append(parsedArgs, arg)
		case "uint256":
			bigInt := new(big.Int)
			bigInt.SetString(arg, 10)
			parsedArgs = append(parsedArgs, bigInt)
		case "address":
			parsedArgs = append(parsedArgs, arg)
		case "bool":
			parsedArgs = append(parsedArgs, arg == "true")
		default:
			// For other types, try to parse as string first
			parsedArgs = append(parsedArgs, arg)
		}
	}

	return parsedArgs, nil
}

func saveDeploymentInfo(address, txHash string, deployment *models.ContractDeployment, deployInfo *models.DeploymentInfo) {
	// Create deployments directory if it doesn't exist
	deploymentsDir := "deployments"
	if err := os.MkdirAll(deploymentsDir, 0755); err != nil {
		log.Error("Failed to create deployments directory", "error", err)
		return
	}

	// Create deployment record
	record := map[string]interface{}{
		"name":        deployment.Name,
		"address":     address,
		"txHash":      txHash,
		"blockNumber": deployInfo.BlockNumber,
		"timestamp":   deployInfo.Timestamp,
		"gasUsed":     deployInfo.GasUsed,
		"creator":     deployInfo.CreatorAddress,
		"type":        deployment.ContractType,
		"verified":    false,
	}

	// Save to JSON file
	filename := fmt.Sprintf("%s_%s.json", deployment.Name, address[:10])
	filepath := filepath.Join(deploymentsDir, filename)

	data, err := json.MarshalIndent(record, "", "  ")
	if err != nil {
		log.Error("Failed to marshal deployment info", "error", err)
		return
	}

	if err := ioutil.WriteFile(filepath, data, 0644); err != nil {
		log.Error("Failed to save deployment info", "error", err)
		return
	}

	log.Success("Deployment info saved", "file", filepath)
}
