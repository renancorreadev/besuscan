// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "../src/SocialRecovery.sol";
import "../src/interfaces/ISocialRecovery.sol";

/**
 * @title SetupSocialRecoveryScript
 * @dev Script para configurar sistema de recuperacao social para contas AA
 * @notice Gerencia guardioes, configuracoes de recuperacao e processos de recuperacao
 */
contract SetupSocialRecoveryScript is Script {
    // ============= CONFIGURATION =============
    struct RecoveryConfig {
        address accountAddress;
        uint256 requiredApprovals;
        uint256 requiredWeight;
        uint256 recoveryDelay;
        uint256 approvalWindow;
        uint256 cooldownPeriod;
        bool isActive;
        GuardianInfo[] guardians;
    }

    struct GuardianInfo {
        address guardianAddress;
        ISocialRecovery.GuardianType guardianType;
        uint256 weight;
        bool isActive;
        string metadata;
    }

    function run() external {
        RecoveryConfig memory config = _getRecoveryConfig();

        address socialRecoveryAddr = vm.envAddress("SOCIAL_RECOVERY");
        SocialRecovery socialRecovery = SocialRecovery(socialRecoveryAddr);

        address bankAdmin = vm.envAddress("BANK_ADMIN");

        vm.startBroadcast(bankAdmin);

        console.log("Configuring social recovery for account...");
        console.log("Account:", config.accountAddress);
        console.log("Required approvals:", config.requiredApprovals);
        console.log("Required weight:", config.requiredWeight);
        console.log("Recovery delay:", config.recoveryDelay / 3600, "hours");

        // 1. Configurar recuperacao social para a conta
        console.log("\nConfiguring recovery settings...");
        ISocialRecovery.RecoveryConfig memory recoveryConfig = ISocialRecovery.RecoveryConfig({
            requiredApprovals: config.requiredApprovals,
            requiredWeight: config.requiredWeight,
            recoveryDelay: config.recoveryDelay,
            approvalWindow: config.approvalWindow,
            cooldownPeriod: config.cooldownPeriod,
            isActive: config.isActive
        });

        socialRecovery.setRecoveryConfig(config.accountAddress, recoveryConfig);
        console.log("SUCCESS: Recovery configuration applied");

        // 2. Adicionar guardioes
        console.log("\nAdding guardians...");
        for (uint256 i = 0; i < config.guardians.length; i++) {
            GuardianInfo memory guardian = config.guardians[i];

            console.log("Adding guardian", i + 1, ":", guardian.guardianAddress);
            console.log("- Type:", _guardianTypeToString(guardian.guardianType));
            console.log("- Weight:", guardian.weight);
            console.log("- Active:", guardian.isActive);
            console.log("- Metadata:", guardian.metadata);

            socialRecovery.addGuardian(
                config.accountAddress,
                guardian.guardianAddress,
                guardian.guardianType,
                guardian.weight,
                guardian.metadata
            );

            if (!guardian.isActive) {
                socialRecovery.setGuardianStatus(config.accountAddress, guardian.guardianAddress, false);
                console.log("  WARNING: Guardian deactivated");
            }
        }

        // 3. Verificar configuracao
        console.log("\nVerifying configuration...");
        ISocialRecovery.RecoveryConfig memory savedConfig = socialRecovery.getRecoveryConfig(config.accountAddress);
        console.log("SUCCESS: Saved configuration:");
        console.log("- Required approvals:", savedConfig.requiredApprovals);
        console.log("- Required weight:", savedConfig.requiredWeight);
        console.log("- Recovery delay:", savedConfig.recoveryDelay / 3600, "hours");
        console.log("- Approval window:", savedConfig.approvalWindow / 3600, "hours");
        console.log("- Cooldown period:", savedConfig.cooldownPeriod / 86400, "days");
        console.log("- Active:", savedConfig.isActive);

        // 4. Verificar guardioes
        console.log("\nVerifying guardians...");
        ISocialRecovery.Guardian[] memory guardians = socialRecovery.getGuardians(config.accountAddress);
        console.log("SUCCESS: Guardians configured:", guardians.length);

        for (uint256 i = 0; i < guardians.length; i++) {
            ISocialRecovery.Guardian memory guardian = guardians[i];
            console.log("- Guardian", i + 1, ":", guardian.guardianAddress);
            console.log("  Type:", _guardianTypeToString(guardian.guardianType));
            console.log("  Weight:", guardian.weight);
            console.log("  Active:", guardian.isActive);
            console.log("  Added at:", guardian.addedAt);
            console.log("  Metadata:", guardian.metadata);
        }

        // 5. Verificar peso total
        uint256 totalWeight = socialRecovery.getTotalGuardianWeight(config.accountAddress);
        console.log("\nTotal guardian weight:", totalWeight);

        // 6. Testar processo de recuperacao
        console.log("\nTesting recovery process...");
        address proposedNewOwner = makeAddr("newOwner");
        bytes32 reason = "Social recovery test";

        // Verificar se pode iniciar recuperacao
        bool canInitiate = socialRecovery.canInitiateRecovery(config.accountAddress, config.guardians[0].guardianAddress);
        if (canInitiate) {
            console.log("SUCCESS: Guardian can initiate recovery");

            // Iniciar recuperacao de teste
            bytes32 requestId = socialRecovery.initiateRecovery(
                config.accountAddress,
                proposedNewOwner,
                reason
            );

            console.log("SUCCESS: Recovery initiated:", vm.toString(requestId));

            // Verificar status da recuperacao
            ISocialRecovery.RecoveryRequestView memory request = socialRecovery.getRecoveryRequest(requestId);

            console.log("Recovery status:");
            console.log("- Account:", request.account);
            console.log("- Proposed new owner:", request.proposedNewOwner);
            console.log("- Initiated by:", request.initiator);
            console.log("- Status:", _recoveryStatusToString(request.status));
            console.log("- Approvals:", request.approvals, "/", savedConfig.requiredApprovals);
            console.log("- Current weight:", request.totalWeight);
            console.log("- Can execute:", socialRecovery.canExecuteRecovery(config.accountAddress, requestId));
            console.log("- Time until execution:", socialRecovery.getTimeUntilExecution(config.accountAddress, requestId) / 3600, "hours");
        } else {
            console.log("WARNING: Guardian cannot initiate recovery");
        }

        vm.stopBroadcast();

        // Salvar informacoes
        _saveRecoveryInfo(config.accountAddress, savedConfig, guardians);
    }

    function _getRecoveryConfig() internal view returns (RecoveryConfig memory) {
        GuardianInfo[] memory guardians = new GuardianInfo[](3);

        guardians[0] = GuardianInfo({
            guardianAddress: vm.envOr("GUARDIAN_1", makeAddr("guardian1")),
            guardianType: ISocialRecovery.GuardianType.FAMILY,
            weight: 100,
            isActive: true,
            metadata: "Close family member - Spouse"
        });

        guardians[1] = GuardianInfo({
            guardianAddress: vm.envOr("GUARDIAN_2", makeAddr("guardian2")),
            guardianType: ISocialRecovery.GuardianType.FRIEND,
            weight: 150,
            isActive: true,
            metadata: "Trusted friend - Work colleague"
        });

        guardians[2] = GuardianInfo({
            guardianAddress: vm.envOr("GUARDIAN_3", makeAddr("guardian3")),
            guardianType: ISocialRecovery.GuardianType.EMERGENCY,
            weight: 200,
            isActive: true,
            metadata: "Emergency guardian - Lawyer"
        });

        return RecoveryConfig({
            accountAddress: vm.envAddress("ACCOUNT_ADDRESS"),
            requiredApprovals: vm.envOr("REQUIRED_APPROVALS", uint256(2)),
            requiredWeight: vm.envOr("REQUIRED_WEIGHT", uint256(200)),
            recoveryDelay: vm.envOr("RECOVERY_DELAY", uint256(24 hours)),
            approvalWindow: vm.envOr("APPROVAL_WINDOW", uint256(72 hours)),
            cooldownPeriod: vm.envOr("COOLDOWN_PERIOD", uint256(7 days)),
            isActive: vm.envOr("IS_ACTIVE", true),
            guardians: guardians
        });
    }

    function _guardianTypeToString(ISocialRecovery.GuardianType guardianType) internal pure returns (string memory) {
        if (guardianType == ISocialRecovery.GuardianType.FAMILY) return "FAMILY";
        if (guardianType == ISocialRecovery.GuardianType.FRIEND) return "FRIEND";
        if (guardianType == ISocialRecovery.GuardianType.PROFESSIONAL) return "PROFESSIONAL";
        if (guardianType == ISocialRecovery.GuardianType.EMERGENCY) return "EMERGENCY";
        return "UNKNOWN";
    }

    function _recoveryStatusToString(ISocialRecovery.RecoveryStatus status) internal pure returns (string memory) {
        if (status == ISocialRecovery.RecoveryStatus.INITIATED) return "INITIATED";
        if (status == ISocialRecovery.RecoveryStatus.APPROVED) return "APPROVED";
        if (status == ISocialRecovery.RecoveryStatus.EXECUTED) return "EXECUTED";
        if (status == ISocialRecovery.RecoveryStatus.REJECTED) return "REJECTED";
        return "UNKNOWN";
    }

    function _saveRecoveryInfo(
        address account,
        ISocialRecovery.RecoveryConfig memory config,
        ISocialRecovery.Guardian[] memory guardians
    ) internal {
        console.log("\nSocial recovery information saved:");
        console.log("export ACCOUNT_ADDRESS=", account);
        console.log("export REQUIRED_APPROVALS=", config.requiredApprovals);
        console.log("export REQUIRED_WEIGHT=", config.requiredWeight);
        console.log("export RECOVERY_DELAY=", config.recoveryDelay);
        console.log("export GUARDIAN_COUNT=", guardians.length);
    }
}

