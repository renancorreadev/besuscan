// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "@account-abstraction/contracts/core/EntryPoint.sol";
import "../src/AABankManager.sol";
import "../src/AABankAccount.sol";
import "../src/KYCAMLValidator.sol";
import "../src/TransactionLimits.sol";
import "../src/MultiSignatureValidator.sol";
import "../src/SocialRecovery.sol";
import "../src/AuditLogger.sol";

/**
 * @title DeployAABankingScript
 * @dev Script para deploy completo do sistema AA Banking para instituicoes financeiras
 * @notice Deploy otimizado para ambiente de producao com configuracoes de seguranca
 */
contract DeployAABankingScript is Script {
    // ============= DEPLOYMENT ADDRESSES =============
    EntryPoint public entryPoint;
    AABankManager public bankManager;
    AABankAccount public accountImplementation;
    KYCAMLValidator public kycAmlValidator;
    TransactionLimits public transactionLimits;
    MultiSignatureValidator public multiSigValidator;
    SocialRecovery public socialRecovery;
    AuditLogger public auditLogger;

    // ============= CONFIGURATION =============
    struct DeploymentConfig {
        address deployer;
        address superAdmin;
        address bankAdmin;
        address complianceOfficer;
        address riskManager;
        uint256 kycValidityPeriod;
        AABankManager.GlobalLimits globalLimits;
        KYCAMLValidator.RiskThresholds riskThresholds;
        ITransactionLimits.LimitConfiguration defaultLimits;
    }

    // ============= DEPLOYMENT RESULTS =============
    struct DeploymentAddresses {
        address entryPoint;
        address bankManager;
        address accountImplementation;
        address kycAmlValidator;
        address transactionLimits;
        address multiSigValidator;
        address socialRecovery;
        address auditLogger;
    }

    function run() external {
        DeploymentConfig memory config = _getDeploymentConfig();

        vm.startBroadcast(config.deployer);

        DeploymentAddresses memory addresses = _deployAllContracts(config);
        _configureContracts(config, addresses);
        _verifyDeployment(addresses);
        _logDeploymentSummary(addresses);

        vm.stopBroadcast();

        // Deployment addresses saved to console output above
    }

    function _getDeploymentConfig() internal view returns (DeploymentConfig memory) {
        // Configuracao baseada em variaveis de ambiente ou valores padrao
        address deployer = vm.envOr("DEPLOYER", msg.sender);
        address superAdmin = vm.envOr("SUPER_ADMIN", deployer);
        address bankAdmin = vm.envOr("BANK_ADMIN", deployer);
        address complianceOfficer = vm.envOr("COMPLIANCE_OFFICER", deployer);
        address riskManager = vm.envOr("RISK_MANAGER", deployer);

        AABankManager.GlobalLimits memory globalLimits = AABankManager.GlobalLimits({
            dailyLimit: vm.envOr("DAILY_LIMIT", uint256(10000 ether)),
            weeklyLimit: vm.envOr("WEEKLY_LIMIT", uint256(50000 ether)),
            monthlyLimit: vm.envOr("MONTHLY_LIMIT", uint256(200000 ether)),
            transactionLimit: vm.envOr("TRANSACTION_LIMIT", uint256(5000 ether)),
            multiSigThreshold: vm.envOr("MULTISIG_THRESHOLD", uint256(10000 ether))
        });

        KYCAMLValidator.RiskThresholds memory riskThresholds = KYCAMLValidator.RiskThresholds({
            lowThreshold: vm.envOr("RISK_LOW", uint256(20)),
            mediumThreshold: vm.envOr("RISK_MEDIUM", uint256(50)),
            highThreshold: vm.envOr("RISK_HIGH", uint256(80)),
            criticalThreshold: vm.envOr("RISK_CRITICAL", uint256(100))
        });

        ITransactionLimits.LimitConfiguration memory defaultLimits = ITransactionLimits.LimitConfiguration({
            dailyLimit: globalLimits.dailyLimit,
            weeklyLimit: globalLimits.weeklyLimit,
            monthlyLimit: globalLimits.monthlyLimit,
            transactionLimit: globalLimits.transactionLimit,
            velocityLimit: vm.envOr("VELOCITY_LIMIT", uint256(10)),
            velocityWindow: vm.envOr("VELOCITY_WINDOW", uint256(1 hours)),
            isActive: true
        });

        return DeploymentConfig({
            deployer: deployer,
            superAdmin: superAdmin,
            bankAdmin: bankAdmin,
            complianceOfficer: complianceOfficer,
            riskManager: riskManager,
            kycValidityPeriod: vm.envOr("KYC_VALIDITY", uint256(365 days)),
            globalLimits: globalLimits,
            riskThresholds: riskThresholds,
            defaultLimits: defaultLimits
        });
    }

    function _deployAllContracts(DeploymentConfig memory config)
        internal
        returns (DeploymentAddresses memory addresses)
    {
        console.log("Iniciando deploy do sistema AA Banking...");

        // 1. Deploy EntryPoint (ou usar existente se especificado)
        address entryPointAddr = vm.envOr("ENTRY_POINT", address(0));
        if (entryPointAddr == address(0)) {
            console.log("Deploying EntryPoint...");
            entryPoint = new EntryPoint();
            addresses.entryPoint = address(entryPoint);
        } else {
            console.log("Using existing EntryPoint at:", entryPointAddr);
            entryPoint = EntryPoint(payable(entryPointAddr));
            addresses.entryPoint = entryPointAddr;
        }

        // 2. Deploy validation contracts
        console.log("Deploying validation contracts...");

        kycAmlValidator = new KYCAMLValidator(
            config.riskThresholds,
            config.kycValidityPeriod
        );
        addresses.kycAmlValidator = address(kycAmlValidator);
        console.log("KYCAMLValidator deployed at:", addresses.kycAmlValidator);

        transactionLimits = new TransactionLimits(config.defaultLimits);
        addresses.transactionLimits = address(transactionLimits);
        console.log("TransactionLimits deployed at:", addresses.transactionLimits);

        multiSigValidator = new MultiSignatureValidator();
        addresses.multiSigValidator = address(multiSigValidator);
        console.log("MultiSignatureValidator deployed at:", addresses.multiSigValidator);

        socialRecovery = new SocialRecovery();
        addresses.socialRecovery = address(socialRecovery);
        console.log("SocialRecovery deployed at:", addresses.socialRecovery);

        auditLogger = new AuditLogger();
        addresses.auditLogger = address(auditLogger);
        console.log("AuditLogger deployed at:", addresses.auditLogger);

        // 3. Deploy core contracts
        console.log("Deploying core contracts...");

        accountImplementation = new AABankAccount(entryPoint);
        addresses.accountImplementation = address(accountImplementation);
        console.log("AABankAccount implementation deployed at:", addresses.accountImplementation);

        bankManager = new AABankManager(
            entryPoint,
            address(accountImplementation),
            config.globalLimits
        );
        addresses.bankManager = address(bankManager);
        console.log("AABankManager deployed at:", addresses.bankManager);

        console.log("Todos os contratos deployados com sucesso!");
        return addresses;
    }

    function _configureContracts(
        DeploymentConfig memory config,
        DeploymentAddresses memory addresses
    ) internal {
        console.log("Configurando roles e permissoes...");

        // Configure Bank Manager roles
        bankManager.grantRole(bankManager.BANK_ADMIN(), config.bankAdmin);
        bankManager.grantRole(bankManager.COMPLIANCE_OFFICER(), config.complianceOfficer);
        bankManager.grantRole(bankManager.RISK_MANAGER(), config.riskManager);

        // Configure KYC/AML roles
        kycAmlValidator.grantRole(kycAmlValidator.KYC_OFFICER(), config.complianceOfficer);
        kycAmlValidator.grantRole(kycAmlValidator.AML_OFFICER(), config.complianceOfficer);
        kycAmlValidator.grantRole(kycAmlValidator.RISK_ANALYST(), config.riskManager);

        // Configure Transaction Limits roles
        transactionLimits.grantRole(transactionLimits.LIMIT_MANAGER(), config.riskManager);
        transactionLimits.grantRole(transactionLimits.RISK_MANAGER(), config.riskManager);

        // Configure Multi-Sig roles
        multiSigValidator.grantRole(multiSigValidator.MULTISIG_ADMIN(), config.bankAdmin);
        multiSigValidator.grantRole(multiSigValidator.SIGNER_MANAGER(), config.bankAdmin);

        // Configure Social Recovery roles
        socialRecovery.grantRole(socialRecovery.RECOVERY_ADMIN(), config.bankAdmin);
        socialRecovery.grantRole(socialRecovery.GUARDIAN_MANAGER(), config.bankAdmin);

        // Configure Audit Logger roles
        auditLogger.grantRole(auditLogger.LOGGER(), addresses.bankManager);
        auditLogger.grantRole(auditLogger.VIEWER(), config.complianceOfficer);
        auditLogger.grantRole(auditLogger.COMPLIANCE_OFFICER(), config.complianceOfficer);

        console.log("Configuracao de roles concluida!");
    }

    function _verifyDeployment(DeploymentAddresses memory addresses) internal view {
        console.log("Verificando deployment...");

        require(addresses.entryPoint != address(0), "EntryPoint not deployed");
        require(addresses.bankManager != address(0), "BankManager not deployed");
        require(addresses.accountImplementation != address(0), "AccountImplementation not deployed");
        require(addresses.kycAmlValidator != address(0), "KYCAMLValidator not deployed");
        require(addresses.transactionLimits != address(0), "TransactionLimits not deployed");
        require(addresses.multiSigValidator != address(0), "MultiSignatureValidator not deployed");
        require(addresses.socialRecovery != address(0), "SocialRecovery not deployed");
        require(addresses.auditLogger != address(0), "AuditLogger not deployed");

        // Verify contract state
        require(bankManager.totalAccounts() == 0, "BankManager should start with 0 accounts");
        require(bankManager.activeAccounts() == 0, "BankManager should start with 0 active accounts");

        console.log("Deployment verification passed!");
    }

    function _logDeploymentSummary(DeploymentAddresses memory addresses) internal view {
        console.log("\nDEPLOYMENT SUMMARY");
        console.log("======================");
        console.log("EntryPoint:              ", addresses.entryPoint);
        console.log("AABankManager:           ", addresses.bankManager);
        console.log("AABankAccount (impl):    ", addresses.accountImplementation);
        console.log("KYCAMLValidator:         ", addresses.kycAmlValidator);
        console.log("TransactionLimits:       ", addresses.transactionLimits);
        console.log("MultiSignatureValidator: ", addresses.multiSigValidator);
        console.log("SocialRecovery:          ", addresses.socialRecovery);
        console.log("AuditLogger:             ", addresses.auditLogger);
        console.log("======================\n");
    }

}

