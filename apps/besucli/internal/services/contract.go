package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"math/big"
	"net/http"
	"strconv"
	"strings"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"gopkg.in/yaml.v3"

	"github.com/hubweb3/besucli/internal/blockchain"
	"github.com/hubweb3/besucli/internal/models"
	"github.com/hubweb3/besucli/pkg/logger"
)

var log = logger.New()

type ContractService struct {
	client *blockchain.Client
	apiURL string
}

func NewContractService(client *blockchain.Client, apiURL string) *ContractService {
	return &ContractService{
		client: client,
		apiURL: apiURL,
	}
}

func (s *ContractService) LoadContractFiles(deployment *models.ContractDeployment, contractFile, abiFile, bytecodeFile string) error {
	log.Info("Loading contract files...")

	if contractFile != "" {
		// Load and compile .sol file (optional)
		sourceCode, err := ioutil.ReadFile(contractFile)
		if err != nil {
			return fmt.Errorf("failed to read contract file: %w", err)
		}
		deployment.SourceCode = string(sourceCode)
		log.Info("Source code loaded", "file", contractFile)
	}

	if abiFile != "" {
		// Load ABI file
		abiData, err := ioutil.ReadFile(abiFile)
		if err != nil {
			return fmt.Errorf("failed to read ABI file: %w", err)
		}
		deployment.ABI = json.RawMessage(abiData)
		log.Info("ABI loaded", "file", abiFile)
	}

	if bytecodeFile != "" {
		// Load bytecode file
		bytecodeData, err := ioutil.ReadFile(bytecodeFile)
		if err != nil {
			return fmt.Errorf("failed to read bytecode file: %w", err)
		}
		deployment.Bytecode = strings.TrimSpace(string(bytecodeData))
		log.Info("Bytecode loaded", "file", bytecodeFile)
	}

	return nil
}

func (s *ContractService) LoadContractConfig(configFile string) (*models.ContractConfig, error) {
	log.Info("Loading contract configuration", "file", configFile)

	data, err := ioutil.ReadFile(configFile)
	if err != nil {
		return nil, fmt.Errorf("failed to read config file: %w", err)
	}

	var config models.ContractConfig
	if err := yaml.Unmarshal(data, &config); err != nil {
		return nil, fmt.Errorf("failed to parse YAML: %w", err)
	}

	log.Success("Configuration loaded", "contract", config.Contract.Name)
	return &config, nil
}

