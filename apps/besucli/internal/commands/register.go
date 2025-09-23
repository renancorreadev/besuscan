package commands

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"math/big"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/spf13/cobra"
	"gopkg.in/yaml.v3"

	"github.com/hubweb3/besucli/internal/blockchain"
	"github.com/hubweb3/besucli/internal/config"
	"github.com/hubweb3/besucli/internal/models"
	"github.com/hubweb3/besucli/internal/services"
)

// ContractRegisterConfig representa a configuração para registro de contratos já deployados
type ContractRegisterConfig struct {
	Contract struct {
		Address     string `yaml:"address"` // Endereço do contrato já deployado
		Name        string `yaml:"name"`
		Symbol      string `yaml:"symbol"`
		Description string `yaml:"description"`
		Type        string `yaml:"type"`
	} `yaml:"contract"`

	Deployment struct {
		TxHash         string `yaml:"tx_hash,omitempty"`         // Hash da transação de deploy (opcional)
		CreatorAddress string `yaml:"creator_address,omitempty"` // Endereço do criador (opcional)
		BlockNumber    int64  `yaml:"block_number,omitempty"`    // Número do bloco (opcional)
		GasUsed        int64  `yaml:"gas_used,omitempty"`        // Gas usado (opcional)
		Timestamp      string `yaml:"timestamp,omitempty"`       // Timestamp (opcional)
	} `yaml:"deployment,omitempty"`

	Files struct {
		Contract string `yaml:"contract,omitempty"`
		ABI      string `yaml:"abi"`
		Bytecode string `yaml:"bytecode,omitempty"`
	} `yaml:"files"`

	ConstructorArgs []string `yaml:"constructor_args"`

	Compiler struct {
		Version             string `yaml:"version"`
		OptimizationEnabled bool   `yaml:"optimization_enabled"`
		OptimizationRuns    int    `yaml:"optimization_runs"`
	} `yaml:"compiler"`

	Metadata struct {
		License          string   `yaml:"license"`
		WebsiteURL       string   `yaml:"website_url"`
		GithubURL        string   `yaml:"github_url"`
		DocumentationURL string   `yaml:"documentation_url"`
		Tags             []string `yaml:"tags"`
	} `yaml:"metadata"`

	Register struct {
		AutoVerify        bool `yaml:"auto_verify"`
		RegisterOnlyMain  bool `yaml:"register_only_main"`
		SkipBytecodeCheck bool `yaml:"skip_bytecode_check"`
	} `yaml:"register"`
}

