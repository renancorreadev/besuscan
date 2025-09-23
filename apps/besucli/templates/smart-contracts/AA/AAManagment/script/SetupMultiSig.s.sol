// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "../src/MultiSignatureValidator.sol";
import "../src/interfaces/IMultiSignatureValidator.sol";

/**
 * @title SetupMultiSigScript
 * @dev Script para configurar sistema de multi-assinatura para contas AA
 * @notice Gerencia signatarios, thresholds e configuracoes de timelock
 */
contract SetupMultiSigScript is Script {
    // ============= CONFIGURATION =============
    struct MultiSigConfig {
        address accountAddress;
        uint256 requiredSignatures;
        uint256 threshold;
        uint256 timelock;
        uint256 expirationTime;
        bool isActive;
        SignerInfo[] signers;
    }

    struct SignerInfo {
        address signerAddress;
        IMultiSignatureValidator.SignerRole role;
        uint256 weight;
        bool isActive;
    }

    function run() external {
        MultiSigConfig memory config = _getMultiSigConfig();

        address multiSigValidatorAddr = vm.envAddress("MULTISIG_VALIDATOR");
        MultiSignatureValidator multiSigValidator = MultiSignatureValidator(multiSigValidatorAddr);

        address bankAdmin = vm.envAddress("BANK_ADMIN");

        vm.startBroadcast(bankAdmin);

        console.log("Configuring multi-signature for account...");
        console.log("Account:", config.accountAddress);
        console.log("Required signatures:", config.requiredSignatures);
        console.log("Threshold:", config.threshold / 1 ether, "ETH");
        console.log("Timelock:", config.timelock / 3600, "hours");

        // 1. Configurar multi-sig para a conta
        console.log("\nConfiguring multi-sig settings...");
        IMultiSignatureValidator.MultiSigConfig memory multiSigConfig = IMultiSignatureValidator.MultiSigConfig({
            requiredSignatures: config.requiredSignatures,
            threshold: config.threshold,
            timelock: config.timelock,
            expirationTime: config.expirationTime,
            isActive: config.isActive
        });

        multiSigValidator.setMultiSigConfig(config.accountAddress, multiSigConfig);
        console.log("SUCCESS: Multi-sig configuration applied");

        // 2. Adicionar signatarios
        console.log("\nAdding signers...");
        for (uint256 i = 0; i < config.signers.length; i++) {
            SignerInfo memory signer = config.signers[i];

            console.log("Adding signer", i + 1, ":", signer.signerAddress);
            console.log("- Role:", _roleToString(signer.role));
            console.log("- Weight:", signer.weight);
            console.log("- Active:", signer.isActive);

            multiSigValidator.addSigner(
                config.accountAddress,
                signer.signerAddress,
                signer.role,
                signer.weight
            );

            if (!signer.isActive) {
                multiSigValidator.setSignerStatus(config.accountAddress, signer.signerAddress, false);
                console.log("  WARNING: Signer deactivated");
            }
        }

        // 3. Verificar configuracao
        console.log("\nVerifying configuration...");
        IMultiSignatureValidator.MultiSigConfig memory savedConfig = multiSigValidator.getMultiSigConfig(config.accountAddress);
        console.log("SUCCESS: Saved configuration:");
        console.log("- Required signatures:", savedConfig.requiredSignatures);
        console.log("- Threshold:", savedConfig.threshold / 1 ether, "ETH");
        console.log("- Timelock:", savedConfig.timelock / 3600, "hours");
        console.log("- Expiration time:", savedConfig.expirationTime / 3600, "hours");
        console.log("- Active:", savedConfig.isActive);

        // 4. Verificar signatarios
        console.log("\nVerifying signers...");
        IMultiSignatureValidator.Signer[] memory signers = multiSigValidator.getSigners(config.accountAddress);
        console.log("SUCCESS: Signers configured:", signers.length);

        for (uint256 i = 0; i < signers.length; i++) {
            IMultiSignatureValidator.Signer memory signer = signers[i];
            console.log("- Signer", i + 1, ":", signer.signerAddress);
            console.log("  Role:", _roleToString(signer.role));
            console.log("  Weight:", signer.weight);
            console.log("  Active:", signer.isActive);
            console.log("  Added at:", signer.addedAt);
        }

        // 5. Verificar peso total
        uint256 totalWeight = multiSigValidator.getTotalSignerWeight(config.accountAddress);
        console.log("\nTotal signer weight:", totalWeight);

        // 6. Testar criacao de transacao
        console.log("\nTesting transaction creation...");
        address testTarget = makeAddr("testTarget");
        uint256 testValue = config.threshold + 1 ether; // Acima do threshold
        bytes memory testData = "test_transaction_data";

        if (multiSigValidator.requiresMultiSig(config.accountAddress, testValue)) {
            console.log("SUCCESS: Transaction requires multi-sig (value:", testValue / 1 ether, "ETH)");

            // Criar transacao de teste
            bytes32 txHash = multiSigValidator.createTransaction(
                config.accountAddress,
                testTarget,
                testValue,
                testData
            );

            console.log("SUCCESS: Transaction created:", vm.toString(txHash));

            // Verificar status da transacao
            IMultiSignatureValidator.TransactionView memory txView = multiSigValidator.getTransaction(
                config.accountAddress,
                txHash
            );

            console.log("Transaction status:");
            console.log("- Target:", txView.target);
            console.log("- Value:", txView.value / 1 ether, "ETH");
            console.log("- Status:", _statusToString(txView.status));
            console.log("- Approvals:", txView.approvals, "/", savedConfig.requiredSignatures);
            console.log("- Current weight:", txView.totalWeight);
            console.log("- Can execute:", multiSigValidator.canExecuteTransaction(config.accountAddress, txHash));
        } else {
            console.log("WARNING: Transaction does not require multi-sig (low value)");
        }

        vm.stopBroadcast();

        // Salvar informacoes
        _saveMultiSigInfo(config.accountAddress, savedConfig, signers);
    }

    function _getMultiSigConfig() internal view returns (MultiSigConfig memory) {
        SignerInfo[] memory signers = new SignerInfo[](3);

        signers[0] = SignerInfo({
            signerAddress: vm.envOr("SIGNER_1", makeAddr("signer1")),
            role: IMultiSignatureValidator.SignerRole.OPERATOR,
            weight: 100,
            isActive: true
        });

        signers[1] = SignerInfo({
            signerAddress: vm.envOr("SIGNER_2", makeAddr("signer2")),
            role: IMultiSignatureValidator.SignerRole.SUPERVISOR,
            weight: 150,
            isActive: true
        });

        signers[2] = SignerInfo({
            signerAddress: vm.envOr("SIGNER_3", makeAddr("signer3")),
            role: IMultiSignatureValidator.SignerRole.EMERGENCY,
            weight: 200,
            isActive: true
        });

        return MultiSigConfig({
            accountAddress: vm.envAddress("ACCOUNT_ADDRESS"),
            requiredSignatures: vm.envOr("REQUIRED_SIGNATURES", uint256(2)),
            threshold: vm.envOr("MULTISIG_THRESHOLD", uint256(10000 ether)),
            timelock: vm.envOr("TIMELOCK", uint256(1 hours)),
            expirationTime: vm.envOr("EXPIRATION_TIME", uint256(24 hours)),
            isActive: vm.envOr("IS_ACTIVE", true),
            signers: signers
        });
    }

    function _roleToString(IMultiSignatureValidator.SignerRole role) internal pure returns (string memory) {
        if (role == IMultiSignatureValidator.SignerRole.OPERATOR) return "OPERATOR";
        if (role == IMultiSignatureValidator.SignerRole.SUPERVISOR) return "SUPERVISOR";
        if (role == IMultiSignatureValidator.SignerRole.EMERGENCY) return "EMERGENCY";
        return "UNKNOWN";
    }

    function _statusToString(IMultiSignatureValidator.TransactionStatus status) internal pure returns (string memory) {
        if (status == IMultiSignatureValidator.TransactionStatus.PENDING) return "PENDING";
        if (status == IMultiSignatureValidator.TransactionStatus.APPROVED) return "APPROVED";
        if (status == IMultiSignatureValidator.TransactionStatus.EXECUTED) return "EXECUTED";
        if (status == IMultiSignatureValidator.TransactionStatus.REJECTED) return "REJECTED";
        return "UNKNOWN";
    }

    function _saveMultiSigInfo(
        address account,
        IMultiSignatureValidator.MultiSigConfig memory config,
        IMultiSignatureValidator.Signer[] memory signers
    ) internal {
        console.log("\nMulti-sig information saved:");
        console.log("export ACCOUNT_ADDRESS=", account);
        console.log("export REQUIRED_SIGNATURES=", config.requiredSignatures);
        console.log("export MULTISIG_THRESHOLD=", config.threshold);
        console.log("export TIMELOCK=", config.timelock);
        console.log("export SIGNER_COUNT=", signers.length);
    }
}

