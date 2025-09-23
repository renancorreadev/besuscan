// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {ChippedReceivablesTracker} from "../src/ChippedReceivablesTracker.sol";

/**
 * @title Interaction Script for ChippedReceivablesTracker
 * @dev Script to demonstrate protocol usage and interactions
 * @author Renan Correa
 */
contract InteractScript is Script {
    ChippedReceivablesTracker public tracker;

    function setUp() public {}

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address contractAddress = vm.envAddress("CONTRACT_ADDRESS");

        console.log("Interacting with ChippedReceivablesTracker at:", contractAddress);

        vm.startBroadcast(deployerPrivateKey);

        tracker = ChippedReceivablesTracker(contractAddress);

        // Demonstrate protocol usage
        _demonstrateTokenization();
        _demonstrateValidation();
        _demonstrateQueries();

        vm.stopBroadcast();

        console.log("Interaction completed successfully!");
    }

    function _demonstrateTokenization() internal {
        console.log("\n=== Tokenizing a Receivable ===");

        // Create sample tokenization parameters
        ChippedReceivablesTracker.TokenizeParams memory params = ChippedReceivablesTracker.TokenizeParams({
            documentNumber: "NFE-12345-2024",
            documentType: ChippedReceivablesTracker.DocumentType.NFE,
            issuerName: "ACME Corp Ltda",
            issuerCNPJ: "12.345.678/0001-90",
            payerName: "Cliente Exemplo Ltda",
            payerCNPJ: "98.765.432/0001-10",
            originalValue: 50000, // R$ 500,00 (in cents)
            dueDate: block.timestamp + 30 days,
            ipfsHash: "QmYjtig7VJQ6XsnUjqqJvj7QaMcCAwtrgNdahSiFofrE7o",
            documentHash: keccak256("sample_document_content"),
            description: "Venda de produtos - NFE 12345"
        });

        try tracker.tokenizeReceivable(params) returns (uint256 tokenId) {
            console.log("Receivable tokenized successfully!");
            console.log("Token ID:", tokenId);
            console.log("Document Number:", params.documentNumber);
            console.log("Original Value:", params.originalValue);
            console.log("Due Date:", params.dueDate);
        } catch Error(string memory reason) {
            console.log(" Tokenization failed:", reason);
        }
    }

    function _demonstrateValidation() internal {
        console.log("\n=== Validating a Receivable ===");

        // Get the first token (assuming it exists)
        uint256 tokenId = 1;

        try tracker.validateReceivable(
            tokenId,
            true, // isValid
            "Document verified successfully",
            0 // no value adjustment
        ) {
            console.log("Receivable validated successfully!");
            console.log("Token ID:", tokenId);
        } catch Error(string memory reason) {
            console.log(" Validation failed:", reason);
        }

        // Try to activate the receivable
        try tracker.activateReceivable(
            tokenId,
            "Receivable activated for payment monitoring"
        ) {
            console.log("Receivable activated successfully!");
        } catch Error(string memory reason) {
            console.log(" Activation failed:", reason);
        }
    }

    function _demonstrateQueries() internal {
        console.log("\n=== Querying Protocol Data ===");

        // Get protocol statistics
        try tracker.getProtocolStats() returns (ChippedReceivablesTracker.ProtocolStats memory stats) {
            console.log("Protocol Stats:");
            console.log("Total Receivables:", stats.totalReceivables);
            console.log("Total Value:", stats.totalValue);
            console.log("Created Count:", stats.createdCount);
            console.log("Validated Count:", stats.validatedCount);
            console.log("Active Count:", stats.activeCount);
            console.log("Paid Count:", stats.paidCount);
            console.log("Overdue Count:", stats.overdueCount);
            console.log("Cancelled Count:", stats.cancelledCount);
        } catch Error(string memory reason) {
            console.log(" Failed to get protocol stats:", reason);
        }

        // Check if document exists
        try tracker.isDocumentTokenized("NFE-12345-2024") returns (bool exists, uint256 tokenId) {
            if (exists) {
                console.log("Document NFE-12345-2024 is tokenized as Token ID:", tokenId);
            } else {
                console.log(" Document NFE-12345-2024 is not tokenized");
            }
        } catch Error(string memory reason) {
            console.log(" Failed to check document:", reason);
        }

        // Get issuer receivables
        address deployer = msg.sender;
        try tracker.getIssuerReceivables(deployer) returns (uint256[] memory tokenIds) {
            console.log("Issuer has", tokenIds.length, "receivables");
            for (uint256 i = 0; i < tokenIds.length && i < 5; i++) {
                console.log("Token ID:", tokenIds[i]);
            }
        } catch Error(string memory reason) {
            console.log(" Failed to get issuer receivables:", reason);
        }
    }

    function getReceivableDetails(uint256 tokenId) external view {
        try tracker.getReceivableDetails(tokenId) returns (ChippedReceivablesTracker.ReceivableDocument memory doc) {
            console.log("\n=== Receivable Details ===");
            console.log("Token ID:", doc.tokenId);
            console.log("Document Number:", doc.documentNumber);
            console.log("Issuer:", doc.issuer);
            console.log("Payer CNPJ:", doc.payerCNPJ);
            console.log("Original Value:", doc.originalValue);
            console.log("Current Value:", doc.currentValue);
            console.log("Due Date:", doc.dueDate);
            console.log("Is Validated:", doc.isValidated);
            console.log("Status:", uint8(doc.status));
        } catch Error(string memory reason) {
            console.log(" Failed to get receivable details:", reason);
        }
    }
}
