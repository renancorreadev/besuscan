package commands

import (
	"fmt"
	"os"

	"github.com/hubweb3/besucli/internal/models"
	"github.com/hubweb3/besucli/pkg/logger"
	"github.com/spf13/cobra"
	"gopkg.in/yaml.v3"
)

// fileExists checks if a file exists
func fileExists(filename string) bool {
	_, err := os.Stat(filename)
	return !os.IsNotExist(err)
}

// NewValidateCommand creates the validation command
func NewValidateCommand(log *logger.Logger) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "validate [file.yml]",
		Short: "✅ Validate YAML configuration files",
		Long: `
╔══════════════════════════════════════════════════════════════════════════════╗
║                          ✅ CONFIGURATION VALIDATION                        ║
╚══════════════════════════════════════════════════════════════════════════════╝

Professional YAML file validation:
• 📋 YAML syntax validation
• 🔍 Schema validation
• 📁 Referenced file verification
• 💡 Improvement suggestions

Examples:
  besucli validate token.yml              # Validate specific file
  besucli validate templates/*.yml        # Validate multiple files
		`,
		Args: cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			return runValidate(cmd, args, log)
		},
	}

	cmd.Flags().Bool("strict", false, "Strict validation mode")
	cmd.Flags().Bool("warnings", true, "Show warnings")

	return cmd
}

func runValidate(cmd *cobra.Command, args []string, log *logger.Logger) error {
	filename := args[0]

	// Get flag values
	strict, _ := cmd.Flags().GetBool("strict")
	showWarnings, _ := cmd.Flags().GetBool("warnings")

	log.Banner("✅ VALIDATING YAML CONFIGURATION")
	log.Info("📄 File:", filename)
	if strict {
		log.Info("🔒 Mode: Strict validation enabled")
	}

	// Check if file exists
	if !fileExists(filename) {
		log.Error("❌ File not found", "file", filename)
		return fmt.Errorf("file not found: %s", filename)
	}

	// Load YAML file
	log.Progress("📋 Loading YAML file...")
	data, err := os.ReadFile(filename)
	if err != nil {
		return fmt.Errorf("failed to read file: %w", err)
	}

	// Parse YAML
	var contract models.ContractConfig
	if err := yaml.Unmarshal(data, &contract); err != nil {
		log.Error("❌ YAML PARSING ERROR:")
		log.Error("   ", err.Error())
		return fmt.Errorf("invalid YAML syntax: %w", err)
	}

	log.Success("✅ YAML syntax is valid")

	// Validate contract configuration
	log.Progress("🔍 Validating contract configuration...")
	errors, warnings := validateContractConfig(&contract)

	// In strict mode, treat warnings as errors
	if strict && len(warnings) > 0 {
		errors = append(errors, warnings...)
		warnings = nil
	}

	// Validate referenced files
	log.Progress("📁 Checking referenced files...")
	fileErrors := validateReferencedFiles(&contract)
	if len(fileErrors) > 0 {
		log.Error("❌ REFERENCED FILES NOT FOUND:")
		for _, err := range fileErrors {
			log.Error("   ", err)
		}
		return fmt.Errorf("referenced files not found")
	}

	// Display results
	if len(errors) > 0 {
		log.Error("❌ VALIDATION ERRORS:")
		for _, err := range errors {
			log.Error("   ", err)
		}
		return fmt.Errorf("validation failed with %d errors", len(errors))
	}

	// Show warnings only if the flag is enabled
	if showWarnings && len(warnings) > 0 {
		log.Warning("⚠️ VALIDATION WARNINGS:")
		for _, warning := range warnings {
			log.Warning("   ", warning)
		}
	}

	log.Success("🎉 Configuration is valid!")

	if showWarnings && len(warnings) > 0 {
		log.Info("💡 SUGGESTIONS FOR IMPROVEMENT:")
		log.Info("   • Add a detailed contract description")
		log.Info("   • Specify contract type for better categorization")
		log.Info("   • Add tags for easier searching")
		log.Info("   • Include website and documentation URLs")
		log.Info("   • Specify contract license")
		log.Info("")
		log.Info("📚 For more information:")
		log.Info("   • Use 'besucli deploy --help' to see all options")
		log.Info("   • Check templates/ directory for examples")
	}

	return nil
}

func validateContractConfig(contract *models.ContractConfig) ([]string, []string) {
	var errors []string
	var warnings []string

	// Required fields
	if contract.Contract.Name == "" {
		errors = append(errors, "Contract name is required")
	}

	if contract.Files.ABI == "" {
		errors = append(errors, "ABI file is required")
	}

	if contract.Files.Bytecode == "" {
		errors = append(errors, "Bytecode file is required")
	}

	// Optional but recommended fields
	if contract.Contract.Description == "" {
		warnings = append(warnings, "Contract description not provided")
	}

	if contract.Contract.Type == "" {
		warnings = append(warnings, "Contract type not specified")
	}

	if len(contract.Metadata.Tags) == 0 {
		warnings = append(warnings, "No tags specified")
	}

	if contract.Metadata.License == "" {
		warnings = append(warnings, "License not specified")
	}

	return errors, warnings
}

func validateReferencedFiles(contract *models.ContractConfig) []string {
	var errors []string

	// Check required files
	if contract.Files.ABI != "" && !fileExists(contract.Files.ABI) {
		errors = append(errors, fmt.Sprintf("ABI file not found: %s", contract.Files.ABI))
	}

	if contract.Files.Bytecode != "" && !fileExists(contract.Files.Bytecode) {
		errors = append(errors, fmt.Sprintf("Bytecode file not found: %s", contract.Files.Bytecode))
	}

	// Check optional contract file
	if contract.Files.Contract != "" && !fileExists(contract.Files.Contract) {
		errors = append(errors, fmt.Sprintf("Contract file not found: %s", contract.Files.Contract))
	}

	return errors
}
