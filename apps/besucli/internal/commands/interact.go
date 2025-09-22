package commands

import (
	"fmt"
	"strings"

	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/spf13/cobra"
	"github.com/spf13/viper"

	"github.com/hubweb3/besucli/internal/blockchain"
	"github.com/hubweb3/besucli/internal/services"
)

func NewInteractCommand() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "interact",
		Short: "Interact with smart contracts",
		Long:  "Call functions on deployed smart contracts",
	}

	// Subcommands for different types of interaction
	cmd.AddCommand(
		newReadFunctionCommand(),
		newWriteFunctionCommand(),
		newGetFunctionsCommand(),
	)

	return cmd
}

func newReadFunctionCommand() *cobra.Command {
	var (
		contractAddress string
		functionName    string
		functionArgs    []string
	)

	cmd := &cobra.Command{
		Use:   "read [contract-address] [function-name] [args...]",
		Short: "Call a read-only function",
		Long: `
Call a read-only (view/pure) function on a smart contract.

Examples:
  besucli interact read 0x123... balanceOf 0xabc...
  besucli interact read 0x123... totalSupply
  besucli interact read 0x123... allowance 0xabc... 0xdef...
		`,
		RunE: func(cmd *cobra.Command, args []string) error {
			if len(args) < 2 {
				return fmt.Errorf("contract address and function name are required")
			}

			contractAddress = args[0]
			functionName = args[1]
			if len(args) > 2 {
				functionArgs = args[2:]
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

			// Get contract ABI
			contractABI, err := contractService.GetContractABI(contractAddress)
			if err != nil {
				return fmt.Errorf("failed to get contract ABI: %w", err)
			}

			// Call function
			result, err := contractService.CallContractFunction(contractAddress, functionName, functionArgs, contractABI)
			if err != nil {
				return fmt.Errorf("function call failed: %w", err)
			}

			log.Success("Function call result", "function", functionName, "result", result)
			return nil
		},
	}

	return cmd
}

func newWriteFunctionCommand() *cobra.Command {
	var (
		contractAddress string
		gasLimit        uint64
		gasPrice        string
		value           string
	)

	cmd := &cobra.Command{
		Use:   "write [contract-address] [function-name] [args...]",
		Short: "Call a state-changing function",
		Long: `
Call a state-changing function on a smart contract.

Examples:
  besucli interact write 0x123... transfer 0xabc... 1000
  besucli interact write 0x123... approve 0xabc... 5000
  besucli interact write 0x123... mint 0xabc... 100 --gas-limit 100000
		`,
		RunE: func(cmd *cobra.Command, args []string) error {
			if len(args) < 2 {
				return fmt.Errorf("contract address and function name are required")
			}

			contractAddress = args[0]
			functionName := args[1]
			var functionArgs []string
			if len(args) > 2 {
				functionArgs = args[2:]
			}

			// Initialize blockchain client
			rpcURL := viper.GetString("network.rpc_url")
			privateKeyHex := viper.GetString("wallet.private_key")

			if privateKeyHex == "" {
				return fmt.Errorf("private key not configured. Use 'besucli config set-wallet' first")
			}

			client, err := blockchain.NewClient(rpcURL, privateKeyHex)
			if err != nil {
				return fmt.Errorf("failed to initialize blockchain client: %w", err)
			}
			defer client.Close()

			// Initialize services
			apiURL := viper.GetString("api.base_url")
			contractService := services.NewContractService(client, apiURL)

			// Get contract ABI
			contractABI, err := contractService.GetContractABI(contractAddress)
			if err != nil {
				return fmt.Errorf("failed to get contract ABI: %w", err)
			}

			// Call function
			txHash, err := contractService.WriteContractFunction(contractAddress, functionName, functionArgs, contractABI, gasLimit, gasPrice, value)
			if err != nil {
				return fmt.Errorf("failed to call function: %w", err)
			}

			log.Success("Transaction sent", "txHash", txHash)
			return nil
		},
	}

	cmd.Flags().Uint64Var(&gasLimit, "gas-limit", 0, "Gas limit for transaction")
	cmd.Flags().StringVar(&gasPrice, "gas-price", "", "Gas price in wei")
	cmd.Flags().StringVar(&value, "value", "0", "ETH value to send with transaction")

	return cmd
}

func newGetFunctionsCommand() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "functions [contract-address]",
		Short: "List all functions in a contract",
		Long: `
List all available functions in a smart contract.

Examples:
  besucli interact functions 0x123...
		`,
		RunE: func(cmd *cobra.Command, args []string) error {
			if len(args) < 1 {
				return fmt.Errorf("contract address is required")
			}

			contractAddress := args[0]

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

			// Get contract ABI
			contractABI, err := contractService.GetContractABI(contractAddress)
			if err != nil {
				return fmt.Errorf("failed to get contract ABI: %w", err)
			}

			// List functions
			log.Info("Contract functions:")
			for name, method := range contractABI.Methods {
				signature := buildMethodSignature(method)
				mutability := "write"
				if method.IsConstant() {
					mutability = "read"
				}
				log.Info("Function", "name", name, "signature", signature, "type", mutability)
			}

			return nil
		},
	}

	return cmd
}

func buildMethodSignature(method abi.Method) string {
	inputs := make([]string, len(method.Inputs))
	for i, input := range method.Inputs {
		inputs[i] = input.Type.String()
	}
	return fmt.Sprintf("%s(%s)", method.Name, strings.Join(inputs, ","))
}