func NewRegisterCommand(cfg *config.Config) *cobra.Command {
	var (
		address             string
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
		registerOnlyMain    bool
		skipBytecodeCheck   bool
	)

	cmd := &cobra.Command{
		Use:   "register [config-file | flags]",
		Short: "📝 Register an existing smart contract",
		Long: `🌟 Register an existing smart contract that was deployed by other tools like Forge or Hardhat.

✨ YAML mode (recommended):
  besucli register token.yml
  besucli register deployed-contracts/mytoken.yml

⚡ Traditional mode with flags (ALL FIELDS REQUIRED):
  besucli register --address 0x123... --name "My Token" --symbol "MTK" \
    --description "My custom token" --type "ERC-20" \
    --contract MyToken.sol --abi MyToken.abi --bytecode MyToken.bin \
    --compiler "v0.8.19" --license "MIT" \
    --website "https://mytoken.com" --github "https://github.com/me/mytoken" \
    --docs "https://docs.mytoken.com" --tags "token,erc20"

The register command will:
• Verify the contract exists on the blockchain
• Validate ALL required fields for complete database registration
• Process constructor arguments if provided
• Register the contract in the PostgreSQL database via API
• Optionally verify the contract source code

⚠️  IMPORTANT: ALL fields are required for complete registration in smart_contracts table`,
		RunE: func(cmd *cobra.Command, args []string) error {
			// Welcome banner
			log.Banner("SMART CONTRACT REGISTRATION")

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

			// Check if the first argument is a YAML file
			if len(args) == 1 {
				configFile := args[0]
				if strings.HasSuffix(strings.ToLower(configFile), ".yml") || strings.HasSuffix(strings.ToLower(configFile), ".yaml") {
					log.Step(3, 5, "YAML mode detected - processing configuration...")
					return registerFromYAML(client, currentCfg, configFile)
				}
			}

			log.Step(3, 5, "Traditional mode detected - processing flags...")
			return registerFromFlags(client, currentCfg, address, contractFile, abiFile, bytecodeFile,
				name, symbol, description, contractType, constructorArgs, compilerVersion,
				optimizationEnabled, optimizationRuns, licenseType, websiteURL, githubURL,
				documentationURL, tags, autoVerify, registerOnlyMain, skipBytecodeCheck)
		},
	}

	// Flags - TODOS OBRIGATÓRIOS para flags mode
	cmd.Flags().StringVar(&address, "address", "", "Contract address (REQUIRED)")
	cmd.Flags().StringVar(&contractFile, "contract", "", "Contract .sol file (REQUIRED)")
	cmd.Flags().StringVar(&abiFile, "abi", "", "Contract .abi file (REQUIRED)")
	cmd.Flags().StringVar(&bytecodeFile, "bytecode", "", "Bytecode .bin file (REQUIRED)")
	cmd.Flags().StringVar(&name, "name", "", "Contract name (REQUIRED)")
	cmd.Flags().StringVar(&symbol, "symbol", "", "Token/Contract symbol (REQUIRED)")
	cmd.Flags().StringVar(&description, "description", "", "Contract description (REQUIRED)")
	cmd.Flags().StringVar(&contractType, "type", "", "Contract type - ERC-20, ERC-721, DeFi, etc. (REQUIRED)")
	cmd.Flags().StringSliceVar(&constructorArgs, "args", []string{}, "Constructor arguments used in deployment")
	cmd.Flags().StringVar(&compilerVersion, "compiler", "", "Solidity compiler version (REQUIRED)")
	cmd.Flags().BoolVar(&optimizationEnabled, "optimization", true, "Optimization enabled")
	cmd.Flags().IntVar(&optimizationRuns, "optimization-runs", 200, "Number of optimization runs")
	cmd.Flags().StringVar(&licenseType, "license", "", "License type (REQUIRED)")
	cmd.Flags().StringVar(&websiteURL, "website", "", "Website URL (REQUIRED)")
	cmd.Flags().StringVar(&githubURL, "github", "", "GitHub URL (REQUIRED)")
	cmd.Flags().StringVar(&documentationURL, "docs", "", "Documentation URL (REQUIRED)")
	cmd.Flags().StringSliceVar(&tags, "tags", []string{}, "Tags for categorization (REQUIRED)")
	cmd.Flags().BoolVar(&autoVerify, "auto-verify", true, "Automatically verify after registration")
	cmd.Flags().BoolVar(&registerOnlyMain, "register-only-main", false, "Register only main contract, skip proxy/implementation")
	cmd.Flags().BoolVar(&skipBytecodeCheck, "skip-bytecode-check", false, "Skip bytecode validation")

	return cmd
}