/**
 * @title SetupBanksScript
 * @dev Script para configurar bancos iniciais no sistema
 */
contract SetupBanksScript is Script {
    function run() external {
        address bankManagerAddr = vm.envAddress("BANK_MANAGER");
        AABankManager bankManager = AABankManager(bankManagerAddr);

        address bankAdmin = vm.envAddress("BANK_ADMIN");

        vm.startBroadcast(bankAdmin);

        console.log("Setting up Bradesco bank...");

        // Setup apenas Bradesco
        bytes32 bradescoId = keccak256("BRADESCO");

        if (!_bankExists(bankManager, bradescoId)) {
            bankManager.registerBank(bradescoId, "Banco Bradesco", bankAdmin);
            console.log("Banco Bradesco registered");
        } else {
            console.log("Banco Bradesco already exists");
        }

        vm.stopBroadcast();

        console.log("Bradesco bank setup completed!");
        console.log("Bank ID: 0x42524144455343550000000s00000000000000000000000000000000000000000");
    }

    function _bankExists(AABankManager bankManager, bytes32 bankId) internal view returns (bool) {
        try bankManager.getBankInfo(bankId) returns (AABankManager.BankInfo memory bankInfo) {
            return bankInfo.createdAt > 0;
        } catch {
            return false;
        }
    }
}

