package models

import (
	"encoding/json"
	"time"
)

// ContractDeployment representa um deployment de contrato
type ContractDeployment struct {
	Name                string                 `json:"name" yaml:"name"`
	Symbol              string                 `json:"symbol,omitempty" yaml:"symbol,omitempty"`
	Description         string                 `json:"description" yaml:"description"`
	ContractType        string                 `json:"contract_type" yaml:"contract_type"`
	SourceCode          string                 `json:"source_code" yaml:"source_code"`
	ABI                 json.RawMessage        `json:"abi" yaml:"abi"`
	Bytecode            string                 `json:"bytecode" yaml:"bytecode"`
	ConstructorArgs     []interface{}          `json:"constructor_args" yaml:"constructor_args"`
	CompilerVersion     string                 `json:"compiler_version" yaml:"compiler_version"`
	OptimizationEnabled bool                   `json:"optimization_enabled" yaml:"optimization_enabled"`
	OptimizationRuns    int                    `json:"optimization_runs" yaml:"optimization_runs"`
	LicenseType         string                 `json:"license_type" yaml:"license_type"`
	WebsiteURL          string                 `json:"website_url,omitempty" yaml:"website_url,omitempty"`
	GithubURL           string                 `json:"github_url,omitempty" yaml:"github_url,omitempty"`
	DocumentationURL    string                 `json:"documentation_url,omitempty" yaml:"documentation_url,omitempty"`
	Tags                []string               `json:"tags" yaml:"tags"`
	Metadata            map[string]interface{} `json:"metadata" yaml:"metadata"`

	// Campos de deployment
	Address         string    `json:"address,omitempty"`
	TransactionHash string    `json:"transaction_hash,omitempty"`
	BlockNumber     int64     `json:"block_number,omitempty"`
	GasUsed         int64     `json:"gas_used,omitempty"`
	Status          string    `json:"status,omitempty"`
	Verified        bool      `json:"verified,omitempty"`
	DeployedAt      time.Time `json:"deployed_at,omitempty"`
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
		Contract string `yaml:"contract,omitempty"`
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
	DeployedViaCLI      bool                   `json:"deployed_via_cli"`
	RegisterOnlyMain    bool                   `json:"register_only_main"`

	// Informações do deploy (quando disponíveis)
	CreatorAddress      string    `json:"creator_address,omitempty"`
	CreationTxHash      string    `json:"creation_tx_hash,omitempty"`
	CreationBlockNumber int64     `json:"creation_block_number,omitempty"`
	CreationTimestamp   time.Time `json:"creation_timestamp,omitempty"`
	GasUsed             int64     `json:"gas_used,omitempty"`
}

// DeployResult representa o resultado de um deploy
type DeployResult struct {
	Address     string        `json:"address"`
	TxHash      string        `json:"tx_hash"`
	BlockNumber int64         `json:"block_number"`
	GasUsed     uint64        `json:"gas_used"`
	Cost        string        `json:"cost"`
	Duration    time.Duration `json:"duration"`
	Timestamp   time.Time     `json:"timestamp"`
}

// DeploymentInfo representa informações de deployment
type DeploymentInfo struct {
	CreatorAddress string    `json:"creator_address"`
	TxHash         string    `json:"tx_hash"`
	BlockNumber    int64     `json:"block_number"`
	Timestamp      time.Time `json:"timestamp"`
	GasUsed        int64     `json:"gas_used"`
}

// RPCResponse representa uma resposta RPC
type RPCResponse struct {
	JSONRPC string    `json:"jsonrpc"`
	ID      int       `json:"id"`
	Result  string    `json:"result"`
	Error   *RPCError `json:"error"`
}

// RPCError representa um erro RPC
type RPCError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
}

// ContractInteraction representa uma interação com contrato
type ContractInteraction struct {
	Address   string        `json:"address"`
	Function  string        `json:"function"`
	Arguments []interface{} `json:"arguments"`
	Result    interface{}   `json:"result,omitempty"`
	TxHash    string        `json:"tx_hash,omitempty"`
	GasUsed   uint64        `json:"gas_used,omitempty"`
	Status    string        `json:"status"`
	Timestamp time.Time     `json:"timestamp"`
}
