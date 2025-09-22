package commands

import (
	"bufio"
	"fmt"
	"os"
	"strings"

	"github.com/fatih/color"
	"github.com/spf13/cobra"
	"github.com/spf13/viper"

	"github.com/hubweb3/besucli/pkg/logger"
)

var log = logger.New()

func NewConfigCommand() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "config",
		Short: "Configure CLI",
		Long:  "Manage CLI configurations",
	}

	cmd.AddCommand(
		newSetWalletCommand(),
		newSetNetworkCommand(),
		newShowConfigCommand(),
	)

	return cmd
}

func newSetWalletCommand() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "set-wallet",
		Short: "Configure wallet private key",
		Long:  "Set the private key for transaction signing",
		RunE: func(cmd *cobra.Command, args []string) error {
			reader := bufio.NewReader(os.Stdin)

			fmt.Print("Enter private key (without 0x prefix): ")
			privateKey, err := reader.ReadString('\n')
			if err != nil {
				return fmt.Errorf("failed to read private key: %w", err)
			}

			privateKey = strings.TrimSpace(privateKey)
			if privateKey == "" {
				return fmt.Errorf("private key cannot be empty")
			}

			// Remove 0x prefix if present
			if strings.HasPrefix(privateKey, "0x") {
				privateKey = privateKey[2:]
			}

			// Validate private key length
			if len(privateKey) != 64 {
				return fmt.Errorf("invalid private key length: expected 64 characters, got %d", len(privateKey))
			}

			// Set in viper and save
			viper.Set("wallet.private_key", privateKey)
			if err := viper.WriteConfig(); err != nil {
				return fmt.Errorf("failed to save configuration: %w", err)
			}

			log.Success("Wallet configured successfully")
			return nil
		},
	}

	return cmd
}

func newSetNetworkCommand() *cobra.Command {
	var (
		rpcURL  string
		name    string
		chainID int64
	)

	cmd := &cobra.Command{
		Use:   "set-network",
		Short: "Configure network settings",
		Long:  "Set RPC URL, network name, and chain ID",
		RunE: func(cmd *cobra.Command, args []string) error {
			if rpcURL != "" {
				viper.Set("network.rpc_url", rpcURL)
			}
			if name != "" {
				viper.Set("network.name", name)
			}
			if chainID != 0 {
				viper.Set("network.chain_id", chainID)
			}

			if err := viper.WriteConfig(); err != nil {
				return fmt.Errorf("failed to save configuration: %w", err)
			}

			log.Success("Network configuration updated")
			return nil
		},
	}

	cmd.Flags().StringVar(&rpcURL, "rpc-url", "", "RPC URL for blockchain connection")
	cmd.Flags().StringVar(&name, "name", "", "Network name")
	cmd.Flags().Int64Var(&chainID, "chain-id", 0, "Chain ID")

	return cmd
}

func newShowConfigCommand() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "show",
		Short: "Show current configuration",
		Long:  "Display current CLI configuration",
		RunE: func(cmd *cobra.Command, args []string) error {
			// Banner
			fmt.Println(color.CyanString(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                            🚀 Current Configuration                         ║
╚══════════════════════════════════════════════════════════════════════════════╝`))

			// Network Configuration
			fmt.Println(color.BlueString("🌐 Network Configuration:"))
			fmt.Printf("   Name: %s\n", color.WhiteString(viper.GetString("network.name")))
			fmt.Printf("   RPC URL: %s\n", color.CyanString(viper.GetString("network.rpc_url")))
			chainID := viper.GetInt64("network.chain_id")
			if chainID > 0 {
				fmt.Printf("   Chain ID: %s\n", color.WhiteString(fmt.Sprintf("%d", chainID)))
			}
			fmt.Println()

			// API Configuration
			fmt.Println(color.BlueString("🔗 API Configuration:"))
			fmt.Printf("   Base URL: %s\n", color.CyanString(viper.GetString("api.base_url")))
			fmt.Println()

			// Gas Configuration
			fmt.Println(color.BlueString("⛽ Gas Configuration:"))
			fmt.Printf("   Limit: %s\n", color.WhiteString(fmt.Sprintf("%d", viper.GetUint64("gas.limit"))))
			gasPrice := viper.GetString("gas.price")
			if gasPrice == "" || gasPrice == "0" {
				fmt.Printf("   Price: %s\n", color.YellowString("Auto (network default)"))
			} else {
				fmt.Printf("   Price: %s\n", color.WhiteString(gasPrice+" wei"))
			}
			fmt.Println()

			// Wallet Configuration
			fmt.Println(color.BlueString("💰 Wallet Configuration:"))
			privateKey := viper.GetString("wallet.private_key")
			if privateKey != "" {
				fmt.Printf("   Status: %s\n", color.GreenString("Configured ✅"))
			} else {
				fmt.Printf("   Status: %s\n", color.RedString("Not configured ❌"))
				fmt.Printf("   Tip: %s\n", color.YellowString("Use 'besucli config set-wallet' to configure"))
			}

			return nil
		},
	}

	return cmd
}
