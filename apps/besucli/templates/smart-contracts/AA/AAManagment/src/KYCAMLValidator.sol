// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IKYCAMLValidator.sol";

/**
 * @title KYCAMLValidator
 * @dev Implementação completa de validação KYC/AML para instituições financeiras
 * @notice Sistema robusto de compliance com integração para regulamentações bancárias
 */
contract KYCAMLValidator is IKYCAMLValidator, AccessControl, Pausable, ReentrancyGuard {
    // ============= ROLES =============
    bytes32 public constant KYC_OFFICER = keccak256("KYC_OFFICER");
    bytes32 public constant AML_OFFICER = keccak256("AML_OFFICER");
    bytes32 public constant COMPLIANCE_ADMIN = keccak256("COMPLIANCE_ADMIN");
    bytes32 public constant RISK_ANALYST = keccak256("RISK_ANALYST");

    // ============= STATE VARIABLES =============

    // KYC Data
    mapping(address => KYCData) public kycData;
    mapping(address => bool) public isKYCVerified;

    // AML Data
    mapping(address => AMLCheckResult[]) public amlHistory;
    mapping(address => RiskLevel) public userRiskLevel;
    mapping(address => uint256) public lastAMLCheck;

    // Sanctions and Blacklists
    mapping(bytes32 => mapping(address => bool)) public sanctionLists;
    mapping(address => bytes32[]) public userSanctionLists;
    mapping(bytes32 => bool) public activeSanctionLists;

    // Risk Configuration
    struct RiskThresholds {
        uint256 lowThreshold;
        uint256 mediumThreshold;
        uint256 highThreshold;
        uint256 criticalThreshold;
    }

    RiskThresholds public riskThresholds;
    uint256 public kycValidityPeriod = 365 days; // 1 ano
    uint256 public amlCheckInterval = 24 hours; // Check diário

    // Authorized Validators
    mapping(address => bool) public authorizedValidators;

    // Statistics
    uint256 public totalKYCVerifications;
    uint256 public totalAMLChecks;
    uint256 public rejectedTransactions;

    // ============= EVENTS IMPLEMENTATION =============
    // (Events já definidos na interface)

    // ============= CUSTOM ERRORS IMPLEMENTATION =============
    // (Errors já definidos na interface)

    // ============= CONSTRUCTOR =============
    constructor(
        RiskThresholds memory _riskThresholds,
        uint256 _kycValidityPeriod
    ) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(COMPLIANCE_ADMIN, msg.sender);
        _grantRole(KYC_OFFICER, msg.sender);
        _grantRole(AML_OFFICER, msg.sender);
        _grantRole(RISK_ANALYST, msg.sender);

        riskThresholds = _riskThresholds;
        kycValidityPeriod = _kycValidityPeriod;

        authorizedValidators[msg.sender] = true;
    }

    // ============= KYC FUNCTIONS =============

    /**
     * @dev Atualiza o status KYC de um usuário
     */
    function updateKYCStatus(
        address user,
        KYCStatus status,
        uint256 expiresAt,
        bytes32 documentHash
    ) external onlyRole(KYC_OFFICER) whenNotPaused {
        if (user == address(0)) revert("Invalid user address");
        if (status == KYCStatus.VERIFIED && expiresAt <= block.timestamp) {
            revert InvalidKYCData();
        }

        KYCData storage userData = kycData[user];
        KYCStatus oldStatus = userData.status;

        userData.status = status;
        userData.documentHash = documentHash;

        if (status == KYCStatus.VERIFIED) {
            userData.verifiedAt = block.timestamp;
            userData.expiresAt = expiresAt;
            isKYCVerified[user] = true;
            totalKYCVerifications++;
        } else {
            isKYCVerified[user] = false;
        }

        // Define nível de risco inicial baseado no status KYC
        if (status == KYCStatus.VERIFIED && userRiskLevel[user] == RiskLevel.CRITICAL) {
            userRiskLevel[user] = RiskLevel.MEDIUM;
        } else if (status == KYCStatus.REJECTED) {
            userRiskLevel[user] = RiskLevel.HIGH;
        }

        emit KYCStatusUpdated(user, oldStatus, status, expiresAt);
    }

    /**
     * @dev Valida se o KYC de um usuário está válido
     */
    function validateKYC(address user) external view override returns (bool) {
        return isKYCValid(user);
    }

    /**
     * @dev Verifica se o KYC está válido e não expirado
     */
    function isKYCValid(address user) public view override returns (bool) {
        KYCData memory userData = kycData[user];

        return userData.status == KYCStatus.VERIFIED &&
               block.timestamp <= userData.expiresAt &&
               !isSanctioned(user);
    }

    /**
     * @dev Retorna dados KYC de um usuário
     */
    function getKYCData(address user) external view override returns (KYCData memory) {
        return kycData[user];
    }

    // ============= AML FUNCTIONS =============

    /**
     * @dev Valida transação contra políticas AML
     */
    function validateAML(
        address target,
        uint256 value,
        bytes calldata data
    ) external view override returns (bool) {
        // Verifica se o target está em lista de sanções
        if (isSanctioned(target)) {
            return false;
        }

        // Calcula score de risco da transação
        (uint256 riskScore, RiskLevel riskLevel) = calculateTransactionRisk(
            msg.sender, target, value, data
        );

        // Rejeita transações de alto risco
        if (riskLevel == RiskLevel.CRITICAL) {
            return false;
        }

        // Verifica se o risco está dentro dos thresholds aceitáveis
        RiskLevel userRisk = userRiskLevel[msg.sender];
        if (userRisk == RiskLevel.HIGH && riskLevel >= RiskLevel.HIGH) {
            return false;
        }

        return true;
    }

    /**
     * @dev Executa verificação AML completa e registra resultado
     */
    function performAMLCheck(
        address user,
        address target,
        uint256 value,
        bytes calldata data
    ) external override onlyRole(AML_OFFICER) returns (AMLCheckResult memory) {
        // Calcula risco da transação
        (uint256 riskScore, RiskLevel riskLevel) = calculateTransactionRisk(
            user, target, value, data
        );

        // Coleta flags de risco
        bytes32[] memory flags = _collectRiskFlags(user, target, value, data);

        // Determina se passou na verificação
        bool passed = riskLevel != RiskLevel.CRITICAL && !isSanctioned(target);

        // Cria resultado
        AMLCheckResult memory result = AMLCheckResult({
            passed: passed,
            riskLevel: riskLevel,
            flags: flags,
            score: riskScore,
            checkedAt: block.timestamp
        });

        // Armazena no histórico
        amlHistory[user].push(result);
        lastAMLCheck[user] = block.timestamp;
        totalAMLChecks++;

        if (!passed) {
            rejectedTransactions++;
        }

        emit AMLCheckPerformed(user, target, value, passed, riskLevel, riskScore);

        return result;
    }

    /**
     * @dev Retorna histórico AML de um usuário
     */
    function getAMLHistory(address user, uint256 limit)
        external
        view
        override
        returns (AMLCheckResult[] memory)
    {
        AMLCheckResult[] memory history = amlHistory[user];

        if (limit == 0 || limit >= history.length) {
            return history;
        }

        // Retorna os últimos 'limit' registros
        AMLCheckResult[] memory limitedHistory = new AMLCheckResult[](limit);
        uint256 startIndex = history.length - limit;

        for (uint256 i = 0; i < limit; i++) {
            limitedHistory[i] = history[startIndex + i];
        }

        return limitedHistory;
    }

    // ============= RISK MANAGEMENT =============

    /**
     * @dev Atualiza nível de risco de um usuário
     */
    function updateRiskLevel(
        address user,
        RiskLevel newLevel,
        bytes32 reason
    ) external override onlyRole(RISK_ANALYST) {
        RiskLevel oldLevel = userRiskLevel[user];
        userRiskLevel[user] = newLevel;

        emit RiskLevelChanged(user, oldLevel, newLevel, reason);
    }

    /**
     * @dev Retorna nível de risco atual do usuário
     */
    function getRiskLevel(address user) external view override returns (RiskLevel) {
        return userRiskLevel[user];
    }

    /**
     * @dev Calcula risco de uma transação
     */
    function calculateTransactionRisk(
        address user,
        address target,
        uint256 value,
        bytes calldata data
    ) public view override returns (uint256 score, RiskLevel level) {
        score = 0;

        // Fator 1: Risco do usuário
        RiskLevel userRisk = userRiskLevel[user];
        if (userRisk == RiskLevel.LOW) score += 10;
        else if (userRisk == RiskLevel.MEDIUM) score += 25;
        else if (userRisk == RiskLevel.HIGH) score += 50;
        else if (userRisk == RiskLevel.CRITICAL) score += 100;

        // Fator 2: Valor da transação
        if (value > 1000000 ether) score += 40;
        else if (value > 100000 ether) score += 25;
        else if (value > 10000 ether) score += 15;
        else if (value > 1000 ether) score += 5;

        // Fator 3: Target está em lista de sanções
        if (isSanctioned(target)) score += 100;

        // Fator 4: Frequência de transações (velocity)
        uint256 timeSinceLastCheck = block.timestamp - lastAMLCheck[user];
        if (timeSinceLastCheck < 1 hours) score += 20;
        else if (timeSinceLastCheck < 6 hours) score += 10;

        // Fator 5: Complexidade da transação (dados não vazios)
        if (data.length > 0) score += 5;
        if (data.length > 1000) score += 10;

        // Fator 6: KYC não verificado
        if (!isKYCValid(user)) score += 30;

        // Determina nível baseado no score
        if (score >= riskThresholds.criticalThreshold) level = RiskLevel.CRITICAL;
        else if (score >= riskThresholds.highThreshold) level = RiskLevel.HIGH;
        else if (score >= riskThresholds.mediumThreshold) level = RiskLevel.MEDIUM;
        else level = RiskLevel.LOW;
    }

    // ============= SANCTIONS & BLACKLIST =============

    /**
     * @dev Adiciona endereços a uma lista de sanções
     */
    function addToSanctionList(bytes32 listId, address[] calldata addresses)
        external
        override
        onlyRole(AML_OFFICER)
    {
        activeSanctionLists[listId] = true;

        for (uint256 i = 0; i < addresses.length; i++) {
            address addr = addresses[i];
            if (!sanctionLists[listId][addr]) {
                sanctionLists[listId][addr] = true;
                userSanctionLists[addr].push(listId);
            }
        }

        emit SanctionListUpdated(listId, addresses.length);
    }

    /**
     * @dev Remove endereços de uma lista de sanções
     */
    function removeFromSanctionList(bytes32 listId, address[] calldata addresses)
        external
        override
        onlyRole(AML_OFFICER)
    {
        for (uint256 i = 0; i < addresses.length; i++) {
            address addr = addresses[i];
            if (sanctionLists[listId][addr]) {
                sanctionLists[listId][addr] = false;
                _removeSanctionListFromUser(addr, listId);
            }
        }

        emit SanctionListUpdated(listId, addresses.length);
    }

    /**
     * @dev Verifica se um endereço está sancionado
     */
    function isSanctioned(address target) public view override returns (bool) {
        bytes32[] memory lists = userSanctionLists[target];

        for (uint256 i = 0; i < lists.length; i++) {
            if (activeSanctionLists[lists[i]] && sanctionLists[lists[i]][target]) {
                return true;
            }
        }

        return false;
    }

    /**
     * @dev Retorna listas de sanções que contêm o endereço
     */
    function getSanctionLists(address target) external view override returns (bytes32[] memory) {
        return userSanctionLists[target];
    }

    // ============= CONFIGURATION =============

    /**
     * @dev Define thresholds de risco
     */
    function setRiskThresholds(
        uint256 lowThreshold,
        uint256 mediumThreshold,
        uint256 highThreshold
    ) external override onlyRole(COMPLIANCE_ADMIN) {
        if (lowThreshold >= mediumThreshold ||
            mediumThreshold >= highThreshold) {
            revert("Invalid thresholds");
        }

        riskThresholds.lowThreshold = lowThreshold;
        riskThresholds.mediumThreshold = mediumThreshold;
        riskThresholds.highThreshold = highThreshold;
        riskThresholds.criticalThreshold = highThreshold + 50; // Auto-calculado
    }

    /**
     * @dev Define período de validade do KYC
     */
    function setKYCValidityPeriod(uint256 validityPeriod)
        external
        override
        onlyRole(COMPLIANCE_ADMIN)
    {
        kycValidityPeriod = validityPeriod;
    }

    /**
     * @dev Adiciona validador autorizado
     */
    function addAuthorizedValidator(address validator)
        external
        override
        onlyRole(COMPLIANCE_ADMIN)
    {
        authorizedValidators[validator] = true;
    }

    /**
     * @dev Remove validador autorizado
     */
    function removeAuthorizedValidator(address validator)
        external
        override
        onlyRole(COMPLIANCE_ADMIN)
    {
        authorizedValidators[validator] = false;
    }

    // ============= EMERGENCY FUNCTIONS =============

    /**
     * @dev Pausa o sistema em emergência
     */
    function emergencyPause() external onlyRole(COMPLIANCE_ADMIN) {
        _pause();
    }

    /**
     * @dev Despausa o sistema
     */
    function unpause() external onlyRole(COMPLIANCE_ADMIN) {
        _unpause();
    }

    /**
     * @dev Congela KYC de um usuário
     */
    function emergencyFreezeKYC(address user, bytes32 reason)
        external
        onlyRole(COMPLIANCE_ADMIN)
    {
        kycData[user].status = KYCStatus.REJECTED;
        isKYCVerified[user] = false;
        userRiskLevel[user] = RiskLevel.CRITICAL;

        emit KYCStatusUpdated(user, KYCStatus.VERIFIED, KYCStatus.REJECTED, 0);
    }

    // ============= INTERNAL FUNCTIONS =============

    /**
     * @dev Coleta flags de risco para uma transação
     */
    function _collectRiskFlags(
        address user,
        address target,
        uint256 value,
        bytes calldata data
    ) internal view returns (bytes32[] memory) {
        bytes32[] memory tempFlags = new bytes32[](10);
        uint256 flagCount = 0;

        if (!isKYCValid(user)) {
            tempFlags[flagCount++] = "KYC_INVALID";
        }

        if (isSanctioned(target)) {
            tempFlags[flagCount++] = "SANCTIONED_TARGET";
        }

        if (value > 100000 ether) {
            tempFlags[flagCount++] = "HIGH_VALUE";
        }

        if (userRiskLevel[user] >= RiskLevel.HIGH) {
            tempFlags[flagCount++] = "HIGH_RISK_USER";
        }

        uint256 timeSinceLastCheck = block.timestamp - lastAMLCheck[user];
        if (timeSinceLastCheck < 1 hours) {
            tempFlags[flagCount++] = "HIGH_VELOCITY";
        }

        if (data.length > 1000) {
            tempFlags[flagCount++] = "COMPLEX_TRANSACTION";
        }

        // Retorna array com tamanho exato
        bytes32[] memory flags = new bytes32[](flagCount);
        for (uint256 i = 0; i < flagCount; i++) {
            flags[i] = tempFlags[i];
        }

        return flags;
    }

    /**
     * @dev Remove lista de sanção de um usuário
     */
    function _removeSanctionListFromUser(address user, bytes32 listId) internal {
        bytes32[] storage userLists = userSanctionLists[user];

        for (uint256 i = 0; i < userLists.length; i++) {
            if (userLists[i] == listId) {
                userLists[i] = userLists[userLists.length - 1];
                userLists.pop();
                break;
            }
        }
    }

    // ============= VIEW FUNCTIONS =============

    /**
     * @dev Retorna estatísticas do sistema
     */
    function getSystemStats() external view returns (
        uint256 totalKYC,
        uint256 totalAML,
        uint256 rejected,
        uint256 activeLists
    ) {
        totalKYC = totalKYCVerifications;
        totalAML = totalAMLChecks;
        rejected = rejectedTransactions;

        // Conta listas de sanções ativas (implementação simplificada)
        activeLists = 0; // Poderia ser implementado com contador dedicado
    }

    /**
     * @dev Retorna configurações de risco
     */
    function getRiskThresholds() external view returns (RiskThresholds memory) {
        return riskThresholds;
    }
}