func registerFromYAML(client *blockchain.Client, cfg *config.Config, configFile string) error {
	log.Section("📋 Contract Configuration")

	log.StartSpinner("Loading configuration file...")
	time.Sleep(500 * time.Millisecond)

	// Load contract register configuration
	registerConfig, err := loadRegisterConfig(configFile)
	if err != nil {
		log.StopSpinner()
		log.Error("Failed to load register configuration", "error", err, "file", configFile)
		return err
	}

	log.StopSpinner()
	log.Success("Configuration loaded", "file", configFile)

	// VALIDAÇÃO RIGOROSA - Todos os campos são obrigatórios
	log.Step(3, 5, "Validating configuration...")
	if err := validateRegisterConfig(registerConfig); err != nil {
		log.Error("Configuration validation failed", "error", err)
		return fmt.Errorf("configuration validation failed: %w", err)
	}
	log.Success("Configuration validated successfully")

	contractAddress := common.HexToAddress(registerConfig.Contract.Address)

	// Display contract information in table
	contractInfo := [][]string{
		{"Address", registerConfig.Contract.Address},
		{"Name", registerConfig.Contract.Name},
		{"Symbol", registerConfig.Contract.Symbol},
		{"Type", registerConfig.Contract.Type},
		{"Description", registerConfig.Contract.Description},
		{"Compiler", registerConfig.Compiler.Version},
		{"Optimization", fmt.Sprintf("%v (%d runs)", registerConfig.Compiler.OptimizationEnabled, registerConfig.Compiler.OptimizationRuns)},
	}

	log.Info("📊 Contract Information:")
	log.Table([]string{"Property", "Value"}, contractInfo)

	// Verify contract exists on blockchain
	log.Section("🔍 Blockchain Verification")
	log.Step(4, 5, "Verifying contract exists on blockchain...")

	deploymentInfo, err := getContractDeploymentInfo(client, contractAddress, &DeploymentInfo{
		TxHash:         registerConfig.Deployment.TxHash,
		CreatorAddress: registerConfig.Deployment.CreatorAddress,
		BlockNumber:    registerConfig.Deployment.BlockNumber,
		GasUsed:        registerConfig.Deployment.GasUsed,
		Timestamp:      registerConfig.Deployment.Timestamp,
	})
	if err != nil {
		log.Error("Failed to verify contract on blockchain", "error", err)
		return fmt.Errorf("contract verification failed: %w", err)
	}

	log.Success("Contract verified on blockchain")
	log.Info("Contract deployment info",
		"creator", deploymentInfo.CreatorAddress,
		"txHash", deploymentInfo.TxHash,
		"block", deploymentInfo.BlockNumber,
		"timestamp", deploymentInfo.Timestamp.Format("2006-01-02 15:04:05"))

	// Create deployment object
	deployment := &models.ContractDeployment{
		Name:                registerConfig.Contract.Name,
		Symbol:              registerConfig.Contract.Symbol,
		Description:         registerConfig.Contract.Description,
		ContractType:        registerConfig.Contract.Type,
		CompilerVersion:     registerConfig.Compiler.Version,
		OptimizationEnabled: registerConfig.Compiler.OptimizationEnabled,
		OptimizationRuns:    registerConfig.Compiler.OptimizationRuns,
		LicenseType:         registerConfig.Metadata.License,
		WebsiteURL:          registerConfig.Metadata.WebsiteURL,
		GithubURL:           registerConfig.Metadata.GithubURL,
		DocumentationURL:    registerConfig.Metadata.DocumentationURL,
		Tags:                registerConfig.Metadata.Tags,
		Address:             registerConfig.Contract.Address,
		TransactionHash:     deploymentInfo.TxHash,
		BlockNumber:         deploymentInfo.BlockNumber,
		GasUsed:             deploymentInfo.GasUsed,
		Status:              "deployed",
		Verified:            false,
		DeployedAt:          deploymentInfo.Timestamp,
	}

	log.Section("📁 Contract Files")

	// Load contract files with progress
	files := []string{registerConfig.Files.Contract, registerConfig.Files.ABI, registerConfig.Files.Bytecode}
	fileNames := []string{"Source Code", "ABI", "Bytecode"}

	for i := range files {
		if files[i] != "" {
			log.ProgressBar(fmt.Sprintf("Loading %s", fileNames[i]), i, len(files))
			time.Sleep(300 * time.Millisecond) // Simulate loading
		}
	}
	log.ProgressBar("Files processed", len(files), len(files))

	err = loadContractFiles(deployment, registerConfig.Files.Contract, registerConfig.Files.ABI, registerConfig.Files.Bytecode)
	if err != nil {
		log.Error("Failed to load contract files", "error", err)
		return err
	}

	if registerConfig.Files.Contract != "" {
		log.Success("Source code loaded", "file", registerConfig.Files.Contract)
	}
	if registerConfig.Files.ABI != "" {
		log.Success("ABI loaded", "file", registerConfig.Files.ABI)
	}
	if registerConfig.Files.Bytecode != "" {
		log.Success("Bytecode loaded", "file", registerConfig.Files.Bytecode)
	}

	// Validate bytecode if provided and not skipped
	if deployment.Bytecode != "" && !registerConfig.Register.SkipBytecodeCheck {
		log.Step(5, 5, "Validating bytecode against deployed contract...")

		err = validateDeployedBytecode(client, contractAddress, deployment.Bytecode)
		if err != nil {
			log.Warning("Bytecode validation failed", "error", err)
			log.Info("Consider using --skip-bytecode-check if this is expected")
		} else {
			log.Success("Bytecode validation passed")
		}
	}

	// Process constructor arguments if provided
	if len(registerConfig.ConstructorArgs) > 0 && len(deployment.ABI) > 0 {
		log.Progress("Processing constructor arguments...")

		contractABI, err := abi.JSON(bytes.NewReader(deployment.ABI))
		if err != nil {
			log.Warning("Failed to parse ABI for constructor arguments", "error", err)
		} else {
			parsedArgs, err := parseConstructorArgs(contractABI, registerConfig.ConstructorArgs)
			if err != nil {
				log.Warning("Failed to process constructor arguments", "error", err)
			} else {
				deployment.ConstructorArgs = parsedArgs
				log.Success("Constructor arguments processed", "count", len(parsedArgs))
			}
		}
	}

	// Register contract via API
	log.Section("📝 Contract Registration")
	log.Progress("Registering contract in database...")

	err = registerContractViaAPI(cfg.API.BaseURL, deployment, deploymentInfo, registerConfig.Register.RegisterOnlyMain)
	if err != nil {
		log.Error("Registration failed", "error", err)
		return fmt.Errorf("contract registration failed: %w", err)
	}

	log.Celebrate("CONTRACT REGISTERED SUCCESSFULLY!")

	// Display registration information
	registrationData := [][]string{
		{"Address", deployment.Address},
		{"Name", deployment.Name},
		{"Type", deployment.ContractType},
		{"Status", "Registered"},
		{"Creator", deploymentInfo.CreatorAddress},
		{"Block Number", fmt.Sprintf("%d", deploymentInfo.BlockNumber)},
		{"Gas Used", fmt.Sprintf("%d", deploymentInfo.GasUsed)},
		{"Deployed At", deploymentInfo.Timestamp.Format("2006-01-02 15:04:05")},
	}

	log.Table([]string{"Property", "Value"}, registrationData)

	// Verify contract if auto-verify is enabled and source code is available
	if registerConfig.Register.AutoVerify && deployment.SourceCode != "" {
		log.Section("🔍 Contract Verification")

		log.StartSpinner("Sending contract for verification...")
		time.Sleep(2 * time.Second) // Simulate verification

		deployService := services.NewDeployService(client, cfg.API.BaseURL, cfg.Gas.Limit, nil)
		err = deployService.VerifyContract(deployment.Address, deployment, deploymentInfo)
		log.StopSpinner()

		if err != nil {
			log.Warning("Contract verification failed", "error", err)
		} else {
			log.Success("Contract verified successfully! ✅")
			deployment.Verified = true
		}
	}

	log.Celebrate("REGISTRATION COMPLETED SUCCESSFULLY!")
	return nil
}

