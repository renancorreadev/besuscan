// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "@account-abstraction/contracts/interfaces/IEntryPoint.sol";
import "./AABankAccount.sol";

/**
 * @title AABankManager
 * @dev Contrato principal para gerenciamento de contas Account Abstraction para instituições financeiras
 * @notice Implementa funcionalidades completas de compliance, auditoria e gestão para bancos
 */
contract AABankManager is AccessControl, Pausable, ReentrancyGuard {
    using Clones for address;

    // ============= ROLES =============
    bytes32 public constant SUPER_ADMIN = keccak256("SUPER_ADMIN");
    bytes32 public constant BANK_ADMIN = keccak256("BANK_ADMIN");
    bytes32 public constant COMPLIANCE_OFFICER = keccak256("COMPLIANCE_OFFICER");
    bytes32 public constant RISK_MANAGER = keccak256("RISK_MANAGER");
    bytes32 public constant ACCOUNT_OPERATOR = keccak256("ACCOUNT_OPERATOR");

    // ============= STATES =============
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

    // ============= STATE VARIABLES =============
    IEntryPoint public immutable entryPoint;
    address public immutable accountImplementation;

    GlobalLimits public globalLimits;

    mapping(bytes32 => BankInfo) public banks;
    mapping(address => AccountInfo) public accounts;
    mapping(bytes32 => address[]) public bankAccounts;
    mapping(address => bool) public isValidAccount;

    bytes32[] public bankIds;
    uint256 public totalAccounts;
    uint256 public activeAccounts;

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

    // ============= MODIFIERS =============
    modifier onlyValidBank(bytes32 bankId) {
        if (!banks[bankId].isActive) revert BankNotActive(bankId);
        _;
    }

    modifier onlyValidAccount(address account) {
        if (!isValidAccount[account]) revert AccountNotFound(account);
        _;
    }

    modifier onlyActiveAccount(address account) {
        if (accounts[account].status != AccountStatus.ACTIVE) {
            revert InvalidAccountStatus(accounts[account].status, AccountStatus.ACTIVE);
        }
        _;
    }

    // ============= CONSTRUCTOR =============
    constructor(
        IEntryPoint _entryPoint,
        address _accountImplementation,
        GlobalLimits memory _globalLimits
    ) {
        if (address(_entryPoint) == address(0)) revert ZeroAddress();
        if (_accountImplementation == address(0)) revert ZeroAddress();

        entryPoint = _entryPoint;
        accountImplementation = _accountImplementation;
        globalLimits = _globalLimits;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(SUPER_ADMIN, msg.sender);
        _grantRole(BANK_ADMIN, msg.sender);
        _grantRole(COMPLIANCE_OFFICER, msg.sender);
        _grantRole(RISK_MANAGER, msg.sender);
    }

    // ============= BANK MANAGEMENT =============

    /**
     * @dev Registra uma nova instituição financeira no sistema
     */
    function registerBank(
        bytes32 bankId,
        string calldata name,
        address admin
    ) external onlyRole(SUPER_ADMIN) {
        if (bankId == bytes32(0)) revert InvalidBankId();
        if (admin == address(0)) revert ZeroAddress();
        if (banks[bankId].createdAt != 0) revert BankAlreadyRegistered(bankId);

        banks[bankId] = BankInfo({
            bankId: bankId,
            name: name,
            admin: admin,
            isActive: true,
            createdAt: block.timestamp
        });

        bankIds.push(bankId);
        _grantRole(BANK_ADMIN, admin);

        emit BankRegistered(bankId, name, admin);
    }

    /**
     * @dev Altera o status de ativação de um banco
     */
    function setBankStatus(bytes32 bankId, bool isActive)
        external
        onlyRole(SUPER_ADMIN)
    {
        if (banks[bankId].createdAt == 0) revert BankNotRegistered(bankId);

        banks[bankId].isActive = isActive;
        emit BankStatusChanged(bankId, isActive);
    }

    // ============= ACCOUNT MANAGEMENT =============

    /**
     * @dev Cria uma nova conta AA para um cliente bancário
     */
    function createBankAccount(
        address owner,
        bytes32 bankId,
        uint256 salt,
        bytes calldata initData
    ) external onlyRole(BANK_ADMIN) onlyValidBank(bankId) whenNotPaused returns (address) {
        if (owner == address(0)) revert ZeroAddress();

        bytes32 fullSalt = keccak256(abi.encodePacked(bankId, owner, salt));
        address account = accountImplementation.cloneDeterministic(fullSalt);

        if (isValidAccount[account]) revert AccountAlreadyExists(account);

        // Inicializa a conta com dados específicos do banco
        AABankAccount(payable(account)).initialize(
            entryPoint,
            owner,
            bankId,
            address(this),
            initData
        );

        AccountInfo memory accountInfo = AccountInfo({
            account: account,
            owner: owner,
            bankId: bankId,
            status: AccountStatus.ACTIVE,
            createdAt: block.timestamp,
            lastActivity: block.timestamp
        });

        accounts[account] = accountInfo;
        bankAccounts[bankId].push(account);
        isValidAccount[account] = true;
        totalAccounts++;
        activeAccounts++;

        emit BankAccountCreated(account, owner, bankId, salt);
        emit AccountActivity(account, "ACCOUNT_CREATED", initData);

        return account;
    }

    /**
     * @dev Altera o status de uma conta
     */
    function setAccountStatus(
        address account,
        AccountStatus newStatus,
        bytes32 reason
    ) external onlyRole(COMPLIANCE_OFFICER) onlyValidAccount(account) {
        AccountStatus oldStatus = accounts[account].status;

        if (oldStatus == newStatus) return;

        // Validações de transição de estado
        _validateStatusTransition(oldStatus, newStatus);

        accounts[account].status = newStatus;

        // Atualiza contadores
        if (oldStatus == AccountStatus.ACTIVE && newStatus != AccountStatus.ACTIVE) {
            activeAccounts--;
        } else if (oldStatus != AccountStatus.ACTIVE && newStatus == AccountStatus.ACTIVE) {
            activeAccounts++;
        }

        // Notifica a conta sobre a mudança de status
        AABankAccount(payable(account)).setStatus(AABankAccount.AccountStatus(uint8(newStatus)));

        emit AccountStatusChanged(account, oldStatus, newStatus, reason);
        emit ComplianceAction(account, msg.sender, "STATUS_CHANGED", reason);
    }

    /**
     * @dev Versão interna de setAccountStatus (sem verificação de role)
     */
    function _setAccountStatus(
        address account,
        AccountStatus newStatus,
        bytes32 reason
    ) internal {
        AccountStatus oldStatus = accounts[account].status;

        if (oldStatus == newStatus) return;

        // Validações de transição de estado
        _validateStatusTransition(oldStatus, newStatus);

        accounts[account].status = newStatus;

        // Atualiza contadores
        if (oldStatus == AccountStatus.ACTIVE && newStatus != AccountStatus.ACTIVE) {
            activeAccounts--;
        } else if (oldStatus != AccountStatus.ACTIVE && newStatus == AccountStatus.ACTIVE) {
            activeAccounts++;
        }

        // Notifica a conta sobre a mudança de status
        AABankAccount(payable(account)).setStatus(AABankAccount.AccountStatus(uint8(newStatus)));

        emit AccountStatusChanged(account, oldStatus, newStatus, reason);
        emit ComplianceAction(account, msg.sender, "STATUS_CHANGED", reason);
    }

    /**
     * @dev Congela uma conta em caso de emergência
     */
    function emergencyFreezeAccount(address account, bytes32 reason)
        external
        onlyRole(COMPLIANCE_OFFICER)
        onlyValidAccount(account)
    {
        _setAccountStatus(account, AccountStatus.FROZEN, reason);

        // Notifica o sistema de auditoria
        emit ComplianceAction(account, msg.sender, "EMERGENCY_FREEZE", reason);
    }

    /**
     * @dev Descongela uma conta após verificações
     */
    function unfreezeAccount(address account, bytes32 reason)
        external
        onlyRole(COMPLIANCE_OFFICER)
        onlyValidAccount(account)
    {
        if (accounts[account].status != AccountStatus.FROZEN) {
            revert InvalidAccountStatus(accounts[account].status, AccountStatus.FROZEN);
        }

        _setAccountStatus(account, AccountStatus.ACTIVE, reason);
        emit ComplianceAction(account, msg.sender, "UNFROZE", reason);
    }

    // ============= LIMITS MANAGEMENT =============

    /**
     * @dev Atualiza os limites globais do sistema
     */
    function updateGlobalLimits(GlobalLimits calldata newLimits)
        external
        onlyRole(RISK_MANAGER)
    {
        if (newLimits.dailyLimit == 0 ||
            newLimits.weeklyLimit < newLimits.dailyLimit ||
            newLimits.monthlyLimit < newLimits.weeklyLimit) {
            revert InvalidLimits();
        }

        globalLimits = newLimits;

        emit GlobalLimitsUpdated(
            newLimits.dailyLimit,
            newLimits.weeklyLimit,
            newLimits.monthlyLimit,
            newLimits.transactionLimit,
            newLimits.multiSigThreshold
        );
    }

    // ============= AUDIT & COMPLIANCE =============

    /**
     * @dev Registra atividade de uma conta para auditoria
     */
    function logAccountActivity(
        address account,
        bytes32 activityType,
        bytes calldata data
    ) external {
        // Apenas contas registradas podem logar atividades
        if (!isValidAccount[account]) revert AccountNotFound(account);
        if (msg.sender != account) revert UnauthorizedAccess(msg.sender, "ACCOUNT_ONLY");

        accounts[account].lastActivity = block.timestamp;
        emit AccountActivity(account, activityType, data);
    }

    // ============= EMERGENCY FUNCTIONS =============

    /**
     * @dev Pausa o sistema em caso de emergência
     */
    function emergencyPause() external onlyRole(SUPER_ADMIN) {
        _pause();
    }

    /**
     * @dev Despausa o sistema
     */
    function unpause() external onlyRole(SUPER_ADMIN) {
        _unpause();
    }

    // ============= VIEW FUNCTIONS =============

    /**
     * @dev Retorna informações de um banco
     */
    function getBankInfo(bytes32 bankId) external view returns (BankInfo memory) {
        return banks[bankId];
    }

    /**
     * @dev Retorna informações de uma conta
     */
    function getAccountInfo(address account) external view returns (AccountInfo memory) {
        return accounts[account];
    }

    /**
     * @dev Retorna todas as contas de um banco
     */
    function getBankAccounts(bytes32 bankId) external view returns (address[] memory) {
        return bankAccounts[bankId];
    }

    /**
     * @dev Retorna o endereço determinístico de uma conta antes de criá-la
     */
    function getAccountAddress(
        bytes32 bankId,
        address owner,
        uint256 salt
    ) external view returns (address) {
        bytes32 fullSalt = keccak256(abi.encodePacked(bankId, owner, salt));
        return accountImplementation.predictDeterministicAddress(fullSalt);
    }

    /**
     * @dev Retorna estatísticas do sistema
     */
    function getSystemStats() external view returns (
        uint256 totalBanks,
        uint256 _totalAccounts,
        uint256 _activeAccounts,
        uint256 frozenAccounts
    ) {
        totalBanks = bankIds.length;
        _totalAccounts = totalAccounts;
        _activeAccounts = activeAccounts;

        // Calcula contas congeladas
        frozenAccounts = 0;
        for (uint256 i = 0; i < bankIds.length; i++) {
            address[] memory bankAccountsList = bankAccounts[bankIds[i]];
            for (uint256 j = 0; j < bankAccountsList.length; j++) {
                if (accounts[bankAccountsList[j]].status == AccountStatus.FROZEN) {
                    frozenAccounts++;
                }
            }
        }
    }

    // ============= INTERNAL FUNCTIONS =============

    /**
     * @dev Valida transições de estado das contas
     */
    function _validateStatusTransition(
        AccountStatus from,
        AccountStatus to
    ) internal pure {
        // Implementa regras de negócio para transições de estado
        if (from == AccountStatus.CLOSED) {
            revert InvalidAccountStatus(from, to);
        }

        if (to == AccountStatus.RECOVERING && from != AccountStatus.SUSPENDED) {
            revert InvalidAccountStatus(from, to);
        }
    }

    // ============= UPGRADABILITY =============

    /**
     * @dev Função para verificar se o contrato suporta uma interface
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}