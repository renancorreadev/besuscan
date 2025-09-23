// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {ChippedReceivablesTracker} from "../src/ChippedReceivablesTracker.sol";

/**
 * @title Deploy Script for ChippedReceivablesTracker
 * @dev Deployment script for the Chipped Receivables Protocol
 * @author Renan Correa
 */
contract DeployScript is Script {
    ChippedReceivablesTracker public tracker;

    // Default URI for metadata
    string public constant DEFAULT_URI = "https://api.example.com/metadata/{id}.json";

    function setUp() public {}

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("Deploying ChippedReceivablesTracker with deployer:", deployer);


        vm.startBroadcast(deployerPrivateKey);

        // Deploy the contract
        tracker = new ChippedReceivablesTracker(DEFAULT_URI);

        console.log("ChippedReceivablesTracker deployed at:", address(tracker));
        console.log("Contract URI:", DEFAULT_URI);

        // Verify the deployment
        console.log("DEFAULT_ADMIN_ROLE:", vm.toString(tracker.DEFAULT_ADMIN_ROLE()));
        console.log("ISSUER_ROLE:", vm.toString(tracker.ISSUER_ROLE()));
        console.log("VALIDATOR_ROLE:", vm.toString(tracker.VALIDATOR_ROLE()));
        console.log("AUDITOR_ROLE:", vm.toString(tracker.AUDITOR_ROLE()));
        console.log("PAUSER_ROLE:", vm.toString(tracker.PAUSER_ROLE()));

        // Check if deployer has admin role
        bool hasAdminRole = tracker.hasRole(tracker.DEFAULT_ADMIN_ROLE(), deployer);
        console.log("Deployer has admin role:", hasAdminRole);

        vm.stopBroadcast();

        // Log deployment info
        console.log("=== DEPLOYMENT SUCCESSFUL ===");
        console.log("Contract Address:", address(tracker));
        console.log("Chain ID:", block.chainid);
        console.log("Block Number:", block.number);
        console.log("Timestamp:", block.timestamp);
    }
}
