package commands

import (
	"fmt"

	"github.com/spf13/cobra"
	"github.com/spf13/viper"

	"github.com/hubweb3/besucli/internal/blockchain"
	"github.com/hubweb3/besucli/internal/services"
)

func NewListCommand() *cobra.Command {
	var (
		verified bool
		limit    int
		offset   int
	)

	cmd := &cobra.Command{
		Use:   "list",
		Short: "List smart contracts",
		Long:  "List deployed and verified smart contracts",
		RunE: func(cmd *cobra.Command, args []string) error {
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

			contracts, err := contractService.ListContracts()
			if err != nil {
				return fmt.Errorf("failed to list contracts: %w", err)
			}

			if len(contracts) == 0 {
				log.Info("No contracts found")
				return nil
			}

			log.Info("Found contracts", "count", len(contracts))
			for i, contract := range contracts {
				log.Info("Contract", "index", i+1, "name", contract["name"], "address", contract["address"])
				if contractType, ok := contract["type"]; ok {
					log.Info("  Type", "type", contractType)
				}
				if verified, ok := contract["verified"].(bool); ok && verified {
					log.Success("  ✅ Verified")
				}
			}

			return nil
		},
	}

	cmd.Flags().BoolVar(&verified, "verified", false, "Show only verified contracts")
	cmd.Flags().IntVar(&limit, "limit", 50, "Maximum number of contracts to show")
	cmd.Flags().IntVar(&offset, "offset", 0, "Number of contracts to skip")

	return cmd
}
