// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title ITransactionLimits
 * @dev Interface para gerenciamento de limites de transações
 */
interface ITransactionLimits {
    // ============= ENUMS =============
    enum LimitType {
        DAILY,
        WEEKLY,
        MONTHLY,
        TRANSACTION,
        VELOCITY
    }

    enum LimitStatus {
        ACTIVE,
        SUSPENDED,
        EXCEEDED
    }

    // ============= STRUCTS =============
    struct LimitConfiguration {
        uint256 dailyLimit;
        uint256 weeklyLimit;
        uint256 monthlyLimit;
        uint256 transactionLimit;
        uint256 velocityLimit; // Transações por período
        uint256 velocityWindow; // Janela de tempo para velocidade
        bool isActive;
    }

    struct SpendingTracker {
        uint256 dailySpent;
        uint256 weeklySpent;
        uint256 monthlySpent;
        uint256 lastDayReset;
        uint256 lastWeekReset;
        uint256 lastMonthReset;
        uint256 transactionCount;
        uint256 lastTransactionTime;
    }

    struct LimitViolation {
        address account;
        LimitType limitType;
        uint256 attemptedAmount;
        uint256 allowedAmount;
        uint256 timestamp;
        bytes32 reason;
    }

    // ============= EVENTS =============
    event LimitConfigurationUpdated(
        address indexed account,
        LimitConfiguration newConfig
    );
    event LimitExceeded(
        address indexed account,
        LimitType limitType,
        uint256 attemptedAmount,
        uint256 allowedAmount,
        uint256 currentSpent
    );
    event LimitReset(
        address indexed account,
        LimitType limitType,
        uint256 resetAt
    );
    event EmergencyLimitOverride(
        address indexed account,
        address indexed authorizer,
        uint256 amount,
        bytes32 reason
    );
    event VelocityLimitTriggered(
        address indexed account,
        uint256 transactionCount,
        uint256 timeWindow,
        uint256 limit
    );

    // ============= CUSTOM ERRORS =============
    error LimitExceededError(LimitType limitType, uint256 attempted, uint256 allowed);
    error VelocityLimitExceeded(uint256 transactions, uint256 window, uint256 limit);
    error InvalidLimitConfiguration();
    error LimitNotActive(address account);
    error UnauthorizedLimitChange(address caller);
    error InvalidTimeWindow();
    error ZeroLimitNotAllowed(LimitType limitType);

    // ============= LIMIT MANAGEMENT =============
    function setLimitConfiguration(
        address account,
        LimitConfiguration calldata config
    ) external;

    function updateSpecificLimit(
        address account,
        LimitType limitType,
        uint256 newLimit
    ) external;

    function activateLimits(address account) external;

    function deactivateLimits(address account) external;

    // ============= VALIDATION FUNCTIONS =============
    function validateTransaction(
        address account,
        uint256 amount
    ) external returns (bool);

    function validateBatchTransaction(
        address account,
        uint256[] calldata amounts
    ) external returns (bool);

    function checkLimitCompliance(
        address account,
        uint256 amount
    ) external view returns (bool canProceed, LimitType[] memory violatedLimits);

    // ============= SPENDING TRACKING =============
    function recordTransaction(
        address account,
        uint256 amount
    ) external;

    function recordBatchTransaction(
        address account,
        uint256[] calldata amounts
    ) external;

    function getSpendingTracker(address account)
        external
        view
        returns (SpendingTracker memory);

    // ============= LIMIT CALCULATIONS =============
    function getAvailableLimits(address account)
        external
        view
        returns (
            uint256 dailyAvailable,
            uint256 weeklyAvailable,
            uint256 monthlyAvailable,
            uint256 transactionAvailable
        );

    function getRemainingVelocity(address account)
        external
        view
        returns (uint256 remainingTransactions, uint256 windowReset);

    function calculateRequiredCooldown(address account)
        external
        view
        returns (uint256 cooldownSeconds);

    // ============= VIOLATION TRACKING =============
    function getViolationHistory(address account, uint256 limit)
        external
        view
        returns (LimitViolation[] memory);

    function getViolationCount(address account, uint256 timeWindow)
        external
        view
        returns (uint256);

    // ============= EMERGENCY FUNCTIONS =============
    function emergencyOverride(
        address account,
        uint256 amount,
        bytes32 reason
    ) external;

    function emergencyResetLimits(address account) external;

    function emergencyFreezeLimits(address account) external;

    // ============= CONFIGURATION =============
    function setGlobalLimitDefaults(LimitConfiguration calldata defaultConfig) external;

    function addLimitManager(address manager) external;

    function removeLimitManager(address manager) external;

    function setVelocityWindow(uint256 windowSeconds) external;

    // ============= VIEW FUNCTIONS =============
    function getLimitConfiguration(address account)
        external
        view
        returns (LimitConfiguration memory);

    function isLimitActive(address account) external view returns (bool);

    function getNextResetTime(address account, LimitType limitType)
        external
        view
        returns (uint256);

    function getLimitStatus(address account) external view returns (LimitStatus);
}