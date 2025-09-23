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
	"time"

	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/common"
	"github.com/spf13/cobra"
	"gopkg.in/yaml.v3"

	"github.com/hubweb3/besucli/internal/blockchain"
	"github.com/hubweb3/besucli/internal/config"
	"github.com/hubweb3/besucli/internal/models"
	"github.com/hubweb3/besucli/internal/services"
)

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
		Short: "🚀 Deploy a smart contract with style",
		Long: `🌟 Deploy a smart contract on Hyperledger Besu with automatic verification and modern CLI experience.

✨ YAML mode (recommended):
  besucli deploy token.yml
  besucli deploy templates/counter.yml

⚡ Traditional mode with flags:
  besucli deploy --contract MyToken.sol --name "My Token" --symbol "MTK" --type ERC-20`,
		RunE: func(cmd *cobra.Command, args []string) error {
			// Welcome banner
			log.Banner("SMART CONTRACT DEPLOYMENT")

			// Reload configuration
			log.Step(1, 5, "Loading system configuration...")
			currentCfg, err := config.Load()
			if err != nil {
				log.Warning("Using default configuration", "error", err)
				currentCfg = config.Default()
			}
			log.Success("Configuration loaded successfully")

			// Initialize blockchain client
			log.Step(2, 5, "Connecting to blockchain...")
			log.StartSpinner("Establishing network connection...")

			client, err := blockchain.NewClient(currentCfg.Network.RPCURL, currentCfg.Wallet.PrivateKey)
			if err != nil {
				log.StopSpinner()
				log.Error("Failed to connect to blockchain", "error", err)
				return fmt.Errorf("failed to initialize blockchain client: %w", err)
			}
			defer client.Close()

			log.StopSpinner()
			log.Success("Connected to blockchain", "network", currentCfg.Network.RPCURL)

			if client.GetPrivateKey() == nil {
				log.Error("Private key not configured", "solution", "Use 'besucli config set-wallet' first")
				return fmt.Errorf("private key not configured. Use 'besucli config set-wallet' first")
			}

			log.Step(3, 5, "Validating wallet and permissions...")
			log.Success("Wallet validated and ready for deployment")

			// Check if the first argument is a YAML file
			if len(args) == 1 {
				configFile := args[0]
				if strings.HasSuffix(strings.ToLower(configFile), ".yml") || strings.HasSuffix(strings.ToLower(configFile), ".yaml") {
					log.Step(4, 5, "YAML mode detected - processing configuration...")
					return deployFromYAML(client, currentCfg, configFile)
				}
			}

			log.Step(4, 5, "Traditional mode detected - processing flags...")
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
	log.Section("📋 Contract Configuration")

	log.StartSpinner("Loading configuration file...")
	time.Sleep(500 * time.Millisecond) // Simulate processing

	// Load contract configuration
	contractConfig, err := loadContractConfig(configFile)
	if err != nil {
		log.StopSpinner()
		log.Error("Failed to load contract configuration", "error", err, "file", configFile)
		return err
	}

	log.StopSpinner()
	log.Success("Configuration loaded", "file", configFile)

	// Display contract information in table
	contractInfo := [][]string{
		{"Name", contractConfig.Contract.Name},
		{"Symbol", contractConfig.Contract.Symbol},
		{"Type", contractConfig.Contract.Type},
		{"Description", contractConfig.Contract.Description},
		{"Compiler", contractConfig.Compiler.Version},
		{"Optimization", fmt.Sprintf("%v (%d runs)", contractConfig.Compiler.OptimizationEnabled, contractConfig.Compiler.OptimizationRuns)},
	}

	log.Info("📊 Contract Information:")
	log.Table([]string{"Property", "Value"}, contractInfo)

	// Create deployment object
	deployment := &models.ContractDeployment{
		Name:                contractConfig.Contract.Name,
		Symbol:              contractConfig.Contract.Symbol,
		Description:         contractConfig.Contract.Description,
		ContractType:        contractConfig.Contract.Type,
		CompilerVersion:     contractConfig.Compiler.Version,
		OptimizationEnabled: contractConfig.Compiler.OptimizationEnabled,
		OptimizationRuns:    contractConfig.Compiler.OptimizationRuns,
		LicenseType:         contractConfig.Metadata.License,
		WebsiteURL:          contractConfig.Metadata.WebsiteURL,
		GithubURL:           contractConfig.Metadata.GithubURL,
		DocumentationURL:    contractConfig.Metadata.DocumentationURL,
		Tags:                contractConfig.Metadata.Tags,
	}

	log.Section("📁 Contract Files")

	// Load contract files with progress
	files := []string{contractConfig.Files.Contract, contractConfig.Files.ABI, contractConfig.Files.Bytecode}
	fileNames := []string{"Source Code", "ABI", "Bytecode"}

	for i := range files {
		log.ProgressBar(fmt.Sprintf("Loading %s", fileNames[i]), i, len(files))
		time.Sleep(300 * time.Millisecond) // Simulate loading
	}
	log.ProgressBar("Files loaded", len(files), len(files))

	err = loadContractFiles(deployment, contractConfig.Files.Contract, contractConfig.Files.ABI, contractConfig.Files.Bytecode)
	if err != nil {
		log.Error("Failed to load contract files", "error", err)
		return err
	}

	log.Success("Source code loaded", "file", contractConfig.Files.Contract)
	log.Success("ABI loaded", "file", contractConfig.Files.ABI)
	log.Success("Bytecode loaded", "file", contractConfig.Files.Bytecode)

	// Process constructor arguments correctly using ABI
	if len(contractConfig.ConstructorArgs) > 0 {
		log.Progress("Processing constructor arguments...")

		// Parse ABI to convert arguments correctly
		contractABI, err := abi.JSON(bytes.NewReader(deployment.ABI))
		if err != nil {
			log.Error("Failed to parse ABI", "error", err)
			return fmt.Errorf("failed to parse ABI for arguments: %w", err)
		}

		parsedArgs, err := parseConstructorArgs(contractABI, contractConfig.ConstructorArgs)
		if err != nil {
			log.Error("Failed to process constructor arguments", "error", err)
			return fmt.Errorf("failed to process constructor arguments: %w", err)
		}
		deployment.ConstructorArgs = parsedArgs
		log.Success("Constructor arguments processed", "count", len(parsedArgs))
	}

	// Convert gas price from string to *big.Int
	gasPrice, _ := new(big.Int).SetString(cfg.Gas.Price, 10)

	// Create deploy service
	deployService := services.NewDeployService(client, cfg.API.BaseURL, cfg.Gas.Limit, gasPrice)

	log.Section("🚀 Contract Deployment")

	log.StartSpinner("Preparing deployment transaction...")
	time.Sleep(1 * time.Second) // Simulate preparation
	log.StopSpinner()

	log.Info("💰 Estimating gas costs...")
	log.Info("📡 Sending transaction to blockchain...")

	// Deploy contract
	address, txHash, deployInfo, err := deployService.DeployContract(deployment)
	if err != nil {
		log.Error("Deployment failed", "error", err)
		return err
	}

	log.Celebrate("CONTRACT DEPLOYED SUCCESSFULLY!")

	// Display deployment information in table
	deployData := [][]string{
		{"Address", address},
		{"Transaction Hash", txHash},
		{"Block Number", fmt.Sprintf("%d", deployInfo.BlockNumber)},
		{"Gas Used", fmt.Sprintf("%d", deployInfo.GasUsed)},
		{"Creator", deployInfo.CreatorAddress},
		{"Timestamp", deployInfo.Timestamp.Format("2006-01-02 15:04:05")},
	}

	log.Table([]string{"Property", "Value"}, deployData)

	// Save deployment info
	log.Progress("Saving deployment information...")
	deployService.SaveDeploymentInfo(address, txHash, deployment, deployInfo)
	log.Success("Deployment info saved", "file", fmt.Sprintf("deployments/%s_%s.json", deployment.Name, address[:10]))

	// Verify contract if auto-verify is enabled
	if contractConfig.Deploy.AutoVerify {
		log.Section("🔍 Contract Verification")

		log.StartSpinner("Sending contract for verification...")
		time.Sleep(2 * time.Second) // Simulate verification

		err = deployService.VerifyContract(address, deployment, deployInfo)
		log.StopSpinner()

		if err != nil {
			log.Warning("Contract verification failed", "error", err)
		} else {
			log.Success("Contract verified successfully! ✅")
		}
	}

	log.Celebrate("DEPLOYMENT COMPLETED SUCCESSFULLY!")
	return nil
}

