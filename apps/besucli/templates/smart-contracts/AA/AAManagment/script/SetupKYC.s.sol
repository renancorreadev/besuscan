// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "../src/KYCAMLValidator.sol";
import "../src/interfaces/IKYCAMLValidator.sol";

/**
 * @title SetupKYCScript
 * @dev Script para configurar KYC/AML para clientes
 * @notice Gerencia validacao de identidade e anti-lavagem de dinheiro
 */
contract SetupKYCScript is Script {
    // ============= CONFIGURATION =============
    struct KYCConfig {
        address clientAddress;
        IKYCAMLValidator.KYCStatus status;
        uint256 expiresAt;
        bytes32 documentHash;
        IKYCAMLValidator.RiskLevel riskLevel;
        bytes32[] sanctionLists;
        address[] sanctionedAddresses;
    }

    function run() external {
        KYCConfig memory config = _getKYCConfig();

        address kycValidatorAddr = vm.envAddress("KYC_VALIDATOR");
        KYCAMLValidator kycValidator = KYCAMLValidator(kycValidatorAddr);

        address complianceOfficer = vm.envAddress("COMPLIANCE_OFFICER");

        vm.startBroadcast(complianceOfficer);

        console.log("Configuring KYC/AML for client...");
        console.log("Client:", config.clientAddress);
        console.log("KYC Status:", _kycStatusToString(config.status));
        console.log("Risk Level:", _riskLevelToString(config.riskLevel));

        // 1. Configurar status KYC
        console.log("\nConfiguring KYC status...");
        kycValidator.updateKYCStatus(
            config.clientAddress,
            config.status,
            config.expiresAt,
            config.documentHash
        );

        // Verificar se foi aplicado
        IKYCAMLValidator.KYCData memory kycData = kycValidator.getKYCData(config.clientAddress);
        console.log("SUCCESS: KYC configured:");
        console.log("- Status:", _kycStatusToString(kycData.status));
        console.log("- Verified at:", kycData.verifiedAt);
        console.log("- Expires at:", kycData.expiresAt);
        console.log("- Document hash:", vm.toString(kycData.documentHash));

        // 2. Configurar nivel de risco
        console.log("\nConfiguring risk level...");
        bytes32 reason = "Initial client configuration";
        kycValidator.updateRiskLevel(config.clientAddress, config.riskLevel, reason);

        IKYCAMLValidator.RiskLevel currentRisk = kycValidator.getRiskLevel(config.clientAddress);
        console.log("SUCCESS: Risk level configured:", _riskLevelToString(currentRisk));

        // 3. Configurar listas de sancao (se especificadas)
        if (config.sanctionLists.length > 0) {
            console.log("\nConfiguring sanction lists...");
            for (uint256 i = 0; i < config.sanctionLists.length; i++) {
                bytes32 listId = config.sanctionLists[i];
                address[] memory addresses = new address[](1);
                addresses[0] = config.sanctionedAddresses[i];

                kycValidator.addToSanctionList(listId, addresses);
                console.log("SUCCESS: Sanction list added:", vm.toString(listId));
            }
        }

        // 4. Verificar validacao KYC
        console.log("\nVerifying KYC validation...");
        bool isKYCValid = kycValidator.isKYCValid(config.clientAddress);
        bool validateKYC = kycValidator.validateKYC(config.clientAddress);

        console.log("SUCCESS: KYC validation:");
        console.log("- isKYCValid:", isKYCValid);
        console.log("- validateKYC:", validateKYC);

        // 5. Testar validacao AML
        console.log("\nTesting AML validation...");
        address testTarget = makeAddr("testTarget");
        uint256 testValue = 1000 ether;
        bytes memory testData = "";

        bool amlValid = kycValidator.validateAML(testTarget, testValue, testData);
        console.log("SUCCESS: AML validation (test):", amlValid);

        // 6. Realizar verificacao AML completa
        console.log("\nPerforming complete AML verification...");
        IKYCAMLValidator.AMLCheckResult memory amlResult = kycValidator.performAMLCheck(
            config.clientAddress,
            testTarget,
            testValue,
            testData
        );

        console.log("SUCCESS: AML result:");
        console.log("- Passed:", amlResult.passed);
        console.log("- Risk level:", _riskLevelToString(amlResult.riskLevel));
        console.log("- Score:", amlResult.score);
        console.log("- Checked at:", amlResult.checkedAt);
        console.log("- Flags:", amlResult.flags.length);

        vm.stopBroadcast();

        // Salvar informacoes
        _saveKYCInfo(config.clientAddress, kycData, currentRisk);
    }

    function _getKYCConfig() internal view returns (KYCConfig memory) {
        return KYCConfig({
            clientAddress: vm.envAddress("CLIENT_ADDRESS"),
            status: IKYCAMLValidator.KYCStatus(vm.envOr("KYC_STATUS", uint8(1))), // VERIFIED = 1
            expiresAt: vm.envOr("KYC_EXPIRES_AT", block.timestamp + 365 days),
            documentHash: vm.envOr("DOCUMENT_HASH", keccak256("test_document_hash")),
            riskLevel: IKYCAMLValidator.RiskLevel(vm.envOr("RISK_LEVEL", uint8(1))), // MEDIUM = 1
            sanctionLists: _getSanctionLists(),
            sanctionedAddresses: _getSanctionedAddresses()
        });
    }

    function _getSanctionLists() internal pure returns (bytes32[] memory) {
        bytes32[] memory lists = new bytes32[](2);
        lists[0] = keccak256("OFAC_LIST");
        lists[1] = keccak256("EU_SANCTIONS");
        return lists;
    }

    function _getSanctionedAddresses() internal pure returns (address[] memory) {
        address[] memory addresses = new address[](2);
        addresses[0] = makeAddr("sanctioned1");
        addresses[1] = makeAddr("sanctioned2");
        return addresses;
    }

    function _kycStatusToString(IKYCAMLValidator.KYCStatus status) internal pure returns (string memory) {
        if (status == IKYCAMLValidator.KYCStatus.NOT_VERIFIED) return "NOT_VERIFIED";
        if (status == IKYCAMLValidator.KYCStatus.VERIFIED) return "VERIFIED";
        if (status == IKYCAMLValidator.KYCStatus.REJECTED) return "REJECTED";
        if (status == IKYCAMLValidator.KYCStatus.EXPIRED) return "EXPIRED";
        return "UNKNOWN";
    }

    function _riskLevelToString(IKYCAMLValidator.RiskLevel level) internal pure returns (string memory) {
        if (level == IKYCAMLValidator.RiskLevel.LOW) return "LOW";
        if (level == IKYCAMLValidator.RiskLevel.MEDIUM) return "MEDIUM";
        if (level == IKYCAMLValidator.RiskLevel.HIGH) return "HIGH";
        if (level == IKYCAMLValidator.RiskLevel.CRITICAL) return "CRITICAL";
        return "UNKNOWN";
    }

    function _saveKYCInfo(
        address client,
        IKYCAMLValidator.KYCData memory kycData,
        IKYCAMLValidator.RiskLevel riskLevel
    ) internal {
        console.log("\nKYC information saved:");
        console.log("export CLIENT_ADDRESS=", client);
        console.log("export KYC_STATUS=", uint8(kycData.status));
        console.log("export RISK_LEVEL=", uint8(riskLevel));
        console.log("export KYC_EXPIRES_AT=", kycData.expiresAt);
    }
}