func (s *ContractService) ParseConstructorArgs(contractABI abi.ABI, args []string) ([]interface{}, error) {
	if len(args) == 0 {
		return nil, nil
	}

	// Find constructor
	constructor := contractABI.Constructor
	if constructor.Inputs == nil || len(constructor.Inputs) == 0 {
		if len(args) > 0 {
			return nil, fmt.Errorf("contract has no constructor but arguments provided")
		}
		return nil, nil
	}

	if len(args) != len(constructor.Inputs) {
		return nil, fmt.Errorf("expected %d constructor arguments, got %d", len(constructor.Inputs), len(args))
	}

	parsedArgs := make([]interface{}, len(args))
	for i, arg := range args {
		input := constructor.Inputs[i]

		switch input.Type.T {
		case abi.UintTy:
			val, err := strconv.ParseUint(arg, 10, int(input.Type.Size))
			if err != nil {
				return nil, fmt.Errorf("failed to parse uint argument %d: %w", i, err)
			}
			switch input.Type.Size {
			case 8:
				parsedArgs[i] = uint8(val)
			case 16:
				parsedArgs[i] = uint16(val)
			case 32:
				parsedArgs[i] = uint32(val)
			case 64:
				parsedArgs[i] = uint64(val)
			default:
				bigVal := new(big.Int)
				bigVal.SetUint64(val)
				parsedArgs[i] = bigVal
			}
		case abi.IntTy:
			val, err := strconv.ParseInt(arg, 10, int(input.Type.Size))
			if err != nil {
				return nil, fmt.Errorf("failed to parse int argument %d: %w", i, err)
			}
			switch input.Type.Size {
			case 8:
				parsedArgs[i] = int8(val)
			case 16:
				parsedArgs[i] = int16(val)
			case 32:
				parsedArgs[i] = int32(val)
			case 64:
				parsedArgs[i] = int64(val)
			default:
				bigVal := new(big.Int)
				bigVal.SetInt64(val)
				parsedArgs[i] = bigVal
			}
		case abi.AddressTy:
			if !common.IsHexAddress(arg) {
				return nil, fmt.Errorf("invalid address format for argument %d: %s", i, arg)
			}
			parsedArgs[i] = common.HexToAddress(arg)
		case abi.BoolTy:
			val, err := strconv.ParseBool(arg)
			if err != nil {
				return nil, fmt.Errorf("failed to parse bool argument %d: %w", i, err)
			}
			parsedArgs[i] = val
		case abi.StringTy:
			parsedArgs[i] = arg
		case abi.BytesTy:
			if strings.HasPrefix(arg, "0x") {
				parsedArgs[i] = common.FromHex(arg)
			} else {
				parsedArgs[i] = []byte(arg)
			}
		case abi.TupleTy:
			// Handle tuples - expect JSON format
			var tupleData map[string]interface{}
			if err := json.Unmarshal([]byte(arg), &tupleData); err != nil {
				// Try array format for unnamed tuples
				var arrayData []interface{}
				if err2 := json.Unmarshal([]byte(arg), &arrayData); err2 != nil {
					return nil, fmt.Errorf("failed to parse tuple: %w", err)
				}
				tupleData = make(map[string]interface{})
				for idx, val := range arrayData {
					tupleData[fmt.Sprintf("%d", idx)] = val
				}
			}

			var tupleResult []interface{}
			for j, field := range input.Type.TupleElems {
				var fieldValue interface{}
				var exists bool

				if len(input.Type.TupleRawNames) > j && input.Type.TupleRawNames[j] != "" {
					fieldValue, exists = tupleData[input.Type.TupleRawNames[j]]
				}
				if !exists {
					fieldValue, exists = tupleData[fmt.Sprintf("%d", j)]
				}
				if !exists {
					return nil, fmt.Errorf("missing field %d in tuple", j)
				}

				fieldStr := fmt.Sprintf("%v", fieldValue)
				parsedField, err := s.parseFieldByType(*field, fieldStr)
				if err != nil {
					return nil, fmt.Errorf("failed to parse tuple field %d: %w", j, err)
				}
				tupleResult = append(tupleResult, parsedField)
			}

			parsedArgs[i] = tupleResult
		default:
			return nil, fmt.Errorf("unsupported argument type %s for argument %d", input.Type.String(), i)
		}
	}

	return parsedArgs, nil
}

func (s *ContractService) ListContracts() ([]map[string]interface{}, error) {
	url := fmt.Sprintf("%s/smart-contracts", s.apiURL)
	resp, err := http.Get(url)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch contracts: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API returned status %d", resp.StatusCode)
	}

	var contracts []map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&contracts); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return contracts, nil
}

