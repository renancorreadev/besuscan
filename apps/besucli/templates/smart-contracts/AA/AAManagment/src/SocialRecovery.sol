// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "./interfaces/ISocialRecovery.sol";

/**
 * @title SocialRecovery
 * @dev Sistema avançado de recuperação social para contas AA bancárias
 * @notice Implementa recuperação multi-fator com guardiões de confiança
 */
contract SocialRecovery is ISocialRecovery, AccessControl, Pausable, ReentrancyGuard {
    using ECDSA for bytes32;

    // ============= ROLES =============
    bytes32 public constant RECOVERY_ADMIN = keccak256("RECOVERY_ADMIN");
    bytes32 public constant GUARDIAN_MANAGER = keccak256("GUARDIAN_MANAGER");
    bytes32 public constant EMERGENCY_MANAGER = keccak256("EMERGENCY_MANAGER");

    // ============= STATE VARIABLES =============

    // Configurações de recuperação por conta
    mapping(address => RecoveryConfig) public recoveryConfigs;
    mapping(address => mapping(address => Guardian)) public accountGuardians;
    mapping(address => address[]) public guardiansList;
    mapping(address => uint256) public guardianCounts;

    // Solicitações de recuperação
    mapping(address => RecoveryRequest) private activeRecoveries;
    mapping(bytes32 => RecoveryRequest) private recoveryRequests;
    mapping(address => RecoveryRequestView[]) public recoveryHistory;
    mapping(address => uint256) public lastRecoveryAttempt;

    // Nonces para unicidade
    mapping(address => uint256) public recoveryNonces;

    // Estatísticas
    uint256 public totalRecoveryAccounts;
    uint256 public totalRecoveryRequests;
    uint256 public successfulRecoveries;
    uint256 public rejectedRecoveries;

    // Configuração padrão
    RecoveryConfig public defaultConfig = RecoveryConfig({
        requiredApprovals: 2,
        requiredWeight: 100,
        recoveryDelay: 24 hours,
        approvalWindow: 72 hours,
        cooldownPeriod: 7 days,
        isActive: true
    });

    // ============= MODIFIERS =============
    modifier onlyValidAccount(address account) {
        if (!recoveryConfigs[account].isActive) revert RecoveryNotConfigured(account);
        _;
    }

    modifier onlyValidGuardian(address account, address guardian) {
        if (!accountGuardians[account][guardian].isActive) {
            revert GuardianNotFound(guardian);
        }
        _;
    }

    modifier cooldownCheck(address account) {
        uint256 lastAttempt = lastRecoveryAttempt[account];
        uint256 cooldown = recoveryConfigs[account].cooldownPeriod;

        if (lastAttempt != 0 && block.timestamp < lastAttempt + cooldown) {
            revert CooldownPeriodActive(lastAttempt + cooldown - block.timestamp);
        }
        _;
    }

    // ============= CONSTRUCTOR =============
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(RECOVERY_ADMIN, msg.sender);
        _grantRole(GUARDIAN_MANAGER, msg.sender);
        _grantRole(EMERGENCY_MANAGER, msg.sender);
    }

    // ============= GUARDIAN MANAGEMENT =============

    /**
     * @dev Adiciona um guardião para uma conta
     */
    function addGuardian(
        address account,
        address guardian,
        GuardianType guardianType,
        uint256 weight,
        string calldata metadata
    ) external override onlyRole(GUARDIAN_MANAGER) whenNotPaused {
        if (account == address(0) || guardian == address(0)) revert("Invalid address");
        if (accountGuardians[account][guardian].guardianAddress != address(0)) {
            revert GuardianAlreadyExists(guardian);
        }
        if (weight == 0) revert("Invalid weight");

        accountGuardians[account][guardian] = Guardian({
            guardianAddress: guardian,
            guardianType: guardianType,
            weight: weight,
            isActive: true,
            addedAt: block.timestamp,
            metadata: metadata
        });

        guardiansList[account].push(guardian);
        guardianCounts[account]++;

        // Ativa recuperação automaticamente se não estiver ativa
        if (!recoveryConfigs[account].isActive) {
            recoveryConfigs[account] = defaultConfig;
            totalRecoveryAccounts++;
        }

        emit GuardianAdded(account, guardian, guardianType, weight);
    }

    /**
     * @dev Remove um guardião
     */
    function removeGuardian(address account, address guardian)
        external
        override
        onlyRole(GUARDIAN_MANAGER)
        onlyValidAccount(account)
    {
        if (accountGuardians[account][guardian].guardianAddress == address(0)) {
            revert GuardianNotFound(guardian);
        }
        if (guardianCounts[account] <= recoveryConfigs[account].requiredApprovals) {
            revert CannotRemoveLastGuardian();
        }

        delete accountGuardians[account][guardian];
        _removeFromGuardiansList(account, guardian);
        guardianCounts[account]--;

        emit GuardianRemoved(account, guardian);
    }

    /**
     * @dev Atualiza peso de um guardião
     */
    function updateGuardianWeight(address account, address guardian, uint256 newWeight)
        external
        override
        onlyRole(GUARDIAN_MANAGER)
        onlyValidAccount(account)
        onlyValidGuardian(account, guardian)
    {
        if (newWeight == 0) revert("Invalid weight");
        accountGuardians[account][guardian].weight = newWeight;
    }

    /**
     * @dev Atualiza tipo de um guardião
     */
    function updateGuardianType(address account, address guardian, GuardianType newType)
        external
        override
        onlyRole(GUARDIAN_MANAGER)
        onlyValidAccount(account)
        onlyValidGuardian(account, guardian)
    {
        accountGuardians[account][guardian].guardianType = newType;
    }

    /**
     * @dev Ativa/desativa um guardião
     */
    function setGuardianStatus(address account, address guardian, bool isActive)
        external
        override
        onlyRole(GUARDIAN_MANAGER)
        onlyValidAccount(account)
    {
        if (accountGuardians[account][guardian].guardianAddress == address(0)) {
            revert GuardianNotFound(guardian);
        }

        accountGuardians[account][guardian].isActive = isActive;
        emit GuardianStatusChanged(account, guardian, isActive);
    }

    /**
     * @dev Atualiza metadata de um guardião
     */
    function updateGuardianMetadata(address account, address guardian, string calldata metadata)
        external
        override
        onlyRole(GUARDIAN_MANAGER)
        onlyValidAccount(account)
        onlyValidGuardian(account, guardian)
    {
        accountGuardians[account][guardian].metadata = metadata;
    }

    // ============= RECOVERY CONFIGURATION =============

    /**
     * @dev Define configuração de recuperação
     */
    function setRecoveryConfig(
        address account,
        RecoveryConfig calldata config
    ) external override onlyRole(RECOVERY_ADMIN) whenNotPaused {
        if (account == address(0)) revert("Invalid account");
        if (!_isValidRecoveryConfig(config)) revert InvalidRecoveryConfig();

        bool wasActive = recoveryConfigs[account].isActive;
        recoveryConfigs[account] = config;

        if (!wasActive && config.isActive) {
            totalRecoveryAccounts++;
        } else if (wasActive && !config.isActive) {
            totalRecoveryAccounts--;
        }

        emit RecoveryConfigUpdated(
            account,
            config.requiredApprovals,
            config.requiredWeight,
            config.recoveryDelay
        );
    }

    /**
     * @dev Atualiza delay de recuperação
     */
    function updateRecoveryDelay(address account, uint256 newDelay)
        external
        override
        onlyRole(RECOVERY_ADMIN)
        onlyValidAccount(account)
    {
        if (newDelay < 1 hours || newDelay > 30 days) revert InvalidRecoveryConfig();
        recoveryConfigs[account].recoveryDelay = newDelay;
    }

    /**
     * @dev Atualiza aprovações necessárias
     */
    function updateRequiredApprovals(address account, uint256 newRequired)
        external
        override
        onlyRole(RECOVERY_ADMIN)
        onlyValidAccount(account)
    {
        if (newRequired == 0 || newRequired > guardianCounts[account]) {
            revert InvalidRecoveryConfig();
        }
        recoveryConfigs[account].requiredApprovals = newRequired;
    }

    /**
     * @dev Atualiza janela de aprovação
     */
    function updateApprovalWindow(address account, uint256 newWindow)
        external
        override
        onlyRole(RECOVERY_ADMIN)
        onlyValidAccount(account)
    {
        if (newWindow < 12 hours || newWindow > 7 days) revert InvalidRecoveryConfig();
        recoveryConfigs[account].approvalWindow = newWindow;
    }

    /**
     * @dev Ativa recuperação
     */
    function activateRecovery(address account) external override onlyRole(RECOVERY_ADMIN) {
        if (guardianCounts[account] == 0) revert InsufficientGuardians(0, 1);

        if (!recoveryConfigs[account].isActive) {
            recoveryConfigs[account] = defaultConfig;
            totalRecoveryAccounts++;
        }
        recoveryConfigs[account].isActive = true;
    }

    /**
     * @dev Desativa recuperação
     */
    function deactivateRecovery(address account) external override onlyRole(RECOVERY_ADMIN) {
        recoveryConfigs[account].isActive = false;
        if (totalRecoveryAccounts > 0) totalRecoveryAccounts--;
    }

    // ============= RECOVERY PROCESS =============

    /**
     * @dev Inicia processo de recuperação
     */
    function initiateRecovery(
        address account,
        address proposedNewOwner,
        bytes32 reason
    ) external override onlyValidAccount(account) cooldownCheck(account) returns (bytes32 requestId) {
        if (proposedNewOwner == address(0)) revert("Invalid new owner");
        if (!canInitiateRecovery(account, msg.sender)) {
            revert UnauthorizedRecoveryAction(msg.sender);
        }

        // Verifica se já existe recuperação ativa
        if (activeRecoveries[account].account != address(0)) {
            revert RecoveryAlreadyInitiated(account);
        }

        RecoveryConfig memory config = recoveryConfigs[account];
        uint256 nonce = recoveryNonces[account]++;

        requestId = keccak256(abi.encodePacked(
            account, proposedNewOwner, msg.sender, nonce, block.timestamp
        ));

        RecoveryRequest storage request = recoveryRequests[requestId];
        request.requestId = requestId;
        request.account = account;
        request.proposedNewOwner = proposedNewOwner;
        request.initiator = msg.sender;
        request.initiatedAt = block.timestamp;
        request.executionTime = block.timestamp + config.recoveryDelay;
        request.expiresAt = block.timestamp + config.approvalWindow;
        request.status = RecoveryStatus.INITIATED;
        request.approvals = 0;
        request.totalWeight = 0;
        request.reason = reason;

        // Marca como recuperação ativa
        RecoveryRequest storage activeRequest = activeRecoveries[account];
        activeRequest.requestId = request.requestId;
        activeRequest.account = request.account;
        activeRequest.proposedNewOwner = request.proposedNewOwner;
        activeRequest.initiator = request.initiator;
        activeRequest.initiatedAt = request.initiatedAt;
        activeRequest.executionTime = request.executionTime;
        activeRequest.expiresAt = request.expiresAt;
        activeRequest.status = request.status;
        activeRequest.approvals = request.approvals;
        activeRequest.totalWeight = request.totalWeight;
        activeRequest.reason = request.reason;
        // Note: mapping hasApproved and array approvers will start empty in activeRecoveries
        lastRecoveryAttempt[account] = block.timestamp;
        totalRecoveryRequests++;

        emit RecoveryInitiated(account, requestId, msg.sender, proposedNewOwner, request.expiresAt);

        return requestId;
    }

    /**
     * @dev Aprova uma recuperação
     */
    function approveRecovery(
        address account,
        bytes32 requestId
    ) external override onlyValidAccount(account) onlyValidGuardian(account, msg.sender) {
        RecoveryRequest storage request = recoveryRequests[requestId];

        if (request.account == address(0)) revert RecoveryRequestNotFound(requestId);
        if (request.status != RecoveryStatus.INITIATED) revert RecoveryNotInitiated(account);
        if (block.timestamp > request.expiresAt) revert RecoveryExpiredError(requestId);
        if (request.hasApproved[msg.sender]) revert GuardianAlreadyApproved(msg.sender);

        Guardian memory guardian = accountGuardians[account][msg.sender];
        if (!guardian.isActive) revert GuardianNotFound(msg.sender);

        request.hasApproved[msg.sender] = true;
        request.approvers.push(msg.sender);
        request.approvals++;
        request.totalWeight += guardian.weight;

        emit RecoveryApproved(account, requestId, msg.sender, request.approvals, request.totalWeight);

        // Verifica se atinge os requisitos para aprovação
        RecoveryConfig memory config = recoveryConfigs[account];
        if (request.approvals >= config.requiredApprovals &&
            request.totalWeight >= config.requiredWeight) {
            request.status = RecoveryStatus.APPROVED;
        }

        // Atualiza recuperação ativa
        RecoveryRequest storage activeRequest = activeRecoveries[account];
        activeRequest.requestId = request.requestId;
        activeRequest.account = request.account;
        activeRequest.proposedNewOwner = request.proposedNewOwner;
        activeRequest.initiator = request.initiator;
        activeRequest.initiatedAt = request.initiatedAt;
        activeRequest.executionTime = request.executionTime;
        activeRequest.expiresAt = request.expiresAt;
        activeRequest.status = request.status;
        activeRequest.approvals = request.approvals;
        activeRequest.totalWeight = request.totalWeight;
        activeRequest.reason = request.reason;
        // Copy approvers array
        delete activeRequest.approvers;
        for (uint256 i = 0; i < request.approvers.length; i++) {
            activeRequest.approvers.push(request.approvers[i]);
            activeRequest.hasApproved[request.approvers[i]] = request.hasApproved[request.approvers[i]];
        }
    }

    /**
     * @dev Executa uma recuperação aprovada
     */
    function executeRecovery(
        address account,
        bytes32 requestId
    ) external override onlyValidAccount(account) nonReentrant {
        RecoveryRequest storage request = recoveryRequests[requestId];

        if (request.account == address(0)) revert RecoveryRequestNotFound(requestId);
        if (request.status != RecoveryStatus.APPROVED) revert RecoveryNotInitiated(account);
        if (block.timestamp > request.expiresAt) revert RecoveryExpiredError(requestId);
        if (block.timestamp < request.executionTime) {
            revert RecoveryDelayNotMet(block.timestamp, request.executionTime);
        }

        RecoveryConfig memory config = recoveryConfigs[account];
        if (request.approvals < config.requiredApprovals) {
            revert InsufficientApprovals(request.approvals, config.requiredApprovals);
        }

        request.status = RecoveryStatus.EXECUTED;
        successfulRecoveries++;

        // Remove recuperação ativa
        delete activeRecoveries[account];

        // Adiciona ao histórico
        _addToHistory(account, request);

        emit RecoveryExecuted(account, requestId, address(0), request.proposedNewOwner);

        // NOTA: A mudança real do owner deve ser feita pelo contrato da conta
        // Este contrato apenas gerencia o processo de aprovação
    }

    /**
     * @dev Rejeita uma recuperação
     */
    function rejectRecovery(
        address account,
        bytes32 requestId,
        bytes32 reason
    ) external override onlyValidAccount(account) onlyValidGuardian(account, msg.sender) {
        RecoveryRequest storage request = recoveryRequests[requestId];

        if (request.account == address(0)) revert RecoveryRequestNotFound(requestId);
        if (request.status == RecoveryStatus.EXECUTED) revert("Already executed");

        // Apenas guardiões EMERGENCY podem rejeitar
        Guardian memory guardian = accountGuardians[account][msg.sender];
        if (guardian.guardianType != GuardianType.EMERGENCY) {
            revert UnauthorizedRecoveryAction(msg.sender);
        }

        request.status = RecoveryStatus.REJECTED;
        rejectedRecoveries++;

        // Remove recuperação ativa
        delete activeRecoveries[account];

        _addToHistory(account, request);

        emit RecoveryRejected(account, requestId, msg.sender, reason);
    }

    /**
     * @dev Cancela uma recuperação
     */
    function cancelRecovery(
        address account,
        bytes32 requestId,
        bytes32 reason
    ) external override {
        RecoveryRequest storage request = recoveryRequests[requestId];

        if (request.account == address(0)) revert RecoveryRequestNotFound(requestId);
        if (request.status == RecoveryStatus.EXECUTED) revert("Already executed");

        // Apenas o iniciador ou emergency guardian pode cancelar
        bool canCancel = msg.sender == request.initiator ||
                        (accountGuardians[account][msg.sender].guardianType == GuardianType.EMERGENCY &&
                         accountGuardians[account][msg.sender].isActive);

        if (!canCancel) revert UnauthorizedRecoveryAction(msg.sender);

        request.status = RecoveryStatus.REJECTED;

        // Remove recuperação ativa
        delete activeRecoveries[account];

        _addToHistory(account, request);

        emit RecoveryCancelled(account, requestId, msg.sender, reason);
    }

    // ============= EMERGENCY FUNCTIONS =============

    /**
     * @dev Recuperação de emergência (bypass do processo normal)
     */
    function emergencyRecovery(
        address account,
        address newOwner
    ) external override onlyRole(EMERGENCY_MANAGER) {
        if (newOwner == address(0)) revert("Invalid new owner");

        // Cria request de emergência
        bytes32 requestId = keccak256(abi.encodePacked(
            account, newOwner, msg.sender, "EMERGENCY", block.timestamp
        ));

        RecoveryRequest storage request = recoveryRequests[requestId];
        request.requestId = requestId;
        request.account = account;
        request.proposedNewOwner = newOwner;
        request.initiator = msg.sender;
        request.initiatedAt = block.timestamp;
        request.executionTime = block.timestamp;
        request.expiresAt = block.timestamp + 1 hours;
        request.status = RecoveryStatus.EXECUTED;
        request.reason = "EMERGENCY_RECOVERY";

        successfulRecoveries++;
        totalRecoveryRequests++;

        _addToHistory(account, request);

        emit EmergencyRecovery(account, msg.sender, newOwner);
    }

    /**
     * @dev Congela recuperação social
     */
    function emergencyFreeze(address account) external override onlyRole(EMERGENCY_MANAGER) {
        recoveryConfigs[account].isActive = false;

        // Cancela recuperação ativa se existir
        if (activeRecoveries[account].account != address(0)) {
            delete activeRecoveries[account];
        }
    }

    /**
     * @dev Descongela recuperação social
     */
    function emergencyUnfreeze(address account) external override onlyRole(EMERGENCY_MANAGER) {
        recoveryConfigs[account].isActive = true;
    }

    // ============= VALIDATION FUNCTIONS =============

    /**
     * @dev Verifica se pode iniciar recuperação
     */
    function canInitiateRecovery(address account, address initiator) public view override returns (bool) {
        // Guardião ou owner podem iniciar recuperação
        return accountGuardians[account][initiator].isActive ||
               hasRole(RECOVERY_ADMIN, initiator);
    }

    /**
     * @dev Verifica se pode aprovar recuperação
     */
    function canApproveRecovery(address account, bytes32 requestId, address guardian)
        public
        view
        override
        returns (bool)
    {
        RecoveryRequest storage request = recoveryRequests[requestId];

        return request.account != address(0) &&
               request.status == RecoveryStatus.INITIATED &&
               block.timestamp <= request.expiresAt &&
               !request.hasApproved[guardian] &&
               accountGuardians[account][guardian].isActive;
    }

    /**
     * @dev Verifica se pode executar recuperação
     */
    function canExecuteRecovery(address account, bytes32 requestId) public view override returns (bool) {
        RecoveryRequest storage request = recoveryRequests[requestId];
        RecoveryConfig memory config = recoveryConfigs[account];

        return request.account != address(0) &&
               request.status == RecoveryStatus.APPROVED &&
               block.timestamp >= request.executionTime &&
               block.timestamp <= request.expiresAt &&
               request.approvals >= config.requiredApprovals &&
               request.totalWeight >= config.requiredWeight;
    }

    /**
     * @dev Verifica se é guardião válido
     */
    function isValidGuardian(address account, address guardian) public view override returns (bool) {
        return accountGuardians[account][guardian].isActive;
    }

    // ============= VIEW FUNCTIONS =============

    /**
     * @dev Retorna configuração de recuperação
     */
    function getRecoveryConfig(address account) external view override returns (RecoveryConfig memory) {
        return recoveryConfigs[account];
    }

    /**
     * @dev Retorna todos os guardiões
     */
    function getGuardians(address account) external view override returns (Guardian[] memory) {
        address[] memory guardianAddresses = guardiansList[account];
        Guardian[] memory guardians = new Guardian[](guardianAddresses.length);

        for (uint256 i = 0; i < guardianAddresses.length; i++) {
            guardians[i] = accountGuardians[account][guardianAddresses[i]];
        }

        return guardians;
    }

    /**
     * @dev Retorna dados de um guardião
     */
    function getGuardian(address account, address guardian) external view override returns (Guardian memory) {
        return accountGuardians[account][guardian];
    }

    /**
     * @dev Retorna recuperação ativa
     */
    function getActiveRecoveryRequest(address account) external view override returns (RecoveryRequestView memory) {
        RecoveryRequest storage request = activeRecoveries[account];
        return _convertToView(request);
    }

    /**
     * @dev Retorna dados de recuperação
     */
    function getRecoveryRequest(bytes32 requestId) external view override returns (RecoveryRequestView memory) {
        RecoveryRequest storage request = recoveryRequests[requestId];
        return _convertToView(request);
    }

    /**
     * @dev Retorna histórico de recuperações
     */
    function getRecoveryHistory(address account, uint256 limit)
        external
        view
        override
        returns (RecoveryRequestView[] memory)
    {
        RecoveryRequestView[] memory history = recoveryHistory[account];

        if (limit == 0 || limit >= history.length) {
            return history;
        }

        RecoveryRequestView[] memory limitedHistory = new RecoveryRequestView[](limit);
        uint256 startIndex = history.length - limit;

        for (uint256 i = 0; i < limit; i++) {
            limitedHistory[i] = history[startIndex + i];
        }

        return limitedHistory;
    }

    /**
     * @dev Retorna número de guardiões
     */
    function getGuardianCount(address account) external view override returns (uint256) {
        return guardianCounts[account];
    }

    /**
     * @dev Retorna peso total dos guardiões
     */
    function getTotalGuardianWeight(address account) external view override returns (uint256) {
        address[] memory guardianAddresses = guardiansList[account];
        uint256 totalWeight = 0;

        for (uint256 i = 0; i < guardianAddresses.length; i++) {
            Guardian memory guardian = accountGuardians[account][guardianAddresses[i]];
            if (guardian.isActive) {
                totalWeight += guardian.weight;
            }
        }

        return totalWeight;
    }

    /**
     * @dev Retorna status de aprovação
     */
    function getApprovalStatus(address account, bytes32 requestId)
        external
        view
        override
        returns (
            uint256 currentApprovals,
            uint256 requiredApprovals,
            uint256 currentWeight,
            uint256 requiredWeight,
            bool canExecute
        )
    {
        RecoveryRequest storage request = recoveryRequests[requestId];
        RecoveryConfig memory config = recoveryConfigs[account];

        currentApprovals = request.approvals;
        requiredApprovals = config.requiredApprovals;
        currentWeight = request.totalWeight;
        requiredWeight = config.requiredWeight;
        canExecute = canExecuteRecovery(account, requestId);
    }

    /**
     * @dev Retorna tempo até execução
     */
    function getTimeUntilExecution(address account, bytes32 requestId) external view override returns (uint256) {
        RecoveryRequest storage request = recoveryRequests[requestId];

        if (block.timestamp >= request.executionTime) return 0;
        return request.executionTime - block.timestamp;
    }

    /**
     * @dev Retorna cooldown restante
     */
    function getRemainingCooldown(address account) external view override returns (uint256) {
        uint256 lastAttempt = lastRecoveryAttempt[account];
        if (lastAttempt == 0) return 0;

        uint256 cooldownEnd = lastAttempt + recoveryConfigs[account].cooldownPeriod;
        if (block.timestamp >= cooldownEnd) return 0;

        return cooldownEnd - block.timestamp;
    }

    // ============= BATCH OPERATIONS =============

    /**
     * @dev Adiciona múltiplos guardiões
     */
    function batchAddGuardians(
        address account,
        Guardian[] calldata guardians
    ) external override onlyRole(GUARDIAN_MANAGER) {
        for (uint256 i = 0; i < guardians.length; i++) {
            this.addGuardian(
                account,
                guardians[i].guardianAddress,
                guardians[i].guardianType,
                guardians[i].weight,
                guardians[i].metadata
            );
        }
    }

    /**
     * @dev Remove múltiplos guardiões
     */
    function batchRemoveGuardians(
        address account,
        address[] calldata guardians
    ) external override onlyRole(GUARDIAN_MANAGER) {
        for (uint256 i = 0; i < guardians.length; i++) {
            this.removeGuardian(account, guardians[i]);
        }
    }

    /**
     * @dev Aprova múltiplas recuperações
     */
    function batchApproveRecovery(
        bytes32[] calldata requestIds
    ) external override {
        for (uint256 i = 0; i < requestIds.length; i++) {
            RecoveryRequest storage request = recoveryRequests[requestIds[i]];
            this.approveRecovery(request.account, requestIds[i]);
        }
    }

    // ============= INTERNAL FUNCTIONS =============

    /**
     * @dev Valida configuração de recuperação
     */
    function _isValidRecoveryConfig(RecoveryConfig memory config) internal pure returns (bool) {
        return config.requiredApprovals > 0 &&
               config.requiredWeight > 0 &&
               config.recoveryDelay >= 1 hours &&
               config.recoveryDelay <= 30 days &&
               config.approvalWindow >= 12 hours &&
               config.approvalWindow <= 7 days &&
               config.cooldownPeriod >= 1 days &&
               config.cooldownPeriod <= 30 days;
    }

    /**
     * @dev Remove guardião da lista
     */
    function _removeFromGuardiansList(address account, address guardian) internal {
        address[] storage guardians = guardiansList[account];

        for (uint256 i = 0; i < guardians.length; i++) {
            if (guardians[i] == guardian) {
                guardians[i] = guardians[guardians.length - 1];
                guardians.pop();
                break;
            }
        }
    }

    /**
     * @dev Adiciona ao histórico
     */
    function _addToHistory(address account, RecoveryRequest storage request) internal {
        recoveryHistory[account].push(_convertToView(request));
    }

    /**
     * @dev Converte para struct view
     */
    function _convertToView(RecoveryRequest storage request) internal view returns (RecoveryRequestView memory) {
        return RecoveryRequestView({
            requestId: request.requestId,
            account: request.account,
            proposedNewOwner: request.proposedNewOwner,
            initiator: request.initiator,
            initiatedAt: request.initiatedAt,
            executionTime: request.executionTime,
            expiresAt: request.expiresAt,
            status: request.status,
            approvals: request.approvals,
            totalWeight: request.totalWeight,
            approvers: request.approvers,
            reason: request.reason
        });
    }
}