/**
 * @title BatchSetupKYCScript
 * @dev Script para configurar KYC/AML para multiplos clientes
 */
contract BatchSetupKYCScript is Script {
    struct ClientKYCInfo {
        address clientAddress;
        IKYCAMLValidator.KYCStatus status;
        uint256 expiresAt;
        bytes32 documentHash;
        IKYCAMLValidator.RiskLevel riskLevel;
    }

    function run() external {
        address kycValidatorAddr = vm.envAddress("KYC_VALIDATOR");
        KYCAMLValidator kycValidator = KYCAMLValidator(kycValidatorAddr);

        address complianceOfficer = vm.envAddress("COMPLIANCE_OFFICER");

        ClientKYCInfo[] memory clients = _getClientsList();

        vm.startBroadcast(complianceOfficer);

        console.log("Configuring KYC/AML for", clients.length, "clients...");

        for (uint256 i = 0; i < clients.length; i++) {
            ClientKYCInfo memory client = clients[i];

            console.log("\nClient", i + 1, ":", client.clientAddress);

            // Configurar KYC
            kycValidator.updateKYCStatus(
                client.clientAddress,
                client.status,
                client.expiresAt,
                client.documentHash
            );

            // Configurar nivel de risco
            bytes32 reason = "Batch configuration";
            kycValidator.updateRiskLevel(client.clientAddress, client.riskLevel, reason);

            // Verificar
            bool isKYCValid = kycValidator.isKYCValid(client.clientAddress);
            IKYCAMLValidator.RiskLevel currentRisk = kycValidator.getRiskLevel(client.clientAddress);

            console.log("SUCCESS: KYC:", isKYCValid, "| Risk:", _riskLevelToString(currentRisk));
        }

        vm.stopBroadcast();

        console.log("\nSUCCESS: Batch KYC configuration completed!");
    }

    function _getClientsList() internal pure returns (ClientKYCInfo[] memory) {
        ClientKYCInfo[] memory clients = new ClientKYCInfo[](3);

        clients[0] = ClientKYCInfo({
            clientAddress: 0x742d35Cc6634C0532925A3b8D7c9C0F4b8B8b8B8,
            status: IKYCAMLValidator.KYCStatus.VERIFIED,
            expiresAt: block.timestamp + 365 days,
            documentHash: keccak256("client1_document"),
            riskLevel: IKYCAMLValidator.RiskLevel.LOW
        });

        clients[1] = ClientKYCInfo({
            clientAddress: 0x8A2e36e214f457b625E0CF9ABD89029a0441EF60,
            status: IKYCAMLValidator.KYCStatus.VERIFIED,
            expiresAt: block.timestamp + 365 days,
            documentHash: keccak256("client2_document"),
            riskLevel: IKYCAMLValidator.RiskLevel.MEDIUM
        });

        clients[2] = ClientKYCInfo({
            clientAddress: 0x9B3f47e325f568b736E0Df0bCe9Abd89029a0441,
            status: IKYCAMLValidator.KYCStatus.VERIFIED,
            expiresAt: block.timestamp + 365 days,
            documentHash: keccak256("client3_document"),
            riskLevel: IKYCAMLValidator.RiskLevel.HIGH
        });

        return clients;
    }

    function _riskLevelToString(IKYCAMLValidator.RiskLevel level) internal pure returns (string memory) {
        if (level == IKYCAMLValidator.RiskLevel.LOW) return "LOW";
        if (level == IKYCAMLValidator.RiskLevel.MEDIUM) return "MEDIUM";
        if (level == IKYCAMLValidator.RiskLevel.HIGH) return "HIGH";
        if (level == IKYCAMLValidator.RiskLevel.CRITICAL) return "CRITICAL";
        return "UNKNOWN";
    }
}

