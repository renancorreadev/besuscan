package main

import (
	"bufio"
	"bytes"
	"context"
	"crypto/ecdsa"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"math/big"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"
	"github.com/spf13/cobra"
	"github.com/spf13/viper"
	"gopkg.in/yaml.v3"
)

// ContractDeployment representa um deployment de contrato
type ContractDeployment struct {
	Name                string                 `json:"name"`
	Symbol              string                 `json:"symbol,omitempty"`
	Description         string                 `json:"description"`
	ContractType        string                 `json:"contract_type"`
	SourceCode          string                 `json:"source_code"`
	ABI                 json.RawMessage        `json:"abi"`
	Bytecode            string                 `json:"bytecode"`
	ConstructorArgs     []interface{}          `json:"constructor_args"`
	CompilerVersion     string                 `json:"compiler_version"`
	OptimizationEnabled bool                   `json:"optimization_enabled"`
	OptimizationRuns    int                    `json:"optimization_runs"`
	LicenseType         string                 `json:"license_type"`
	WebsiteURL          string                 `json:"website_url,omitempty"`
	GithubURL           string                 `json:"github_url,omitempty"`
	DocumentationURL    string                 `json:"documentation_url,omitempty"`
	Tags                []string               `json:"tags"`
	Metadata            map[string]interface{} `json:"metadata"`
}

// ContractConfig representa a configuração de deploy via YAML
type ContractConfig struct {
	Contract struct {
		Name        string `yaml:"name"`
		Symbol      string `yaml:"symbol"`
		Description string `yaml:"description"`
		Type        string `yaml:"type"`
	} `yaml:"contract"`

	Files struct {
		Contract string `yaml:"contract,omitempty"` // Opcional
		ABI      string `yaml:"abi"`
		Bytecode string `yaml:"bytecode"`
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

	Deploy struct {
		AutoVerify     bool `yaml:"auto_verify"`
		SaveDeployment bool `yaml:"save_deployment"`
	} `yaml:"deploy"`

	Gas struct {
		Limit uint64 `yaml:"limit"`
		Price string `yaml:"price"`
	} `yaml:"gas"`
}

// ContractVerificationRequest representa uma requisição de verificação
type ContractVerificationRequest struct {
	Address             string                 `json:"address"`
	Name                string                 `json:"name"`
	Symbol              string                 `json:"symbol,omitempty"`
	Description         string                 `json:"description"`
	ContractType        string                 `json:"contract_type"`
	SourceCode          string                 `json:"source_code"`
	ABI                 json.RawMessage        `json:"abi"`
	Bytecode            string                 `json:"bytecode"`
	ConstructorArgs     []interface{}          `json:"constructor_args"`
	CompilerVersion     string                 `json:"compiler_version"`
	OptimizationEnabled bool                   `json:"optimization_enabled"`
	OptimizationRuns    int                    `json:"optimization_runs"`
	LicenseType         string                 `json:"license_type"`
	WebsiteURL          string                 `json:"website_url,omitempty"`
	GithubURL           string                 `json:"github_url,omitempty"`
	DocumentationURL    string                 `json:"documentation_url,omitempty"`
	Tags                []string               `json:"tags"`
	Metadata            map[string]interface{} `json:"metadata"`
	// Informações do deploy (quando disponíveis)
	CreatorAddress      string    `json:"creator_address,omitempty"`
	CreationTxHash      string    `json:"creation_tx_hash,omitempty"`
	CreationBlockNumber int64     `json:"creation_block_number,omitempty"`
	CreationTimestamp   time.Time `json:"creation_timestamp,omitempty"`
	GasUsed             int64     `json:"gas_used,omitempty"`
}

var (
	// Configurações globais
	ethClient   *ethclient.Client
	privateKey  *ecdsa.PrivateKey
	fromAddress common.Address
	apiBaseURL  string
	networkName string
	gasLimit    uint64
	gasPrice    *big.Int
)

func main() {
	var rootCmd = &cobra.Command{
		Use:   "besucli",
		Short: "BesuCLI - BesuScan Command Line Interface",
		Long: `
BesuCLI é uma ferramenta poderosa para:
- Deploy de smart contracts no Hyperledger Besu
- Verificação automática de contratos
- Gerenciamento de metadados e templates
- Interação com contratos deployados
- Integração completa com o BesuScan Explorer

Exemplos de uso:
  besucli deploy token.yml                    # Deploy via YAML
  besucli validate counter.yml               # Validar contrato
  besucli interact read 0x123... balanceOf   # Ler função
  besucli list --verified                    # Listar contratos verificados
		`,
	}

	// Comandos principais
	rootCmd.AddCommand(
		deployCmd(),
		verifyCmd(),
		interactCmd(),
		listCmd(),
		configCmd(),
		validateCmd(),
	)

	// Configuração global
	cobra.OnInitialize(initConfig)

	if err := rootCmd.Execute(); err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
}

// initConfig inicializa a configuração
func initConfig() {
	viper.SetConfigName("besucli")
	viper.SetConfigType("yaml")
	viper.AddConfigPath(".")
	viper.AddConfigPath("$HOME")
	viper.AddConfigPath("$HOME/.config/besucli")

	// Valores padrão
	viper.SetDefault("network.rpc_url", "http://144.22.179.183")
	viper.SetDefault("network.name", "besu-local")
	viper.SetDefault("api.base_url", "http://localhost:8080/api")
	viper.SetDefault("gas.limit", 300000)
	viper.SetDefault("gas.price", "20000000000") // 20 gwei

	if err := viper.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); ok {
			// Arquivo de config não encontrado, usar valores padrão
			log.Println("⚠️ Arquivo de configuração não encontrado, usando valores padrão")
			log.Println("💡 Execute 'besucli config set-wallet' para configurar")
		} else {
			log.Fatalf("❌ Erro ao ler arquivo de configuração: %v", err)
		}
	} else {
		log.Printf("📁 Usando configuração: %s", viper.ConfigFileUsed())
	}

	// Inicializar conexões
	initConnections()
}

// initConnections inicializa as conexões com blockchain e API
func initConnections() {
	// Conectar ao nó Ethereum/Besu
	rpcURL := viper.GetString("network.rpc_url")
	client, err := ethclient.Dial(rpcURL)
	if err != nil {
		log.Fatalf("❌ Erro ao conectar ao nó: %v", err)
	}
	ethClient = client

	// Configurar chave privada se fornecida
	privateKeyHex := viper.GetString("wallet.private_key")
	if privateKeyHex != "" {
		key, err := crypto.HexToECDSA(privateKeyHex)
		if err != nil {
			log.Fatalf("❌ Erro ao carregar chave privada: %v", err)
		}
		privateKey = key
		fromAddress = crypto.PubkeyToAddress(key.PublicKey)
	}

	// Configurações globais
	apiBaseURL = viper.GetString("api.base_url")
	networkName = viper.GetString("network.name")
	gasLimit = viper.GetUint64("gas.limit")

	gasPriceStr := viper.GetString("gas.price")
	gasPrice, _ = new(big.Int).SetString(gasPriceStr, 10)

	log.Printf("✅ Conectado ao nó: %s", rpcURL)
	log.Printf("✅ API Base URL: %s", apiBaseURL)
	if privateKey != nil {
		log.Printf("✅ Endereço da carteira: %s", fromAddress.Hex())
	}
}

// deployCmd comando para deploy de contratos
func deployCmd() *cobra.Command {
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
		Short: "Deploy um smart contract",
		Long: `
Deploy um smart contract no Hyperledger Besu com verificação automática.

Modo YAML (recomendado):
  contract deploy token.yml
  contract deploy templates/counter.yml

Modo tradicional com flags:
  contract deploy --contract MyToken.sol --name "My Token" --symbol "MTK" --type ERC-20
		`,
		Run: func(cmd *cobra.Command, args []string) {
			if privateKey == nil {
				log.Fatal("❌ Chave privada não configurada. Use 'contract config set-wallet' primeiro")
			}

			// Verificar se o primeiro argumento é um arquivo YAML
			if len(args) == 1 {
				configFile := args[0]
				if strings.HasSuffix(strings.ToLower(configFile), ".yml") || strings.HasSuffix(strings.ToLower(configFile), ".yaml") {
					// Modo YAML
					deployFromYAML(configFile)
					return
				}
			}

			// Modo tradicional com flags
			deployFromFlags(contractFile, abiFile, bytecodeFile, name, symbol, description,
				contractType, constructorArgs, compilerVersion, optimizationEnabled,
				optimizationRuns, licenseType, websiteURL, githubURL, documentationURL,
				tags, autoVerify)
		},
	}

	cmd.Flags().StringVar(&contractFile, "contract", "", "Arquivo .sol do contrato")
	cmd.Flags().StringVar(&abiFile, "abi", "", "Arquivo .abi do contrato")
	cmd.Flags().StringVar(&bytecodeFile, "bytecode", "", "Arquivo .bin com bytecode")
	cmd.Flags().StringVar(&name, "name", "", "Nome do contrato (obrigatório para modo flags)")
	cmd.Flags().StringVar(&symbol, "symbol", "", "Símbolo do token (para tokens)")
	cmd.Flags().StringVar(&description, "description", "", "Descrição do contrato")
	cmd.Flags().StringVar(&contractType, "type", "Unknown", "Tipo do contrato (ERC-20, ERC-721, DeFi, etc.)")
	cmd.Flags().StringSliceVar(&constructorArgs, "args", []string{}, "Argumentos do construtor")
	cmd.Flags().StringVar(&compilerVersion, "compiler", "v0.8.19", "Versão do compilador Solidity")
	cmd.Flags().BoolVar(&optimizationEnabled, "optimization", true, "Otimização habilitada")
	cmd.Flags().IntVar(&optimizationRuns, "optimization-runs", 200, "Número de runs de otimização")
	cmd.Flags().StringVar(&licenseType, "license", "MIT", "Tipo de licença")
	cmd.Flags().StringVar(&websiteURL, "website", "", "URL do website")
	cmd.Flags().StringVar(&githubURL, "github", "", "URL do GitHub")
	cmd.Flags().StringVar(&documentationURL, "docs", "", "URL da documentação")
	cmd.Flags().StringSliceVar(&tags, "tags", []string{}, "Tags para categorização")
	cmd.Flags().BoolVar(&autoVerify, "auto-verify", true, "Verificar automaticamente após deploy")

	return cmd
}

