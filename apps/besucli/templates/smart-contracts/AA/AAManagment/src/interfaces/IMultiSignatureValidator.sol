// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IMultiSignatureValidator
 * @dev Interface para validação de múltiplas assinaturas em transações
 */
interface IMultiSignatureValidator {
    // ============= ENUMS =============
    enum TransactionStatus {
        PENDING,
        APPROVED,
        EXECUTED,
        REJECTED,
        EXPIRED
    }

    enum SignerRole {
        OWNER,
        OPERATOR,
        SUPERVISOR,
        EMERGENCY
    }

    // ============= STRUCTS =============
    struct MultiSigConfig {
        uint256 requiredSignatures;
        uint256 threshold; // Valor acima do qual requer multi-sig
        uint256 timelock; // Delay em segundos antes da execução
        uint256 expirationTime; // Tempo limite para aprovação
        bool isActive;
    }

    struct Signer {
        address signerAddress;
        SignerRole role;
        uint256 weight; // Peso da assinatura
        bool isActive;
        uint256 addedAt;
    }

    struct Transaction {
        bytes32 txHash;
        address target;
        uint256 value;
        bytes data;
        uint256 createdAt;
        uint256 executionTime; // Quando pode ser executada (após timelock)
        uint256 expiresAt;
        TransactionStatus status;
        uint256 approvals;
        uint256 totalWeight;
        mapping(address => bool) hasApproved;
        address[] approvers;
    }

    struct TransactionView {
        bytes32 txHash;
        address target;
        uint256 value;
        bytes data;
        uint256 createdAt;
        uint256 executionTime;
        uint256 expiresAt;
        TransactionStatus status;
        uint256 approvals;
        uint256 totalWeight;
        address[] approvers;
    }

    // ============= EVENTS =============
    event MultiSigConfigUpdated(
        address indexed account,
        uint256 requiredSignatures,
        uint256 threshold,
        uint256 timelock
    );
    event SignerAdded(
        address indexed account,
        address indexed signer,
        SignerRole role,
        uint256 weight
    );
    event SignerRemoved(
        address indexed account,
        address indexed signer
    );
    event SignerStatusChanged(
        address indexed account,
        address indexed signer,
        bool isActive
    );
    event TransactionCreated(
        address indexed account,
        bytes32 indexed txHash,
        address target,
        uint256 value,
        uint256 expiresAt
    );
    event TransactionApproved(
        address indexed account,
        bytes32 indexed txHash,
        address indexed signer,
        uint256 totalApprovals,
        uint256 totalWeight
    );
    event TransactionExecuted(
        address indexed account,
        bytes32 indexed txHash,
        bool success
    );
    event TransactionRejected(
        address indexed account,
        bytes32 indexed txHash,
        address indexed rejector,
        bytes32 reason
    );
    event TransactionExpired(
        address indexed account,
        bytes32 indexed txHash
    );
    event EmergencyExecution(
        address indexed account,
        bytes32 indexed txHash,
        address indexed emergencySigner
    );

    // ============= CUSTOM ERRORS =============
    error InsufficientSignatures(uint256 provided, uint256 required);
    error InsufficientWeight(uint256 providedWeight, uint256 requiredWeight);
    error TransactionNotFound(bytes32 txHash);
    error TransactionAlreadyExecuted(bytes32 txHash);
    error TransactionExpiredError(bytes32 txHash);
    error TransactionNotApproved(bytes32 txHash);
    error TimelockNotMet(uint256 currentTime, uint256 executionTime);
    error SignerNotAuthorized(address signer);
    error SignerAlreadyApproved(address signer);
    error InvalidMultiSigConfig();
    error CannotRemoveLastSigner();
    error DuplicateSigner(address signer);

    // ============= CONFIGURATION MANAGEMENT =============
    function setMultiSigConfig(
        address account,
        MultiSigConfig calldata config
    ) external;

    function updateThreshold(address account, uint256 newThreshold) external;

    function updateRequiredSignatures(address account, uint256 newRequired) external;

    function updateTimelock(address account, uint256 newTimelock) external;

    // ============= SIGNER MANAGEMENT =============
    function addSigner(
        address account,
        address signer,
        SignerRole role,
        uint256 weight
    ) external;

    function removeSigner(address account, address signer) external;

    function updateSignerRole(address account, address signer, SignerRole newRole) external;

    function updateSignerWeight(address account, address signer, uint256 newWeight) external;

    function setSignerStatus(address account, address signer, bool isActive) external;

    // ============= TRANSACTION MANAGEMENT =============
    function createTransaction(
        address account,
        address target,
        uint256 value,
        bytes calldata data
    ) external returns (bytes32 txHash);

    function approveTransaction(
        address account,
        bytes32 txHash
    ) external;

    function executeTransaction(
        address account,
        bytes32 txHash
    ) external returns (bool success);

    function rejectTransaction(
        address account,
        bytes32 txHash,
        bytes32 reason
    ) external;

    function emergencyExecute(
        address account,
        bytes32 txHash
    ) external returns (bool success);

    // ============= VALIDATION FUNCTIONS =============
    function requiresMultiSig(address account, uint256 value) external view returns (bool);

    function canExecuteTransaction(address account, bytes32 txHash) external view returns (bool);

    function isValidSigner(address account, address signer) external view returns (bool);

    function hasApproved(address account, bytes32 txHash, address signer) external view returns (bool);

    function getApprovalStatus(address account, bytes32 txHash)
        external
        view
        returns (
            uint256 currentApprovals,
            uint256 requiredApprovals,
            uint256 currentWeight,
            uint256 requiredWeight,
            bool canExecute
        );

    // ============= VIEW FUNCTIONS =============
    function getMultiSigConfig(address account) external view returns (MultiSigConfig memory);

    function getSigners(address account) external view returns (Signer[] memory);

    function getSigner(address account, address signer) external view returns (Signer memory);

    function getTransaction(address account, bytes32 txHash) external view returns (TransactionView memory);

    function getPendingTransactions(address account) external view returns (TransactionView[] memory);

    function getTransactionHistory(address account, uint256 limit) external view returns (TransactionView[] memory);

    function getSignerCount(address account) external view returns (uint256);

    function getTotalSignerWeight(address account) external view returns (uint256);

    function getTimeUntilExecution(address account, bytes32 txHash) external view returns (uint256);

    // ============= BATCH OPERATIONS =============
    function batchApproveTransactions(
        address account,
        bytes32[] calldata txHashes
    ) external;

    function batchRejectTransactions(
        address account,
        bytes32[] calldata txHashes,
        bytes32 reason
    ) external;

    // ============= EMERGENCY FUNCTIONS =============
    function emergencyPauseMultiSig(address account) external;

    function emergencyUnpauseMultiSig(address account) external;

    function emergencyResetSigners(address account, Signer[] calldata newSigners) external;
}