/**
 * @title ApproveRecoveryScript
 * @dev Script para aprovar recuperacoes sociais
 */
contract ApproveRecoveryScript is Script {
    function run() external {
        address socialRecoveryAddr = vm.envAddress("SOCIAL_RECOVERY");
        SocialRecovery socialRecovery = SocialRecovery(socialRecoveryAddr);

        address account = vm.envAddress("ACCOUNT_ADDRESS");
        bytes32 requestId = vm.envBytes32("RECOVERY_REQUEST_ID");
        address guardian = vm.envAddress("GUARDIAN_ADDRESS");

        vm.startBroadcast(guardian);

        console.log("Approving social recovery...");
        console.log("Account:", account);
        console.log("Request:", vm.toString(requestId));
        console.log("Guardian:", guardian);

        // Verificar se pode aprovar
        bool canApprove = socialRecovery.canApproveRecovery(account, requestId, guardian);
        if (!canApprove) {
            console.log("WARNING: Guardian cannot approve this recovery");
            vm.stopBroadcast();
            return;
        }

        // Aprovar recuperacao
        socialRecovery.approveRecovery(account, requestId);

        // Verificar status apos aprovacao
        ISocialRecovery.RecoveryRequestView memory request = socialRecovery.getRecoveryRequest(requestId);
        console.log("SUCCESS: Recovery approved!");
        console.log("Current approvals:", request.approvals);
        console.log("Total weight:", request.totalWeight);
        console.log("Can execute:", socialRecovery.canExecuteRecovery(account, requestId));

        vm.stopBroadcast();
    }
}

