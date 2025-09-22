package commands

import (
	"bytes"
	"fmt"

	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/spf13/cobra"
	"github.com/spf13/viper"

	"github.com/hubweb3/besucli/internal/blockchain"
	"github.com/hubweb3/besucli/internal/models"
	"github.com/hubweb3/besucli/internal/services"
)

func NewVerifyCommand() *cobra.Command {
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
		Short: "Verify an existing smart contract",
		Long: `
Verify an already deployed smart contract by providing source code and metadata.

Examples:
  besucli verify --address 0x123... --contract MyToken.sol --name "My Token"
  besucli verify --address 0x123... --abi token.abi --name "Custom Token"
		`,
		RunE: func(cmd *cobra.Command, args []string) error {
			if address == "" {
				return fmt.Errorf("contract address is required")
			}

			// Initialize blockchain client
			rpcURL := viper.GetString("network.rpc_url")
			privateKeyHex := viper.GetString("wallet.private_key")

			client, err := blockchain.NewClient(rpcURL, privateKeyHex)
			if err != nil {
				return fmt.Errorf("failed to initialize blockchain client: %w", err)
			}
			defer client.Close()

			// Initialize services
			apiURL := viper.GetString("api.base_url")
			contractService := services.NewContractService(client, apiURL)
			deployService := services.NewDeployService(client, apiURL, 0, nil)

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
			if err := contractService.LoadContractFiles(deployment, contractFile, abiFile, ""); err != nil {
				return fmt.Errorf("failed to load contract files: %w", err)
			}

			// Process constructor arguments
			if len(constructorArgs) > 0 {
				// Parse ABI to convert arguments correctly
				contractABI, err := abi.JSON(bytes.NewReader(deployment.ABI))
				if err != nil {
					return fmt.Errorf("failed to parse ABI for arguments: %w", err)
				}

				parsedArgs, err := contractService.ParseConstructorArgs(contractABI, constructorArgs)
				if err != nil {
					return fmt.Errorf("failed to process constructor arguments: %w", err)
				}
				deployment.ConstructorArgs = parsedArgs
			}

			// Verify contract
			if err := deployService.VerifyContract(address, deployment, nil); err != nil {
				return fmt.Errorf("verification failed: %w", err)
			}

			log.Success("Contract verified successfully", "address", address)
			return nil
		},
	}

	cmd.Flags().StringVar(&address, "address", "", "Contract address (required)")
	cmd.Flags().StringVar(&contractFile, "contract", "", "Contract .sol file")
	cmd.Flags().StringVar(&abiFile, "abi", "", "Contract .abi file")
	cmd.Flags().StringVar(&name, "name", "", "Contract name (required)")
	cmd.Flags().StringVar(&symbol, "symbol", "", "Token symbol (for tokens)")
	cmd.Flags().StringVar(&description, "description", "", "Contract description")
	cmd.Flags().StringVar(&contractType, "type", "Unknown", "Contract type")
	cmd.Flags().StringSliceVar(&constructorArgs, "args", []string{}, "Constructor arguments")
	cmd.Flags().StringVar(&compilerVersion, "compiler", "v0.8.19", "Compiler version")
	cmd.Flags().BoolVar(&optimizationEnabled, "optimization", true, "Optimization enabled")
	cmd.Flags().IntVar(&optimizationRuns, "optimization-runs", 200, "Number of optimization runs")
	cmd.Flags().StringVar(&licenseType, "license", "MIT", "License type")
	cmd.Flags().StringVar(&websiteURL, "website", "", "Website URL")
	cmd.Flags().StringVar(&githubURL, "github", "", "GitHub URL")
	cmd.Flags().StringVar(&documentationURL, "docs", "", "Documentation URL")
	cmd.Flags().StringSliceVar(&tags, "tags", []string{}, "Tags for categorization")

	cmd.MarkFlagRequired("address")
	cmd.MarkFlagRequired("name")

	return cmd
}
