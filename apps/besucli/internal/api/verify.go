package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"time"

	"github.com/hubweb3/besucli/internal/models"
	"github.com/hubweb3/besucli/pkg/logger"
)

var log = logger.New()

type VerifyService struct {
	baseURL string
	timeout time.Duration
}

func NewVerifyService(baseURL string) *VerifyService {
	return &VerifyService{
		baseURL: baseURL,
		timeout: 30 * time.Second,
	}
}

func (v *VerifyService) VerifyContract(address string, deployment *models.ContractDeployment, deployInfo *models.DeploymentInfo) error {
	log.Info("Sending contract for verification...")

	// If we don't have source code, use a placeholder or skip verification
	sourceCode := deployment.SourceCode
	if sourceCode == "" {
		log.Warning("Source code not available, using placeholder for verification")
		sourceCode = "// Source code not available - Deploy via ABI/Bytecode"
	}

	request := &models.ContractVerificationRequest{
		Address:             address,
		Name:                deployment.Name,
		Symbol:              deployment.Symbol,
		Description:         deployment.Description,
		ContractType:        deployment.ContractType,
		SourceCode:          sourceCode,
		ABI:                 deployment.ABI,
		Bytecode:            deployment.Bytecode,
		ConstructorArgs:     deployment.ConstructorArgs,
		CompilerVersion:     deployment.CompilerVersion,
		OptimizationEnabled: deployment.OptimizationEnabled,
		OptimizationRuns:    deployment.OptimizationRuns,
		LicenseType:         deployment.LicenseType,
		WebsiteURL:          deployment.WebsiteURL,
		GithubURL:           deployment.GithubURL,
		DocumentationURL:    deployment.DocumentationURL,
		Tags:                deployment.Tags,
		Metadata:            deployment.Metadata,
	}

	// Add deployment info if available
	if deployInfo != nil {
		request.CreatorAddress = deployInfo.CreatorAddress
		request.CreationTxHash = deployInfo.TxHash
		request.CreationBlockNumber = deployInfo.BlockNumber
		request.CreationTimestamp = deployInfo.Timestamp
		request.GasUsed = deployInfo.GasUsed
	}

	jsonData, err := json.Marshal(request)
	if err != nil {
		return fmt.Errorf("failed to serialize data: %w", err)
	}

	// Send to API
	url := fmt.Sprintf("%s/smart-contracts/verify", v.baseURL)
	client := &http.Client{Timeout: v.timeout}

	resp, err := client.Post(url, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := ioutil.ReadAll(resp.Body)
		return fmt.Errorf("verification failed (status %d): %s", resp.StatusCode, string(body))
	}

	log.Success("Contract verified successfully")
	return nil
}

func (v *VerifyService) ListContracts() ([]map[string]interface{}, error) {
	url := fmt.Sprintf("%s/smart-contracts", v.baseURL)
	client := &http.Client{Timeout: v.timeout}

	resp, err := client.Get(url)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := ioutil.ReadAll(resp.Body)
		return nil, fmt.Errorf("failed to list contracts (status %d): %s", resp.StatusCode, string(body))
	}

	var contracts []map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&contracts); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return contracts, nil
}
