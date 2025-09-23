// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IAABankManager
 * @dev Interface para o contrato de gerenciamento de contas bancárias AA
 */
interface IAABankManager {
    // ============= ENUMS =============
    enum AccountStatus {
        INACTIVE,
        ACTIVE,
        FROZEN,
        SUSPENDED,
        RECOVERING,
        CLOSED
    }

    // ============= STRUCTS =============
    struct BankInfo {
        bytes32 bankId;
        string name;
        address admin;
        bool isActive;
        uint256 createdAt;
    }

    struct AccountInfo {
        address account;
        address owner;
        bytes32 bankId;
        AccountStatus status;
        uint256 createdAt;
        uint256 lastActivity;
    }

    struct GlobalLimits {
        uint256 dailyLimit;
        uint256 weeklyLimit;
        uint256 monthlyLimit;
        uint256 transactionLimit;
        uint256 multiSigThreshold;
    }

    // ============= EVENTS =============
    event BankRegistered(bytes32 indexed bankId, string name, address indexed admin);
    event BankStatusChanged(bytes32 indexed bankId, bool isActive);
    event BankAccountCreated(
        address indexed account,
        address indexed owner,
        bytes32 indexed bankId,
        uint256 salt
    );
    event AccountStatusChanged(
        address indexed account,
        AccountStatus oldStatus,
        AccountStatus newStatus,
        bytes32 reason
    );
    event GlobalLimitsUpdated(
        uint256 dailyLimit,
        uint256 weeklyLimit,
        uint256 monthlyLimit,
        uint256 transactionLimit,
        uint256 multiSigThreshold
    );
    event AccountActivity(address indexed account, bytes32 indexed activityType, bytes data);
    event ComplianceAction(
        address indexed account,
        address indexed officer,
        bytes32 indexed action,
        bytes32 reason
    );

    // ============= CUSTOM ERRORS =============
    error UnauthorizedAccess(address caller, bytes32 requiredRole);
    error BankNotRegistered(bytes32 bankId);
    error BankAlreadyRegistered(bytes32 bankId);
    error BankNotActive(bytes32 bankId);
    error AccountNotFound(address account);
    error AccountAlreadyExists(address account);
    error InvalidAccountStatus(AccountStatus current, AccountStatus required);
    error InvalidLimits();
    error ZeroAddress();
    error InvalidBankId();

    // ============= BANK MANAGEMENT =============
    function registerBank(
        bytes32 bankId,
        string calldata name,
        address admin
    ) external;

    function setBankStatus(bytes32 bankId, bool isActive) external;

    // ============= ACCOUNT MANAGEMENT =============
    function createBankAccount(
        address owner,
        bytes32 bankId,
        uint256 salt,
        bytes calldata initData
    ) external returns (address);

    function setAccountStatus(
        address account,
        AccountStatus newStatus,
        bytes32 reason
    ) external;

    function emergencyFreezeAccount(address account, bytes32 reason) external;

    function unfreezeAccount(address account, bytes32 reason) external;

    // ============= LIMITS MANAGEMENT =============
    function updateGlobalLimits(GlobalLimits calldata newLimits) external;

    // ============= AUDIT & COMPLIANCE =============
    function logAccountActivity(
        address account,
        bytes32 activityType,
        bytes calldata data
    ) external;

    // ============= EMERGENCY FUNCTIONS =============
    function emergencyPause() external;
    function unpause() external;

    // ============= VIEW FUNCTIONS =============
    function getBankInfo(bytes32 bankId) external view returns (BankInfo memory);
    function getAccountInfo(address account) external view returns (AccountInfo memory);
    function getBankAccounts(bytes32 bankId) external view returns (address[] memory);
    function getAccountAddress(
        bytes32 bankId,
        address owner,
        uint256 salt
    ) external view returns (address);
    function getSystemStats() external view returns (
        uint256 totalBanks,
        uint256 totalAccounts,
        uint256 activeAccounts,
        uint256 frozenAccounts
    );
}