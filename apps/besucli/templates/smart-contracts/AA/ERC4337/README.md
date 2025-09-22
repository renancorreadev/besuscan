Account Abstraction
Unlike Externally Owned Accounts (EOAs), smart contracts may contain arbitrary verification logic based on authentication mechanisms different to Ethereum’s native ECDSA and have execution advantages such as batching or gas sponsorship. To leverage these properties of smart contracts, the community has widely adopted ERC-4337, a standard to process user operations through an alternative mempool.

The library provides multiple contracts for Account Abstraction following this standard as it enables more flexible and user-friendly interactions with applications. Account Abstraction use cases include wallets in novel contexts (e.g. embedded wallets), more granular configuration of accounts, and recovery mechanisms.

ERC-4337 Overview
The ERC-4337 is a detailed specification of how to implement the necessary logic to handle operations without making changes to the protocol level (i.e. the rules of the blockchain itself). This specification defines the following components:

UserOperation
A UserOperation is a higher-layer pseudo-transaction object that represents the intent of the account. This shares some similarities with regular EVM transactions like the concept of gasFees or callData but includes fields that enable new capabilities.

struct PackedUserOperation {
    address sender;
    uint256 nonce;
    bytes initCode; // concatenation of factory address and factoryData (or empty)
    bytes callData;
    bytes32 accountGasLimits; // concatenation of verificationGas (16 bytes) and callGas (16 bytes)
    uint256 preVerificationGas;
    bytes32 gasFees; // concatenation of maxPriorityFee (16 bytes) and maxFeePerGas (16 bytes)
    bytes paymasterAndData; // concatenation of paymaster fields (or empty)
    bytes signature;
}
This process of bundling user operations involves several costs that the bundler must cover, including base transaction fees, calldata serialization, entrypoint execution, and paymaster context costs. To compensate for these expenses, bundlers use the preVerificationGas and gasFees fields to charge users appropriately.

Estimating preVerificationGas is not standardized as it varies based on network conditions such as gas prices and the size of the operation bundle.
Use ERC4337Utils to manipulate the UserOperation struct and other ERC-4337 related values.
Entrypoint
Each UserOperation is executed through a contract known as the EntryPoint. This contract is a singleton deployed across multiple networks at the same address although other custom implementations may be used.

The Entrypoint contracts is considered a trusted entity by the account.

Bundlers
The bundler is a piece of offchain infrastructure that is in charge of processing an alternative mempool of user operations. Bundlers themselves call the Entrypoint contract’s handleOps function with an array of UserOperations that are executed and included in a block.

During the process, the bundler pays for the gas of executing the transaction and gets refunded during the execution phase of the Entrypoint contract.

/// @dev Process `userOps` and `beneficiary` receives all
/// the gas fees collected during the bundle execution.
function handleOps(
    PackedUserOperation[] calldata ops,
    address payable beneficiary
) external { ... }
Account Contract
The Account Contract is a smart contract that implements the logic required to validate a UserOperation in the context of ERC-4337. Any smart contract account should conform with the IAccount interface to validate operations.

interface IAccount {
    function validateUserOp(PackedUserOperation calldata, bytes32, uint256) external returns (uint256 validationData);
}
Similarly, an Account should have a way to execute these operations by either handling arbitrary calldata on its fallback or implementing the IAccountExecute interface:

interface IAccountExecute {
    function executeUserOp(PackedUserOperation calldata userOp, bytes32 userOpHash) external;
}
The IAccountExecute interface is optional. Developers might want to use ERC-7821 for a minimal batched execution interface or rely on ERC-7579 or any other execution logic.
To build your own account, see accounts.

Factory Contract
The smart contract accounts are created by a Factory contract defined by the Account developer. This factory receives arbitrary bytes as initData and returns an address where the logic of the account is deployed.

To build your own factory, see account factories.

Paymaster Contract
A Paymaster is an optional entity that can sponsor gas fees for Accounts, or allow them to pay for those fees in ERC-20 instead of native currency. This abstracts gas away of the user experience in the same way that computational costs of cloud servers are abstracted away from end-users.

To build your own paymaster, see paymasters.

Further notes
ERC-7562 Validation Rules
To process a bundle of UserOperations, bundlers call validateUserOp on each operation sender to check whether the operation can be executed. However, the bundler has no guarantee that the state of the blockchain will remain the same after the validation phase. To overcome this problem, ERC-7562 proposes a set of limitations to EVM code so that bundlers (or node operators) are protected from unexpected state changes.

These rules outline the requirements for operations to be processed by the canonical mempool.

Accounts can access its own storage during the validation phase, they might easily violate ERC-7562 storage access rules in undirect ways. For example, most accounts access their public keys from storage when validating a signature, limiting the ability of having accounts that validate operations for other accounts (e.g. via ERC-1271)
