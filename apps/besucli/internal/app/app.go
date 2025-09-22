package app

import (
	"github.com/spf13/cobra"

	"github.com/hubweb3/besucli/internal/commands"
	"github.com/hubweb3/besucli/internal/config"
	"github.com/hubweb3/besucli/pkg/logger"
)

type App struct {
	logger *logger.Logger
	config *config.Config
	rootCmd *cobra.Command
}

// New cria uma nova instância da aplicação
func New(log *logger.Logger) *App {
	app := &App{
		logger: log,
	}

	// Inicializar configuração padrão
	app.config = config.Default()

	app.setupRootCommand()
	app.setupCommands()

	return app
}

func (a *App) setupRootCommand() {
	a.rootCmd = &cobra.Command{
		Use:   "besucli",
		Short: "🚀 BesuCLI - Professional Interface for Hyperledger Besu",
		Long: `
╔══════════════════════════════════════════════════════════════════════════════╗
║                            🚀 BesuCLI v2.0                                  ║
║              Professional Interface for Hyperledger Besu                    ║
╚══════════════════════════════════════════════════════════════════════════════╝

BesuCLI is a complete and professional tool for:

📦 Smart Contract Deployment
   • Deploy via configurable YAML files
   • Automatic contract validation
   • Pre-configured templates

🔍 Automatic Verification
   • Verification on BesuScan Explorer
   • Complete and organized metadata
   • API integration

🔧 Contract Interaction
   • Read and write function calls
   • Transaction management
   • Real-time monitoring

⚙️  Advanced Configuration
   • Multiple network profiles
   • Wallet management
   • Customizable settings

Usage examples:
  besucli deploy token.yml                    # Deploy via YAML
  besucli validate counter.yml               # Validate contract
  besucli interact read 0x123... balanceOf   # Read function
  besucli list --verified                    # List verified contracts
  besucli config show                        # Show current configuration
		`,
		PersistentPreRunE: a.initializeConfig,
	}

	// Global flags
	a.rootCmd.PersistentFlags().String("config", "", "Configuration file (default: besucli.yaml)")
	a.rootCmd.PersistentFlags().BoolP("verbose", "v", false, "Verbose output")
	a.rootCmd.PersistentFlags().BoolP("quiet", "q", false, "Silent output")
	a.rootCmd.PersistentFlags().String("network", "", "Network to use")
}

func (a *App) setupCommands() {
	// Criar factory de comandos
	factory := commands.NewFactory(a.logger, a.config)

	// Adicionar todos os comandos
	a.rootCmd.AddCommand(factory.NewDeployCommand())
	a.rootCmd.AddCommand(factory.NewVerifyCommand())
	a.rootCmd.AddCommand(factory.NewInteractCommand())
	a.rootCmd.AddCommand(factory.NewListCommand())
	a.rootCmd.AddCommand(factory.NewConfigCommand())
	a.rootCmd.AddCommand(factory.NewValidateCommand())
	a.rootCmd.AddCommand(factory.NewVersionCommand())
}

func (a *App) initializeConfig(cmd *cobra.Command, args []string) error {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		a.logger.Warning("Using default configuration", "error", err)
		cfg = config.Default()
	}

	// Atualizar configuração se mudou
	if a.config != cfg {
		a.config = cfg
		// Recriar comandos com a nova configuração
		a.setupCommands()
	}

	return nil
}

func (a *App) Execute() error {
	return a.rootCmd.Execute()
}

func (a *App) GetConfig() *config.Config {
	return a.config
}