/**
 * @title ExecuteRecoveryScript
 * @dev Script para executar recuperacoes sociais aprovadas
 */
contract ExecuteRecoveryScript is Script {
    function run() external {
        address socialRecoveryAddr = vm.envAddress("SOCIAL_RECOVERY");
        SocialRecovery socialRecovery = SocialRecovery(socialRecoveryAddr);

        address account = vm.envAddress("ACCOUNT_ADDRESS");
        bytes32 requestId = vm.envBytes32("RECOVERY_REQUEST_ID");

        vm.startBroadcast(account);

        console.log("Executing social recovery...");
        console.log("Account:", account);
        console.log("Request:", vm.toString(requestId));

        // Verificar se pode executar
        bool canExecute = socialRecovery.canExecuteRecovery(account, requestId);
        if (!canExecute) {
            console.log("WARNING: Recovery cannot be executed yet");
            vm.stopBroadcast();
            return;
        }

        // Executar recuperacao
        socialRecovery.executeRecovery(account, requestId);

        console.log("SUCCESS: Recovery executed successfully!");

        vm.stopBroadcast();
    }
}

/**
 * @title BatchSetupSocialRecoveryScript
 * @dev Script para configurar recuperacao social para multiplas contas
 */
contract BatchSetupSocialRecoveryScript is Script {
    struct AccountRecoveryInfo {
        address accountAddress;
        uint256 requiredApprovals;
        uint256 requiredWeight;
        uint256 recoveryDelay;
        address[] guardians;
        uint256[] weights;
        string[] metadata;
    }

    function run() external {
        address socialRecoveryAddr = vm.envAddress("SOCIAL_RECOVERY");
        SocialRecovery socialRecovery = SocialRecovery(socialRecoveryAddr);

        address bankAdmin = vm.envAddress("BANK_ADMIN");

        AccountRecoveryInfo[] memory accounts = _getAccountsList();

        vm.startBroadcast(bankAdmin);

        console.log("Configuring social recovery for", accounts.length, "accounts...");

        for (uint256 i = 0; i < accounts.length; i++) {
            AccountRecoveryInfo memory accountInfo = accounts[i];

            console.log("\nAccount", i + 1, ":", accountInfo.accountAddress);

            // Configurar recuperacao social
            ISocialRecovery.RecoveryConfig memory config = ISocialRecovery.RecoveryConfig({
                requiredApprovals: accountInfo.requiredApprovals,
                requiredWeight: accountInfo.requiredWeight,
                recoveryDelay: accountInfo.recoveryDelay,
                approvalWindow: 72 hours,
                cooldownPeriod: 7 days,
                isActive: true
            });

            socialRecovery.setRecoveryConfig(accountInfo.accountAddress, config);

            // Adicionar guardioes
            for (uint256 j = 0; j < accountInfo.guardians.length; j++) {
                ISocialRecovery.GuardianType guardianType = ISocialRecovery.GuardianType.FAMILY;
                if (j == 1) guardianType = ISocialRecovery.GuardianType.FRIEND;
                if (j == 2) guardianType = ISocialRecovery.GuardianType.EMERGENCY;

                socialRecovery.addGuardian(
                    accountInfo.accountAddress,
                    accountInfo.guardians[j],
                    guardianType,
                    accountInfo.weights[j],
                    accountInfo.metadata[j]
                );
            }

            console.log("SUCCESS: Social recovery configured with", accountInfo.guardians.length, "guardians");
        }

        vm.stopBroadcast();

        console.log("\nSUCCESS: Batch social recovery configuration completed!");
    }

    function _getAccountsList() internal pure returns (AccountRecoveryInfo[] memory) {
        AccountRecoveryInfo[] memory accounts = new AccountRecoveryInfo[](2);

        // Conta 1
        address[] memory guardians1 = new address[](2);
        guardians1[0] = makeAddr("guardian1_1");
        guardians1[1] = makeAddr("guardian1_2");

        uint256[] memory weights1 = new uint256[](2);
        weights1[0] = 100;
        weights1[1] = 100;

        string[] memory metadata1 = new string[](2);
        metadata1[0] = "Family - Spouse";
        metadata1[1] = "Friend - Colleague";

        accounts[0] = AccountRecoveryInfo({
            accountAddress: 0x742d35Cc6634C0532925a3b8D7C9C0F4b8b8b8b8,
            requiredApprovals: 2,
            requiredWeight: 150,
            recoveryDelay: 24 hours,
            guardians: guardians1,
            weights: weights1,
            metadata: metadata1
        });

        // Conta 2
        address[] memory guardians2 = new address[](3);
        guardians2[0] = makeAddr("guardian2_1");
        guardians2[1] = makeAddr("guardian2_2");
        guardians2[2] = makeAddr("guardian2_3");

        uint256[] memory weights2 = new uint256[](3);
        weights2[0] = 100;
        weights2[1] = 150;
        weights2[2] = 200;

        string[] memory metadata2 = new string[](3);
        metadata2[0] = "Family - Brother";
        metadata2[1] = "Friend - Best friend";
        metadata2[2] = "Professional - Lawyer";

        accounts[1] = AccountRecoveryInfo({
            accountAddress: 0x8A2e36e214f457b625e0cf9abd89029a0441eF60,
            requiredApprovals: 2,
            requiredWeight: 200,
            recoveryDelay: 48 hours,
            guardians: guardians2,
            weights: weights2,
            metadata: metadata2
        });

        return accounts;
    }
}

/**
 * @title EmergencyRecoveryScript
 * @dev Script para recuperacao de emergencia
 */
contract EmergencyRecoveryScript is Script {
    function run() external {
        address socialRecoveryAddr = vm.envAddress("SOCIAL_RECOVERY");
        SocialRecovery socialRecovery = SocialRecovery(socialRecoveryAddr);

        address account = vm.envAddress("ACCOUNT_ADDRESS");
        address newOwner = vm.envAddress("NEW_OWNER");
        address emergencyManager = vm.envAddress("EMERGENCY_MANAGER");

        vm.startBroadcast(emergencyManager);

        console.log("EXECUTING EMERGENCY RECOVERY...");
        console.log("WARNING: This is a critical operation!");
        console.log("Account:", account);
        console.log("New owner:", newOwner);
        console.log("Emergency manager:", emergencyManager);

        // Executar recuperacao de emergencia
        socialRecovery.emergencyRecovery(account, newOwner);

        console.log("SUCCESS: Emergency recovery executed!");
        console.log("WARNING: This is a critical operation - verify if necessary");

        vm.stopBroadcast();
    }
}