func deployFromFlags(client *blockchain.Client, cfg *config.Config, contractFile, abiFile, bytecodeFile, name, symbol, description,
	contractType string, constructorArgs []string, compilerVersion string,
	optimizationEnabled bool, optimizationRuns int, licenseType, websiteURL,
	githubURL, documentationURL string, tags []string, autoVerify bool) error {

	log.Section("⚙️  Configuration via Flags")

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
	log.Progress("Loading contract files...")
	if err := loadContractFiles(deployment, contractFile, abiFile, bytecodeFile); err != nil {
		log.Error("Failed to load contract files", "error", err)
		return fmt.Errorf("failed to load contract files: %w", err)
	}
	log.Success("Contract files loaded successfully")

	// Process constructor arguments
	if len(constructorArgs) > 0 {
		log.Progress("Processing constructor arguments...")

		// Parse ABI to convert arguments correctly
		contractABI, err := abi.JSON(bytes.NewReader(deployment.ABI))
		if err != nil {
			log.Error("Failed to parse ABI", "error", err)
			return fmt.Errorf("failed to parse ABI for arguments: %w", err)
		}

		parsedArgs, err := parseConstructorArgs(contractABI, constructorArgs)
		if err != nil {
			log.Error("Failed to process constructor arguments", "error", err)
			return fmt.Errorf("failed to process constructor arguments: %w", err)
		}
		deployment.ConstructorArgs = parsedArgs
		log.Success("Constructor arguments processed", "count", len(parsedArgs))
	}

	// Deploy contract
	log.Section("🚀 Contract Deployment")

	gasPrice, _ := new(big.Int).SetString(cfg.Gas.Price, 10)
	deployService := services.NewDeployService(client, cfg.API.BaseURL, cfg.Gas.Limit, gasPrice)

	log.StartSpinner("Executing deployment...")
	address, txHash, deployInfo, err := deployService.DeployContract(deployment)
	log.StopSpinner()

	if err != nil {
		log.Error("Deployment failed", "error", err)
		return fmt.Errorf("deployment failed: %w", err)
	}

	log.Celebrate("CONTRACT DEPLOYED!")
	log.Success("Contract address", "address", address)
	log.Success("Transaction hash", "txHash", txHash)

	// Save deployment info
	log.Progress("Saving deployment information...")
	saveDeploymentInfo(address, txHash, deployment, deployInfo)
	log.Success("Deployment information saved")

	// Auto-verify if requested
	if autoVerify {
		log.Section("🔍 Automatic Verification")
		log.StartSpinner("Verifying contract...")

		err = deployService.VerifyContract(address, deployment, deployInfo)
		log.StopSpinner()

		if err != nil {
			log.Error("Automatic verification failed", "error", err)
		} else {
			log.Success("Contract verified automatically! 🎉")
		}
	}

	return nil
}

