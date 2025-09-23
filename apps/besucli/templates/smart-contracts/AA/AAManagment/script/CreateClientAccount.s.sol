// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "../src/AABankManager.sol";
import "../src/AABankAccount.sol";

/**
 * @title CreateClientAccountScript
 * @dev Script para criar contas AA para clientes bancários
 * @notice Permite criar contas com configurações personalizadas
 */
contract CreateClientAccountScript is Script {
    // ============= CONFIGURATION =============
    struct ClientAccountConfig {
        address clientAddress;
        bytes32 bankId;
        uint256 salt;
        uint256 dailyLimit;
        uint256 weeklyLimit;
        uint256 monthlyLimit;
        uint256 transactionLimit;
        uint256 multiSigThreshold;
        bool requiresKYC;
        bool requiresAML;
        uint8 riskLevel;
    }

    function run() external {
        // Configuração do cliente
        ClientAccountConfig memory config = _getClientConfig();

        // Endereços dos contratos (configurar via variáveis de ambiente)
        address bankManagerAddr = vm.envAddress("BANK_MANAGER");
        AABankManager bankManager = AABankManager(bankManagerAddr);

        address bankAdmin = vm.envAddress("BANK_ADMIN");

        vm.startBroadcast(bankAdmin);

        console.log("Creating AA account for client...");
        console.log("Client:", config.clientAddress);
        console.log("Bank ID:", vm.toString(config.bankId));
        console.log("Salt:", config.salt);

        // Verificar se o banco existe
        AABankManager.BankInfo memory bankInfo = bankManager.getBankInfo(config.bankId);
        require(bankInfo.createdAt > 0, "Bank not found");
        console.log("Bank found:", bankInfo.name);

        // Verificar se a conta já existe
        address predictedAddress = bankManager.getAccountAddress(
            config.bankId,
            config.clientAddress,
            config.salt
        );

        if (bankManager.isValidAccount(predictedAddress)) {
            console.log("WARNING: Account already exists for this client and salt");
            console.log("Account address:", predictedAddress);
            vm.stopBroadcast();
            return;
        }

        // Criar configuração da conta
        AABankAccount.AccountConfiguration memory accountConfig = AABankAccount.AccountConfiguration({
            dailyLimit: config.dailyLimit,
            weeklyLimit: config.weeklyLimit,
            monthlyLimit: config.monthlyLimit,
            transactionLimit: config.transactionLimit,
            multiSigThreshold: config.multiSigThreshold,
            requiresKYC: config.requiresKYC,
            requiresAML: config.requiresAML,
            riskLevel: config.riskLevel
        });

        bytes memory initData = abi.encode(accountConfig);

        // Criar a conta
        address account = bankManager.createBankAccount(
            config.clientAddress,
            config.bankId,
            config.salt,
            initData
        );

        console.log("SUCCESS: Account created successfully!");
        console.log("Account address:", account);
        console.log("Owner:", config.clientAddress);
        console.log("Bank:", bankInfo.name);

        // Verificar informações da conta
        AABankManager.AccountInfo memory accountInfo = bankManager.getAccountInfo(account);
        console.log("Account status:", _statusToString(accountInfo.status));
        console.log("Created at:", accountInfo.createdAt);

        // Verificar configurações
        AABankAccount accountContract = AABankAccount(payable(account));
        (
            uint256 dailyLimit,
            uint256 weeklyLimit,
            uint256 monthlyLimit,
            uint256 transactionLimit,
            uint256 multiSigThreshold,
            bool requiresKYC,
            bool requiresAML,
            uint8 riskLevel
        ) = accountContract.config();

        console.log("\nAccount configuration:");
        console.log("- Daily limit:", dailyLimit / 1 ether, "ETH");
        console.log("- Weekly limit:", weeklyLimit / 1 ether, "ETH");
        console.log("- Monthly limit:", monthlyLimit / 1 ether, "ETH");
        console.log("- Transaction limit:", transactionLimit / 1 ether, "ETH");
        console.log("- Multi-sig threshold:", multiSigThreshold / 1 ether, "ETH");
        console.log("- Requires KYC:", requiresKYC);
        console.log("- Requires AML:", requiresAML);
        console.log("- Risk level:", riskLevel);

        vm.stopBroadcast();

        // Salvar informações para uso posterior
        _saveAccountInfo(account, config);
    }

    function _getClientConfig() internal view returns (ClientAccountConfig memory) {
        return ClientAccountConfig({
            clientAddress: vm.envAddress("CLIENT_ADDRESS"),
            bankId: keccak256("BRADESCO"),
            salt: vm.envOr("SALT", uint256(12345)),
            dailyLimit: vm.envOr("DAILY_LIMIT", uint256(10000 ether)),
            weeklyLimit: vm.envOr("WEEKLY_LIMIT", uint256(50000 ether)),
            monthlyLimit: vm.envOr("MONTHLY_LIMIT", uint256(200000 ether)),
            transactionLimit: vm.envOr("TRANSACTION_LIMIT", uint256(5000 ether)),
            multiSigThreshold: vm.envOr("MULTISIG_THRESHOLD", uint256(10000 ether)),
            requiresKYC: vm.envOr("REQUIRES_KYC", true),
            requiresAML: vm.envOr("REQUIRES_AML", true),
            riskLevel: uint8(vm.envOr("RISK_LEVEL", uint256(1)))
        });
    }

    function _statusToString(AABankManager.AccountStatus status) internal pure returns (string memory) {
        if (status == AABankManager.AccountStatus.INACTIVE) return "INACTIVE";
        if (status == AABankManager.AccountStatus.ACTIVE) return "ACTIVE";
        if (status == AABankManager.AccountStatus.FROZEN) return "FROZEN";
        if (status == AABankManager.AccountStatus.SUSPENDED) return "SUSPENDED";
        if (status == AABankManager.AccountStatus.RECOVERING) return "RECOVERING";
        if (status == AABankManager.AccountStatus.CLOSED) return "CLOSED";
        return "UNKNOWN";
    }

    function _saveAccountInfo(address account, ClientAccountConfig memory config) internal {
        console.log("\nInformation for later use:");
        console.log("export ACCOUNT_ADDRESS=", account);
        console.log("export CLIENT_ADDRESS=", config.clientAddress);
        console.log("export BANK_ID=", vm.toString(config.bankId));
        console.log("export SALT=", config.salt);
    }
}

