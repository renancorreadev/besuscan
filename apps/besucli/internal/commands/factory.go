package commands

import (
	"github.com/spf13/cobra"
	"github.com/hubweb3/besucli/internal/config"
	"github.com/hubweb3/besucli/pkg/logger"
)

// Factory cria instâncias de comandos com dependências injetadas
type Factory struct {
	logger *logger.Logger
	config *config.Config
}

// NewFactory cria uma nova factory
func NewFactory(logger *logger.Logger, cfg *config.Config) *Factory {
	return &Factory{
		logger: logger,
		config: cfg,
	}
}

// NewDeployCommand cria comando de deploy
func (f *Factory) NewDeployCommand() *cobra.Command {
	return NewDeployCommand(f.config)
}

// NewRegisterCommand cria comando de registro
func (f *Factory) NewRegisterCommand() *cobra.Command {
	return NewRegisterCommand(f.config)
}

// NewVerifyCommand cria comando de verificação
func (f *Factory) NewVerifyCommand() *cobra.Command {
	return NewVerifyCommand()
}

// NewInteractCommand cria comando de interação
func (f *Factory) NewInteractCommand() *cobra.Command {
	return NewInteractCommand()
}

// NewListCommand cria comando de listagem
func (f *Factory) NewListCommand() *cobra.Command {
	return NewListCommand()
}

// NewConfigCommand cria comando de configuração
func (f *Factory) NewConfigCommand() *cobra.Command {
	return NewConfigCommand()
}

// NewValidateCommand cria comando de validação
func (f *Factory) NewValidateCommand() *cobra.Command {
	return NewValidateCommand(f.logger)
}

// NewVersionCommand cria comando de versão
func (f *Factory) NewVersionCommand() *cobra.Command {
	return NewVersionCommand(f.logger)
}