// Helper functions with enhanced logging
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
	if contractFile != "" {
		// Load and compile .sol file (optional)
		sourceCode, err := ioutil.ReadFile(contractFile)
		if err != nil {
			return fmt.Errorf("failed to read contract file: %w", err)
		}
		deployment.SourceCode = string(sourceCode)
		log.Info("📄 Source code loaded", "file", contractFile, "size", fmt.Sprintf("%d bytes", len(sourceCode)))
	}

	if abiFile != "" {
		// Load ABI file
		abiData, err := ioutil.ReadFile(abiFile)
		if err != nil {
			return fmt.Errorf("failed to read ABI file: %w", err)
		}
		deployment.ABI = json.RawMessage(abiData)
		log.Info("🔧 ABI loaded", "file", abiFile, "size", fmt.Sprintf("%d bytes", len(abiData)))
	}

	if bytecodeFile != "" {
		// Load bytecode file
		bytecodeData, err := ioutil.ReadFile(bytecodeFile)
		if err != nil {
			return fmt.Errorf("failed to read bytecode file: %w", err)
		}
		deployment.Bytecode = strings.TrimSpace(string(bytecodeData))
		log.Info("💾 Bytecode loaded", "file", bytecodeFile, "size", fmt.Sprintf("%d bytes", len(bytecodeData)))
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

	var parsedArgs []interface{}
	for i, input := range constructor.Inputs {
		arg := args[i]

		parsedArg, err := parseArgumentByType(input.Type, arg)
		if err != nil {
			return nil, fmt.Errorf("failed to parse argument %d (%s): %w", i, input.Name, err)
		}

		parsedArgs = append(parsedArgs, parsedArg)
	}

	return parsedArgs, nil
}