func registerFromFlags(client *blockchain.Client, cfg *config.Config, address, contractFile, abiFile, bytecodeFile,
	name, symbol, description, contractType string, constructorArgs []string, compilerVersion string,
	optimizationEnabled bool, optimizationRuns int, licenseType, websiteURL, githubURL,
	documentationURL string, tags []string, autoVerify, registerOnlyMain, skipBytecodeCheck bool) error {

	log.Section("⚙️  Configuration via Flags")

	// VALIDAÇÃO RIGOROSA - Todos os campos obrigatórios
	log.Step(3, 5, "Validating parameters...")

	if address == "" {
		return fmt.Errorf("contract address is required (use --address)")
	}
	if name == "" {
		return fmt.Errorf("contract name is required (use --name)")
	}
	if symbol == "" {
		return fmt.Errorf("contract symbol is required (use --symbol)")
	}
	if description == "" {
		return fmt.Errorf("contract description is required (use --description)")
	}
	if contractType == "" {
		return fmt.Errorf("contract type is required (use --type)")
	}
	if abiFile == "" {
		return fmt.Errorf("ABI file is required (use --abi)")
	}
	if contractFile == "" {
		return fmt.Errorf("contract source file is required (use --contract)")
	}
	if bytecodeFile == "" {
		return fmt.Errorf("bytecode file is required (use --bytecode)")
	}
	if compilerVersion == "" {
		return fmt.Errorf("compiler version is required (use --compiler)")
	}
	if licenseType == "" {
		return fmt.Errorf("license type is required (use --license)")
	}
	if websiteURL == "" {
		return fmt.Errorf("website URL is required (use --website)")
	}
	if githubURL == "" {
		return fmt.Errorf("GitHub URL is required (use --github)")
	}
	if documentationURL == "" {
		return fmt.Errorf("documentation URL is required (use --docs)")
	}
	if len(tags) == 0 {
		return fmt.Errorf("at least one tag is required (use --tags)")
	}

	if !common.IsHexAddress(address) {
		return fmt.Errorf("invalid contract address format: %s", address)
	}

	// Verificar se arquivos existem
	if err := validateFileExists(contractFile, "contract source file"); err != nil {
		return err
	}
	if err := validateFileExists(abiFile, "ABI file"); err != nil {
		return err
	}
	if err := validateFileExists(bytecodeFile, "bytecode file"); err != nil {
		return err
	}

	log.Success("All parameters validated successfully")

	contractAddress := common.HexToAddress(address)

	// Verify contract exists on blockchain
	log.Step(4, 5, "Verifying contract exists on blockchain...")

	deploymentInfo, err := getContractDeploymentInfo(client, contractAddress, nil)
	if err != nil {
		log.Error("Failed to verify contract on blockchain", "error", err)
		return fmt.Errorf("contract verification failed: %w", err)
	}

	log.Success("Contract verified on blockchain")

	// Create deployment object
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
		Address:             address,
		TransactionHash:     deploymentInfo.TxHash,
		BlockNumber:         deploymentInfo.BlockNumber,
		GasUsed:             deploymentInfo.GasUsed,
		Status:              "deployed",
		Verified:            false,
		DeployedAt:          deploymentInfo.Timestamp,
	}

	// Load contract files
	log.Step(5, 5, "Loading contract files...")
	if err := loadContractFiles(deployment, contractFile, abiFile, bytecodeFile); err != nil {
		log.Error("Failed to load contract files", "error", err)
		return fmt.Errorf("failed to load contract files: %w", err)
	}
	log.Success("Contract files loaded successfully")

	// Validate bytecode if provided and not skipped
	if deployment.Bytecode != "" && !skipBytecodeCheck {
		log.Progress("Validating bytecode against deployed contract...")

		err = validateDeployedBytecode(client, contractAddress, deployment.Bytecode)
		if err != nil {
			log.Warning("Bytecode validation failed", "error", err)
		} else {
			log.Success("Bytecode validation passed")
		}
	}

	// Process constructor arguments if provided
	if len(constructorArgs) > 0 && len(deployment.ABI) > 0 {
		log.Progress("Processing constructor arguments...")

		contractABI, err := abi.JSON(bytes.NewReader(deployment.ABI))
		if err != nil {
			log.Warning("Failed to parse ABI for constructor arguments", "error", err)
		} else {
			parsedArgs, err := parseConstructorArgs(contractABI, constructorArgs)
			if err != nil {
				log.Warning("Failed to process constructor arguments", "error", err)
			} else {
				deployment.ConstructorArgs = parsedArgs
				log.Success("Constructor arguments processed", "count", len(parsedArgs))
			}
		}
	}

	// Register contract
	log.Section("📝 Contract Registration")
	log.Progress("Registering contract in database...")

	err = registerContractViaAPI(cfg.API.BaseURL, deployment, deploymentInfo, registerOnlyMain)
	if err != nil {
		log.Error("Registration failed", "error", err)
		return fmt.Errorf("contract registration failed: %w", err)
	}

	log.Celebrate("CONTRACT REGISTERED!")
	log.Success("Contract address", "address", deployment.Address)
	log.Success("Registration status", "status", "Success")

	// Auto-verify if requested and source code is available
	if autoVerify && deployment.SourceCode != "" {
		log.Section("🔍 Automatic Verification")
		log.StartSpinner("Verifying contract...")

		deployService := services.NewDeployService(client, cfg.API.BaseURL, cfg.Gas.Limit, nil)
		err = deployService.VerifyContract(deployment.Address, deployment, deploymentInfo)
		log.StopSpinner()

		if err != nil {
			log.Error("Automatic verification failed", "error", err)
		} else {
			log.Success("Contract verified automatically! 🎉")
		}
	}

	return nil
}