/**
 * @title ApproveTransactionScript
 * @dev Script para aprovar transacoes multi-sig
 */
contract ApproveTransactionScript is Script {
    function run() external {
        address multiSigValidatorAddr = vm.envAddress("MULTISIG_VALIDATOR");
        MultiSignatureValidator multiSigValidator = MultiSignatureValidator(multiSigValidatorAddr);

        address account = vm.envAddress("ACCOUNT_ADDRESS");
        bytes32 txHash = vm.envBytes32("TRANSACTION_HASH");
        address signer = vm.envAddress("SIGNER_ADDRESS");

        vm.startBroadcast(signer);

        console.log("Approving multi-sig transaction...");
        console.log("Account:", account);
        console.log("Transaction:", vm.toString(txHash));
        console.log("Signer:", signer);

        // Verificar se pode aprovar
        bool canApprove = multiSigValidator.canApproveTransaction(account, txHash, signer);
        if (!canApprove) {
            console.log("WARNING: Signer cannot approve this transaction");
            vm.stopBroadcast();
            return;
        }

        // Aprovar transacao
        multiSigValidator.approveTransaction(account, txHash);

        // Verificar status apos aprovacao
        IMultiSignatureValidator.TransactionView memory txView = multiSigValidator.getTransaction(account, txHash);
        console.log("SUCCESS: Transaction approved!");
        console.log("Current approvals:", txView.approvals);
        console.log("Total weight:", txView.totalWeight);
        console.log("Can execute:", multiSigValidator.canExecuteTransaction(account, txHash));

        vm.stopBroadcast();
    }
}