// verifyCmd comando para verificar contratos existentes
func verifyCmd() *cobra.Command {
	var (
		address             string
		contractFile        string
		abiFile             string
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
	)

	cmd := &cobra.Command{
		Use:   "verify",
		Short: "Verificar um smart contract existente",
		Long: `
Verificar um smart contract já deployado fornecendo o código fonte e metadados.

Exemplos:
  contract-cli verify --address 0x123... --contract MyToken.sol --name "My Token"
  contract-cli verify --address 0x123... --abi token.abi --name "Custom Token"
		`,
		Run: func(cmd *cobra.Command, args []string) {
			if address == "" {
				log.Fatal("❌ Endereço do contrato é obrigatório")
			}

			deployment := &ContractDeployment{
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

			// Carregar arquivos do contrato
			if err := loadContractFiles(deployment, contractFile, abiFile, ""); err != nil {
				log.Fatalf("❌ Erro ao carregar arquivos do contrato: %v", err)
			}

			// Processar argumentos do construtor
			if len(constructorArgs) > 0 {
				// Parse do ABI para converter argumentos corretamente
				contractABI, err := abi.JSON(bytes.NewReader(deployment.ABI))
				if err != nil {
					log.Fatalf("❌ Erro ao parsear ABI para argumentos: %v", err)
				}

				parsedArgs, err := parseConstructorArgs(contractABI, constructorArgs)
				if err != nil {
					log.Fatalf("❌ Erro ao processar argumentos do construtor: %v", err)
				}
				deployment.ConstructorArgs = parsedArgs
			}

			// Verificar contrato
			if err := verifyContract(address, deployment, nil); err != nil {
				log.Fatalf("❌ Erro na verificação: %v", err)
			}

			log.Printf("✅ Contrato %s verificado com sucesso!", address)
		},
	}

	cmd.Flags().StringVar(&address, "address", "", "Endereço do contrato (obrigatório)")
	cmd.Flags().StringVar(&contractFile, "contract", "", "Arquivo .sol do contrato")
	cmd.Flags().StringVar(&abiFile, "abi", "", "Arquivo .abi do contrato")
	cmd.Flags().StringVar(&name, "name", "", "Nome do contrato (obrigatório)")
	cmd.Flags().StringVar(&symbol, "symbol", "", "Símbolo do token (para tokens)")
	cmd.Flags().StringVar(&description, "description", "", "Descrição do contrato")
	cmd.Flags().StringVar(&contractType, "type", "Unknown", "Tipo do contrato")
	cmd.Flags().StringSliceVar(&constructorArgs, "args", []string{}, "Argumentos do construtor")
	cmd.Flags().StringVar(&compilerVersion, "compiler", "v0.8.19", "Versão do compilador")
	cmd.Flags().BoolVar(&optimizationEnabled, "optimization", true, "Otimização habilitada")
	cmd.Flags().IntVar(&optimizationRuns, "optimization-runs", 200, "Número de runs de otimização")
	cmd.Flags().StringVar(&licenseType, "license", "MIT", "Tipo de licença")
	cmd.Flags().StringVar(&websiteURL, "website", "", "URL do website")
	cmd.Flags().StringVar(&githubURL, "github", "", "URL do GitHub")
	cmd.Flags().StringVar(&documentationURL, "docs", "", "URL da documentação")
	cmd.Flags().StringSliceVar(&tags, "tags", []string{}, "Tags para categorização")

	cmd.MarkFlagRequired("address")
	cmd.MarkFlagRequired("name")

	return cmd
}

// interactCmd comando para interagir com contratos
func interactCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "interact",
		Short: "Interagir com smart contracts",
		Long:  "Chamar funções de smart contracts deployados",
	}

	// Subcomandos para diferentes tipos de interação
	cmd.AddCommand(
		readFunctionCmd(),
		writeFunctionCmd(),
		getFunctionsCmd(),
	)

	return cmd
}

// listCmd comando para listar contratos
func listCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "list",
		Short: "Listar smart contracts",
		Long:  "Listar smart contracts deployados e verificados",
		Run: func(cmd *cobra.Command, args []string) {
			contracts, err := listContracts()
			if err != nil {
				log.Fatalf("❌ Erro ao listar contratos: %v", err)
			}

			if len(contracts) == 0 {
				log.Println("📭 Nenhum contrato encontrado")
				return
			}

			log.Printf("📋 Encontrados %d contratos:\n", len(contracts))
			for i, contract := range contracts {
				log.Printf("%d. %s (%s)", i+1, contract["name"], contract["address"])
				if contractType, ok := contract["type"]; ok {
					log.Printf("   Tipo: %s", contractType)
				}
				if verified, ok := contract["verified"].(bool); ok && verified {
					log.Printf("   ✅ Verificado")
				}
				log.Println()
			}
		},
	}

	return cmd
}

// configCmd comando para configuração
func configCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "config",
		Short: "Configurar CLI",
		Long:  "Gerenciar configurações do CLI",
	}

	cmd.AddCommand(
		setWalletCmd(),
		setNetworkCmd(),
		showConfigCmd(),
	)

	return cmd
}

// validateCmd comando para validar os arquivos do contrato antes do deploy
func validateCmd() *cobra.Command {
	var (
		contractFile        string
		abiFile             string
		bytecodeFile        string
		name                string
		symbol              string
		description         string
		contractType        string
		compilerVersion     string
		optimizationEnabled bool
		optimizationRuns    int
		licenseType         string
		websiteURL          string
		githubURL           string
		documentationURL    string
		tags                []string
	)

	cmd := &cobra.Command{
		Use:   "validate [config-file | flags]",
		Short: "Validar arquivos do contrato antes do deploy",
		Long: `
Validar os arquivos do contrato antes de fazer o deploy.

Modo YAML (recomendado):
  contract validate token.yml
  contract validate templates/counter.yml

Modo tradicional com flags:
  contract validate --contract MyToken.sol --name "My Token" --type ERC-20
		`,
		Run: func(cmd *cobra.Command, args []string) {
			if privateKey == nil {
				log.Fatal("❌ Chave privada não configurada. Use 'contract config set-wallet' primeiro")
			}

			// Verificar se o primeiro argumento é um arquivo YAML
			if len(args) == 1 {
				configFile := args[0]
				if strings.HasSuffix(strings.ToLower(configFile), ".yml") || strings.HasSuffix(strings.ToLower(configFile), ".yaml") {
					// Modo YAML
					validateFromYAML(configFile)
					return
				}
			}

			// Modo tradicional com flags
			validateFromFlags(contractFile, abiFile, bytecodeFile, name, symbol, description,
				contractType, compilerVersion, optimizationEnabled, optimizationRuns,
				licenseType, websiteURL, githubURL, documentationURL, tags)
		},
	}

	cmd.Flags().StringVar(&contractFile, "contract", "", "Arquivo .sol do contrato")
	cmd.Flags().StringVar(&abiFile, "abi", "", "Arquivo .abi do contrato")
	cmd.Flags().StringVar(&bytecodeFile, "bytecode", "", "Arquivo .bin com bytecode")
	cmd.Flags().StringVar(&name, "name", "", "Nome do contrato (obrigatório para modo flags)")
	cmd.Flags().StringVar(&symbol, "symbol", "", "Símbolo do token (para tokens)")
	cmd.Flags().StringVar(&description, "description", "", "Descrição do contrato")
	cmd.Flags().StringVar(&contractType, "type", "Unknown", "Tipo do contrato")
	cmd.Flags().StringVar(&compilerVersion, "compiler", "v0.8.19", "Versão do compilador")
	cmd.Flags().BoolVar(&optimizationEnabled, "optimization", true, "Otimização habilitada")
	cmd.Flags().IntVar(&optimizationRuns, "optimization-runs", 200, "Número de runs de otimização")
	cmd.Flags().StringVar(&licenseType, "license", "MIT", "Tipo de licença")
	cmd.Flags().StringVar(&websiteURL, "website", "", "URL do website")
	cmd.Flags().StringVar(&githubURL, "github", "", "URL do GitHub")
	cmd.Flags().StringVar(&documentationURL, "docs", "", "URL da documentação")
	cmd.Flags().StringSliceVar(&tags, "tags", []string{}, "Tags para categorização")

	return cmd
}