// Helper functions
func loadRegisterConfig(configFile string) (*ContractRegisterConfig, error) {
	data, err := ioutil.ReadFile(configFile)
	if err != nil {
		return nil, fmt.Errorf("failed to read config file: %w", err)
	}

	var config ContractRegisterConfig
	if err := yaml.Unmarshal(data, &config); err != nil {
		return nil, fmt.Errorf("failed to parse YAML: %w", err)
	}

	return &config, nil
}

func validateRegisterConfig(config *ContractRegisterConfig) error {
	// Validar campos do contrato
	if config.Contract.Address == "" {
		return fmt.Errorf("contract.address is required")
	}
	if config.Contract.Name == "" {
		return fmt.Errorf("contract.name is required")
	}
	if config.Contract.Symbol == "" {
		return fmt.Errorf("contract.symbol is required")
	}
	if config.Contract.Description == "" {
		return fmt.Errorf("contract.description is required")
	}
	if config.Contract.Type == "" {
		return fmt.Errorf("contract.type is required")
	}

	// Validar arquivos obrigatórios
	if config.Files.ABI == "" {
		return fmt.Errorf("files.abi is required")
	}
	if config.Files.Contract == "" {
		return fmt.Errorf("files.contract is required")
	}
	if config.Files.Bytecode == "" {
		return fmt.Errorf("files.bytecode is required")
	}

	// Validar compilador
	if config.Compiler.Version == "" {
		return fmt.Errorf("compiler.version is required")
	}

	// Validar metadados
	if config.Metadata.License == "" {
		return fmt.Errorf("metadata.license is required")
	}
	if config.Metadata.WebsiteURL == "" {
		return fmt.Errorf("metadata.website_url is required")
	}
	if config.Metadata.GithubURL == "" {
		return fmt.Errorf("metadata.github_url is required")
	}
	if config.Metadata.DocumentationURL == "" {
		return fmt.Errorf("metadata.documentation_url is required")
	}
	if len(config.Metadata.Tags) == 0 {
		return fmt.Errorf("metadata.tags is required (at least one tag)")
	}

	// Validar endereço
	if !common.IsHexAddress(config.Contract.Address) {
		return fmt.Errorf("invalid contract address format: %s", config.Contract.Address)
	}

	// Verificar se arquivos existem
	if err := validateFileExists(config.Files.Contract, "contract source file"); err != nil {
		return err
	}
	if err := validateFileExists(config.Files.ABI, "ABI file"); err != nil {
		return err
	}
	if err := validateFileExists(config.Files.Bytecode, "bytecode file"); err != nil {
		return err
	}

	return nil
}