/**
 * @title ManageSanctionListsScript
 * @dev Script para gerenciar listas de sancao
 */
contract ManageSanctionListsScript is Script {
    function run() external {
        address kycValidatorAddr = vm.envAddress("KYC_VALIDATOR");
        KYCAMLValidator kycValidator = KYCAMLValidator(kycValidatorAddr);

        address complianceOfficer = vm.envAddress("COMPLIANCE_OFFICER");

        vm.startBroadcast(complianceOfficer);

        console.log("Managing sanction lists...");

        // Adicionar enderecos a lista OFAC
        bytes32 ofacListId = keccak256("OFAC_LIST");
        address[] memory ofacAddresses = new address[](3);
        ofacAddresses[0] = makeAddr("ofac1");
        ofacAddresses[1] = makeAddr("ofac2");
        ofacAddresses[2] = makeAddr("ofac3");

        kycValidator.addToSanctionList(ofacListId, ofacAddresses);
        console.log("SUCCESS: OFAC list updated with", ofacAddresses.length, "addresses");

        // Adicionar enderecos a lista EU
        bytes32 euListId = keccak256("EU_SANCTIONS");
        address[] memory euAddresses = new address[](2);
        euAddresses[0] = makeAddr("eu1");
        euAddresses[1] = makeAddr("eu2");

        kycValidator.addToSanctionList(euListId, euAddresses);
        console.log("SUCCESS: EU list updated with", euAddresses.length, "addresses");

        // Testar verificacao de sancao
        console.log("\nTesting sanction verification...");
        bool isSanctioned1 = kycValidator.isSanctioned(ofacAddresses[0]);
        bool isSanctioned2 = kycValidator.isSanctioned(euAddresses[0]);
        bool isSanctioned3 = kycValidator.isSanctioned(makeAddr("clean_address"));

        console.log("SUCCESS: Sanction verification:");
        console.log("- OFAC address 1:", isSanctioned1);
        console.log("- EU address 1:", isSanctioned2);
        console.log("- Clean address:", isSanctioned3);

        vm.stopBroadcast();

        console.log("\nSUCCESS: Sanction list management completed!");
    }
}