// Implementações das funções auxiliares...

// loadContractFiles carrega os arquivos do contrato
func loadContractFiles(deployment *ContractDeployment, contractFile, abiFile, bytecodeFile string) error {
	// Implementar carregamento de arquivos .sol, .abi, .bin
	// Esta função seria responsável por:
	// 1. Ler arquivos Solidity e compilar se necessário
	// 2. Extrair ABI e bytecode
	// 3. Detectar tipo de contrato automaticamente
	// 4. Validar arquivos

	log.Println("🔄 Carregando arquivos do contrato...")

	if contractFile != "" {
		// Carregar e compilar arquivo .sol (opcional)
		sourceCode, err := ioutil.ReadFile(contractFile)
		if err != nil {
			return fmt.Errorf("erro ao ler arquivo do contrato: %w", err)
		}
		deployment.SourceCode = string(sourceCode)
		log.Printf("📄 Código fonte carregado: %s", contractFile)
	} else {
		log.Println("📄 Nenhum arquivo de código fonte fornecido (opcional)")
	}

	if abiFile != "" {
		// Carregar arquivo .abi (obrigatório)
		abiData, err := ioutil.ReadFile(abiFile)
		if err != nil {
			return fmt.Errorf("erro ao ler arquivo ABI: %w", err)
		}
		deployment.ABI = json.RawMessage(abiData)
		log.Printf("📋 ABI carregado: %s", abiFile)
	} else {
		return fmt.Errorf("arquivo ABI é obrigatório")
	}

	if bytecodeFile != "" {
		// Carregar arquivo .bin (obrigatório)
		bytecodeData, err := ioutil.ReadFile(bytecodeFile)
		if err != nil {
			return fmt.Errorf("erro ao ler arquivo bytecode: %w", err)
		}
		deployment.Bytecode = strings.TrimSpace(string(bytecodeData))
		log.Printf("📦 Bytecode carregado: %s (%d bytes)", bytecodeFile, len(deployment.Bytecode))
	} else {
		return fmt.Errorf("arquivo bytecode é obrigatório")
	}

	return nil
}

// loadContractConfig carrega configuração do arquivo YAML
func loadContractConfig(configFile string) (*ContractConfig, error) {
	log.Printf("📁 Carregando configuração: %s", configFile)

	// Ler arquivo YAML
	data, err := ioutil.ReadFile(configFile)
	if err != nil {
		return nil, fmt.Errorf("erro ao ler arquivo de configuração: %w", err)
	}

	// Substituir placeholders
	dataStr := string(data)
	if strings.Contains(dataStr, "{{wallet_address}}") {
		if fromAddress == (common.Address{}) {
			return nil, fmt.Errorf("{{wallet_address}} encontrado no YAML mas carteira não configurada")
		}
		dataStr = strings.ReplaceAll(dataStr, "{{wallet_address}}", fromAddress.Hex())
		log.Printf("🔑 Substituindo {{wallet_address}} por: %s", fromAddress.Hex())
	}

	// Parse YAML
	var config ContractConfig
	if err := yaml.Unmarshal([]byte(dataStr), &config); err != nil {
		return nil, fmt.Errorf("erro ao parsear YAML: %w", err)
	}

	// Validar configuração obrigatória
	if config.Contract.Name == "" {
		return nil, fmt.Errorf("nome do contrato é obrigatório")
	}

	if config.Files.ABI == "" || config.Files.Bytecode == "" {
		return nil, fmt.Errorf("arquivos ABI e bytecode são obrigatórios")
	}

	// Aplicar valores padrão se não especificados
	if config.Compiler.Version == "" {
		config.Compiler.Version = "v0.8.19"
	}

	if config.Compiler.OptimizationRuns == 0 {
		config.Compiler.OptimizationRuns = 200
	}

	if config.Metadata.License == "" {
		config.Metadata.License = "MIT"
	}

	// Valores padrão para deploy
	if !config.Deploy.AutoVerify {
		config.Deploy.AutoVerify = true // Padrão é true
	}

	if !config.Deploy.SaveDeployment {
		config.Deploy.SaveDeployment = true // Padrão é true
	}

	log.Printf("✅ Configuração carregada: %s (%s)", config.Contract.Name, config.Contract.Type)
	log.Printf("📦 Arquivos: ABI=%s, Bytecode=%s", config.Files.ABI, config.Files.Bytecode)

	if len(config.ConstructorArgs) > 0 {
		log.Printf("🔧 Argumentos do construtor: %d argumentos", len(config.ConstructorArgs))
		for i, arg := range config.ConstructorArgs {
			log.Printf("  %d: %s", i+1, arg)
		}
	}

	return &config, nil
}

