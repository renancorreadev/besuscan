// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title ISocialRecovery
 * @dev Interface para sistema de recuperação social de contas
 */
interface ISocialRecovery {
    // ============= ENUMS =============
    enum RecoveryStatus {
        INACTIVE,
        INITIATED,
        APPROVED,
        EXECUTED,
        REJECTED,
        EXPIRED
    }

    enum GuardianType {
        FAMILY,
        FRIEND,
        INSTITUTION,
        EMERGENCY
    }

    // ============= STRUCTS =============
    struct Guardian {
        address guardianAddress;
        GuardianType guardianType;
        uint256 weight;
        bool isActive;
        uint256 addedAt;
        string metadata; // IPFS hash ou dados off-chain
    }

    struct RecoveryConfig {
        uint256 requiredApprovals;
        uint256 requiredWeight;
        uint256 recoveryDelay; // Delay antes da execução
        uint256 approvalWindow; // Janela de tempo para aprovação
        uint256 cooldownPeriod; // Tempo entre tentativas de recuperação
        bool isActive;
    }

    struct RecoveryRequest {
        bytes32 requestId;
        address account;
        address proposedNewOwner;
        address initiator;
        uint256 initiatedAt;
        uint256 executionTime;
        uint256 expiresAt;
        RecoveryStatus status;
        uint256 approvals;
        uint256 totalWeight;
        mapping(address => bool) hasApproved;
        address[] approvers;
        bytes32 reason;
    }

    struct RecoveryRequestView {
        bytes32 requestId;
        address account;
        address proposedNewOwner;
        address initiator;
        uint256 initiatedAt;
        uint256 executionTime;
        uint256 expiresAt;
        RecoveryStatus status;
        uint256 approvals;
        uint256 totalWeight;
        address[] approvers;
        bytes32 reason;
    }

    // ============= EVENTS =============
    event GuardianAdded(
        address indexed account,
        address indexed guardian,
        GuardianType guardianType,
        uint256 weight
    );
    event GuardianRemoved(
        address indexed account,
        address indexed guardian
    );
    event GuardianStatusChanged(
        address indexed account,
        address indexed guardian,
        bool isActive
    );
    event RecoveryConfigUpdated(
        address indexed account,
        uint256 requiredApprovals,
        uint256 requiredWeight,
        uint256 recoveryDelay
    );
    event RecoveryInitiated(
        address indexed account,
        bytes32 indexed requestId,
        address indexed initiator,
        address proposedNewOwner,
        uint256 expiresAt
    );
    event RecoveryApproved(
        address indexed account,
        bytes32 indexed requestId,
        address indexed guardian,
        uint256 totalApprovals,
        uint256 totalWeight
    );
    event RecoveryExecuted(
        address indexed account,
        bytes32 indexed requestId,
        address oldOwner,
        address newOwner
    );
    event RecoveryRejected(
        address indexed account,
        bytes32 indexed requestId,
        address indexed rejector,
        bytes32 reason
    );
    event RecoveryCancelled(
        address indexed account,
        bytes32 indexed requestId,
        address canceller,
        bytes32 reason
    );
    event RecoveryExpired(
        address indexed account,
        bytes32 indexed requestId
    );
    event EmergencyRecovery(
        address indexed account,
        address indexed emergencyGuardian,
        address newOwner
    );

    // ============= CUSTOM ERRORS =============
    error RecoveryNotConfigured(address account);
    error InsufficientGuardians(uint256 current, uint256 required);
    error GuardianAlreadyExists(address guardian);
    error GuardianNotFound(address guardian);
    error RecoveryRequestNotFound(bytes32 requestId);
    error RecoveryAlreadyInitiated(address account);
    error RecoveryNotInitiated(address account);
    error RecoveryExpiredError(bytes32 requestId);
    error RecoveryDelayNotMet(uint256 currentTime, uint256 executionTime);
    error CooldownPeriodActive(uint256 remainingTime);
    error UnauthorizedRecoveryAction(address caller);
    error InvalidRecoveryConfig();
    error GuardianAlreadyApproved(address guardian);
    error InsufficientApprovals(uint256 provided, uint256 required);
    error CannotRemoveLastGuardian();

    // ============= GUARDIAN MANAGEMENT =============
    function addGuardian(
        address account,
        address guardian,
        GuardianType guardianType,
        uint256 weight,
        string calldata metadata
    ) external;

    function removeGuardian(address account, address guardian) external;

    function updateGuardianWeight(address account, address guardian, uint256 newWeight) external;

    function updateGuardianType(address account, address guardian, GuardianType newType) external;

    function setGuardianStatus(address account, address guardian, bool isActive) external;

    function updateGuardianMetadata(address account, address guardian, string calldata metadata) external;

    // ============= RECOVERY CONFIGURATION =============
    function setRecoveryConfig(
        address account,
        RecoveryConfig calldata config
    ) external;

    function updateRecoveryDelay(address account, uint256 newDelay) external;

    function updateRequiredApprovals(address account, uint256 newRequired) external;

    function updateApprovalWindow(address account, uint256 newWindow) external;

    function activateRecovery(address account) external;

    function deactivateRecovery(address account) external;

    // ============= RECOVERY PROCESS =============
    function initiateRecovery(
        address account,
        address proposedNewOwner,
        bytes32 reason
    ) external returns (bytes32 requestId);

    function approveRecovery(
        address account,
        bytes32 requestId
    ) external;

    function executeRecovery(
        address account,
        bytes32 requestId
    ) external;

    function rejectRecovery(
        address account,
        bytes32 requestId,
        bytes32 reason
    ) external;

    function cancelRecovery(
        address account,
        bytes32 requestId,
        bytes32 reason
    ) external;

    // ============= EMERGENCY FUNCTIONS =============
    function emergencyRecovery(
        address account,
        address newOwner
    ) external;

    function emergencyFreeze(address account) external;

    function emergencyUnfreeze(address account) external;

    // ============= VALIDATION FUNCTIONS =============
    function canInitiateRecovery(address account, address initiator) external view returns (bool);

    function canApproveRecovery(address account, bytes32 requestId, address guardian) external view returns (bool);

    function canExecuteRecovery(address account, bytes32 requestId) external view returns (bool);

    function isValidGuardian(address account, address guardian) external view returns (bool);

    // ============= VIEW FUNCTIONS =============
    function getRecoveryConfig(address account) external view returns (RecoveryConfig memory);

    function getGuardians(address account) external view returns (Guardian[] memory);

    function getGuardian(address account, address guardian) external view returns (Guardian memory);

    function getActiveRecoveryRequest(address account) external view returns (RecoveryRequestView memory);

    function getRecoveryRequest(bytes32 requestId) external view returns (RecoveryRequestView memory);

    function getRecoveryHistory(address account, uint256 limit) external view returns (RecoveryRequestView[] memory);

    function getGuardianCount(address account) external view returns (uint256);

    function getTotalGuardianWeight(address account) external view returns (uint256);

    function getApprovalStatus(address account, bytes32 requestId)
        external
        view
        returns (
            uint256 currentApprovals,
            uint256 requiredApprovals,
            uint256 currentWeight,
            uint256 requiredWeight,
            bool canExecute
        );

    function getTimeUntilExecution(address account, bytes32 requestId) external view returns (uint256);

    function getRemainingCooldown(address account) external view returns (uint256);

    // ============= BATCH OPERATIONS =============
    function batchAddGuardians(
        address account,
        Guardian[] calldata guardians
    ) external;

    function batchRemoveGuardians(
        address account,
        address[] calldata guardians
    ) external;

    function batchApproveRecovery(
        bytes32[] calldata requestIds
    ) external;
}