/**
 * @title ExecuteTransactionScript
 * @dev Script para executar transacoes multi-sig aprovadas
 */
contract ExecuteTransactionScript is Script {
    function run() external {
        address multiSigValidatorAddr = vm.envAddress("MULTISIG_VALIDATOR");
        MultiSignatureValidator multiSigValidator = MultiSignatureValidator(multiSigValidatorAddr);

        address account = vm.envAddress("ACCOUNT_ADDRESS");
        bytes32 txHash = vm.envBytes32("TRANSACTION_HASH");

        vm.startBroadcast(account);

        console.log("Executing multi-sig transaction...");
        console.log("Account:", account);
        console.log("Transaction:", vm.toString(txHash));

        // Verificar se pode executar
        bool canExecute = multiSigValidator.canExecuteTransaction(account, txHash);
        if (!canExecute) {
            console.log("WARNING: Transaction cannot be executed yet");
            vm.stopBroadcast();
            return;
        }

        // Executar transacao
        bool success = multiSigValidator.executeTransaction(account, txHash);

        if (success) {
            console.log("SUCCESS: Transaction executed successfully!");
        } else {
            console.log("ERROR: Transaction execution failed");
        }

        vm.stopBroadcast();
    }
}

/**
 * @title BatchSetupMultiSigScript
 * @dev Script para configurar multi-sig para multiplas contas
 */
contract BatchSetupMultiSigScript is Script {
    struct AccountMultiSigInfo {
        address accountAddress;
        uint256 requiredSignatures;
        uint256 threshold;
        uint256 timelock;
        address[] signers;
        uint256[] weights;
    }

    function run() external {
        address multiSigValidatorAddr = vm.envAddress("MULTISIG_VALIDATOR");
        MultiSignatureValidator multiSigValidator = MultiSignatureValidator(multiSigValidatorAddr);

        address bankAdmin = vm.envAddress("BANK_ADMIN");

        AccountMultiSigInfo[] memory accounts = _getAccountsList();

        vm.startBroadcast(bankAdmin);

        console.log("Configuring multi-sig for", accounts.length, "accounts...");

        for (uint256 i = 0; i < accounts.length; i++) {
            AccountMultiSigInfo memory accountInfo = accounts[i];

            console.log("\nAccount", i + 1, ":", accountInfo.accountAddress);

            // Configurar multi-sig
            IMultiSignatureValidator.MultiSigConfig memory config = IMultiSignatureValidator.MultiSigConfig({
                requiredSignatures: accountInfo.requiredSignatures,
                threshold: accountInfo.threshold,
                timelock: accountInfo.timelock,
                expirationTime: 24 hours,
                isActive: true
            });

            multiSigValidator.setMultiSigConfig(accountInfo.accountAddress, config);

            // Adicionar signatarios
            for (uint256 j = 0; j < accountInfo.signers.length; j++) {
                multiSigValidator.addSigner(
                    accountInfo.accountAddress,
                    accountInfo.signers[j],
                    IMultiSignatureValidator.SignerRole.OPERATOR,
                    accountInfo.weights[j]
                );
            }

            console.log("SUCCESS: Multi-sig configured with", accountInfo.signers.length, "signers");
        }

        vm.stopBroadcast();

        console.log("\nSUCCESS: Batch multi-sig configuration completed!");
    }

    function _getAccountsList() internal pure returns (AccountMultiSigInfo[] memory) {
        AccountMultiSigInfo[] memory accounts = new AccountMultiSigInfo[](2);

        // Conta 1
        address[] memory signers1 = new address[](2);
        signers1[0] = makeAddr("signer1_1");
        signers1[1] = makeAddr("signer1_2");

        uint256[] memory weights1 = new uint256[](2);
        weights1[0] = 100;
        weights1[1] = 100;

        accounts[0] = AccountMultiSigInfo({
            accountAddress: 0x742d35Cc6634C0532925a3b8D7C9C0F4b8b8b8b8,
            requiredSignatures: 2,
            threshold: 5000 ether,
            timelock: 1 hours,
            signers: signers1,
            weights: weights1
        });

        // Conta 2
        address[] memory signers2 = new address[](3);
        signers2[0] = makeAddr("signer2_1");
        signers2[1] = makeAddr("signer2_2");
        signers2[2] = makeAddr("signer2_3");

        uint256[] memory weights2 = new uint256[](3);
        weights2[0] = 100;
        weights2[1] = 150;
        weights2[2] = 200;

        accounts[1] = AccountMultiSigInfo({
            accountAddress: 0x8A2e36e214f457b625e0cf9abd89029a0441eF60,
            requiredSignatures: 2,
            threshold: 10000 ether,
            timelock: 2 hours,
            signers: signers2,
            weights: weights2
        });

        return accounts;
    }
}
