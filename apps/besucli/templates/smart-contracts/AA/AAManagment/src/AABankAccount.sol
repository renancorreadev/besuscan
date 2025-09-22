// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@account-abstraction/contracts/core/BaseAccount.sol";
import "@account-abstraction/contracts/interfaces/IEntryPoint.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "./interfaces/IAABankManager.sol";
import "./interfaces/IKYCAMLValidator.sol";
import "./interfaces/ITransactionLimits.sol";
import "./interfaces/IMultiSignatureValidator.sol";
import "./interfaces/ISocialRecovery.sol";

/**
 * @title AABankAccount
 * @dev Implementação de conta Account Abstraction para clientes bancários
 * @notice Inclui validações KYC/AML, limites, multi-sig e recuperação social
 */
contract AABankAccount is BaseAccount, ReentrancyGuard, Initializable {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    // ============= ENUMS =============
    enum AccountStatus {
        INACTIVE,
        ACTIVE,
        FROZEN,
        SUSPENDED,
        RECOVERING,
        CLOSED
    }

    enum TransactionType {
        TRANSFER,
        CONTRACT_CALL,
        BATCH_TRANSACTION,
        MULTI_SIG_REQUIRED
    }

    // ============= STRUCTS =============
    struct AccountConfiguration {
        uint256 dailyLimit;
        uint256 weeklyLimit;
        uint256 monthlyLimit;
        uint256 transactionLimit;
        uint256 multiSigThreshold;
        bool requiresKYC;
        bool requiresAML;
        uint8 riskLevel; // 0 = Baixo, 1 = Médio, 2 = Alto
    }

    struct TransactionLimitTracker {
        uint256 dailySpent;
        uint256 weeklySpent;
        uint256 monthlySpent;
        uint256 lastDayTimestamp;
        uint256 lastWeekTimestamp;
        uint256 lastMonthTimestamp;
    }

    struct MultiSigTransaction {
        address target;
        uint256 value;
        bytes data;
        uint256 deadline;
        uint256 approvals;
        mapping(address => bool) hasApproved;
        bool executed;
    }

    // ============= CONSTANTS =============
    uint256 internal constant SIG_VALIDATION_FAILED = 1;

    // ============= STATE VARIABLES =============
    IEntryPoint private immutable _entryPoint;

    address public owner;
    bytes32 public bankId;
    address public bankManager;
    AccountStatus public status;

    AccountConfiguration public config;
    TransactionLimitTracker public limitTracker;

    // Validadores externos
    IKYCAMLValidator public kycAmlValidator;
    ITransactionLimits public transactionLimits;
    IMultiSignatureValidator public multiSigValidator;
    ISocialRecovery public socialRecovery;

    // Multi-signature
    mapping(bytes32 => MultiSigTransaction) public pendingTransactions;
    mapping(address => bool) public authorizedSigners;
    uint256 public requiredSignatures;
    uint256 public multiSigNonce;

    // Auditoria
    mapping(uint256 => bytes32) public transactionHashes;
    uint256 public transactionCount;

    // ============= EVENTS =============
    event AccountInitialized(
        address indexed owner,
        bytes32 indexed bankId,
        address indexed manager
    );
    event TransactionExecuted(
        bytes32 indexed txHash,
        address indexed target,
        uint256 value,
        bytes data,
        bool success
    );
    event TransactionBatchExecuted(
        bytes32 indexed batchHash,
        uint256 successful,
        uint256 total
    );
    event MultiSigTransactionCreated(
        bytes32 indexed txHash,
        address indexed target,
        uint256 value,
        uint256 deadline
    );
    event MultiSigTransactionApproved(
        bytes32 indexed txHash,
        address indexed signer,
        uint256 totalApprovals
    );
    event MultiSigTransactionExecuted(bytes32 indexed txHash);
    event LimitExceeded(
        uint8 indexed limitType,
        uint256 attempted,
        uint256 allowed,
        uint256 currentSpent
    );
    event StatusChanged(AccountStatus oldStatus, AccountStatus newStatus);
    event ConfigurationUpdated(AccountConfiguration newConfig);
    event SignerAdded(address indexed signer);
    event SignerRemoved(address indexed signer);

    // ============= CUSTOM ERRORS =============
    error NotInitialized();
    error AlreadyInitialized();
    error UnauthorizedAccess(address caller);
    error AccountFrozen();
    error AccountSuspended();
    error InvalidOwner(address owner);
    error InvalidBankManager(address manager);
    error TransactionLimitExceeded(uint8 limitType, uint256 amount, uint256 limit);
    error KYCValidationFailed(bytes32 reason);
    error AMLValidationFailed(bytes32 reason);
    error InsufficientSignatures(uint256 provided, uint256 required);
    error MultiSigTransactionNotFound(bytes32 txHash);
    error MultiSigTransactionExpired(bytes32 txHash, uint256 deadline);
    error MultiSigTransactionAlreadyExecuted(bytes32 txHash);
    error InvalidSignature();
    error ZeroAddress();

    // ============= MODIFIERS =============
    modifier onlyInitialized() {
        if (owner == address(0)) revert NotInitialized();
        _;
    }

    modifier onlyActiveStatus() {
        if (status == AccountStatus.FROZEN) revert AccountFrozen();
        if (status == AccountStatus.SUSPENDED) revert AccountSuspended();
        _;
    }

    modifier onlyOwnerOrManager() {
        if (msg.sender != owner && msg.sender != bankManager) {
            revert UnauthorizedAccess(msg.sender);
        }
        _;
    }

    modifier onlyBankManager() {
        if (msg.sender != bankManager) revert UnauthorizedAccess(msg.sender);
        _;
    }

    // ============= CONSTRUCTOR =============
    constructor(IEntryPoint anEntryPoint) {
        _entryPoint = anEntryPoint;
        _disableInitializers();
    }

    // ============= INITIALIZATION =============

    /**
     * @dev Inicializa a conta com configurações específicas do banco
     */
    function initialize(
        IEntryPoint anEntryPoint,
        address anOwner,
        bytes32 aBankId,
        address aBankManager,
        bytes calldata initData
    ) external initializer {
        if (address(anEntryPoint) != address(_entryPoint)) revert("Invalid EntryPoint");
        if (anOwner == address(0)) revert InvalidOwner(anOwner);
        if (aBankManager == address(0)) revert InvalidBankManager(aBankManager);

        owner = anOwner;
        bankId = aBankId;
        bankManager = aBankManager;
        status = AccountStatus.ACTIVE;

        // Decodifica dados de inicialização
        if (initData.length > 0) {
            AccountConfiguration memory initialConfig = abi.decode(initData, (AccountConfiguration));
            config = initialConfig;
        } else {
            // Configuração padrão
            config = AccountConfiguration({
                dailyLimit: 10000 ether,
                weeklyLimit: 50000 ether,
                monthlyLimit: 200000 ether,
                transactionLimit: 5000 ether,
                multiSigThreshold: 10000 ether,
                requiresKYC: true,
                requiresAML: true,
                riskLevel: 1
            });
        }

        // Inicializa rastreamento de limites
        limitTracker = TransactionLimitTracker({
            dailySpent: 0,
            weeklySpent: 0,
            monthlySpent: 0,
            lastDayTimestamp: block.timestamp,
            lastWeekTimestamp: block.timestamp,
            lastMonthTimestamp: block.timestamp
        });

        emit AccountInitialized(anOwner, aBankId, aBankManager);
    }

    // ============= ACCOUNT ABSTRACTION IMPLEMENTATION =============

    /**
     * @dev Retorna o EntryPoint usado por esta conta
     */
    function entryPoint() public view override returns (IEntryPoint) {
        return _entryPoint;
    }

    /**
     * @dev Valida a assinatura da UserOperation
     */
    function _validateSignature(
        PackedUserOperation calldata userOp,
        bytes32 userOpHash
    ) internal view override returns (uint256 validationData) {
        bytes32 hash = userOpHash.toEthSignedMessageHash();
        address signer = hash.recover(userOp.signature);

        if (signer != owner && !authorizedSigners[signer]) {
            return SIG_VALIDATION_FAILED;
        }

        return 0;
    }

    /**
     * @dev Execução de transação com validações bancárias
     */
    function execute(
        address target,
        uint256 value,
        bytes calldata data
    ) public override onlyInitialized onlyActiveStatus {
        _requireFromEntryPoint();

        // Valida KYC/AML se necessário
        if (config.requiresKYC || config.requiresAML) {
            _validateCompliance(target, value, data);
        }

        // Verifica limites de transação
        _validateTransactionLimits(value);

        // Verifica se requer multi-assinatura
        if (value >= config.multiSigThreshold) {
            revert InsufficientSignatures(1, requiredSignatures);
        }

        // Atualiza rastreamento de limites
        _updateLimitTracker(value);

        // Executa a transação
        bool success = _executeTransaction(target, value, data);

        // Log para auditoria
        bytes32 txHash = keccak256(abi.encodePacked(target, value, data, block.timestamp));
        transactionHashes[transactionCount] = txHash;
        transactionCount++;

        // Notifica o banco manager sobre a atividade
        IAABankManager(bankManager).logAccountActivity(
            address(this),
            "TRANSACTION_EXECUTED",
            abi.encodePacked(target, value, success)
        );

        emit TransactionExecuted(txHash, target, value, data, success);
    }

    /**
     * @dev Execução em lote com validações
     */
    function executeBatch(Call[] calldata calls)
        public
        override
        onlyInitialized
        onlyActiveStatus
    {
        _requireFromEntryPoint();

        uint256 totalValue = 0;
        for (uint256 i = 0; i < calls.length; i++) {
            totalValue += calls[i].value;
        }

        // Valida compliance para o lote
        if (config.requiresKYC || config.requiresAML) {
            _validateBatchCompliance(calls);
        }

        // Verifica limites para o valor total
        _validateTransactionLimits(totalValue);

        if (totalValue >= config.multiSigThreshold) {
            revert InsufficientSignatures(1, requiredSignatures);
        }

        _updateLimitTracker(totalValue);

        uint256 successful = 0;
        for (uint256 i = 0; i < calls.length; i++) {
            bool success = _executeTransaction(calls[i].target, calls[i].value, calls[i].data);
            if (success) successful++;
        }

        bytes32 batchHash = keccak256(abi.encode(calls, block.timestamp));
        emit TransactionBatchExecuted(batchHash, successful, calls.length);
    }

    // ============= MULTI-SIGNATURE TRANSACTIONS =============

    /**
     * @dev Cria uma transação que requer múltiplas assinaturas
     */
    function createMultiSigTransaction(
        address target,
        uint256 value,
        bytes calldata data,
        uint256 deadline
    ) external onlyOwnerOrManager onlyActiveStatus returns (bytes32) {
        if (deadline <= block.timestamp) revert("Invalid deadline");

        bytes32 txHash = keccak256(abi.encodePacked(
            target,
            value,
            data,
            deadline,
            multiSigNonce++
        ));

        MultiSigTransaction storage txn = pendingTransactions[txHash];
        txn.target = target;
        txn.value = value;
        txn.data = data;
        txn.deadline = deadline;
        txn.approvals = 0;
        txn.executed = false;

        emit MultiSigTransactionCreated(txHash, target, value, deadline);
        return txHash;
    }

    /**
     * @dev Aprova uma transação multi-sig
     */
    function approveMultiSigTransaction(bytes32 txHash) external {
        MultiSigTransaction storage txn = pendingTransactions[txHash];

        if (txn.target == address(0)) revert MultiSigTransactionNotFound(txHash);
        if (block.timestamp > txn.deadline) revert MultiSigTransactionExpired(txHash, txn.deadline);
        if (txn.executed) revert MultiSigTransactionAlreadyExecuted(txHash);
        if (txn.hasApproved[msg.sender]) return; // Já aprovado

        if (msg.sender != owner && !authorizedSigners[msg.sender]) {
            revert UnauthorizedAccess(msg.sender);
        }

        txn.hasApproved[msg.sender] = true;
        txn.approvals++;

        emit MultiSigTransactionApproved(txHash, msg.sender, txn.approvals);

        // Auto-executa se tem assinaturas suficientes
        if (txn.approvals >= requiredSignatures) {
            _executeMultiSigTransaction(txHash);
        }
    }

    /**
     * @dev Executa uma transação multi-sig aprovada
     */
    function executeMultiSigTransaction(bytes32 txHash) external {
        MultiSigTransaction storage txn = pendingTransactions[txHash];

        if (txn.approvals < requiredSignatures) {
            revert InsufficientSignatures(txn.approvals, requiredSignatures);
        }

        _executeMultiSigTransaction(txHash);
    }

    // ============= CONFIGURATION MANAGEMENT =============

    /**
     * @dev Atualiza configurações da conta
     */
    function updateConfiguration(AccountConfiguration calldata newConfig)
        external
        onlyBankManager
    {
        config = newConfig;
        emit ConfigurationUpdated(newConfig);
    }

    /**
     * @dev Adiciona um signatário autorizado
     */
    function addAuthorizedSigner(address signer) external onlyBankManager {
        if (signer == address(0)) revert ZeroAddress();
        authorizedSigners[signer] = true;
        emit SignerAdded(signer);
    }

    /**
     * @dev Remove um signatário autorizado
     */
    function removeAuthorizedSigner(address signer) external onlyBankManager {
        authorizedSigners[signer] = false;
        emit SignerRemoved(signer);
    }

    /**
     * @dev Define o número mínimo de assinaturas necessárias
     */
    function setRequiredSignatures(uint256 _requiredSignatures) external onlyBankManager {
        requiredSignatures = _requiredSignatures;
    }

    /**
     * @dev Altera o status da conta
     */
    function setStatus(AccountStatus newStatus) external onlyBankManager {
        AccountStatus oldStatus = status;
        status = newStatus;
        emit StatusChanged(oldStatus, newStatus);
    }

    // ============= LIMITS VALIDATION =============

    /**
     * @dev Valida se a transação está dentro dos limites
     */
    function _validateTransactionLimits(uint256 value) internal view {
        if (value > config.transactionLimit) {
            revert TransactionLimitExceeded(0, value, config.transactionLimit);
        }

        // Verifica limites diários, semanais e mensais
        TransactionLimitTracker memory tracker = _getUpdatedTracker();

        if (tracker.dailySpent + value > config.dailyLimit) {
            revert TransactionLimitExceeded(1, value, config.dailyLimit - tracker.dailySpent);
        }

        if (tracker.weeklySpent + value > config.weeklyLimit) {
            revert TransactionLimitExceeded(2, value, config.weeklyLimit - tracker.weeklySpent);
        }

        if (tracker.monthlySpent + value > config.monthlyLimit) {
            revert TransactionLimitExceeded(3, value, config.monthlyLimit - tracker.monthlySpent);
        }
    }

    /**
     * @dev Atualiza o rastreamento de limites
     */
    function _updateLimitTracker(uint256 value) internal {
        TransactionLimitTracker memory tracker = _getUpdatedTracker();

        tracker.dailySpent += value;
        tracker.weeklySpent += value;
        tracker.monthlySpent += value;

        limitTracker = tracker;
    }

    /**
     * @dev Retorna o tracker atualizado com base no tempo
     */
    function _getUpdatedTracker() internal view returns (TransactionLimitTracker memory tracker) {
        tracker = limitTracker;

        // Reset diário
        if (block.timestamp >= tracker.lastDayTimestamp + 1 days) {
            tracker.dailySpent = 0;
            tracker.lastDayTimestamp = block.timestamp;
        }

        // Reset semanal
        if (block.timestamp >= tracker.lastWeekTimestamp + 7 days) {
            tracker.weeklySpent = 0;
            tracker.lastWeekTimestamp = block.timestamp;
        }

        // Reset mensal
        if (block.timestamp >= tracker.lastMonthTimestamp + 30 days) {
            tracker.monthlySpent = 0;
            tracker.lastMonthTimestamp = block.timestamp;
        }
    }

    // ============= COMPLIANCE VALIDATION =============

    /**
     * @dev Valida compliance KYC/AML
     */
    function _validateCompliance(address target, uint256 value, bytes calldata data) internal view {
        if (address(kycAmlValidator) != address(0)) {
            if (config.requiresKYC && !kycAmlValidator.validateKYC(owner)) {
                revert KYCValidationFailed("KYC_NOT_VERIFIED");
            }

            if (config.requiresAML && !kycAmlValidator.validateAML(target, value, data)) {
                revert AMLValidationFailed("AML_CHECK_FAILED");
            }
        }
    }

    /**
     * @dev Valida compliance para lote de transações
     */
    function _validateBatchCompliance(Call[] calldata calls) internal view {
        for (uint256 i = 0; i < calls.length; i++) {
            _validateCompliance(calls[i].target, calls[i].value, calls[i].data);
        }
    }

    // ============= INTERNAL EXECUTION =============

    /**
     * @dev Executa uma transação individual
     */
    function _executeTransaction(
        address target,
        uint256 value,
        bytes memory data
    ) internal returns (bool success) {
        assembly {
            success := call(gas(), target, value, add(data, 0x20), mload(data), 0, 0)
        }
    }

    /**
     * @dev Executa uma transação multi-sig
     */
    function _executeMultiSigTransaction(bytes32 txHash) internal {
        MultiSigTransaction storage txn = pendingTransactions[txHash];

        if (block.timestamp > txn.deadline) revert MultiSigTransactionExpired(txHash, txn.deadline);
        if (txn.executed) revert MultiSigTransactionAlreadyExecuted(txHash);

        txn.executed = true;

        bool success = _executeTransaction(txn.target, txn.value, txn.data);

        emit MultiSigTransactionExecuted(txHash);
        emit TransactionExecuted(txHash, txn.target, txn.value, txn.data, success);
    }

    // ============= VIEW FUNCTIONS =============

    /**
     * @dev Retorna informações da conta
     */
    function getAccountInfo() external view returns (
        address _owner,
        bytes32 _bankId,
        AccountStatus _status,
        AccountConfiguration memory _config
    ) {
        return (owner, bankId, status, config);
    }

    /**
     * @dev Retorna limites atuais disponíveis
     */
    function getAvailableLimits() external view returns (
        uint256 dailyAvailable,
        uint256 weeklyAvailable,
        uint256 monthlyAvailable
    ) {
        TransactionLimitTracker memory tracker = _getUpdatedTracker();

        dailyAvailable = config.dailyLimit > tracker.dailySpent
            ? config.dailyLimit - tracker.dailySpent
            : 0;

        weeklyAvailable = config.weeklyLimit > tracker.weeklySpent
            ? config.weeklyLimit - tracker.weeklySpent
            : 0;

        monthlyAvailable = config.monthlyLimit > tracker.monthlySpent
            ? config.monthlyLimit - tracker.monthlySpent
            : 0;
    }

    /**
     * @dev Verifica se uma transação multi-sig foi aprovada
     */
    function isMultiSigTransactionApproved(bytes32 txHash, address signer)
        external
        view
        returns (bool)
    {
        return pendingTransactions[txHash].hasApproved[signer];
    }

    // ============= EMERGENCY FUNCTIONS =============

    /**
     * @dev Função de emergência para retirar fundos (apenas bank manager)
     */
    function emergencyWithdraw(address to, uint256 amount) external onlyBankManager {
        require(to != address(0), "Invalid recipient");
        (bool success,) = payable(to).call{value: amount}("");
        require(success, "Transfer failed");
    }

    // ============= RECEIVE FUNCTION =============
    receive() external payable {}
}