// deployContract faz o deploy do contrato
func deployContract(deployment *ContractDeployment) (string, string, *DeploymentInfo, error) {
	log.Println("🚀 Iniciando deploy do contrato...")

	// Parse do ABI
	contractABI, err := abi.JSON(bytes.NewReader(deployment.ABI))
	if err != nil {
		return "", "", nil, fmt.Errorf("erro ao parsear ABI: %w", err)
	}

	// Preparar bytecode
	bytecode := common.FromHex(deployment.Bytecode)
	log.Printf("📦 Bytecode carregado: %d bytes", len(bytecode))

	// Detectar Chain ID automaticamente
	chainID, err := ethClient.NetworkID(context.Background())
	if err != nil {
		log.Printf("⚠️ Erro ao detectar Chain ID, usando padrão: %v", err)
		chainID = big.NewInt(1337) // Fallback para Besu local
	}
	log.Printf("🔗 Chain ID detectado: %s", chainID.String())

	// Verificar saldo da conta
	balance, err := ethClient.BalanceAt(context.Background(), fromAddress, nil)
	if err != nil {
		log.Printf("⚠️ Erro ao verificar saldo: %v", err)
	} else {
		log.Printf("💰 Saldo da conta: %s ETH", formatEther(balance))
	}

	// Configurar transactor
	auth, err := bind.NewKeyedTransactorWithChainID(privateKey, chainID)
	if err != nil {
		return "", "", nil, fmt.Errorf("erro ao criar transactor: %w", err)
	}

	// Configurar gas
	gasLimit := viper.GetUint64("gas.limit")
	if gasLimit == 0 {
		gasLimit = 1000000 // Padrão
	}

	gasPriceStr := viper.GetString("gas.price")
	if gasPriceStr == "0" || gasPriceStr == "" {
		// Gas gratuito - usar transação legacy OBRIGATÓRIO para Besu
		auth.GasPrice = big.NewInt(0)
		auth.GasLimit = gasLimit
		// IMPORTANTE: Desabilitar EIP-1559 para forçar modo legacy
		auth.GasFeeCap = nil
		auth.GasTipCap = nil
		log.Println("⛽ Usando gas gratuito (legacy mode - Besu)")
	} else {
		// Gas pago - usar configuração normal mas ainda legacy
		gasPrice, ok := new(big.Int).SetString(gasPriceStr, 10)
		if !ok {
			gasPrice = big.NewInt(20000000000) // 20 gwei padrão
		}
		auth.GasPrice = gasPrice
		auth.GasLimit = gasLimit
		// IMPORTANTE: Desabilitar EIP-1559 para forçar modo legacy
		auth.GasFeeCap = nil
		auth.GasTipCap = nil
		log.Printf("⛽ Gas Price: %s wei, Gas Limit: %d (legacy mode)", gasPrice.String(), gasLimit)
	}

	// Verificar nonce
	nonce, err := ethClient.PendingNonceAt(context.Background(), fromAddress)
	if err != nil {
		log.Printf("⚠️ Erro ao obter nonce: %v", err)
	} else {
		log.Printf("🔢 Nonce atual: %d", nonce)
		auth.Nonce = big.NewInt(int64(nonce))
	}

	// Log dos argumentos do construtor
	if len(deployment.ConstructorArgs) > 0 {
		log.Printf("🔧 Argumentos do construtor: %v", deployment.ConstructorArgs)
	} else {
		log.Println("🔧 Nenhum argumento do construtor")
	}

	// Fazer deploy
	log.Println("📤 Enviando transação de deploy...")
	address, tx, _, err := bind.DeployContract(auth, contractABI, bytecode, ethClient, deployment.ConstructorArgs...)
	if err != nil {
		return "", "", nil, fmt.Errorf("erro no deploy: %w", err)
	}

	log.Printf("📍 Endereço do contrato: %s", address.Hex())
	log.Printf("🔗 Hash da transação: %s", tx.Hash().Hex())
	log.Printf("⛽ Gas Price usado: %s wei", tx.GasPrice().String())
	log.Printf("⛽ Gas Limit usado: %d", tx.Gas())

	// Aguardar confirmação
	log.Println("⏳ Aguardando confirmação da transação...")
	receipt, err := bind.WaitMined(context.Background(), ethClient, tx)
	if err != nil {
		return "", "", nil, fmt.Errorf("erro ao aguardar confirmação: %w", err)
	}

	log.Printf("📋 Status da transação: %d", receipt.Status)
	log.Printf("🎯 Bloco: %d", receipt.BlockNumber.Uint64())
	log.Printf("⛽ Gas usado: %d", receipt.GasUsed)

	if receipt.Status != types.ReceiptStatusSuccessful {
		// Tentar obter mais detalhes do erro
		log.Println("🔍 Analisando falha da transação...")

		// Verificar logs de erro
		if len(receipt.Logs) > 0 {
			log.Printf("📋 Logs da transação: %d logs encontrados", len(receipt.Logs))
			for i, logEntry := range receipt.Logs {
				log.Printf("  Log %d: Address=%s, Topics=%d", i, logEntry.Address.Hex(), len(logEntry.Topics))
			}
		}

		// Tentar obter o erro específico usando debug_traceTransaction
		log.Println("🔍 Tentando obter trace da transação...")
		traceResult, err := getTransactionTrace(tx.Hash().Hex())
		if err != nil {
			log.Printf("⚠️ Erro ao obter trace: %v", err)
		} else if traceResult != "" {
			log.Printf("🚨 Trace da transação: %s", traceResult)
		}

		// Tentar simular a transação para obter erro específico
		log.Println("🔍 Simulando transação para obter erro...")
		callMsg := ethereum.CallMsg{
			From:     fromAddress,
			To:       nil, // Deploy
			Gas:      tx.Gas(),
			GasPrice: tx.GasPrice(),
			Value:    tx.Value(),
			Data:     tx.Data(),
		}

		_, err = ethClient.CallContract(context.Background(), callMsg, receipt.BlockNumber)
		if err != nil {
			log.Printf("🚨 Erro simulado: %v", err)
		}

		// Tentar obter o revert reason
		revertReason, err := getRevertReason(tx.Hash().Hex())
		if err != nil {
			log.Printf("⚠️ Erro ao obter revert reason: %v", err)
		} else if revertReason != "" {
			log.Printf("🚨 Revert reason: %s", revertReason)
		}

		return "", "", nil, fmt.Errorf("transação falhou - status: %d. Gas usado: %d/%d. Verifique: 1) Bytecode válido, 2) Gas suficiente, 3) Argumentos corretos", receipt.Status, receipt.GasUsed, tx.Gas())
	}

	log.Printf("🎉 Deploy confirmado no bloco: %d", receipt.BlockNumber.Uint64())
	log.Printf("⛽ Gas usado: %d", receipt.GasUsed)

	// Buscar informações do bloco para timestamp
	block, err := ethClient.BlockByHash(context.Background(), receipt.BlockHash)
	if err != nil {
		log.Printf("⚠️ Erro ao buscar bloco: %v", err)
		block = nil
	}

	// Criar informações do deploy
	deployInfo := &DeploymentInfo{
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

// formatEther converte Wei para Ether
func formatEther(wei *big.Int) string {
	if wei == nil {
		return "0"
	}

	ether := new(big.Float)
	ether.SetInt(wei)
	ether.Quo(ether, big.NewFloat(1e18))

	return ether.Text('f', 6)
}

// verifyContract verifica um contrato na API
func verifyContract(address string, deployment *ContractDeployment, deployInfo *DeploymentInfo) error {
	log.Println("🔍 Enviando para verificação...")

	// Se não temos código fonte, usar um placeholder ou pular verificação
	sourceCode := deployment.SourceCode
	if sourceCode == "" {
		log.Println("⚠️ Código fonte não disponível, usando placeholder para verificação")
		sourceCode = "// Código fonte não disponível - Deploy via ABI/Bytecode"
	}

	request := &ContractVerificationRequest{
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
	}

	// Adicionar informações do deploy se disponíveis
	if deployInfo != nil {
		request.CreatorAddress = deployInfo.CreatorAddress
		request.CreationTxHash = deployInfo.TxHash
		request.CreationBlockNumber = deployInfo.BlockNumber
		request.CreationTimestamp = deployInfo.Timestamp
		request.GasUsed = deployInfo.GasUsed
	}

	jsonData, err := json.Marshal(request)
	if err != nil {
		return fmt.Errorf("erro ao serializar dados: %w", err)
	}

	// Enviar para API
	url := fmt.Sprintf("%s/smart-contracts/verify", apiBaseURL)
	resp, err := http.Post(url, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("erro ao enviar requisição: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := ioutil.ReadAll(resp.Body)
		return fmt.Errorf("erro na verificação (status %d): %s", resp.StatusCode, string(body))
	}

	return nil
}

// saveDeploymentInfo salva informações do deployment
func saveDeploymentInfo(address, txHash string, deployment *ContractDeployment, deployInfo *DeploymentInfo) {
	deploymentInfo := map[string]interface{}{
		"address":               address,
		"tx_hash":               txHash,
		"timestamp":             deployInfo.Timestamp,
		"creator_address":       deployInfo.CreatorAddress,
		"creation_block_number": deployInfo.BlockNumber,
		"gas_used":              deployInfo.GasUsed,
		"deployment":            deployment,
	}

	// Criar diretório se não existir
	os.MkdirAll("deployments", 0755)

	// Salvar arquivo JSON
	filename := fmt.Sprintf("deployments/%s_%s.json", deployment.Name, address[:8])
	jsonData, _ := json.MarshalIndent(deploymentInfo, "", "  ")
	ioutil.WriteFile(filename, jsonData, 0644)

	log.Printf("💾 Informações salvas em: %s", filename)
}

// listContracts lista contratos da API
func listContracts() ([]map[string]interface{}, error) {
	url := fmt.Sprintf("%s/smart-contracts?limit=50", apiBaseURL)
	resp, err := http.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var response struct {
		Data []map[string]interface{} `json:"data"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return nil, err
	}

	return response.Data, nil
}

// Comandos auxiliares para interação e configuração...
func readFunctionCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "read [address] [function] [args...]",
		Short: "Chamar função de leitura",
		Args:  cobra.MinimumNArgs(2),
		Run: func(cmd *cobra.Command, args []string) {
			contractAddress := args[0]
			functionName := args[1]
			functionArgs := args[2:]

			log.Printf("🔍 Chamando função de leitura: %s.%s", contractAddress, functionName)

			// Buscar ABI do contrato na API
			contractABI, err := getContractABI(contractAddress)
			if err != nil {
				log.Fatalf("❌ Erro ao buscar ABI do contrato: %v", err)
			}

			// Encontrar a função no ABI
			method, exists := contractABI.Methods[functionName]
			if !exists {
				log.Fatalf("❌ Função '%s' não encontrada no contrato", functionName)
			}

			// Verificar se é uma função view/pure
			if method.StateMutability != "view" && method.StateMutability != "pure" {
				log.Printf("⚠️ Aviso: Função '%s' não é view/pure, pode alterar estado", functionName)
			}

			// Verificar número de argumentos
			if len(functionArgs) != len(method.Inputs) {
				log.Printf("❌ Número incorreto de argumentos para %s", functionName)
				log.Printf("   Esperado: %d argumentos", len(method.Inputs))
				log.Printf("   Recebido: %d argumentos", len(functionArgs))
				log.Printf("   Assinatura: %s", buildMethodSignature(method))
				return
			}

			// Parse dos argumentos
			parsedArgs, err := parseMethodArgs(method, functionArgs)
			if err != nil {
				log.Fatalf("❌ Erro ao processar argumentos: %v", err)
			}

			// Preparar call data
			callData, err := contractABI.Pack(functionName, parsedArgs...)
			if err != nil {
				log.Fatalf("❌ Erro ao preparar call data: %v", err)
			}

			// Fazer a chamada
			toAddress := common.HexToAddress(contractAddress)
			msg := ethereum.CallMsg{
				To:   &toAddress,
				Data: callData,
			}

			// Verificar se existe código no endereço
			code, err := ethClient.CodeAt(context.Background(), toAddress, nil)
			if err != nil {
				log.Printf("❌ Erro ao verificar código do contrato: %v", err)
				return
			}
			if len(code) == 0 {
				log.Printf("❌ Nenhum código encontrado no endereço %s", contractAddress)
				log.Printf("⚠️ Verifique se o endereço está correto e se o contrato foi deployado nesta rede")
				return
			}

			// Fazer chamada RPC direta
			result, err := callContractDirect(contractAddress, fmt.Sprintf("0x%x", callData))
			if err != nil {
				// Fallback para go-ethereum
				result, err = ethClient.CallContract(context.Background(), msg, nil)
				if err != nil {
					log.Printf("❌ Erro ao chamar função: %v", err)
					return
				}
			}

			// Decodificar resultado
			outputs, err := contractABI.Unpack(functionName, result)
			if err != nil {
				log.Fatalf("❌ Erro ao decodificar resultado: %v", err)
			}

			// Mostrar resultado
			log.Printf("✅ Resultado da função %s:", functionName)
			if len(outputs) == 0 {
				log.Println("  (sem retorno)")
			} else if len(outputs) == 1 {
				log.Printf("  %v", outputs[0])
			} else {
				for i, output := range outputs {
					log.Printf("  [%d]: %v", i, output)
				}
			}
		},
	}
}

func writeFunctionCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "write [address] [function] [args...]",
		Short: "Chamar função de escrita",
		Args:  cobra.MinimumNArgs(2),
		Run: func(cmd *cobra.Command, args []string) {
			if privateKey == nil {
				log.Fatal("❌ Chave privada não configurada. Use 'besucli config set-wallet' primeiro")
			}

			contractAddress := args[0]
			functionName := args[1]
			functionArgs := args[2:]

			log.Printf("✍️ Chamando função de escrita: %s.%s", contractAddress, functionName)

			// Buscar ABI do contrato na API
			contractABI, err := getContractABI(contractAddress)
			if err != nil {
				log.Fatalf("❌ Erro ao buscar ABI do contrato: %v", err)
			}

			// Encontrar a função no ABI
			method, exists := contractABI.Methods[functionName]
			if !exists {
				log.Fatalf("❌ Função '%s' não encontrada no contrato", functionName)
			}

			// Verificar número de argumentos
			if len(functionArgs) != len(method.Inputs) {
				log.Printf("❌ Número incorreto de argumentos para %s", functionName)
				log.Printf("   Esperado: %d argumentos", len(method.Inputs))
				log.Printf("   Recebido: %d argumentos", len(functionArgs))
				log.Printf("   Assinatura: %s", buildMethodSignature(method))
				return
			}

			// Fazer a transação
			txHash, err := callContractFunction(contractAddress, functionName, functionArgs, contractABI)
			if err != nil {
				log.Fatalf("❌ Erro ao chamar função: %v", err)
			}

			log.Printf("✅ Transação enviada com sucesso!")
			log.Printf("🔗 Hash da transação: %s", txHash)
		},
	}
}

func getFunctionsCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "functions [address]",
		Short: "Listar funções do contrato",
		Args:  cobra.ExactArgs(1),
		Run: func(cmd *cobra.Command, args []string) {
			contractAddress := args[0]
			log.Printf("📋 Listando funções do contrato: %s", contractAddress)

			// Buscar ABI do contrato na API
			contractABI, err := getContractABI(contractAddress)
			if err != nil {
				log.Fatalf("❌ Erro ao buscar ABI do contrato: %v", err)
			}

			// Separar funções por tipo
			var readFunctions []abi.Method
			var writeFunctions []abi.Method

			for _, method := range contractABI.Methods {
				if method.StateMutability == "view" || method.StateMutability == "pure" {
					readFunctions = append(readFunctions, method)
				} else {
					writeFunctions = append(writeFunctions, method)
				}
			}

			// Mostrar funções de leitura
			if len(readFunctions) > 0 {
				log.Println("\n📖 FUNÇÕES DE LEITURA (view/pure):")
				for _, method := range readFunctions {
					signature := buildMethodSignature(method)
					log.Printf("  %s", signature)
				}
			}

			// Mostrar funções de escrita
			if len(writeFunctions) > 0 {
				log.Println("\n✍️ FUNÇÕES DE ESCRITA (state-changing):")
				for _, method := range writeFunctions {
					signature := buildMethodSignature(method)
					log.Printf("  %s", signature)
				}
			}

			// Mostrar eventos
			if len(contractABI.Events) > 0 {
				log.Println("\n📡 EVENTOS:")
				for _, event := range contractABI.Events {
					signature := buildEventSignature(event)
					log.Printf("  %s", signature)
				}
			}

			log.Printf("\n💡 Para chamar uma função:")
			log.Printf("  besucli interact read %s <function_name> [args...]", contractAddress)
			log.Printf("  besucli interact write %s <function_name> [args...]", contractAddress)
		},
	}
}

func setWalletCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "set-wallet",
		Short: "Configurar carteira",
		Run: func(cmd *cobra.Command, args []string) {
			reader := bufio.NewReader(os.Stdin)
			fmt.Print("Digite a chave privada (hex): ")
			privateKeyHex, _ := reader.ReadString('\n')
			privateKeyHex = strings.TrimSpace(privateKeyHex)

			// Validar chave privada
			_, err := crypto.HexToECDSA(privateKeyHex)
			if err != nil {
				log.Fatalf("❌ Chave privada inválida: %v", err)
			}

			viper.Set("wallet.private_key", privateKeyHex)

			// Salvar no arquivo de configuração atual (se existir) ou no diretório home
			configPath := viper.ConfigFileUsed()
			if configPath == "" {
				configPath = filepath.Join(os.Getenv("HOME"), ".besucli.yaml")
			}
			viper.SetConfigFile(configPath)

			if err := viper.WriteConfig(); err != nil {
				// Se o arquivo não existe, criar
				if err := viper.SafeWriteConfig(); err != nil {
					log.Fatalf("❌ Erro ao salvar configuração: %v", err)
				}
			}

			log.Printf("✅ Carteira configurada e salva em: %s", configPath)
		},
	}
}

func setNetworkCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "set-network",
		Short: "Configurar rede",
		Run: func(cmd *cobra.Command, args []string) {
			reader := bufio.NewReader(os.Stdin)

			fmt.Print("RPC URL: ")
			rpcURL, _ := reader.ReadString('\n')
			rpcURL = strings.TrimSpace(rpcURL)

			fmt.Print("Nome da rede: ")
			networkName, _ := reader.ReadString('\n')
			networkName = strings.TrimSpace(networkName)

			fmt.Print("API Base URL: ")
			apiURL, _ := reader.ReadString('\n')
			apiURL = strings.TrimSpace(apiURL)

			viper.Set("network.rpc_url", rpcURL)
			viper.Set("network.name", networkName)
			viper.Set("api.base_url", apiURL)

			// Salvar no diretório home
			configPath := filepath.Join(os.Getenv("HOME"), ".besucli.yaml")
			viper.SetConfigFile(configPath)

			if err := viper.WriteConfig(); err != nil {
				// Se o arquivo não existe, criar
				if err := viper.SafeWriteConfig(); err != nil {
					log.Fatalf("❌ Erro ao salvar configuração: %v", err)
				}
			}

			log.Printf("✅ Rede configurada e salva em: %s", configPath)
		},
	}
}

func showConfigCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "show",
		Short: "Mostrar configuração atual",
		Run: func(cmd *cobra.Command, args []string) {
			log.Println("📋 Configuração atual:")
			log.Printf("  RPC URL: %s", viper.GetString("network.rpc_url"))
			log.Printf("  Rede: %s", viper.GetString("network.name"))
			log.Printf("  API URL: %s", viper.GetString("api.base_url"))
			log.Printf("  Gas Limit: %d", viper.GetUint64("gas.limit"))
			log.Printf("  Gas Price: %s wei", viper.GetString("gas.price"))

			if viper.GetString("wallet.private_key") != "" {
				log.Printf("  Carteira: Configurada ✅")
			} else {
				log.Printf("  Carteira: Não configurada ❌")
			}
		},
	}
}

// parseConstructorArgs converte argumentos string para tipos corretos baseado no ABI
func parseConstructorArgs(contractABI abi.ABI, args []string) ([]interface{}, error) {
	if len(args) == 0 {
		return nil, nil
	}

	// Encontrar o construtor no ABI
	constructor := contractABI.Constructor
	if constructor.Inputs == nil || len(constructor.Inputs) == 0 {
		if len(args) > 0 {
			return nil, fmt.Errorf("contrato não tem construtor, mas argumentos foram fornecidos")
		}
		return nil, nil
	}

	if len(args) != len(constructor.Inputs) {
		return nil, fmt.Errorf("número de argumentos incorreto: esperado %d, recebido %d", len(constructor.Inputs), len(args))
	}

	parsedArgs := make([]interface{}, len(args))

	for i, input := range constructor.Inputs {
		arg := args[i]

		switch input.Type.T {
		case abi.StringTy:
			parsedArgs[i] = arg
		case abi.UintTy:
			switch input.Type.Size {
			case 8:
				val, err := strconv.ParseUint(arg, 10, 8)
				if err != nil {
					return nil, fmt.Errorf("erro ao converter argumento %d para uint8: %w", i, err)
				}
				parsedArgs[i] = uint8(val)
			case 256:
				val, ok := new(big.Int).SetString(arg, 10)
				if !ok {
					return nil, fmt.Errorf("erro ao converter argumento %d para uint256: valor inválido", i)
				}
				parsedArgs[i] = val
			default:
				val, err := strconv.ParseUint(arg, 10, int(input.Type.Size))
				if err != nil {
					return nil, fmt.Errorf("erro ao converter argumento %d para uint%d: %w", i, input.Type.Size, err)
				}
				parsedArgs[i] = val
			}
		case abi.IntTy:
			switch input.Type.Size {
			case 256:
				val, ok := new(big.Int).SetString(arg, 10)
				if !ok {
					return nil, fmt.Errorf("erro ao converter argumento %d para int256: valor inválido", i)
				}
				parsedArgs[i] = val
			default:
				val, err := strconv.ParseInt(arg, 10, int(input.Type.Size))
				if err != nil {
					return nil, fmt.Errorf("erro ao converter argumento %d para int%d: %w", i, input.Type.Size, err)
				}
				parsedArgs[i] = val
			}
		case abi.BoolTy:
			val, err := strconv.ParseBool(arg)
			if err != nil {
				return nil, fmt.Errorf("erro ao converter argumento %d para bool: %w", i, err)
			}
			parsedArgs[i] = val
		case abi.AddressTy:
			if !common.IsHexAddress(arg) {
				return nil, fmt.Errorf("argumento %d não é um endereço válido: %s", i, arg)
			}
			parsedArgs[i] = common.HexToAddress(arg)
		case abi.BytesTy, abi.FixedBytesTy:
			if !strings.HasPrefix(arg, "0x") {
				arg = "0x" + arg
			}
			parsedArgs[i] = common.FromHex(arg)
		default:
			return nil, fmt.Errorf("tipo de argumento não suportado: %s", input.Type.String())
		}
	}

	return parsedArgs, nil
}

// DeploymentInfo contém informações do deploy
type DeploymentInfo struct {
	CreatorAddress string
	TxHash         string
	BlockNumber    int64
	Timestamp      time.Time
	GasUsed        int64
}

// getTransactionTrace obtém o trace de uma transação para debug
func getTransactionTrace(txHash string) (string, error) {
	type TraceRequest struct {
		JSONRPC string        `json:"jsonrpc"`
		Method  string        `json:"method"`
		Params  []interface{} `json:"params"`
		ID      int           `json:"id"`
	}

	type TraceResponse struct {
		JSONRPC string      `json:"jsonrpc"`
		ID      int         `json:"id"`
		Result  interface{} `json:"result,omitempty"`
		Error   *struct {
			Code    int    `json:"code"`
			Message string `json:"message"`
		} `json:"error,omitempty"`
	}

	// Tentar debug_traceTransaction
	request := TraceRequest{
		JSONRPC: "2.0",
		Method:  "debug_traceTransaction",
		Params:  []interface{}{txHash, map[string]interface{}{"tracer": "callTracer"}},
		ID:      1,
	}

	jsonData, err := json.Marshal(request)
	if err != nil {
		return "", err
	}

	rpcURL := viper.GetString("network.rpc_url")
	resp, err := http.Post(rpcURL, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var traceResp TraceResponse
	if err := json.NewDecoder(resp.Body).Decode(&traceResp); err != nil {
		return "", err
	}

	if traceResp.Error != nil {
		return "", fmt.Errorf("RPC error: %s", traceResp.Error.Message)
	}

	if traceResp.Result != nil {
		resultBytes, _ := json.Marshal(traceResp.Result)
		return string(resultBytes), nil
	}

	return "", nil
}

// getRevertReason tenta obter o motivo do revert de uma transação
func getRevertReason(txHash string) (string, error) {
	type RPCRequest struct {
		JSONRPC string        `json:"jsonrpc"`
		Method  string        `json:"method"`
		Params  []interface{} `json:"params"`
		ID      int           `json:"id"`
	}

	type RPCResponse struct {
		JSONRPC string      `json:"jsonrpc"`
		ID      int         `json:"id"`
		Result  interface{} `json:"result,omitempty"`
		Error   *struct {
			Code    int    `json:"code"`
			Message string `json:"message"`
			Data    string `json:"data,omitempty"`
		} `json:"error,omitempty"`
	}

	// Primeiro, obter a transação
	request := RPCRequest{
		JSONRPC: "2.0",
		Method:  "eth_getTransactionByHash",
		Params:  []interface{}{txHash},
		ID:      1,
	}

	jsonData, err := json.Marshal(request)
	if err != nil {
		return "", err
	}

	rpcURL := viper.GetString("network.rpc_url")
	resp, err := http.Post(rpcURL, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var txResp RPCResponse
	if err := json.NewDecoder(resp.Body).Decode(&txResp); err != nil {
		return "", err
	}

	if txResp.Error != nil {
		return "", fmt.Errorf("RPC error: %s", txResp.Error.Message)
	}

	// Tentar eth_call para simular e obter o erro
	if txResp.Result != nil {
		txData, ok := txResp.Result.(map[string]interface{})
		if !ok {
			return "", fmt.Errorf("formato de transação inválido")
		}

		// Preparar chamada eth_call
		callRequest := RPCRequest{
			JSONRPC: "2.0",
			Method:  "eth_call",
			Params: []interface{}{
				map[string]interface{}{
					"from": txData["from"],
					"to":   txData["to"],
					"data": txData["input"],
					"gas":  txData["gas"],
				},
				"latest",
			},
			ID: 2,
		}

		callJsonData, err := json.Marshal(callRequest)
		if err != nil {
			return "", err
		}

		callResp, err := http.Post(rpcURL, "application/json", bytes.NewBuffer(callJsonData))
		if err != nil {
			return "", err
		}
		defer callResp.Body.Close()

		var callRespData RPCResponse
		if err := json.NewDecoder(callResp.Body).Decode(&callRespData); err != nil {
			return "", err
		}

		if callRespData.Error != nil {
			if callRespData.Error.Data != "" {
				// Tentar decodificar o revert reason
				return decodeRevertReason(callRespData.Error.Data), nil
			}
			return callRespData.Error.Message, nil
		}
	}

	return "", nil
}

// decodeRevertReason decodifica o motivo do revert de dados hexadecimais
func decodeRevertReason(data string) string {
	if len(data) < 10 {
		return data
	}

	// Remove 0x prefix
	if strings.HasPrefix(data, "0x") {
		data = data[2:]
	}

	// Verifica se é um revert padrão (Error(string))
	if strings.HasPrefix(data, "08c379a0") {
		// Remove o selector da função (4 bytes = 8 chars hex)
		data = data[8:]

		// Decodifica os dados
		decoded := common.FromHex("0x" + data)
		if len(decoded) == 0 {
			return data
		}

		// Pula os primeiros 32 bytes (offset) e lê o comprimento
		if len(decoded) < 64 {
			return data
		}

		// Lê o comprimento da string (bytes 32-63)
		lengthBytes := decoded[32:64]
		length := new(big.Int).SetBytes(lengthBytes).Uint64()

		// Lê a string
		if len(decoded) >= int(64+length) {
			message := string(decoded[64 : 64+length])
			return message
		}
	}

	// Verificar se é um erro customizado comum
	if len(data) >= 8 {
		selector := data[:8]
		switch selector {
		case "118cdaa7": // Erro comum de acesso/permissão
			return "Acesso negado ou permissão insuficiente para executar esta função"
		case "4e487b71": // Panic(uint256)
			return "Panic do contrato - operação inválida"
		case "b12d13eb": // InsufficientBalance
			return "Saldo insuficiente"
		case "23b872dd": // transferFrom failed
			return "Falha na transferência - verifique aprovação"
		}
	}

	// Retornar o erro com explicação
	return fmt.Sprintf("Erro do contrato: %s (Verifique se você tem permissão para executar esta função)", data)
}

// getContractABI busca o ABI de um contrato na API
func getContractABI(contractAddress string) (abi.ABI, error) {
	url := fmt.Sprintf("%s/smart-contracts/%s", apiBaseURL, contractAddress)
	resp, err := http.Get(url)
	if err != nil {
		return abi.ABI{}, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return abi.ABI{}, fmt.Errorf("contrato não encontrado: status %d", resp.StatusCode)
	}

	var response struct {
		Data struct {
			ABI json.RawMessage `json:"abi"`
		} `json:"data"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return abi.ABI{}, err
	}

	contractABI, err := abi.JSON(bytes.NewReader(response.Data.ABI))
	if err != nil {
		return abi.ABI{}, fmt.Errorf("erro ao parsear ABI: %w", err)
	}

	return contractABI, nil
}

// callContractFunction chama uma função de um contrato
func callContractFunction(contractAddress, functionName string, functionArgs []string, contractABI abi.ABI) (string, error) {
	// Verificar se a função existe no ABI
	method, exists := contractABI.Methods[functionName]
	if !exists {
		return "", fmt.Errorf("função '%s' não encontrada no ABI", functionName)
	}

	// Converter argumentos
	var args []interface{}
	if len(functionArgs) > 0 {
		parsedArgs, err := parseMethodArgs(method, functionArgs)
		if err != nil {
			return "", fmt.Errorf("erro ao processar argumentos: %w", err)
		}
		args = parsedArgs
	}

	// Detectar Chain ID
	chainID, err := ethClient.NetworkID(context.Background())
	if err != nil {
		chainID = big.NewInt(1337) // Fallback
	}

	// Configurar transactor
	auth, err := bind.NewKeyedTransactorWithChainID(privateKey, chainID)
	if err != nil {
		return "", fmt.Errorf("erro ao criar transactor: %w", err)
	}

	// Preparar dados da transação para estimativa de gas
	data, err := contractABI.Pack(functionName, args...)
	if err != nil {
		return "", fmt.Errorf("erro ao preparar dados da transação: %w", err)
	}

	contractAddr := common.HexToAddress(contractAddress)

	// Estimar gas automaticamente
	gasLimit, err := ethClient.EstimateGas(context.Background(), ethereum.CallMsg{
		From: auth.From,
		To:   &contractAddr,
		Data: data,
	})
	if err != nil {
		// Fallback para valor configurado ou padrão mais baixo
		gasLimit = viper.GetUint64("gas.limit")
		if gasLimit == 0 {
			gasLimit = 200000 // Valor mais conservador
		}
		log.Printf("⚠️ Não foi possível estimar gas, usando: %d", gasLimit)
	} else {
		// Adicionar 20% de margem de segurança
		gasLimit = gasLimit + (gasLimit * 20 / 100)
		log.Printf("⛽ Gas estimado: %d (com margem de segurança)", gasLimit)
	}

	auth.GasPrice = big.NewInt(0) // Gas gratuito
	auth.GasLimit = gasLimit
	auth.GasFeeCap = nil // Forçar modo legacy
	auth.GasTipCap = nil // Forçar modo legacy

	// Criar bound contract
	contract := bind.NewBoundContract(common.HexToAddress(contractAddress), contractABI, ethClient, ethClient, ethClient)

	// Chamar função
	tx, err := contract.Transact(auth, functionName, args...)
	if err != nil {
		return "", fmt.Errorf("erro ao enviar transação: %w", err)
	}

	log.Printf("⏳ Aguardando confirmação da transação...")
	receipt, err := bind.WaitMined(context.Background(), ethClient, tx)
	if err != nil {
		return "", fmt.Errorf("erro ao aguardar confirmação: %w", err)
	}

	if receipt.Status != types.ReceiptStatusSuccessful {
		log.Printf("❌ Transação falhou - status: %d", receipt.Status)
		log.Printf("🔗 Hash da transação: %s", tx.Hash().Hex())
		log.Printf("⛽ Gas usado: %d", receipt.GasUsed)

		// Tentar obter o motivo da falha
		reason, err := getRevertReason(tx.Hash().Hex())
		if err != nil {
			log.Printf("⚠️ Não foi possível obter o motivo da falha: %v", err)
		} else if reason != "" {
			log.Printf("💬 Motivo da falha: %s", reason)
		}

		return "", fmt.Errorf("transação reverteu durante a execução")
	}

	log.Printf("✅ Transação confirmada no bloco: %d", receipt.BlockNumber.Uint64())
	log.Printf("⛽ Gas usado: %d", receipt.GasUsed)

	return tx.Hash().Hex(), nil
}

// parseMethodArgs converte argumentos string para tipos corretos baseado no método ABI
// buildMethodSignature constrói a assinatura de uma função para exibição
func buildMethodSignature(method abi.Method) string {
	var inputs []string
	for _, input := range method.Inputs {
		inputStr := input.Type.String()
		if input.Name != "" {
			inputStr = fmt.Sprintf("%s %s", inputStr, input.Name)
		}
		inputs = append(inputs, inputStr)
	}

	var outputs []string
	for _, output := range method.Outputs {
		outputStr := output.Type.String()
		if output.Name != "" {
			outputStr = fmt.Sprintf("%s %s", outputStr, output.Name)
		}
		outputs = append(outputs, outputStr)
	}

	signature := fmt.Sprintf("%s(%s)", method.Name, strings.Join(inputs, ", "))
	if len(outputs) > 0 {
		signature += fmt.Sprintf(" → (%s)", strings.Join(outputs, ", "))
	}

	return signature
}

// callContractDirect faz uma chamada RPC direta
func callContractDirect(contractAddress, data string) ([]byte, error) {
	type CallResponse struct {
		JSONRPC string `json:"jsonrpc"`
		ID      int    `json:"id"`
		Result  string `json:"result,omitempty"`
		Error   *struct {
			Code    int    `json:"code"`
			Message string `json:"message"`
		} `json:"error,omitempty"`
	}

	// Construir requisição JSON manualmente
	reqBody := fmt.Sprintf(`{
		"jsonrpc": "2.0",
		"method": "eth_call",
		"params": [
			{
				"to": "%s",
				"data": "%s"
			},
			"latest"
		],
		"id": 1
	}`, contractAddress, data)

	rpcURL := viper.GetString("network.rpc_url")
	resp, err := http.Post(rpcURL, "application/json", strings.NewReader(reqBody))
	if err != nil {
		return nil, fmt.Errorf("erro na requisição RPC: %w", err)
	}
	defer resp.Body.Close()

	var response CallResponse
	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return nil, fmt.Errorf("erro ao decodificar resposta: %w", err)
	}

	if response.Error != nil {
		return nil, fmt.Errorf("erro RPC: %s", response.Error.Message)
	}

	if response.Result == "" || response.Result == "0x" {
		return []byte{}, nil
	}

	return common.FromHex(response.Result), nil
}

// buildEventSignature constrói a assinatura de um evento para exibição
func buildEventSignature(event abi.Event) string {
	var inputs []string
	for _, input := range event.Inputs {
		inputStr := input.Type.String()
		if input.Name != "" {
			inputStr = fmt.Sprintf("%s %s", inputStr, input.Name)
		}
		if input.Indexed {
			inputStr += " indexed"
		}
		inputs = append(inputs, inputStr)
	}

	return fmt.Sprintf("%s(%s)", event.Name, strings.Join(inputs, ", "))
}

func parseMethodArgs(method abi.Method, args []string) ([]interface{}, error) {
	if len(args) != len(method.Inputs) {
		return nil, fmt.Errorf("número de argumentos incorreto: esperado %d, recebido %d", len(method.Inputs), len(args))
	}

	parsedArgs := make([]interface{}, len(args))

	for i, input := range method.Inputs {
		arg := args[i]

		switch input.Type.T {
		case abi.StringTy:
			parsedArgs[i] = arg
		case abi.UintTy:
			switch input.Type.Size {
			case 8:
				val, err := strconv.ParseUint(arg, 10, 8)
				if err != nil {
					return nil, fmt.Errorf("erro ao converter argumento %d para uint8: %w", i, err)
				}
				parsedArgs[i] = uint8(val)
			case 256:
				val, ok := new(big.Int).SetString(arg, 10)
				if !ok {
					return nil, fmt.Errorf("erro ao converter argumento %d para uint256: valor inválido", i)
				}
				parsedArgs[i] = val
			default:
				val, err := strconv.ParseUint(arg, 10, int(input.Type.Size))
				if err != nil {
					return nil, fmt.Errorf("erro ao converter argumento %d para uint%d: %w", i, input.Type.Size, err)
				}
				parsedArgs[i] = val
			}
		case abi.IntTy:
			switch input.Type.Size {
			case 256:
				val, ok := new(big.Int).SetString(arg, 10)
				if !ok {
					return nil, fmt.Errorf("erro ao converter argumento %d para int256: valor inválido", i)
				}
				parsedArgs[i] = val
			default:
				val, err := strconv.ParseInt(arg, 10, int(input.Type.Size))
				if err != nil {
					return nil, fmt.Errorf("erro ao converter argumento %d para int%d: %w", i, input.Type.Size, err)
				}
				parsedArgs[i] = val
			}
		case abi.BoolTy:
			val, err := strconv.ParseBool(arg)
			if err != nil {
				return nil, fmt.Errorf("erro ao converter argumento %d para bool: %w", i, err)
			}
			parsedArgs[i] = val
		case abi.AddressTy:
			if !common.IsHexAddress(arg) {
				return nil, fmt.Errorf("argumento %d não é um endereço válido: %s", i, arg)
			}
			parsedArgs[i] = common.HexToAddress(arg)
		case abi.BytesTy, abi.FixedBytesTy:
			if !strings.HasPrefix(arg, "0x") {
				arg = "0x" + arg
			}
			parsedArgs[i] = common.FromHex(arg)
		default:
			return nil, fmt.Errorf("tipo de argumento não suportado: %s", input.Type.String())
		}
	}

	return parsedArgs, nil
}

// deployFromYAML faz deploy usando configuração YAML
func deployFromYAML(configFile string) {
	// Carregar configuração do YAML
	config, err := loadContractConfig(configFile)
	if err != nil {
		log.Fatalf("❌ Erro ao carregar configuração: %v", err)
	}

	// Converter configuração para ContractDeployment
	deployment := &ContractDeployment{
		Name:                config.Contract.Name,
		Symbol:              config.Contract.Symbol,
		Description:         config.Contract.Description,
		ContractType:        config.Contract.Type,
		CompilerVersion:     config.Compiler.Version,
		OptimizationEnabled: config.Compiler.OptimizationEnabled,
		OptimizationRuns:    config.Compiler.OptimizationRuns,
		LicenseType:         config.Metadata.License,
		WebsiteURL:          config.Metadata.WebsiteURL,
		GithubURL:           config.Metadata.GithubURL,
		DocumentationURL:    config.Metadata.DocumentationURL,
		Tags:                config.Metadata.Tags,
		Metadata:            make(map[string]interface{}),
	}

	// Carregar arquivos do contrato
	if err := loadContractFiles(deployment, config.Files.Contract, config.Files.ABI, config.Files.Bytecode); err != nil {
		log.Fatalf("❌ Erro ao carregar arquivos do contrato: %v", err)
	}

	// Processar argumentos do construtor
	if len(config.ConstructorArgs) > 0 {
		// Parse do ABI para converter argumentos corretamente
		contractABI, err := abi.JSON(bytes.NewReader(deployment.ABI))
		if err != nil {
			log.Fatalf("❌ Erro ao parsear ABI para argumentos: %v", err)
		}

		parsedArgs, err := parseConstructorArgs(contractABI, config.ConstructorArgs)
		if err != nil {
			log.Fatalf("❌ Erro ao processar argumentos do construtor: %v", err)
		}
		deployment.ConstructorArgs = parsedArgs
	}

	// Aplicar configurações de gas se especificadas
	if config.Gas.Limit > 0 {
		viper.Set("gas.limit", config.Gas.Limit)
	}
	if config.Gas.Price != "" {
		viper.Set("gas.price", config.Gas.Price)
	}

	log.Printf("🚀 Iniciando deploy do contrato: %s", deployment.Name)
	log.Printf("📋 Tipo: %s", deployment.ContractType)
	log.Printf("📝 Descrição: %s", deployment.Description)

	// Fazer deploy
	contractAddress, txHash, deployInfo, err := deployContract(deployment)
	if err != nil {
		log.Fatalf("❌ Erro no deploy: %v", err)
	}

	log.Printf("✅ Contrato deployado com sucesso!")
	log.Printf("📍 Endereço: %s", contractAddress)
	log.Printf("🔗 Transaction Hash: %s", txHash)

	// Verificação automática se solicitada
	if config.Deploy.AutoVerify {
		log.Println("🔍 Iniciando verificação automática...")
		if err := verifyContract(contractAddress, deployment, deployInfo); err != nil {
			log.Printf("⚠️ Erro na verificação automática: %v", err)
		} else {
			log.Println("✅ Contrato verificado automaticamente!")
		}
	}

	// Salvar informações do deployment se solicitado
	if config.Deploy.SaveDeployment {
		saveDeploymentInfo(contractAddress, txHash, deployment, deployInfo)
	}
}

// deployFromFlags faz deploy usando flags da linha de comando
func deployFromFlags(contractFile, abiFile, bytecodeFile, name, symbol, description,
	contractType string, constructorArgs []string, compilerVersion string,
	optimizationEnabled bool, optimizationRuns int, licenseType, websiteURL,
	githubURL, documentationURL string, tags []string, autoVerify bool) {

	// Validar parâmetros obrigatórios
	if name == "" {
		log.Fatal("❌ Nome do contrato é obrigatório no modo flags. Use --name ou arquivo YAML")
	}

	deployment := &ContractDeployment{
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

	// Carregar arquivos do contrato
	if err := loadContractFiles(deployment, contractFile, abiFile, bytecodeFile); err != nil {
		log.Fatalf("❌ Erro ao carregar arquivos do contrato: %v", err)
	}

	// Processar argumentos do construtor
	if len(constructorArgs) > 0 {
		// Parse do ABI para converter argumentos corretamente
		contractABI, err := abi.JSON(bytes.NewReader(deployment.ABI))
		if err != nil {
			log.Fatalf("❌ Erro ao parsear ABI para argumentos: %v", err)
		}

		parsedArgs, err := parseConstructorArgs(contractABI, constructorArgs)
		if err != nil {
			log.Fatalf("❌ Erro ao processar argumentos do construtor: %v", err)
		}
		deployment.ConstructorArgs = parsedArgs
	}

	log.Printf("🚀 Iniciando deploy do contrato: %s", deployment.Name)
	log.Printf("📋 Tipo: %s", deployment.ContractType)
	log.Printf("📝 Descrição: %s", deployment.Description)

	// Fazer deploy
	contractAddress, txHash, deployInfo, err := deployContract(deployment)
	if err != nil {
		log.Fatalf("❌ Erro no deploy: %v", err)
	}

	log.Printf("✅ Contrato deployado com sucesso!")
	log.Printf("📍 Endereço: %s", contractAddress)
	log.Printf("🔗 Transaction Hash: %s", txHash)

	// Verificação automática se solicitada
	if autoVerify {
		log.Println("🔍 Iniciando verificação automática...")
		if err := verifyContract(contractAddress, deployment, deployInfo); err != nil {
			log.Printf("⚠️ Erro na verificação automática: %v", err)
		} else {
			log.Println("✅ Contrato verificado automaticamente!")
		}
	}

	// Salvar informações do deployment
	saveDeploymentInfo(contractAddress, txHash, deployment, deployInfo)
}

// validateFromYAML valida contrato usando configuração YAML
func validateFromYAML(configFile string) {
	// Carregar configuração do YAML
	config, err := loadContractConfig(configFile)
	if err != nil {
		log.Fatalf("❌ Erro ao carregar configuração: %v", err)
	}

	// Converter configuração para ContractDeployment
	deployment := &ContractDeployment{
		Name:                config.Contract.Name,
		Symbol:              config.Contract.Symbol,
		Description:         config.Contract.Description,
		ContractType:        config.Contract.Type,
		CompilerVersion:     config.Compiler.Version,
		OptimizationEnabled: config.Compiler.OptimizationEnabled,
		OptimizationRuns:    config.Compiler.OptimizationRuns,
		LicenseType:         config.Metadata.License,
		WebsiteURL:          config.Metadata.WebsiteURL,
		GithubURL:           config.Metadata.GithubURL,
		DocumentationURL:    config.Metadata.DocumentationURL,
		Tags:                config.Metadata.Tags,
		Metadata:            make(map[string]interface{}),
	}

	// Carregar arquivos do contrato
	if err := loadContractFiles(deployment, config.Files.Contract, config.Files.ABI, config.Files.Bytecode); err != nil {
		log.Fatalf("❌ Erro ao carregar arquivos do contrato: %v", err)
	}

	// Executar validação
	validateContractFiles(deployment, config.ConstructorArgs)
}

// validateFromFlags valida contrato usando flags da linha de comando
func validateFromFlags(contractFile, abiFile, bytecodeFile, name, symbol, description,
	contractType, compilerVersion string, optimizationEnabled bool, optimizationRuns int,
	licenseType, websiteURL, githubURL, documentationURL string, tags []string) {

	// Validar parâmetros obrigatórios
	if name == "" {
		log.Fatal("❌ Nome do contrato é obrigatório no modo flags. Use --name ou arquivo YAML")
	}

	deployment := &ContractDeployment{
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

	// Carregar arquivos do contrato
	if err := loadContractFiles(deployment, contractFile, abiFile, bytecodeFile); err != nil {
		log.Fatalf("❌ Erro ao carregar arquivos do contrato: %v", err)
	}

	// Executar validação
	validateContractFiles(deployment, []string{})
}

// validateContractFiles executa a validação dos arquivos do contrato
func validateContractFiles(deployment *ContractDeployment, constructorArgs []string) {
	log.Printf("🔍 Validando contrato: %s (%s)", deployment.Name, deployment.ContractType)

	// Validar ABI
	log.Println("🔍 Validando ABI...")
	contractABI, err := abi.JSON(bytes.NewReader(deployment.ABI))
	if err != nil {
		log.Fatalf("❌ Erro ao parsear ABI: %v", err)
	}
	log.Printf("✅ ABI válida com %d métodos", len(contractABI.Methods))

	// Validar bytecode
	log.Println("🔍 Validando bytecode...")
	bytecode := common.FromHex(deployment.Bytecode)
	if len(bytecode) == 0 {
		log.Fatal("❌ Bytecode vazio ou inválido")
	}
	log.Printf("✅ Bytecode válido com %d bytes", len(bytecode))

	// Verificar construtor
	if contractABI.Constructor.Inputs != nil && len(contractABI.Constructor.Inputs) > 0 {
		log.Printf("🔧 Construtor encontrado com %d argumentos:", len(contractABI.Constructor.Inputs))
		for i, input := range contractABI.Constructor.Inputs {
			log.Printf("  %d. %s (%s)", i+1, input.Name, input.Type.String())
		}

		// Validar argumentos do construtor se fornecidos
		if len(constructorArgs) > 0 {
			log.Printf("🔧 Validando %d argumentos fornecidos...", len(constructorArgs))
			if len(constructorArgs) != len(contractABI.Constructor.Inputs) {
				log.Printf("⚠️ Número de argumentos incorreto: esperado %d, fornecido %d",
					len(contractABI.Constructor.Inputs), len(constructorArgs))
			} else {
				// Tentar parsear argumentos
				_, err := parseConstructorArgs(contractABI, constructorArgs)
				if err != nil {
					log.Printf("❌ Erro ao validar argumentos: %v", err)
				} else {
					log.Println("✅ Argumentos do construtor válidos")
				}
			}
		}
	} else {
		log.Println("🔧 Nenhum construtor ou construtor sem argumentos")
	}

	// Listar métodos
	if len(contractABI.Methods) > 0 {
		log.Printf("📋 Métodos encontrados (%d):", len(contractABI.Methods))
		readMethods := 0
		writeMethods := 0
		for name, method := range contractABI.Methods {
			log.Printf("  - %s (%s)", name, method.StateMutability)
			if method.StateMutability == "view" || method.StateMutability == "pure" {
				readMethods++
			} else {
				writeMethods++
			}
		}
		log.Printf("📊 Resumo: %d métodos de leitura, %d métodos de escrita", readMethods, writeMethods)
	}

	// Verificar eventos
	if len(contractABI.Events) > 0 {
		log.Printf("📡 Eventos encontrados (%d):", len(contractABI.Events))
		for name := range contractABI.Events {
			log.Printf("  - %s", name)
		}
	}

	log.Println("✅ Arquivos do contrato validados com sucesso!")
}
