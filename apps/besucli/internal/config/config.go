package config

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/spf13/viper"
	"gopkg.in/yaml.v3"
	"github.com/hubweb3/besucli/pkg/logger"
)

var log = logger.New()

type Config struct {
	Network NetworkConfig `yaml:"network" mapstructure:"network"`
	API     APIConfig     `yaml:"api" mapstructure:"api"`
	Gas     GasConfig     `yaml:"gas" mapstructure:"gas"`
	Wallet  WalletConfig  `yaml:"wallet" mapstructure:"wallet"`
	Logging LoggingConfig `yaml:"logging" mapstructure:"logging"`
}

type NetworkConfig struct {
	Name    string `yaml:"name" mapstructure:"name"`
	RPCURL  string `yaml:"rpc_url" mapstructure:"rpc_url"`
	ChainID int64  `yaml:"chain_id" mapstructure:"chain_id"`
}

type APIConfig struct {
	BaseURL string `yaml:"base_url" mapstructure:"base_url"`
	Timeout int    `yaml:"timeout" mapstructure:"timeout"`
	Retries int    `yaml:"retries" mapstructure:"retries"`
}

type GasConfig struct {
	Limit uint64 `yaml:"limit" mapstructure:"limit"`
	Price string `yaml:"price" mapstructure:"price"`
	Auto  bool   `yaml:"auto" mapstructure:"auto"`
}

type WalletConfig struct {
	PrivateKey string `yaml:"private_key" mapstructure:"private_key"`
	Address    string `yaml:"address" mapstructure:"address"`
}

type LoggingConfig struct {
	Level  string `yaml:"level" mapstructure:"level"`
	Format string `yaml:"format" mapstructure:"format"`
}

// Load loads configuration - função global
func Load() (*Config, error) {
	cfg := &Config{}

	// Setup viper
	viper.SetConfigName("besucli")
	viper.SetConfigType("yaml")
	viper.AddConfigPath(".")
	viper.AddConfigPath("$HOME/.besucli")
	viper.AddConfigPath("/etc/besucli")

	// Try to read configuration file
	if err := viper.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); ok {
			// Configuration file not found, create default
			*cfg = *Default()
			return cfg, cfg.createDefaultConfig()
		}
		return nil, fmt.Errorf("failed to read configuration: %w", err)
	}

	// Unmarshal configuration
	if err := viper.Unmarshal(cfg); err != nil {
		return nil, fmt.Errorf("failed to decode configuration: %w", err)
	}

	return cfg, nil
}

// Default returns default configuration
func Default() *Config {
	return &Config{
		Network: NetworkConfig{
			Name:    "besu-local",
			RPCURL:  "http://144.22.179.183",
			ChainID: 1337,
		},
		API: APIConfig{
			BaseURL: "http://localhost:8080/api",
			Timeout: 30,
			Retries: 3,
		},
		Gas: GasConfig{
			Limit: 300000,
			Price: "20000000000", // 20 gwei
			Auto:  false,
		},
		Wallet: WalletConfig{
			PrivateKey: "",
			Address:    "",
		},
		Logging: LoggingConfig{
			Level:  "info",
			Format: "text",
		},
	}
}

// createDefaultConfig creates default configuration file
func (c *Config) createDefaultConfig() error {
	*c = *Default()

	// Create configuration directory if it doesn't exist
	configDir := filepath.Dir(viper.ConfigFileUsed())
	if err := os.MkdirAll(configDir, 0755); err != nil {
		return fmt.Errorf("failed to create configuration directory: %w", err)
	}

	// Save default configuration
	return c.saveConfig()
}

// saveConfig saves configuration to file
func (c *Config) saveConfig() error {
	data, err := yaml.Marshal(c)
	if err != nil {
		return fmt.Errorf("failed to marshal configuration: %w", err)
	}

	return os.WriteFile(viper.ConfigFileUsed(), data, 0644)
}

// Validate validates configuration
func (c *Config) Validate() error {
	if c.Network.RPCURL == "" {
		return fmt.Errorf("network RPC URL is required")
	}

	if c.API.BaseURL == "" {
		return fmt.Errorf("API base URL is required")
	}

	return nil
}

// SetWallet sets wallet configuration
func (c *Config) SetWallet(privateKey, address string) error {
	c.Wallet.PrivateKey = privateKey
	c.Wallet.Address = address
	return c.saveConfig()
}

// SetNetwork sets network configuration
func (c *Config) SetNetwork(name, rpcURL string, chainID int64) error {
	c.Network.Name = name
	c.Network.RPCURL = rpcURL
	c.Network.ChainID = chainID
	return c.saveConfig()
}