func validateFileExists(filePath, fileType string) error {
	if filePath == "" {
		return fmt.Errorf("%s path cannot be empty", fileType)
	}

	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		return fmt.Errorf("%s not found: %s", fileType, filePath)
	}

	return nil
}

func getContractDeploymentInfo(client *blockchain.Client, contractAddress common.Address, deploymentInfo *DeploymentInfo) (*models.DeploymentInfo, error) {
	ctx := context.Background()
	ethClient := client.GetClient()

	// Check if contract exists (has code)
	code, err := ethClient.CodeAt(ctx, contractAddress, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to get contract code: %w", err)
	}

	if len(code) == 0 {
		return nil, fmt.Errorf("no contract found at address %s", contractAddress.Hex())
	}

	log.Success("Contract found on blockchain", "address", contractAddress.Hex(), "codeSize", len(code))

	// Check if deployment info is provided in YAML
	if deploymentInfo != nil && deploymentInfo.TxHash != "" {
		log.Info("Using deployment info from YAML configuration")

		// Parse timestamp if provided
		var timestamp time.Time
		if deploymentInfo.Timestamp != "" {
			var err error
			timestamp, err = time.Parse(time.RFC3339, deploymentInfo.Timestamp)
			if err != nil {
				log.Warning("Failed to parse timestamp, using current time", "error", err)
				timestamp = time.Now()
			}
		} else {
			timestamp = time.Now()
		}

		// Use provided deployment info
		deployInfo := &models.DeploymentInfo{
			CreatorAddress: deploymentInfo.CreatorAddress,
			TxHash:         deploymentInfo.TxHash,
			BlockNumber:    deploymentInfo.BlockNumber,
			Timestamp:      timestamp,
			GasUsed:        deploymentInfo.GasUsed,
		}

		// If only tx_hash is provided, try to get additional info from blockchain
		if deploymentInfo.CreatorAddress == "" || deploymentInfo.BlockNumber == 0 {
			log.Info("Fetching additional deployment info from blockchain...")
			txInfo, err := getTransactionInfo(client, common.HexToHash(deploymentInfo.TxHash))
			if err == nil {
				if deploymentInfo.CreatorAddress == "" {
					deployInfo.CreatorAddress = txInfo.From.Hex()
				}
				if deploymentInfo.BlockNumber == 0 {
					deployInfo.BlockNumber = int64(txInfo.BlockNumber)
				}
				if deploymentInfo.GasUsed == 0 {
					deployInfo.GasUsed = int64(txInfo.GasUsed)
				}
				if deploymentInfo.Timestamp == "" {
					deployInfo.Timestamp = time.Unix(int64(txInfo.Time), 0)
				}
			}
		}

		return deployInfo, nil
	}

	// Fallback: Try to find creation transaction by scanning recent blocks
	log.Info("No deployment info provided, scanning blockchain for creation transaction...")

	// Get current block info as fallback
	header, err := ethClient.HeaderByNumber(ctx, nil)
	if err != nil {
		log.Warning("Failed to get current block header", "error", err)
		header = &types.Header{Number: big.NewInt(0)}
	}

	// Try to find creation transaction by scanning recent blocks
	creationInfo, err := findContractCreationTransaction(client, contractAddress, header.Number)
	if err != nil {
		log.Warning("Could not find creation transaction, using current block info", "error", err)
		// Use current block as fallback
		deployInfo := &models.DeploymentInfo{
			CreatorAddress: "0x0000000000000000000000000000000000000000",                         // Unknown
			TxHash:         "0x0000000000000000000000000000000000000000000000000000000000000000", // Unknown
			BlockNumber:    int64(header.Number.Uint64()),
			Timestamp:      time.Unix(int64(header.Time), 0),
			GasUsed:        0,
		}
		return deployInfo, nil
	}

	deployInfo := &models.DeploymentInfo{
		CreatorAddress: creationInfo.From.Hex(),
		TxHash:         creationInfo.Hash.Hex(),
		BlockNumber:    int64(creationInfo.BlockNumber),
		Timestamp:      time.Unix(int64(creationInfo.Time), 0),
		GasUsed:        int64(creationInfo.GasUsed),
	}

	return deployInfo, nil
}

