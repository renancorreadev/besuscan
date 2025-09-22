package entities

import (
	"math/big"
	"time"
)

// AccountAnalytics representa métricas analíticas de uma conta
type AccountAnalytics struct {
	Address              string    `json:"address"`
	Date                 time.Time `json:"date"`
	TransactionsCount    uint64    `json:"transactions_count"`
	UniqueAddressesCount uint64    `json:"unique_addresses_count"`
	GasUsed              *big.Int  `json:"gas_used"`
	ValueTransferred     *big.Int  `json:"value_transferred"`
	AvgGasPerTx          *big.Int  `json:"avg_gas_per_tx"`
	SuccessRate          float64   `json:"success_rate"`
	ContractCallsCount   uint64    `json:"contract_calls_count"`
	TokenTransfersCount  uint64    `json:"token_transfers_count"`
	CreatedAt            time.Time `json:"created_at"`
	UpdatedAt            time.Time `json:"updated_at"`
}

// NewAccountAnalytics cria uma nova instância de AccountAnalytics
func NewAccountAnalytics(address string, date time.Time) *AccountAnalytics {
	now := time.Now()
	return &AccountAnalytics{
		Address:              address,
		Date:                 date,
		TransactionsCount:    0,
		UniqueAddressesCount: 0,
		GasUsed:              big.NewInt(0),
		ValueTransferred:     big.NewInt(0),
		AvgGasPerTx:          big.NewInt(0),
		SuccessRate:          0.0,
		ContractCallsCount:   0,
		TokenTransfersCount:  0,
		CreatedAt:            now,
		UpdatedAt:            now,
	}
}

// AccountTag representa uma tag associada a uma conta
type AccountTag struct {
	Address   string    `json:"address"`
	Tag       string    `json:"tag"`
	CreatedBy string    `json:"created_by"`
	CreatedAt time.Time `json:"created_at"`
}

// NewAccountTag cria uma nova instância de AccountTag
func NewAccountTag(address, tag, createdBy string) *AccountTag {
	return &AccountTag{
		Address:   address,
		Tag:       tag,
		CreatedBy: createdBy,
		CreatedAt: time.Now(),
	}
}

// ContractInteraction representa uma interação com contrato
type ContractInteraction struct {
	ID                uint64    `json:"id"`
	AccountAddress    string    `json:"account_address"`
	ContractAddress   string    `json:"contract_address"`
	ContractName      *string   `json:"contract_name"`
	Method            *string   `json:"method"`
	InteractionsCount uint64    `json:"interactions_count"`
	LastInteraction   time.Time `json:"last_interaction"`
	FirstInteraction  time.Time `json:"first_interaction"`
	TotalGasUsed      *big.Int  `json:"total_gas_used"`
	TotalValueSent    *big.Int  `json:"total_value_sent"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
}

// NewContractInteraction cria uma nova instância de ContractInteraction
func NewContractInteraction(accountAddress, contractAddress string) *ContractInteraction {
	now := time.Now()
	return &ContractInteraction{
		AccountAddress:    accountAddress,
		ContractAddress:   contractAddress,
		InteractionsCount: 1,
		LastInteraction:   now,
		FirstInteraction:  now,
		TotalGasUsed:      big.NewInt(0),
		TotalValueSent:    big.NewInt(0),
		CreatedAt:         now,
		UpdatedAt:         now,
	}
}

// TokenHolding representa um token mantido por uma conta
type TokenHolding struct {
	AccountAddress string    `json:"account_address"`
	TokenAddress   string    `json:"token_address"`
	TokenSymbol    string    `json:"token_symbol"`
	TokenName      string    `json:"token_name"`
	TokenDecimals  uint8     `json:"token_decimals"`
	Balance        *big.Int  `json:"balance"`
	ValueUSD       *big.Int  `json:"value_usd"`
	LastUpdated    time.Time `json:"last_updated"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

// NewTokenHolding cria uma nova instância de TokenHolding
func NewTokenHolding(accountAddress, tokenAddress, symbol, name string, decimals uint8) *TokenHolding {
	now := time.Now()
	return &TokenHolding{
		AccountAddress: accountAddress,
		TokenAddress:   tokenAddress,
		TokenSymbol:    symbol,
		TokenName:      name,
		TokenDecimals:  decimals,
		Balance:        big.NewInt(0),
		ValueUSD:       big.NewInt(0),
		LastUpdated:    now,
		CreatedAt:      now,
		UpdatedAt:      now,
	}
}

// UpdateBalance atualiza o saldo do token
func (th *TokenHolding) UpdateBalance(balance *big.Int, valueUSD *big.Int) {
	th.Balance = balance
	th.ValueUSD = valueUSD
	th.LastUpdated = time.Now()
	th.UpdatedAt = time.Now()
}
