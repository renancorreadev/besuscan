// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {ChippedReceivablesTracker} from "../src/ChippedReceivablesTracker.sol";

/**
 * @title Configuration Script for ChippedReceivablesTracker
 * @dev Script to configure roles and permissions for the protocol
 * @author Renan Correa
 */
contract ConfigureScript is Script {
    ChippedReceivablesTracker public tracker;

    function setUp() public {}

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address contractAddress = vm.envAddress("CONTRACT_ADDRESS");

        console.log("Configuring ChippedReceivablesTracker at:", contractAddress);

        vm.startBroadcast(deployerPrivateKey);

        tracker = ChippedReceivablesTracker(contractAddress);

        // Configure additional addresses with roles
        _setupRoles();

        vm.stopBroadcast();

        console.log("Configuration completed successfully!");
    }

    function _setupRoles() internal {
        address deployer = msg.sender;

        // Example addresses - replace with actual addresses
        address issuer1 = vm.envOr("ISSUER_1", address(0));
        address validator1 = vm.envOr("VALIDATOR_1", address(0));
        address auditor1 = vm.envOr("AUDITOR_1", address(0));

        console.log("Setting up roles...");

        // Grant ISSUER_ROLE to issuer1 if address is provided
        if (issuer1 != address(0)) {
            tracker.grantRole(tracker.ISSUER_ROLE(), issuer1);
            console.log("Granted ISSUER_ROLE to:", issuer1);
        }

        // Grant VALIDATOR_ROLE to validator1 if address is provided
        if (validator1 != address(0)) {
            tracker.grantRole(tracker.VALIDATOR_ROLE(), validator1);
            console.log("Granted VALIDATOR_ROLE to:", validator1);
        }

        // Grant AUDITOR_ROLE to auditor1 if address is provided
        if (auditor1 != address(0)) {
            tracker.grantRole(tracker.AUDITOR_ROLE(), auditor1);
            console.log("Granted AUDITOR_ROLE to:", auditor1);
        }

        // Deployer gets all roles by default, but let's ensure issuer role
        if (!tracker.hasRole(tracker.ISSUER_ROLE(), deployer)) {
            tracker.grantRole(tracker.ISSUER_ROLE(), deployer);
            console.log("Granted ISSUER_ROLE to deployer:", deployer);
        }

        console.log("Role setup completed!");
    }

    function checkRoles() external view {
        address deployer = msg.sender;

        console.log("=== Role Check ===");
        console.log("Contract address:", address(tracker));
        console.log("Deployer address:", deployer);

        console.log("Has DEFAULT_ADMIN_ROLE:", tracker.hasRole(tracker.DEFAULT_ADMIN_ROLE(), deployer));
        console.log("Has ISSUER_ROLE:", tracker.hasRole(tracker.ISSUER_ROLE(), deployer));
        console.log("Has VALIDATOR_ROLE:", tracker.hasRole(tracker.VALIDATOR_ROLE(), deployer));
        console.log("Has AUDITOR_ROLE:", tracker.hasRole(tracker.AUDITOR_ROLE(), deployer));
        console.log("Has PAUSER_ROLE:", tracker.hasRole(tracker.PAUSER_ROLE(), deployer));
    }
}
