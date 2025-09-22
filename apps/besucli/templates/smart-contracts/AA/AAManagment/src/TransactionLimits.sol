// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/ITransactionLimits.sol";

/**
 * @title TransactionLimits
 * @dev Gerenciamento avançado de limites de transações para instituições financeiras
 * @notice Sistema completo de controle de velocity e limites operacionais
 */
contract TransactionLimits is ITransactionLimits, AccessControl, Pausable, ReentrancyGuard {
    // ============= ROLES =============
    bytes32 public constant LIMIT_MANAGER = keccak256("LIMIT_MANAGER");
    bytes32 public constant RISK_MANAGER = keccak256("RISK_MANAGER");
    bytes32 public constant EMERGENCY_MANAGER = keccak256("EMERGENCY_MANAGER");

    // ============= STATE VARIABLES =============

    // Configurações de limite por conta
    mapping(address => LimitConfiguration) public accountLimits;
    mapping(address => SpendingTracker) public spendingTrackers;
    mapping(address => LimitStatus) public accountStatus;

    // Histórico de violações
    mapping(address => LimitViolation[]) public violationHistory;
    mapping(address => uint256) public violationCount;

    // Configurações globais
    LimitConfiguration public defaultLimits;
    uint256 public defaultVelocityWindow = 1 hours;

    // Overrides de emergência
    mapping(address => mapping(uint256 => bool)) public emergencyOverrides;
    mapping(address => uint256) public lastEmergencyOverride;

    // Estatísticas
    uint256 public totalAccounts;
    uint256 public totalViolations;
    uint256 public totalEmergencyOverrides;

    // ============= EVENTS IMPLEMENTATION =============
    // (Events já definidos na interface)

    // ============= CUSTOM ERRORS IMPLEMENTATION =============
    // (Errors já definidos na interface)

    // ============= CONSTRUCTOR =============
    constructor(LimitConfiguration memory _defaultLimits) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(LIMIT_MANAGER, msg.sender);
        _grantRole(RISK_MANAGER, msg.sender);
        _grantRole(EMERGENCY_MANAGER, msg.sender);

        defaultLimits = _defaultLimits;
    }

    // ============= LIMIT MANAGEMENT =============

    /**
     * @dev Define configuração completa de limites para uma conta
     */
    function setLimitConfiguration(
        address account,
        LimitConfiguration calldata config
    ) external override onlyRole(LIMIT_MANAGER) whenNotPaused {
        if (account == address(0)) revert("Invalid account");
        if (!_isValidConfiguration(config)) revert InvalidLimitConfiguration();

        LimitConfiguration memory oldConfig = accountLimits[account];
        accountLimits[account] = config;

        // Inicializa tracker se for nova conta
        if (!oldConfig.isActive && config.isActive) {
            _initializeSpendingTracker(account);
            totalAccounts++;
        }

        accountStatus[account] = config.isActive ? LimitStatus.ACTIVE : LimitStatus.SUSPENDED;

        emit LimitConfigurationUpdated(account, config);
    }

    /**
     * @dev Atualiza um limite específico
     */
    function updateSpecificLimit(
        address account,
        LimitType limitType,
        uint256 newLimit
    ) external override onlyRole(LIMIT_MANAGER) whenNotPaused {
        if (!accountLimits[account].isActive) revert LimitNotActive(account);

        LimitConfiguration storage config = accountLimits[account];

        if (limitType == LimitType.DAILY) {
            config.dailyLimit = newLimit;
        } else if (limitType == LimitType.WEEKLY) {
            config.weeklyLimit = newLimit;
        } else if (limitType == LimitType.MONTHLY) {
            config.monthlyLimit = newLimit;
        } else if (limitType == LimitType.TRANSACTION) {
            config.transactionLimit = newLimit;
        } else if (limitType == LimitType.VELOCITY) {
            config.velocityLimit = newLimit;
        }

        emit LimitConfigurationUpdated(account, config);
    }

    /**
     * @dev Ativa limites para uma conta
     */
    function activateLimits(address account) external override onlyRole(LIMIT_MANAGER) {
        if (accountLimits[account].dailyLimit == 0) {
            // Usa configuração padrão se não houver configuração específica
            accountLimits[account] = defaultLimits;
            _initializeSpendingTracker(account);
            totalAccounts++;
        }

        accountLimits[account].isActive = true;
        accountStatus[account] = LimitStatus.ACTIVE;
    }

    /**
     * @dev Desativa limites para uma conta
     */
    function deactivateLimits(address account) external override onlyRole(LIMIT_MANAGER) {
        accountLimits[account].isActive = false;
        accountStatus[account] = LimitStatus.SUSPENDED;
    }

    // ============= VALIDATION FUNCTIONS =============

    /**
     * @dev Valida uma transação contra todos os limites
     */
    function validateTransaction(
        address account,
        uint256 amount
    ) external override whenNotPaused returns (bool) {
        if (!accountLimits[account].isActive) return true; // Sem limites = permitido

        // Atualiza tracker com base no tempo atual
        _updateSpendingTracker(account);

        LimitConfiguration memory limits = accountLimits[account];
        SpendingTracker memory tracker = spendingTrackers[account];

        // Verifica limite por transação
        if (amount > limits.transactionLimit) {
            _recordViolation(account, LimitType.TRANSACTION, amount, limits.transactionLimit);
            return false;
        }

        // Verifica limites temporais
        if (tracker.dailySpent + amount > limits.dailyLimit) {
            _recordViolation(account, LimitType.DAILY, amount, limits.dailyLimit - tracker.dailySpent);
            return false;
        }

        if (tracker.weeklySpent + amount > limits.weeklyLimit) {
            _recordViolation(account, LimitType.WEEKLY, amount, limits.weeklyLimit - tracker.weeklySpent);
            return false;
        }

        if (tracker.monthlySpent + amount > limits.monthlyLimit) {
            _recordViolation(account, LimitType.MONTHLY, amount, limits.monthlyLimit - tracker.monthlySpent);
            return false;
        }

        // Verifica velocity limit
        if (!_checkVelocityLimit(account)) {
            _recordViolation(account, LimitType.VELOCITY, 1, limits.velocityLimit);
            return false;
        }

        return true;
    }

    /**
     * @dev Valida transação em lote
     */
    function validateBatchTransaction(
        address account,
        uint256[] calldata amounts
    ) external override whenNotPaused returns (bool) {
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            totalAmount += amounts[i];

            // Verifica limite individual por transação
            if (amounts[i] > accountLimits[account].transactionLimit) {
                return false;
            }
        }

        return this.validateTransaction(account, totalAmount);
    }

    /**
     * @dev Verifica compliance dos limites sem alterar estado
     */
    function checkLimitCompliance(
        address account,
        uint256 amount
    ) external view override returns (bool canProceed, LimitType[] memory violatedLimits) {
        if (!accountLimits[account].isActive) {
            return (true, new LimitType[](0));
        }

        LimitConfiguration memory limits = accountLimits[account];
        SpendingTracker memory tracker = _getUpdatedTracker(account);

        LimitType[] memory tempViolations = new LimitType[](4);
        uint256 violationCounter = 0;

        // Verifica cada tipo de limite
        if (amount > limits.transactionLimit) {
            tempViolations[violationCounter++] = LimitType.TRANSACTION;
        }

        if (tracker.dailySpent + amount > limits.dailyLimit) {
            tempViolations[violationCounter++] = LimitType.DAILY;
        }

        if (tracker.weeklySpent + amount > limits.weeklyLimit) {
            tempViolations[violationCounter++] = LimitType.WEEKLY;
        }

        if (tracker.monthlySpent + amount > limits.monthlyLimit) {
            tempViolations[violationCounter++] = LimitType.MONTHLY;
        }

        // Retorna resultado
        canProceed = violationCounter == 0;
        violatedLimits = new LimitType[](violationCounter);
        for (uint256 i = 0; i < violationCounter; i++) {
            violatedLimits[i] = tempViolations[i];
        }
    }

    // ============= SPENDING TRACKING =============

    /**
     * @dev Registra uma transação executada
     */
    function recordTransaction(
        address account,
        uint256 amount
    ) external override whenNotPaused {
        if (!accountLimits[account].isActive) return;

        _updateSpendingTracker(account);

        SpendingTracker storage tracker = spendingTrackers[account];
        tracker.dailySpent += amount;
        tracker.weeklySpent += amount;
        tracker.monthlySpent += amount;
        tracker.transactionCount++;
        tracker.lastTransactionTime = block.timestamp;

        // Verifica se excedeu após o registro (para casos de race condition)
        if (tracker.dailySpent > accountLimits[account].dailyLimit ||
            tracker.weeklySpent > accountLimits[account].weeklyLimit ||
            tracker.monthlySpent > accountLimits[account].monthlyLimit) {
            accountStatus[account] = LimitStatus.EXCEEDED;
        }
    }

    /**
     * @dev Registra transações em lote
     */
    function recordBatchTransaction(
        address account,
        uint256[] calldata amounts
    ) external override whenNotPaused {
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            totalAmount += amounts[i];
        }

        this.recordTransaction(account, totalAmount);

        // Atualiza contador de transações para o lote
        spendingTrackers[account].transactionCount += amounts.length - 1; // -1 porque recordTransaction já adicionou 1
    }

    /**
     * @dev Retorna tracker de gastos atual
     */
    function getSpendingTracker(address account)
        external
        view
        override
        returns (SpendingTracker memory)
    {
        return _getUpdatedTracker(account);
    }

    // ============= LIMIT CALCULATIONS =============

    /**
     * @dev Retorna limites disponíveis atuais
     */
    function getAvailableLimits(address account)
        external
        view
        override
        returns (
            uint256 dailyAvailable,
            uint256 weeklyAvailable,
            uint256 monthlyAvailable,
            uint256 transactionAvailable
        )
    {
        if (!accountLimits[account].isActive) {
            return (type(uint256).max, type(uint256).max, type(uint256).max, type(uint256).max);
        }

        LimitConfiguration memory limits = accountLimits[account];
        SpendingTracker memory tracker = _getUpdatedTracker(account);

        dailyAvailable = limits.dailyLimit > tracker.dailySpent
            ? limits.dailyLimit - tracker.dailySpent
            : 0;

        weeklyAvailable = limits.weeklyLimit > tracker.weeklySpent
            ? limits.weeklyLimit - tracker.weeklySpent
            : 0;

        monthlyAvailable = limits.monthlyLimit > tracker.monthlySpent
            ? limits.monthlyLimit - tracker.monthlySpent
            : 0;

        transactionAvailable = limits.transactionLimit;
    }

    /**
     * @dev Retorna informações de velocity limit
     */
    function getRemainingVelocity(address account)
        external
        view
        override
        returns (uint256 remainingTransactions, uint256 windowReset)
    {
        LimitConfiguration memory limits = accountLimits[account];
        SpendingTracker memory tracker = spendingTrackers[account];

        uint256 windowStart = block.timestamp - limits.velocityWindow;
        uint256 transactionsInWindow = _countTransactionsInWindow(account, windowStart);

        remainingTransactions = limits.velocityLimit > transactionsInWindow
            ? limits.velocityLimit - transactionsInWindow
            : 0;

        windowReset = tracker.lastTransactionTime + limits.velocityWindow;
    }

    /**
     * @dev Calcula tempo de cooldown necessário
     */
    function calculateRequiredCooldown(address account)
        external
        view
        override
        returns (uint256 cooldownSeconds)
    {
        LimitConfiguration memory limits = accountLimits[account];
        SpendingTracker memory tracker = spendingTrackers[account];

        uint256 windowStart = block.timestamp - limits.velocityWindow;
        uint256 transactionsInWindow = _countTransactionsInWindow(account, windowStart);

        if (transactionsInWindow >= limits.velocityLimit) {
            uint256 oldestTransactionTime = tracker.lastTransactionTime - limits.velocityWindow;
            uint256 nextAvailableTime = oldestTransactionTime + limits.velocityWindow;

            if (nextAvailableTime > block.timestamp) {
                cooldownSeconds = nextAvailableTime - block.timestamp;
            }
        }
    }

    // ============= VIOLATION TRACKING =============

    /**
     * @dev Retorna histórico de violações
     */
    function getViolationHistory(address account, uint256 limit)
        external
        view
        override
        returns (LimitViolation[] memory)
    {
        LimitViolation[] memory history = violationHistory[account];

        if (limit == 0 || limit >= history.length) {
            return history;
        }

        LimitViolation[] memory limitedHistory = new LimitViolation[](limit);
        uint256 startIndex = history.length - limit;

        for (uint256 i = 0; i < limit; i++) {
            limitedHistory[i] = history[startIndex + i];
        }

        return limitedHistory;
    }

    /**
     * @dev Conta violações em uma janela de tempo
     */
    function getViolationCount(address account, uint256 timeWindow)
        external
        view
        override
        returns (uint256)
    {
        LimitViolation[] memory history = violationHistory[account];
        uint256 cutoffTime = block.timestamp - timeWindow;
        uint256 count = 0;

        for (uint256 i = history.length; i > 0; i--) {
            if (history[i - 1].timestamp < cutoffTime) break;
            count++;
        }

        return count;
    }

    // ============= EMERGENCY FUNCTIONS =============

    /**
     * @dev Override de emergência para uma transação específica
     */
    function emergencyOverride(
        address account,
        uint256 amount,
        bytes32 reason
    ) external override onlyRole(EMERGENCY_MANAGER) {
        uint256 overrideId = uint256(keccak256(abi.encodePacked(
            account, amount, block.timestamp, reason
        )));

        emergencyOverrides[account][overrideId] = true;
        lastEmergencyOverride[account] = block.timestamp;
        totalEmergencyOverrides++;

        emit EmergencyLimitOverride(account, msg.sender, amount, reason);
    }

    /**
     * @dev Reset de emergência dos limites
     */
    function emergencyResetLimits(address account) external override onlyRole(EMERGENCY_MANAGER) {
        _initializeSpendingTracker(account);
        accountStatus[account] = LimitStatus.ACTIVE;

        emit LimitReset(account, LimitType.DAILY, block.timestamp);
        emit LimitReset(account, LimitType.WEEKLY, block.timestamp);
        emit LimitReset(account, LimitType.MONTHLY, block.timestamp);
    }

    /**
     * @dev Congela limites de uma conta
     */
    function emergencyFreezeLimits(address account) external override onlyRole(EMERGENCY_MANAGER) {
        accountStatus[account] = LimitStatus.SUSPENDED;
        accountLimits[account].isActive = false;
    }

    // ============= CONFIGURATION =============

    /**
     * @dev Define configuração padrão global
     */
    function setGlobalLimitDefaults(LimitConfiguration calldata defaultConfig)
        external
        override
        onlyRole(RISK_MANAGER)
    {
        if (!_isValidConfiguration(defaultConfig)) revert InvalidLimitConfiguration();
        defaultLimits = defaultConfig;
    }

    /**
     * @dev Adiciona gerente de limites
     */
    function addLimitManager(address manager) external override onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(LIMIT_MANAGER, manager);
    }

    /**
     * @dev Remove gerente de limites
     */
    function removeLimitManager(address manager) external override onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(LIMIT_MANAGER, manager);
    }

    /**
     * @dev Define janela de velocity
     */
    function setVelocityWindow(uint256 windowSeconds) external override onlyRole(RISK_MANAGER) {
        if (windowSeconds < 60 || windowSeconds > 86400) revert InvalidTimeWindow(); // 1 min a 24h
        defaultVelocityWindow = windowSeconds;
    }

    // ============= VIEW FUNCTIONS =============

    /**
     * @dev Retorna configuração de limites
     */
    function getLimitConfiguration(address account)
        external
        view
        override
        returns (LimitConfiguration memory)
    {
        return accountLimits[account];
    }

    /**
     * @dev Verifica se limites estão ativos
     */
    function isLimitActive(address account) external view override returns (bool) {
        return accountLimits[account].isActive;
    }

    /**
     * @dev Retorna próximo tempo de reset
     */
    function getNextResetTime(address account, LimitType limitType)
        external
        view
        override
        returns (uint256)
    {
        SpendingTracker memory tracker = spendingTrackers[account];

        if (limitType == LimitType.DAILY) {
            return tracker.lastDayReset + 1 days;
        } else if (limitType == LimitType.WEEKLY) {
            return tracker.lastWeekReset + 7 days;
        } else if (limitType == LimitType.MONTHLY) {
            return tracker.lastMonthReset + 30 days;
        }

        return 0;
    }

    /**
     * @dev Retorna status dos limites
     */
    function getLimitStatus(address account) external view override returns (LimitStatus) {
        return accountStatus[account];
    }

    // ============= INTERNAL FUNCTIONS =============

    /**
     * @dev Valida configuração de limites
     */
    function _isValidConfiguration(LimitConfiguration memory config) internal pure returns (bool) {
        return config.dailyLimit > 0 &&
               config.weeklyLimit >= config.dailyLimit &&
               config.monthlyLimit >= config.weeklyLimit &&
               config.transactionLimit > 0 &&
               config.velocityLimit > 0 &&
               config.velocityWindow >= 60; // Mínimo 1 minuto
    }

    /**
     * @dev Inicializa tracker de gastos
     */
    function _initializeSpendingTracker(address account) internal {
        spendingTrackers[account] = SpendingTracker({
            dailySpent: 0,
            weeklySpent: 0,
            monthlySpent: 0,
            lastDayReset: block.timestamp,
            lastWeekReset: block.timestamp,
            lastMonthReset: block.timestamp,
            transactionCount: 0,
            lastTransactionTime: 0
        });
    }

    /**
     * @dev Atualiza tracker baseado no tempo atual
     */
    function _updateSpendingTracker(address account) internal {
        SpendingTracker storage tracker = spendingTrackers[account];

        // Reset diário
        if (block.timestamp >= tracker.lastDayReset + 1 days) {
            tracker.dailySpent = 0;
            tracker.lastDayReset = block.timestamp;
            emit LimitReset(account, LimitType.DAILY, block.timestamp);
        }

        // Reset semanal
        if (block.timestamp >= tracker.lastWeekReset + 7 days) {
            tracker.weeklySpent = 0;
            tracker.lastWeekReset = block.timestamp;
            emit LimitReset(account, LimitType.WEEKLY, block.timestamp);
        }

        // Reset mensal
        if (block.timestamp >= tracker.lastMonthReset + 30 days) {
            tracker.monthlySpent = 0;
            tracker.lastMonthReset = block.timestamp;
            emit LimitReset(account, LimitType.MONTHLY, block.timestamp);
        }
    }

    /**
     * @dev Retorna tracker atualizado sem modificar estado
     */
    function _getUpdatedTracker(address account) internal view returns (SpendingTracker memory) {
        SpendingTracker memory tracker = spendingTrackers[account];

        // Reset diário
        if (block.timestamp >= tracker.lastDayReset + 1 days) {
            tracker.dailySpent = 0;
            tracker.lastDayReset = block.timestamp;
        }

        // Reset semanal
        if (block.timestamp >= tracker.lastWeekReset + 7 days) {
            tracker.weeklySpent = 0;
            tracker.lastWeekReset = block.timestamp;
        }

        // Reset mensal
        if (block.timestamp >= tracker.lastMonthReset + 30 days) {
            tracker.monthlySpent = 0;
            tracker.lastMonthReset = block.timestamp;
        }

        return tracker;
    }

    /**
     * @dev Verifica velocity limit
     */
    function _checkVelocityLimit(address account) internal view returns (bool) {
        LimitConfiguration memory limits = accountLimits[account];
        uint256 windowStart = block.timestamp - limits.velocityWindow;
        uint256 transactionsInWindow = _countTransactionsInWindow(account, windowStart);

        return transactionsInWindow < limits.velocityLimit;
    }

    /**
     * @dev Conta transações em uma janela de tempo (implementação simplificada)
     */
    function _countTransactionsInWindow(address account, uint256 windowStart)
        internal
        view
        returns (uint256)
    {
        SpendingTracker memory tracker = spendingTrackers[account];

        // Implementação simplificada - assume distribuição uniforme
        if (tracker.lastTransactionTime > windowStart) {
            return tracker.transactionCount;
        }

        return 0;
    }

    /**
     * @dev Registra violação de limite
     */
    function _recordViolation(
        address account,
        LimitType limitType,
        uint256 attemptedAmount,
        uint256 allowedAmount
    ) internal {
        LimitViolation memory violation = LimitViolation({
            account: account,
            limitType: limitType,
            attemptedAmount: attemptedAmount,
            allowedAmount: allowedAmount,
            timestamp: block.timestamp,
            reason: "LIMIT_EXCEEDED"
        });

        violationHistory[account].push(violation);
        violationCount[account]++;
        totalViolations++;

        emit LimitExceeded(account, limitType, attemptedAmount, allowedAmount, 0);
    }
}