/**
 * @title VerifySystemScript
 * @dev Script para verificar integridade do sistema deployado
 */
contract VerifySystemScript is Script {
    function run() external view {
        console.log("Verifying AA Banking System...");

        address bankManagerAddr = vm.envAddress("BANK_MANAGER");
        AABankManager bankManager = AABankManager(bankManagerAddr);

        // Verify system statistics
        (
            uint256 totalBanks,
            uint256 totalAccounts,
            uint256 activeAccounts,
            uint256 frozenAccounts
        ) = bankManager.getSystemStats();

        console.log("System Statistics:");
        console.log("- Total Banks:", totalBanks);
        console.log("- Total Accounts:", totalAccounts);
        console.log("- Active Accounts:", activeAccounts);
        console.log("- Frozen Accounts:", frozenAccounts);

        // Verify global limits
        (
            uint256 dailyLimit,
            uint256 weeklyLimit,
            uint256 monthlyLimit,
            uint256 transactionLimit,
            uint256 multiSigThreshold
        ) = bankManager.globalLimits();
        console.log("\nGlobal Limits:");
        console.log("- Daily Limit:", dailyLimit / 1 ether, "ETH");
        console.log("- Weekly Limit:", weeklyLimit / 1 ether, "ETH");
        console.log("- Monthly Limit:", monthlyLimit / 1 ether, "ETH");
        console.log("- Transaction Limit:", transactionLimit / 1 ether, "ETH");
        console.log("- MultiSig Threshold:", multiSigThreshold / 1 ether, "ETH");

        console.log("\nSystem verification completed!");
    }
}
