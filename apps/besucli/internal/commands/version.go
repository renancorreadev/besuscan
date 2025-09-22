package commands

import (
	"runtime"

	"github.com/spf13/cobra"
	"github.com/hubweb3/besucli/pkg/logger"
)

var (
	Version    = "2.0.0"
	BuildTime  = "development"
	CommitHash = "dev"
)

// NewVersionCommand creates the version command
func NewVersionCommand(log *logger.Logger) *cobra.Command {
	return &cobra.Command{
		Use:   "version",
		Short: "📋 Show version information",
		Long: `
╔══════════════════════════════════════════════════════════════════════════════╗
║                           📋 VERSION INFORMATION                            ║
╚══════════════════════════════════════════════════════════════════════════════╝

Display detailed version information:
• 📋 Version details
• 🔨 Build information
• 💻 System information
• 🔗 Useful links
		`,
		RunE: func(cmd *cobra.Command, args []string) error {
			return showVersion(log)
		},
	}
}

func showVersion(log *logger.Logger) error {
	log.Banner("🚀 BesuCLI - Version Information")

	log.Info("📋 VERSION:")
	log.Info("   Version:", Version)
	log.Info("   Build:", BuildTime)
	log.Info("   Commit:", CommitHash)

	log.Info("💻 SYSTEM:")
	log.Info("   OS:", runtime.GOOS)
	log.Info("   Arch:", runtime.GOARCH)
	log.Info("   Go:", runtime.Version())

	log.Info("🔗 LINKS:")
	log.Info("   GitHub:", "https://github.com/hubweb3/besuscan")
	log.Info("   Docs:", "https://docs.besuscan.com")
	log.Info("   Explorer:", "https://besuscan.com")

	return nil
}