func (s *ContractService) GetContractABI(contractAddress string) (abi.ABI, error) {
	url := fmt.Sprintf("%s/smart-contracts/%s/abi", s.apiURL, contractAddress)
	resp, err := http.Get(url)
	if err != nil {
		return abi.ABI{}, fmt.Errorf("failed to fetch ABI: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return abi.ABI{}, fmt.Errorf("contract not found or not verified")
	}

	var abiData json.RawMessage
	if err := json.NewDecoder(resp.Body).Decode(&abiData); err != nil {
		return abi.ABI{}, fmt.Errorf("failed to decode ABI: %w", err)
	}

	contractABI, err := abi.JSON(bytes.NewReader(abiData))
	if err != nil {
		return abi.ABI{}, fmt.Errorf("failed to parse ABI: %w", err)
	}

	return contractABI, nil
}

func (s *ContractService) CallContractFunction(contractAddress, functionName string, functionArgs []string, contractABI abi.ABI) (string, error) {
	// Find the method
	method, exists := contractABI.Methods[functionName]
	if !exists {
		return "", fmt.Errorf("method %s not found in contract ABI", functionName)
	}

	// Parse arguments
	parsedArgs, err := s.parseMethodArgs(method, functionArgs)
	if err != nil {
		return "", fmt.Errorf("failed to parse arguments: %w", err)
	}

	// Pack the method call
	data, err := contractABI.Pack(functionName, parsedArgs...)
	if err != nil {
		return "", fmt.Errorf("failed to pack method call: %w", err)
	}

	// Make the call
	result, err := s.callContractDirect(contractAddress, common.Bytes2Hex(data))
	if err != nil {
		return "", err
	}

	// Unpack the result
	unpacked, err := contractABI.Unpack(functionName, result)
	if err != nil {
		return "", fmt.Errorf("failed to unpack result: %w", err)
	}

	// Format the result
	if len(unpacked) == 0 {
		return "void", nil
	} else if len(unpacked) == 1 {
		return fmt.Sprintf("%v", unpacked[0]), nil
	} else {
		return fmt.Sprintf("%v", unpacked), nil
	}
}

func (s *ContractService) parseMethodArgs(method abi.Method, args []string) ([]interface{}, error) {
	if len(args) != len(method.Inputs) {
		return nil, fmt.Errorf("expected %d arguments, got %d", len(method.Inputs), len(args))
	}

	parsedArgs := make([]interface{}, len(args))
	for i, arg := range args {
		input := method.Inputs[i]

		switch input.Type.T {
		case abi.UintTy:
			val, err := strconv.ParseUint(arg, 10, int(input.Type.Size))
			if err != nil {
				return nil, fmt.Errorf("failed to parse uint argument %d: %w", i, err)
			}
			switch input.Type.Size {
			case 8:
				parsedArgs[i] = uint8(val)
			case 16:
				parsedArgs[i] = uint16(val)
			case 32:
				parsedArgs[i] = uint32(val)
			case 64:
				parsedArgs[i] = uint64(val)
			default:
				bigVal := new(big.Int)
				bigVal.SetUint64(val)
				parsedArgs[i] = bigVal
			}
		case abi.IntTy:
			val, err := strconv.ParseInt(arg, 10, int(input.Type.Size))
			if err != nil {
				return nil, fmt.Errorf("failed to parse int argument %d: %w", i, err)
			}
			switch input.Type.Size {
			case 8:
				parsedArgs[i] = int8(val)
			case 16:
				parsedArgs[i] = int16(val)
			case 32:
				parsedArgs[i] = int32(val)
			case 64:
				parsedArgs[i] = int64(val)
			default:
				bigVal := new(big.Int)
				bigVal.SetInt64(val)
				parsedArgs[i] = bigVal
			}
		case abi.AddressTy:
			if !common.IsHexAddress(arg) {
				return nil, fmt.Errorf("invalid address format for argument %d: %s", i, arg)
			}
			parsedArgs[i] = common.HexToAddress(arg)
		case abi.BoolTy:
			val, err := strconv.ParseBool(arg)
			if err != nil {
				return nil, fmt.Errorf("failed to parse bool argument %d: %w", i, err)
			}
			parsedArgs[i] = val
		case abi.StringTy:
			parsedArgs[i] = arg
		case abi.BytesTy:
			if strings.HasPrefix(arg, "0x") {
				parsedArgs[i] = common.FromHex(arg)
			} else {
				parsedArgs[i] = []byte(arg)
			}
		case abi.TupleTy:
			// Handle tuples in method arguments
			var tupleData map[string]interface{}
			if err := json.Unmarshal([]byte(arg), &tupleData); err != nil {
				var arrayData []interface{}
				if err2 := json.Unmarshal([]byte(arg), &arrayData); err2 != nil {
					return nil, fmt.Errorf("failed to parse tuple: %w", err)
				}
				tupleData = make(map[string]interface{})
				for idx, val := range arrayData {
					tupleData[fmt.Sprintf("%d", idx)] = val
				}
			}

			var tupleResult []interface{}
			for j, field := range input.Type.TupleElems {
				var fieldValue interface{}
				var exists bool

				if len(input.Type.TupleRawNames) > j && input.Type.TupleRawNames[j] != "" {
					fieldValue, exists = tupleData[input.Type.TupleRawNames[j]]
				}
				if !exists {
					fieldValue, exists = tupleData[fmt.Sprintf("%d", j)]
				}
				if !exists {
					return nil, fmt.Errorf("missing field %d in tuple", j)
				}

				fieldStr := fmt.Sprintf("%v", fieldValue)
				parsedField, err := s.parseFieldByType(*field, fieldStr)
				if err != nil {
					return nil, fmt.Errorf("failed to parse tuple field %d: %w", j, err)
				}
				tupleResult = append(tupleResult, parsedField)
			}

			parsedArgs[i] = tupleResult
		default:
			return nil, fmt.Errorf("unsupported argument type %s for argument %d", input.Type.String(), i)
		}
	}

	return parsedArgs, nil
}

func (s *ContractService) callContractDirect(contractAddress, data string) ([]byte, error) {
	// Use the blockchain client to make eth_call
	client := s.client.GetClient()

	// Prepare call message
	msg := ethereum.CallMsg{
		To:   &common.Address{},
		Data: common.FromHex(data),
	}

	// Parse contract address
	if !common.IsHexAddress(contractAddress) {
		return nil, fmt.Errorf("invalid contract address: %s", contractAddress)
	}
	contractAddr := common.HexToAddress(contractAddress)
	msg.To = &contractAddr

	// Make the call
	result, err := client.CallContract(context.Background(), msg, nil)
	if err != nil {
		return nil, fmt.Errorf("contract call failed: %w", err)
	}

	return result, nil
}

func (s *ContractService) WriteContractFunction(contractAddress, functionName string, functionArgs []string, contractABI abi.ABI, gasLimit uint64, gasPrice, value string) (string, error) {
	// Find the method
	method, exists := contractABI.Methods[functionName]
	if !exists {
		return "", fmt.Errorf("method %s not found in contract ABI", functionName)
	}

	// Parse arguments
	parsedArgs, err := s.parseMethodArgs(method, functionArgs)
	if err != nil {
		return "", fmt.Errorf("failed to parse arguments: %w", err)
	}

	// Pack the method call
	data, err := contractABI.Pack(functionName, parsedArgs...)
	if err != nil {
		return "", fmt.Errorf("failed to pack method call: %w", err)
	}

	// Parse contract address
	if !common.IsHexAddress(contractAddress) {
		return "", fmt.Errorf("invalid contract address: %s", contractAddress)
	}
	contractAddr := common.HexToAddress(contractAddress)

	// Parse value (ETH amount to send)
	var ethValue *big.Int
	if value != "" && value != "0" {
		ethValue, err = parseEtherValue(value)
		if err != nil {
			return "", fmt.Errorf("invalid value: %w", err)
		}
	} else {
		ethValue = big.NewInt(0)
	}

	// Get client and prepare transaction
	client := s.client.GetClient()
	fromAddress := s.client.GetFromAddress()
	privateKey := s.client.GetPrivateKey()
	chainID := s.client.GetChainID()

	// Get nonce
	nonce, err := client.PendingNonceAt(context.Background(), fromAddress)
	if err != nil {
		return "", fmt.Errorf("failed to get nonce: %w", err)
	}

	// Configure gas
	if gasLimit == 0 {
		// Estimate gas
		msg := ethereum.CallMsg{
			From:  fromAddress,
			To:    &contractAddr,
			Value: ethValue,
			Data:  data,
		}
		gasLimit, err = client.EstimateGas(context.Background(), msg)
		if err != nil {
			return "", fmt.Errorf("failed to estimate gas: %w", err)
		}
		// Add 20% buffer
		gasLimit = gasLimit * 120 / 100
	}

	var gasPriceBig *big.Int
	if gasPrice != "" {
		gasPriceBig, err = parseGasPrice(gasPrice)
		if err != nil {
			return "", fmt.Errorf("invalid gas price: %w", err)
		}
	} else {
		// Get suggested gas price
		gasPriceBig, err = client.SuggestGasPrice(context.Background())
		if err != nil {
			return "", fmt.Errorf("failed to get gas price: %w", err)
		}
	}

	// Create transaction
	tx := types.NewTransaction(nonce, contractAddr, ethValue, gasLimit, gasPriceBig, data)

	// Sign transaction
	signedTx, err := types.SignTx(tx, types.NewEIP155Signer(chainID), privateKey)
	if err != nil {
		return "", fmt.Errorf("failed to sign transaction: %w", err)
	}

	// Send transaction
	err = client.SendTransaction(context.Background(), signedTx)
	if err != nil {
		return "", fmt.Errorf("failed to send transaction: %w", err)
	}

	return signedTx.Hash().Hex(), nil
}

func parseEtherValue(value string) (*big.Int, error) {
	// Parse value as float and convert to Wei
	ethValue, ok := new(big.Float).SetString(value)
	if !ok {
		return nil, fmt.Errorf("invalid ether value: %s", value)
	}

	// Convert to Wei (multiply by 10^18)
	weiValue := new(big.Float).Mul(ethValue, big.NewFloat(1e18))

	// Convert to big.Int
	result, _ := weiValue.Int(nil)
	return result, nil
}

func parseGasPrice(gasPrice string) (*big.Int, error) {
	// Parse gas price in Gwei and convert to Wei
	gweiValue, ok := new(big.Float).SetString(gasPrice)
	if !ok {
		return nil, fmt.Errorf("invalid gas price: %s", gasPrice)
	}

	// Convert to Wei (multiply by 10^9)
	weiValue := new(big.Float).Mul(gweiValue, big.NewFloat(1e9))

	// Convert to big.Int
	result, _ := weiValue.Int(nil)
	return result, nil
}

func (s *ContractService) GetAPIURL() string {
	return s.apiURL
}

func (s *ContractService) parseFieldByType(fieldType abi.Type, value string) (interface{}, error) {
	switch fieldType.T {
	case abi.UintTy:
		if strings.HasPrefix(value, "0x") {
			bigVal := new(big.Int)
			bigVal.SetString(value[2:], 16)
			return bigVal, nil
		}
		val, err := strconv.ParseUint(value, 10, int(fieldType.Size))
		if err != nil {
			bigVal := new(big.Int)
			if _, ok := bigVal.SetString(value, 10); !ok {
				return nil, fmt.Errorf("invalid uint value: %s", value)
			}
			return bigVal, nil
		}
		if fieldType.Size <= 64 {
			return val, nil
		}
		bigVal := new(big.Int)
		bigVal.SetUint64(val)
		return bigVal, nil
	case abi.IntTy:
		if strings.HasPrefix(value, "0x") {
			bigVal := new(big.Int)
			bigVal.SetString(value[2:], 16)
			return bigVal, nil
		}
		val, err := strconv.ParseInt(value, 10, int(fieldType.Size))
		if err != nil {
			bigVal := new(big.Int)
			if _, ok := bigVal.SetString(value, 10); !ok {
				return nil, fmt.Errorf("invalid int value: %s", value)
			}
			return bigVal, nil
		}
		if fieldType.Size <= 64 {
			return val, nil
		}
		bigVal := new(big.Int)
		bigVal.SetInt64(val)
		return bigVal, nil
	case abi.BoolTy:
		return strconv.ParseBool(value)
	case abi.AddressTy:
		if !common.IsHexAddress(value) {
			return nil, fmt.Errorf("invalid address: %s", value)
		}
		return common.HexToAddress(value), nil
	case abi.StringTy:
		return value, nil
	case abi.BytesTy:
		if strings.HasPrefix(value, "0x") {
			return common.FromHex(value), nil
		}
		return []byte(value), nil
	default:
		return nil, fmt.Errorf("unsupported field type: %s", fieldType.String())
	}
}
