// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "@account-abstraction/contracts/core/EntryPoint.sol";

import {AABankManager} from "../src/AABankManager.sol";
import {AABankAccount} from "../src/AABankAccount.sol";
import {KYCAMLValidator} from "../src/KYCAMLValidator.sol";
import {TransactionLimits} from "../src/TransactionLimits.sol";
import {MultiSignatureValidator} from "../src/MultiSignatureValidator.sol";
import {SocialRecovery} from "../src/SocialRecovery.sol";
import {AuditLogger} from "../src/AuditLogger.sol";
import {IKYCAMLValidator} from "../src/interfaces/IKYCAMLValidator.sol";
import {ITransactionLimits} from "../src/interfaces/ITransactionLimits.sol";
import {IMultiSignatureValidator} from "../src/interfaces/IMultiSignatureValidator.sol";
import {ISocialRecovery} from "../src/interfaces/ISocialRecovery.sol";

/**
 * @title BaseTest
 * @dev Classe base para todos os testes do sistema AA Banking
 */
contract BaseTest is Test {
    // ============= CORE CONTRACTS =============
    EntryPoint public entryPoint;
    AABankManager public bankManager;
    AABankAccount public accountImplementation;

    // ============= VALIDATION CONTRACTS =============
    KYCAMLValidator public kycAmlValidator;
    TransactionLimits public transactionLimits;
    MultiSignatureValidator public multiSigValidator;
    SocialRecovery public socialRecovery;
    AuditLogger public auditLogger;

    // ============= TEST ACCOUNTS =============
    address public superAdmin = makeAddr("superAdmin");
    address public bankAdmin = makeAddr("bankAdmin");
    address public complianceOfficer = makeAddr("complianceOfficer");
    address public riskManager = makeAddr("riskManager");

    // Test banks
    bytes32 public constant BANK_SANTANDER = keccak256("SANTANDER");
    bytes32 public constant BANK_ITAU = keccak256("ITAU");
    bytes32 public constant BANK_CAIXA = keccak256("CAIXA");

    // Test users
    address public user1 = makeAddr("user1");
    address public user2 = makeAddr("user2");
    address public user3 = makeAddr("user3");

    // Test signers
    address public signer1 = makeAddr("signer1");
    address public signer2 = makeAddr("signer2");
    address public signer3 = makeAddr("signer3");

    // Test guardians
    address public guardian1 = makeAddr("guardian1");
    address public guardian2 = makeAddr("guardian2");
    address public guardian3 = makeAddr("guardian3");

    // ============= CONSTANTS =============
    uint256 public constant INITIAL_FUNDING = 100 ether;
    uint256 public constant DEFAULT_DAILY_LIMIT = 10000 ether;
    uint256 public constant DEFAULT_WEEKLY_LIMIT = 50000 ether;
    uint256 public constant DEFAULT_MONTHLY_LIMIT = 200000 ether;
    uint256 public constant DEFAULT_TRANSACTION_LIMIT = 5000 ether;
    uint256 public constant DEFAULT_MULTISIG_THRESHOLD = 10000 ether;

    // ============= SETUP =============
    function setUp() public virtual {
        // Deploy EntryPoint
        entryPoint = new EntryPoint();

        // Deploy validation contracts
        _deployValidationContracts();

        // Deploy core contracts
        _deployCoreContracts();

        // Setup initial configuration
        _setupInitialConfiguration();

        // Fund test accounts
        _fundTestAccounts();

        // Setup banks
        _setupTestBanks();
    }

    function _deployValidationContracts() internal {
        // Deploy KYC/AML Validator
        KYCAMLValidator.RiskThresholds memory riskThresholds = KYCAMLValidator.RiskThresholds({
            lowThreshold: 20,
            mediumThreshold: 50,
            highThreshold: 80,
            criticalThreshold: 100
        });

        vm.startPrank(superAdmin);
        kycAmlValidator = new KYCAMLValidator(riskThresholds, 365 days);
        vm.stopPrank();

        // Deploy Transaction Limits
        ITransactionLimits.LimitConfiguration memory defaultLimits = ITransactionLimits.LimitConfiguration({
            dailyLimit: DEFAULT_DAILY_LIMIT,
            weeklyLimit: DEFAULT_WEEKLY_LIMIT,
            monthlyLimit: DEFAULT_MONTHLY_LIMIT,
            transactionLimit: DEFAULT_TRANSACTION_LIMIT,
            velocityLimit: 10,
            velocityWindow: 1 hours,
            isActive: true
        });

        vm.startPrank(superAdmin);
        transactionLimits = new TransactionLimits(defaultLimits);
        vm.stopPrank();

        // Deploy Multi-Signature Validator
        vm.startPrank(superAdmin);
        multiSigValidator = new MultiSignatureValidator();
        vm.stopPrank();

        // Deploy Social Recovery
        vm.startPrank(superAdmin);
        socialRecovery = new SocialRecovery();
        vm.stopPrank();

        // Deploy Audit Logger
        vm.startPrank(superAdmin);
        auditLogger = new AuditLogger();
        vm.stopPrank();
    }

    function _deployCoreContracts() internal {
        // Deploy Account Implementation
        accountImplementation = new AABankAccount(entryPoint);

        // Deploy Bank Manager
        AABankManager.GlobalLimits memory globalLimits = AABankManager.GlobalLimits({
            dailyLimit: DEFAULT_DAILY_LIMIT,
            weeklyLimit: DEFAULT_WEEKLY_LIMIT,
            monthlyLimit: DEFAULT_MONTHLY_LIMIT,
            transactionLimit: DEFAULT_TRANSACTION_LIMIT,
            multiSigThreshold: DEFAULT_MULTISIG_THRESHOLD
        });

        vm.startPrank(superAdmin);
        bankManager = new AABankManager(
            entryPoint,
            address(accountImplementation),
            globalLimits
        );
        vm.stopPrank();
    }

    function _setupInitialConfiguration() internal {
        vm.startPrank(superAdmin);

        // Grant roles to test accounts
        bankManager.grantRole(bankManager.BANK_ADMIN(), bankAdmin);
        bankManager.grantRole(bankManager.COMPLIANCE_OFFICER(), complianceOfficer);
        bankManager.grantRole(bankManager.RISK_MANAGER(), riskManager);

        // Setup KYC/AML roles
        kycAmlValidator.grantRole(kycAmlValidator.KYC_OFFICER(), complianceOfficer);
        kycAmlValidator.grantRole(kycAmlValidator.AML_OFFICER(), complianceOfficer);
        kycAmlValidator.grantRole(kycAmlValidator.RISK_ANALYST(), riskManager);
        kycAmlValidator.grantRole(kycAmlValidator.COMPLIANCE_ADMIN(), complianceOfficer);

        // Setup Transaction Limits roles
        transactionLimits.grantRole(transactionLimits.LIMIT_MANAGER(), riskManager);
        transactionLimits.grantRole(transactionLimits.RISK_MANAGER(), riskManager);

        // Setup Multi-Sig roles
        multiSigValidator.grantRole(multiSigValidator.MULTISIG_ADMIN(), bankAdmin);
        multiSigValidator.grantRole(multiSigValidator.SIGNER_MANAGER(), bankAdmin);

        // Setup Social Recovery roles
        socialRecovery.grantRole(socialRecovery.RECOVERY_ADMIN(), bankAdmin);
        socialRecovery.grantRole(socialRecovery.GUARDIAN_MANAGER(), bankAdmin);

        // Setup Audit Logger roles
        auditLogger.grantRole(auditLogger.LOGGER(), address(bankManager));
        auditLogger.grantRole(auditLogger.VIEWER(), complianceOfficer);
        auditLogger.grantRole(auditLogger.COMPLIANCE_OFFICER(), complianceOfficer);

        vm.stopPrank();
    }

    function _fundTestAccounts() internal {
        vm.deal(superAdmin, INITIAL_FUNDING);
        vm.deal(bankAdmin, INITIAL_FUNDING);
        vm.deal(complianceOfficer, INITIAL_FUNDING);
        vm.deal(riskManager, INITIAL_FUNDING);
        vm.deal(user1, INITIAL_FUNDING);
        vm.deal(user2, INITIAL_FUNDING);
        vm.deal(user3, INITIAL_FUNDING);
        vm.deal(signer1, INITIAL_FUNDING);
        vm.deal(signer2, INITIAL_FUNDING);
        vm.deal(signer3, INITIAL_FUNDING);
        vm.deal(guardian1, INITIAL_FUNDING);
        vm.deal(guardian2, INITIAL_FUNDING);
        vm.deal(guardian3, INITIAL_FUNDING);
    }

    function _setupTestBanks() internal {
        vm.startPrank(superAdmin);

        // Register test banks
        bankManager.registerBank(BANK_SANTANDER, "Banco Santander", bankAdmin);
        bankManager.registerBank(BANK_ITAU, "Banco Itau", bankAdmin);
        bankManager.registerBank(BANK_CAIXA, "Caixa Economica Federal", bankAdmin);

        vm.stopPrank();
    }

    // ============= HELPER FUNCTIONS =============

    /**
     * @dev Cria uma conta AA para teste
     */
    function createTestAccount(
        address owner,
        bytes32 bankId,
        uint256 salt
    ) public returns (address account) {
        vm.startPrank(bankAdmin);

        // Dados de inicialização padrão
        AABankAccount.AccountConfiguration memory config = AABankAccount.AccountConfiguration({
            dailyLimit: DEFAULT_DAILY_LIMIT,
            weeklyLimit: DEFAULT_WEEKLY_LIMIT,
            monthlyLimit: DEFAULT_MONTHLY_LIMIT,
            transactionLimit: DEFAULT_TRANSACTION_LIMIT,
            multiSigThreshold: DEFAULT_MULTISIG_THRESHOLD,
            requiresKYC: true,
            requiresAML: true,
            riskLevel: 1
        });

        bytes memory initData = abi.encode(config);

        account = bankManager.createBankAccount(owner, bankId, salt, initData);

        vm.stopPrank();
        return account;
    }

    /**
     * @dev Configura KYC aprovado para um usuário
     */
    function setupApprovedKYC(address user) public {
        vm.startPrank(complianceOfficer);

        kycAmlValidator.updateKYCStatus(
            user,
            IKYCAMLValidator.KYCStatus.VERIFIED,
            block.timestamp + 365 days,
            keccak256("test_document_hash")
        );

        vm.stopPrank();
    }

    /**
     * @dev Configura multi-sig para uma conta
     */
    function setupMultiSig(address account, address[] memory signers) public {
        vm.startPrank(bankAdmin);

        // Configura multi-sig
        IMultiSignatureValidator.MultiSigConfig memory config = IMultiSignatureValidator.MultiSigConfig({
            requiredSignatures: 2,
            threshold: DEFAULT_MULTISIG_THRESHOLD,
            timelock: 1 hours,
            expirationTime: 24 hours,
            isActive: true
        });

        multiSigValidator.setMultiSigConfig(account, config);

        // Adiciona signatários
        for (uint256 i = 0; i < signers.length; i++) {
            multiSigValidator.addSigner(
                account,
                signers[i],
                IMultiSignatureValidator.SignerRole.OPERATOR,
                100
            );
        }

        vm.stopPrank();
    }

    /**
     * @dev Configura guardiões para recuperação social
     */
    function setupSocialRecovery(address account, address[] memory guardians) public {
        vm.startPrank(bankAdmin);

        // Configura recuperação social
        ISocialRecovery.RecoveryConfig memory config = ISocialRecovery.RecoveryConfig({
            requiredApprovals: 2,
            requiredWeight: 200,
            recoveryDelay: 24 hours,
            approvalWindow: 72 hours,
            cooldownPeriod: 7 days,
            isActive: true
        });

        socialRecovery.setRecoveryConfig(account, config);

        // Adiciona guardiões
        for (uint256 i = 0; i < guardians.length; i++) {
            socialRecovery.addGuardian(
                account,
                guardians[i],
                ISocialRecovery.GuardianType.FAMILY,
                100,
                "test_metadata"
            );
        }

        vm.stopPrank();
    }

    /**
     * @dev Avança o tempo para testes
     */
    function skipTime(uint256 duration) public {
        vm.warp(block.timestamp + duration);
    }

    /**
     * @dev Avança blocos para testes
     */
    function skipBlocks(uint256 blocks) public {
        vm.roll(block.number + blocks);
    }

    /**
     * @dev Verifica se um evento foi emitido
     */
    function expectEventEmitted() public {
        vm.expectEmit(true, true, true, true);
    }

    /**
     * @dev Mock de uma transação para teste
     */
    function mockTransaction(
        address account,
        address target,
        uint256 value,
        bytes memory data
    ) public returns (bytes32 txHash) {
        txHash = keccak256(abi.encodePacked(
            account,
            target,
            value,
            data,
            block.timestamp
        ));
        return txHash;
    }

    // ============= ASSERTION HELPERS =============

    /**
     * @dev Verifica se uma conta está ativa
     */
    function assertAccountActive(address account) public {
        AABankManager.AccountInfo memory info = bankManager.getAccountInfo(account);
        assertEq(uint8(info.status), uint8(AABankManager.AccountStatus.ACTIVE));
    }

    /**
     * @dev Verifica se uma conta está congelada
     */
    function assertAccountFrozen(address account) public {
        AABankManager.AccountInfo memory info = bankManager.getAccountInfo(account);
        assertEq(uint8(info.status), uint8(AABankManager.AccountStatus.FROZEN));
    }

    /**
     * @dev Verifica se um evento de auditoria foi registrado
     */
    function assertAuditEventLogged(
        address target,
        bytes32 eventType,
        AuditLogger.EventCategory category
    ) public {
        // Implementação simplificada - pode ser expandida
        assertTrue(auditLogger.eventCounter() > 0);
    }
}