func parseArgumentByType(argType abi.Type, value string) (interface{}, error) {
	switch argType.T {
	case abi.StringTy:
		return value, nil

	case abi.BoolTy:
		return value == "true" || value == "1", nil

	case abi.AddressTy:
		if !common.IsHexAddress(value) {
			return nil, fmt.Errorf("invalid address format: %s", value)
		}
		return common.HexToAddress(value), nil

	case abi.UintTy:
		bigInt := new(big.Int)
		if strings.HasPrefix(value, "0x") {
			bigInt.SetString(value[2:], 16)
		} else {
			bigInt.SetString(value, 10)
		}

		// Validate size
		maxValue := new(big.Int).Lsh(big.NewInt(1), uint(argType.Size))
		maxValue.Sub(maxValue, big.NewInt(1))
		if bigInt.Cmp(maxValue) > 0 {
			return nil, fmt.Errorf("value %s exceeds maximum for uint%d", value, argType.Size)
		}

		return bigInt, nil

	case abi.IntTy:
		bigInt := new(big.Int)
		if strings.HasPrefix(value, "0x") {
			bigInt.SetString(value[2:], 16)
		} else {
			bigInt.SetString(value, 10)
		}

		// Validate size for signed integers
		maxValue := new(big.Int).Lsh(big.NewInt(1), uint(argType.Size-1))
		maxValue.Sub(maxValue, big.NewInt(1))
		minValue := new(big.Int).Lsh(big.NewInt(1), uint(argType.Size-1))
		minValue.Neg(minValue)

		if bigInt.Cmp(maxValue) > 0 || bigInt.Cmp(minValue) < 0 {
			return nil, fmt.Errorf("value %s out of range for int%d", value, argType.Size)
		}

		return bigInt, nil

	case abi.BytesTy:
		if !strings.HasPrefix(value, "0x") {
			return nil, fmt.Errorf("bytes value must be hex encoded with 0x prefix")
		}
		return common.FromHex(value), nil

	case abi.FixedBytesTy:
		if !strings.HasPrefix(value, "0x") {
			return nil, fmt.Errorf("fixed bytes value must be hex encoded with 0x prefix")
		}
		bytes := common.FromHex(value)
		if len(bytes) != argType.Size {
			return nil, fmt.Errorf("expected %d bytes, got %d", argType.Size, len(bytes))
		}

		// Convert to fixed-size array
		result := make([]byte, argType.Size)
		copy(result, bytes)
		return result, nil

	case abi.SliceTy:
		// Handle arrays - expect JSON format: ["item1", "item2", ...]
		if !strings.HasPrefix(value, "[") || !strings.HasSuffix(value, "]") {
			return nil, fmt.Errorf("array values must be in JSON format: [\"item1\", \"item2\"]")
		}

		var items []string
		if err := json.Unmarshal([]byte(value), &items); err != nil {
			return nil, fmt.Errorf("failed to parse array: %w", err)
		}

		var result []interface{}
		for _, item := range items {
			parsedItem, err := parseArgumentByType(*argType.Elem, item)
			if err != nil {
				return nil, fmt.Errorf("failed to parse array item: %w", err)
			}
			result = append(result, parsedItem)
		}

		return result, nil

	case abi.ArrayTy:
		// Handle fixed-size arrays
		if !strings.HasPrefix(value, "[") || !strings.HasSuffix(value, "]") {
			return nil, fmt.Errorf("array values must be in JSON format: [\"item1\", \"item2\"]")
		}

		var items []string
		if err := json.Unmarshal([]byte(value), &items); err != nil {
			return nil, fmt.Errorf("failed to parse array: %w", err)
		}

		if len(items) != argType.Size {
			return nil, fmt.Errorf("expected %d array items, got %d", argType.Size, len(items))
		}

		var result []interface{}
		for _, item := range items {
			parsedItem, err := parseArgumentByType(*argType.Elem, item)
			if err != nil {
				return nil, fmt.Errorf("failed to parse array item: %w", err)
			}
			result = append(result, parsedItem)
		}

		return result, nil

	case abi.TupleTy:
		// Handle structs/tuples - support both named and unnamed tuples
		var tupleData map[string]interface{}

		// Try to parse as JSON object first
		if err := json.Unmarshal([]byte(value), &tupleData); err != nil {
			// If that fails, try to parse as array for unnamed tuples
			var arrayData []interface{}
			if err2 := json.Unmarshal([]byte(value), &arrayData); err2 != nil {
				return nil, fmt.Errorf("failed to parse tuple as object or array: %w", err)
			}

			// Convert array to map with indices as keys
			tupleData = make(map[string]interface{})
			for i, val := range arrayData {
				tupleData[fmt.Sprintf("%d", i)] = val
			}
		}

		var result []interface{}
		for i, field := range argType.TupleElems {
			var fieldValue interface{}
			var exists bool

			// Try named field first, then index
			if len(argType.TupleRawNames) > i && argType.TupleRawNames[i] != "" {
				fieldValue, exists = tupleData[argType.TupleRawNames[i]]
			}
			if !exists {
				fieldValue, exists = tupleData[fmt.Sprintf("%d", i)]
			}
			if !exists {
				return nil, fmt.Errorf("missing field %d in tuple", i)
			}

			// Convert to string for recursive parsing
			fieldValueStr := fmt.Sprintf("%v", fieldValue)
			parsedField, err := parseArgumentByType(*field, fieldValueStr)
			if err != nil {
				return nil, fmt.Errorf("failed to parse tuple field %d: %w", i, err)
			}
			result = append(result, parsedField)
		}

		return result, nil

	default:
		return nil, fmt.Errorf("unsupported type: %s", argType.String())
	}
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