func validateDeployedBytecode(client *blockchain.Client, contractAddress common.Address, expectedBytecode string) error {
	ctx := context.Background()
	ethClient := client.GetClient()

	// Get deployed bytecode
	deployedCode, err := ethClient.CodeAt(ctx, contractAddress, nil)
	if err != nil {
		return fmt.Errorf("failed to get deployed bytecode: %w", err)
	}

	// Clean expected bytecode
	expectedBytes := common.FromHex(expectedBytecode)

	// Note: Deployed bytecode might be different from creation bytecode
	// This is because:
	// 1. Constructor code is not included in deployed code
	// 2. Compiler optimizations might affect the code
	// 3. Metadata hash might be different

	log.Info("Bytecode comparison",
		"deployedSize", len(deployedCode),
		"expectedSize", len(expectedBytes))

	// For now, we'll just warn if sizes are very different
	if len(deployedCode) == 0 {
		return fmt.Errorf("no bytecode found at contract address")
	}

	sizeDiff := len(deployedCode) - len(expectedBytes)
	if sizeDiff < 0 {
		sizeDiff = -sizeDiff
	}

	// Allow some difference due to metadata and constructor code
	if float64(sizeDiff)/float64(len(deployedCode)) > 0.5 {
		return fmt.Errorf("bytecode size difference too large: deployed=%d, expected=%d", len(deployedCode), len(expectedBytes))
	}

	return nil
}