/**
 * @title BatchCreateClientAccountsScript
 * @dev Script para criar múltiplas contas de uma vez
 */
contract BatchCreateClientAccountsScript is Script {
    struct ClientInfo {
        address clientAddress;
        uint256 salt;
        uint256 dailyLimit;
        uint256 weeklyLimit;
        uint256 monthlyLimit;
        uint256 transactionLimit;
        uint256 multiSigThreshold;
        bool requiresKYC;
        bool requiresAML;
        uint8 riskLevel;
    }

    function run() external {
        address bankManagerAddr = vm.envAddress("BANK_MANAGER");
        AABankManager bankManager = AABankManager(bankManagerAddr);

        bytes32 bankId = vm.envBytes32("BANK_ID");
        address bankAdmin = vm.envAddress("BANK_ADMIN");

        // Lista de clientes para criar (configurar via arquivo ou hardcoded)
        ClientInfo[] memory clients = _getClientsList();

        vm.startBroadcast(bankAdmin);

        console.log("Creating", clients.length, "accounts in batch...");

        for (uint256 i = 0; i < clients.length; i++) {
            ClientInfo memory client = clients[i];

            console.log("\nClient", i + 1, ":", client.clientAddress);

            // Verificar se já existe
            address predictedAddress = bankManager.getAccountAddress(
                bankId,
                client.clientAddress,
                client.salt
            );

            if (bankManager.isValidAccount(predictedAddress)) {
                console.log("WARNING: Account already exists, skipping...");
                continue;
            }

            // Criar configuração
            AABankAccount.AccountConfiguration memory accountConfig = AABankAccount.AccountConfiguration({
                dailyLimit: client.dailyLimit,
                weeklyLimit: client.weeklyLimit,
                monthlyLimit: client.monthlyLimit,
                transactionLimit: client.transactionLimit,
                multiSigThreshold: client.multiSigThreshold,
                requiresKYC: client.requiresKYC,
                requiresAML: client.requiresAML,
                riskLevel: client.riskLevel
            });

            bytes memory initData = abi.encode(accountConfig);

            // Criar conta
            address account = bankManager.createBankAccount(
                client.clientAddress,
                bankId,
                client.salt,
                initData
            );

            console.log("SUCCESS: Account created:", account);
        }

        vm.stopBroadcast();

        console.log("\nSUCCESS: Batch creation completed!");
    }

    function _getClientsList() internal pure returns (ClientInfo[] memory) {
        // Exemplo de clientes - pode ser carregado de arquivo ou configurado via env
        ClientInfo[] memory clients = new ClientInfo[](3);

        clients[0] = ClientInfo({
            clientAddress: 0x742d35Cc6634C0532925A3b8D7c9C0F4b8B8b8B8,
            salt: 1001,
            dailyLimit: 5000 ether,
            weeklyLimit: 25000 ether,
            monthlyLimit: 100000 ether,
            transactionLimit: 2500 ether,
            multiSigThreshold: 5000 ether,
            requiresKYC: true,
            requiresAML: true,
            riskLevel: 1
        });

        clients[1] = ClientInfo({
            clientAddress: 0x8A2e36e214f457b625E0CF9ABD89029a0441EF60,
            salt: 1002,
            dailyLimit: 10000 ether,
            weeklyLimit: 50000 ether,
            monthlyLimit: 200000 ether,
            transactionLimit: 5000 ether,
            multiSigThreshold: 10000 ether,
            requiresKYC: true,
            requiresAML: true,
            riskLevel: 2
        });

        clients[2] = ClientInfo({
            clientAddress: 0x9B3f47e325f568b736E0Df0bCe9Abd89029a0441,
            salt: 1003,
            dailyLimit: 20000 ether,
            weeklyLimit: 100000 ether,
            monthlyLimit: 400000 ether,
            transactionLimit: 10000 ether,
            multiSigThreshold: 20000 ether,
            requiresKYC: true,
            requiresAML: true,
            riskLevel: 3
        });

        return clients;
    }
}
