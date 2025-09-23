// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "./interfaces/IMultiSignatureValidator.sol";

/**
 * @title MultiSignatureValidator
 * @dev Sistema avançado de multi-assinatura para transações bancárias de alto valor
 * @notice Implementa timelock, pesos de assinatura e roles hierárquicos
 */
contract MultiSignatureValidator is IMultiSignatureValidator, AccessControl, Pausable, ReentrancyGuard {
    using ECDSA for bytes32;

    // ============= ROLES =============
    bytes32 public constant MULTISIG_ADMIN = keccak256("MULTISIG_ADMIN");
    bytes32 public constant SIGNER_MANAGER = keccak256("SIGNER_MANAGER");
    bytes32 public constant EMERGENCY_MANAGER = keccak256("EMERGENCY_MANAGER");

    // ============= STATE VARIABLES =============

    // Configurações por conta
    mapping(address => MultiSigConfig) public multiSigConfigs;
    mapping(address => mapping(address => Signer)) public accountSigners;
    mapping(address => address[]) public signersList;
    mapping(address => uint256) public signerCounts;

    // Transações pendentes
    mapping(address => mapping(bytes32 => Transaction)) private pendingTxs;
    mapping(address => bytes32[]) public accountTransactions;
    mapping(address => uint256) public transactionNonces;

    // Estatísticas
    uint256 public totalMultiSigAccounts;
    uint256 public totalTransactions;
    uint256 public totalExecutedTransactions;
    uint256 public totalRejectedTransactions;

    // Configurações padrão
    MultiSigConfig public defaultConfig = MultiSigConfig({
        requiredSignatures: 2,
        threshold: 10000 ether,
        timelock: 1 hours,
        expirationTime: 24 hours,
        isActive: true
    });

    // ============= MODIFIERS =============
    modifier onlyValidAccount(address account) {
        if (!multiSigConfigs[account].isActive) revert("MultiSig not configured");
        _;
    }

    modifier onlyAuthorizedSigner(address account) {
        if (!accountSigners[account][msg.sender].isActive) {
            revert SignerNotAuthorized(msg.sender);
        }
        _;
    }

    // ============= CONSTRUCTOR =============
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MULTISIG_ADMIN, msg.sender);
        _grantRole(SIGNER_MANAGER, msg.sender);
        _grantRole(EMERGENCY_MANAGER, msg.sender);
    }

    // ============= CONFIGURATION MANAGEMENT =============

    /**
     * @dev Define configuração de multi-sig para uma conta
     */
    function setMultiSigConfig(
        address account,
        MultiSigConfig calldata config
    ) external override onlyRole(MULTISIG_ADMIN) whenNotPaused {
        if (account == address(0)) revert("Invalid account");
        if (!_isValidConfig(config)) revert InvalidMultiSigConfig();

        bool wasActive = multiSigConfigs[account].isActive;
        multiSigConfigs[account] = config;

        if (!wasActive && config.isActive) {
            totalMultiSigAccounts++;
        } else if (wasActive && !config.isActive) {
            totalMultiSigAccounts--;
        }

        emit MultiSigConfigUpdated(
            account,
            config.requiredSignatures,
            config.threshold,
            config.timelock
        );
    }

    /**
     * @dev Atualiza threshold de valor
     */
    function updateThreshold(address account, uint256 newThreshold)
        external
        override
        onlyRole(MULTISIG_ADMIN)
        onlyValidAccount(account)
    {
        multiSigConfigs[account].threshold = newThreshold;
        emit MultiSigConfigUpdated(
            account,
            multiSigConfigs[account].requiredSignatures,
            newThreshold,
            multiSigConfigs[account].timelock
        );
    }

    /**
     * @dev Atualiza número de assinaturas necessárias
     */
    function updateRequiredSignatures(address account, uint256 newRequired)
        external
        override
        onlyRole(MULTISIG_ADMIN)
        onlyValidAccount(account)
    {
        if (newRequired == 0 || newRequired > signerCounts[account]) {
            revert InvalidMultiSigConfig();
        }

        multiSigConfigs[account].requiredSignatures = newRequired;
        emit MultiSigConfigUpdated(
            account,
            newRequired,
            multiSigConfigs[account].threshold,
            multiSigConfigs[account].timelock
        );
    }

    /**
     * @dev Atualiza timelock
     */
    function updateTimelock(address account, uint256 newTimelock)
        external
        override
        onlyRole(MULTISIG_ADMIN)
        onlyValidAccount(account)
    {
        multiSigConfigs[account].timelock = newTimelock;
        emit MultiSigConfigUpdated(
            account,
            multiSigConfigs[account].requiredSignatures,
            multiSigConfigs[account].threshold,
            newTimelock
        );
    }

    // ============= SIGNER MANAGEMENT =============

    /**
     * @dev Adiciona um novo signatário
     */
    function addSigner(
        address account,
        address signer,
        SignerRole role,
        uint256 weight
    ) external override onlyRole(SIGNER_MANAGER) onlyValidAccount(account) {
        if (signer == address(0)) revert("Invalid signer");
        if (accountSigners[account][signer].signerAddress != address(0)) {
            revert DuplicateSigner(signer);
        }
        if (weight == 0) revert("Invalid weight");

        accountSigners[account][signer] = Signer({
            signerAddress: signer,
            role: role,
            weight: weight,
            isActive: true,
            addedAt: block.timestamp
        });

        signersList[account].push(signer);
        signerCounts[account]++;

        emit SignerAdded(account, signer, role, weight);
    }

    /**
     * @dev Remove um signatário
     */
    function removeSigner(address account, address signer)
        external
        override
        onlyRole(SIGNER_MANAGER)
        onlyValidAccount(account)
    {
        if (accountSigners[account][signer].signerAddress == address(0)) {
            revert SignerNotAuthorized(signer);
        }
        if (signerCounts[account] <= multiSigConfigs[account].requiredSignatures) {
            revert CannotRemoveLastSigner();
        }

        delete accountSigners[account][signer];
        _removeFromSignersList(account, signer);
        signerCounts[account]--;

        emit SignerRemoved(account, signer);
    }

    /**
     * @dev Atualiza role de um signatário
     */
    function updateSignerRole(address account, address signer, SignerRole newRole)
        external
        override
        onlyRole(SIGNER_MANAGER)
        onlyValidAccount(account)
    {
        if (accountSigners[account][signer].signerAddress == address(0)) {
            revert SignerNotAuthorized(signer);
        }

        accountSigners[account][signer].role = newRole;
    }

    /**
     * @dev Atualiza peso de um signatário
     */
    function updateSignerWeight(address account, address signer, uint256 newWeight)
        external
        override
        onlyRole(SIGNER_MANAGER)
        onlyValidAccount(account)
    {
        if (accountSigners[account][signer].signerAddress == address(0)) {
            revert SignerNotAuthorized(signer);
        }
        if (newWeight == 0) revert("Invalid weight");

        accountSigners[account][signer].weight = newWeight;
    }

    /**
     * @dev Ativa/desativa um signatário
     */
    function setSignerStatus(address account, address signer, bool isActive)
        external
        override
        onlyRole(SIGNER_MANAGER)
        onlyValidAccount(account)
    {
        if (accountSigners[account][signer].signerAddress == address(0)) {
            revert SignerNotAuthorized(signer);
        }

        accountSigners[account][signer].isActive = isActive;
        emit SignerStatusChanged(account, signer, isActive);
    }

    // ============= TRANSACTION MANAGEMENT =============

    /**
     * @dev Cria uma nova transação que requer multi-sig
     */
    function createTransaction(
        address account,
        address target,
        uint256 value,
        bytes calldata data
    ) external override onlyValidAccount(account) returns (bytes32 txHash) {
        if (!requiresMultiSig(account, value)) {
            revert("Transaction below threshold");
        }

        MultiSigConfig memory config = multiSigConfigs[account];
        uint256 nonce = transactionNonces[account]++;

        txHash = keccak256(abi.encodePacked(
            account, target, value, data, nonce, block.timestamp
        ));

        Transaction storage txn = pendingTxs[account][txHash];
        txn.txHash = txHash;
        txn.target = target;
        txn.value = value;
        txn.data = data;
        txn.createdAt = block.timestamp;
        txn.executionTime = block.timestamp + config.timelock;
        txn.expiresAt = block.timestamp + config.expirationTime;
        txn.status = TransactionStatus.PENDING;
        txn.approvals = 0;
        txn.totalWeight = 0;

        accountTransactions[account].push(txHash);
        totalTransactions++;

        emit TransactionCreated(account, txHash, target, value, txn.expiresAt);

        return txHash;
    }

    /**
     * @dev Aprova uma transação
     */
    function approveTransaction(
        address account,
        bytes32 txHash
    ) external override onlyValidAccount(account) onlyAuthorizedSigner(account) {
        Transaction storage txn = pendingTxs[account][txHash];

        if (txn.target == address(0)) revert TransactionNotFound(txHash);
        if (txn.status != TransactionStatus.PENDING) revert TransactionAlreadyExecuted(txHash);
        if (block.timestamp > txn.expiresAt) revert TransactionExpiredError(txHash);
        if (txn.hasApproved[msg.sender]) revert SignerAlreadyApproved(msg.sender);

        Signer memory signer = accountSigners[account][msg.sender];
        if (!signer.isActive) revert SignerNotAuthorized(msg.sender);

        txn.hasApproved[msg.sender] = true;
        txn.approvers.push(msg.sender);
        txn.approvals++;
        txn.totalWeight += signer.weight;

        emit TransactionApproved(account, txHash, msg.sender, txn.approvals, txn.totalWeight);

        // Verifica se pode ser aprovada automaticamente
        MultiSigConfig memory config = multiSigConfigs[account];
        if (txn.approvals >= config.requiredSignatures) {
            txn.status = TransactionStatus.APPROVED;
        }
    }

    /**
     * @dev Executa uma transação aprovada
     */
    function executeTransaction(
        address account,
        bytes32 txHash
    ) external override onlyValidAccount(account) returns (bool success) {
        Transaction storage txn = pendingTxs[account][txHash];

        if (txn.target == address(0)) revert TransactionNotFound(txHash);
        if (txn.status == TransactionStatus.EXECUTED) revert TransactionAlreadyExecuted(txHash);
        if (block.timestamp > txn.expiresAt) revert TransactionExpiredError(txHash);
        if (block.timestamp < txn.executionTime) revert TimelockNotMet(block.timestamp, txn.executionTime);

        MultiSigConfig memory config = multiSigConfigs[account];
        if (txn.approvals < config.requiredSignatures) {
            revert InsufficientSignatures(txn.approvals, config.requiredSignatures);
        }

        txn.status = TransactionStatus.EXECUTED;

        // Executa a transação
        (success,) = txn.target.call{value: txn.value}(txn.data);

        if (success) {
            totalExecutedTransactions++;
        }

        emit TransactionExecuted(account, txHash, success);

        return success;
    }

    /**
     * @dev Rejeita uma transação
     */
    function rejectTransaction(
        address account,
        bytes32 txHash,
        bytes32 reason
    ) external override onlyValidAccount(account) onlyAuthorizedSigner(account) {
        Transaction storage txn = pendingTxs[account][txHash];

        if (txn.target == address(0)) revert TransactionNotFound(txHash);
        if (txn.status != TransactionStatus.PENDING) revert TransactionAlreadyExecuted(txHash);

        // Apenas signatários com role SUPERVISOR ou superior podem rejeitar
        Signer memory signer = accountSigners[account][msg.sender];
        if (signer.role != SignerRole.SUPERVISOR && signer.role != SignerRole.EMERGENCY) {
            revert SignerNotAuthorized(msg.sender);
        }

        txn.status = TransactionStatus.REJECTED;
        totalRejectedTransactions++;

        emit TransactionRejected(account, txHash, msg.sender, reason);
    }

    /**
     * @dev Execução de emergência (apenas emergency signers)
     */
    function emergencyExecute(
        address account,
        bytes32 txHash
    ) external override onlyValidAccount(account) returns (bool success) {
        Signer memory signer = accountSigners[account][msg.sender];
        if (signer.role != SignerRole.EMERGENCY) {
            revert SignerNotAuthorized(msg.sender);
        }

        Transaction storage txn = pendingTxs[account][txHash];

        if (txn.target == address(0)) revert TransactionNotFound(txHash);
        if (txn.status == TransactionStatus.EXECUTED) revert TransactionAlreadyExecuted(txHash);

        txn.status = TransactionStatus.EXECUTED;

        // Executa sem verificar timelock ou aprovações
        (success,) = txn.target.call{value: txn.value}(txn.data);

        if (success) {
            totalExecutedTransactions++;
        }

        emit EmergencyExecution(account, txHash, msg.sender);
        emit TransactionExecuted(account, txHash, success);

        return success;
    }

    // ============= VALIDATION FUNCTIONS =============

    /**
     * @dev Verifica se uma transação requer multi-sig
     */
    function requiresMultiSig(address account, uint256 value) public view override returns (bool) {
        if (!multiSigConfigs[account].isActive) return false;
        return value >= multiSigConfigs[account].threshold;
    }

    /**
     * @dev Verifica se uma transação pode ser executada
     */
    function canExecuteTransaction(address account, bytes32 txHash) public view override returns (bool) {
        Transaction storage txn = pendingTxs[account][txHash];

        if (txn.target == address(0)) return false;
        if (txn.status != TransactionStatus.PENDING && txn.status != TransactionStatus.APPROVED) return false;
        if (block.timestamp > txn.expiresAt) return false;
        if (block.timestamp < txn.executionTime) return false;

        MultiSigConfig memory config = multiSigConfigs[account];
        return txn.approvals >= config.requiredSignatures;
    }

    /**
     * @dev Verifica se é um signatário válido
     */
    function isValidSigner(address account, address signer) public view override returns (bool) {
        return accountSigners[account][signer].isActive;
    }

    /**
     * @dev Verifica se um signer já aprovou
     */
    function hasApproved(address account, bytes32 txHash, address signer) public view override returns (bool) {
        return pendingTxs[account][txHash].hasApproved[signer];
    }

    /**
     * @dev Retorna status de aprovação de uma transação
     */
    function getApprovalStatus(address account, bytes32 txHash)
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
        Transaction storage txn = pendingTxs[account][txHash];
        MultiSigConfig memory config = multiSigConfigs[account];

        currentApprovals = txn.approvals;
        requiredApprovals = config.requiredSignatures;
        currentWeight = txn.totalWeight;
        requiredWeight = _calculateRequiredWeight(account);
        canExecute = canExecuteTransaction(account, txHash);
    }

    // ============= VIEW FUNCTIONS =============

    /**
     * @dev Retorna configuração de multi-sig
     */
    function getMultiSigConfig(address account) external view override returns (MultiSigConfig memory) {
        return multiSigConfigs[account];
    }

    /**
     * @dev Retorna todos os signatários de uma conta
     */
    function getSigners(address account) external view override returns (Signer[] memory) {
        address[] memory signerAddresses = signersList[account];
        Signer[] memory signers = new Signer[](signerAddresses.length);

        for (uint256 i = 0; i < signerAddresses.length; i++) {
            signers[i] = accountSigners[account][signerAddresses[i]];
        }

        return signers;
    }

    /**
     * @dev Retorna dados de um signatário específico
     */
    function getSigner(address account, address signer) external view override returns (Signer memory) {
        return accountSigners[account][signer];
    }

    /**
     * @dev Retorna dados de uma transação
     */
    function getTransaction(address account, bytes32 txHash) external view override returns (TransactionView memory) {
        Transaction storage txn = pendingTxs[account][txHash];

        return TransactionView({
            txHash: txn.txHash,
            target: txn.target,
            value: txn.value,
            data: txn.data,
            createdAt: txn.createdAt,
            executionTime: txn.executionTime,
            expiresAt: txn.expiresAt,
            status: txn.status,
            approvals: txn.approvals,
            totalWeight: txn.totalWeight,
            approvers: txn.approvers
        });
    }

    /**
     * @dev Retorna transações pendentes
     */
    function getPendingTransactions(address account) external view override returns (TransactionView[] memory) {
        bytes32[] memory txHashes = accountTransactions[account];
        uint256 pendingCount = 0;

        // Conta transações pendentes
        for (uint256 i = 0; i < txHashes.length; i++) {
            if (pendingTxs[account][txHashes[i]].status == TransactionStatus.PENDING) {
                pendingCount++;
            }
        }

        // Constrói array resultado
        TransactionView[] memory pending = new TransactionView[](pendingCount);
        uint256 index = 0;

        for (uint256 i = 0; i < txHashes.length; i++) {
            Transaction storage txn = pendingTxs[account][txHashes[i]];
            if (txn.status == TransactionStatus.PENDING) {
                pending[index++] = TransactionView({
                    txHash: txn.txHash,
                    target: txn.target,
                    value: txn.value,
                    data: txn.data,
                    createdAt: txn.createdAt,
                    executionTime: txn.executionTime,
                    expiresAt: txn.expiresAt,
                    status: txn.status,
                    approvals: txn.approvals,
                    totalWeight: txn.totalWeight,
                    approvers: txn.approvers
                });
            }
        }

        return pending;
    }

    /**
     * @dev Retorna histórico de transações
     */
    function getTransactionHistory(address account, uint256 limit) external view override returns (TransactionView[] memory) {
        bytes32[] memory txHashes = accountTransactions[account];

        uint256 resultSize = limit == 0 || limit > txHashes.length ? txHashes.length : limit;
        TransactionView[] memory history = new TransactionView[](resultSize);

        uint256 startIndex = txHashes.length > resultSize ? txHashes.length - resultSize : 0;

        for (uint256 i = 0; i < resultSize; i++) {
            Transaction storage txn = pendingTxs[account][txHashes[startIndex + i]];
            history[i] = TransactionView({
                txHash: txn.txHash,
                target: txn.target,
                value: txn.value,
                data: txn.data,
                createdAt: txn.createdAt,
                executionTime: txn.executionTime,
                expiresAt: txn.expiresAt,
                status: txn.status,
                approvals: txn.approvals,
                totalWeight: txn.totalWeight,
                approvers: txn.approvers
            });
        }

        return history;
    }

    /**
     * @dev Retorna número de signatários
     */
    function getSignerCount(address account) external view override returns (uint256) {
        return signerCounts[account];
    }

    /**
     * @dev Retorna peso total dos signatários
     */
    function getTotalSignerWeight(address account) external view override returns (uint256) {
        address[] memory signerAddresses = signersList[account];
        uint256 totalWeight = 0;

        for (uint256 i = 0; i < signerAddresses.length; i++) {
            Signer memory signer = accountSigners[account][signerAddresses[i]];
            if (signer.isActive) {
                totalWeight += signer.weight;
            }
        }

        return totalWeight;
    }

    /**
     * @dev Retorna tempo até execução possível
     */
    function getTimeUntilExecution(address account, bytes32 txHash) external view override returns (uint256) {
        Transaction storage txn = pendingTxs[account][txHash];

        if (block.timestamp >= txn.executionTime) return 0;
        return txn.executionTime - block.timestamp;
    }

    // ============= BATCH OPERATIONS =============

    /**
     * @dev Aprova múltiplas transações em lote
     */
    function batchApproveTransactions(
        address account,
        bytes32[] calldata txHashes
    ) external override onlyValidAccount(account) onlyAuthorizedSigner(account) {
        for (uint256 i = 0; i < txHashes.length; i++) {
            this.approveTransaction(account, txHashes[i]);
        }
    }

    /**
     * @dev Rejeita múltiplas transações em lote
     */
    function batchRejectTransactions(
        address account,
        bytes32[] calldata txHashes,
        bytes32 reason
    ) external override onlyValidAccount(account) onlyAuthorizedSigner(account) {
        for (uint256 i = 0; i < txHashes.length; i++) {
            this.rejectTransaction(account, txHashes[i], reason);
        }
    }

    // ============= EMERGENCY FUNCTIONS =============

    /**
     * @dev Pausa multi-sig para uma conta
     */
    function emergencyPauseMultiSig(address account) external override onlyRole(EMERGENCY_MANAGER) {
        multiSigConfigs[account].isActive = false;
    }

    /**
     * @dev Despausa multi-sig para uma conta
     */
    function emergencyUnpauseMultiSig(address account) external override onlyRole(EMERGENCY_MANAGER) {
        multiSigConfigs[account].isActive = true;
    }

    /**
     * @dev Reset de emergência dos signatários
     */
    function emergencyResetSigners(address account, Signer[] calldata newSigners)
        external
        override
        onlyRole(EMERGENCY_MANAGER)
    {
        // Remove todos os signatários atuais
        address[] memory currentSigners = signersList[account];
        for (uint256 i = 0; i < currentSigners.length; i++) {
            delete accountSigners[account][currentSigners[i]];
        }
        delete signersList[account];

        // Adiciona novos signatários
        for (uint256 i = 0; i < newSigners.length; i++) {
            accountSigners[account][newSigners[i].signerAddress] = newSigners[i];
            signersList[account].push(newSigners[i].signerAddress);
        }

        signerCounts[account] = newSigners.length;
    }

    // ============= INTERNAL FUNCTIONS =============

    /**
     * @dev Valida configuração de multi-sig
     */
    function _isValidConfig(MultiSigConfig memory config) internal pure returns (bool) {
        return config.requiredSignatures > 0 &&
               config.threshold > 0 &&
               config.timelock <= 7 days &&
               config.expirationTime >= config.timelock &&
               config.expirationTime <= 30 days;
    }

    /**
     * @dev Remove signatário da lista
     */
    function _removeFromSignersList(address account, address signer) internal {
        address[] storage signers = signersList[account];

        for (uint256 i = 0; i < signers.length; i++) {
            if (signers[i] == signer) {
                signers[i] = signers[signers.length - 1];
                signers.pop();
                break;
            }
        }
    }

    /**
     * @dev Calcula peso necessário (implementação simplificada)
     */
    function _calculateRequiredWeight(address account) internal view returns (uint256) {
        // Por simplicidade, retorna o peso total necessário baseado no número de assinaturas
        return multiSigConfigs[account].requiredSignatures * 100; // Peso padrão de 100 por assinatura
    }
}