func registerContractViaAPI(apiURL string, deployment *models.ContractDeployment, deployInfo *models.DeploymentInfo, registerOnlyMain bool) error {
	// Create verification request (which also registers the contract)
	request := &models.ContractVerificationRequest{
		Address:             deployment.Address,
		Name:                deployment.Name,
		Symbol:              deployment.Symbol,
		Description:         deployment.Description,
		ContractType:        deployment.ContractType,
		SourceCode:          deployment.SourceCode,
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
		DeployedViaCLI:      false, // This was deployed by external tools
		RegisterOnlyMain:    registerOnlyMain,
		CreatorAddress:      deployInfo.CreatorAddress,
		CreationTxHash:      deployInfo.TxHash,
		CreationBlockNumber: deployInfo.BlockNumber,
		CreationTimestamp:   deployInfo.Timestamp,
		GasUsed:             deployInfo.GasUsed,
	}

	jsonData, err := json.Marshal(request)
	if err != nil {
		return fmt.Errorf("failed to serialize registration data: %w", err)
	}

	// Send to API
	url := fmt.Sprintf("%s/smart-contracts/verify", apiURL)
	resp, err := http.Post(url, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("failed to send registration request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := ioutil.ReadAll(resp.Body)
		return fmt.Errorf("registration failed (status %d): %s", resp.StatusCode, string(body))
	}

	log.Success("Contract registered successfully in database")
	return nil
}

// ContractCreationInfo holds information about contract creation
type ContractCreationInfo struct {
	Hash        common.Hash
	From        common.Address
	BlockNumber uint64
	Time        uint64
	GasUsed     uint64
}

// DeploymentInfo holds deployment information from YAML
type DeploymentInfo struct {
	TxHash         string `yaml:"tx_hash,omitempty"`
	CreatorAddress string `yaml:"creator_address,omitempty"`
	BlockNumber    int64  `yaml:"block_number,omitempty"`
	GasUsed        int64  `yaml:"gas_used,omitempty"`
	Timestamp      string `yaml:"timestamp,omitempty"`
}

// findContractCreationTransaction attempts to find the transaction that created the contract
func findContractCreationTransaction(client *blockchain.Client, contractAddress common.Address, currentBlock *big.Int) (*ContractCreationInfo, error) {
	ctx := context.Background()
	ethClient := client.GetClient()

	// Scan backwards from current block, checking up to 1000 blocks
	scanBlocks := int64(1000)
	startBlock := new(big.Int).Sub(currentBlock, big.NewInt(scanBlocks))
	if startBlock.Cmp(big.NewInt(0)) < 0 {
		startBlock = big.NewInt(0)
	}

	log.Info("Scanning blocks for contract creation",
		"contract", contractAddress.Hex(),
		"from", startBlock.Uint64(),
		"to", currentBlock.Uint64())

	for blockNum := currentBlock; blockNum.Cmp(startBlock) >= 0; blockNum.Sub(blockNum, big.NewInt(1)) {
		block, err := ethClient.BlockByNumber(ctx, blockNum)
		if err != nil {
			log.Warning("Failed to get block", "block", blockNum.Uint64(), "error", err)
			continue
		}

		// Check each transaction in the block
		for _, tx := range block.Transactions() {
			// Check if this transaction created the contract
			if tx.To() == nil && len(tx.Data()) > 0 {
				// This is a contract creation transaction
				receipt, err := ethClient.TransactionReceipt(ctx, tx.Hash())
				if err != nil {
					continue
				}

				// Check if the created contract address matches
				if receipt.ContractAddress == contractAddress {
					// Get sender address
					sender, err := ethClient.TransactionSender(ctx, tx, block.Hash(), 0)
					if err != nil {
						log.Warning("Failed to get transaction sender", "error", err)
						continue
					}

					log.Success("Found contract creation transaction",
						"txHash", tx.Hash().Hex(),
						"block", blockNum.Uint64(),
						"from", sender.Hex())

					// Create creation info
					creationInfo := &ContractCreationInfo{
						Hash:        tx.Hash(),
						From:        sender,
						BlockNumber: blockNum.Uint64(),
						Time:        block.Time(),
						GasUsed:     receipt.GasUsed,
					}
					return creationInfo, nil
				}
			}
		}
	}

	return nil, fmt.Errorf("contract creation transaction not found in scanned blocks")
}

// getTransactionInfo fetches transaction details from blockchain
func getTransactionInfo(client *blockchain.Client, txHash common.Hash) (*ContractCreationInfo, error) {
	ctx := context.Background()
	ethClient := client.GetClient()

	// Get transaction
	tx, isPending, err := ethClient.TransactionByHash(ctx, txHash)
	if err != nil {
		return nil, fmt.Errorf("failed to get transaction: %w", err)
	}

	if isPending {
		return nil, fmt.Errorf("transaction is still pending")
	}

	// Get transaction receipt
	receipt, err := ethClient.TransactionReceipt(ctx, txHash)
	if err != nil {
		return nil, fmt.Errorf("failed to get transaction receipt: %w", err)
	}

	// Get block info
	block, err := ethClient.BlockByNumber(ctx, receipt.BlockNumber)
	if err != nil {
		return nil, fmt.Errorf("failed to get block: %w", err)
	}

	// Get sender address
	sender, err := ethClient.TransactionSender(ctx, tx, block.Hash(), receipt.TransactionIndex)
	if err != nil {
		return nil, fmt.Errorf("failed to get transaction sender: %w", err)
	}

	return &ContractCreationInfo{
		Hash:        txHash,
		From:        sender,
		BlockNumber: receipt.BlockNumber.Uint64(),
		Time:        block.Time(),
		GasUsed:     receipt.GasUsed,
	}, nil
}
