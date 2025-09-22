// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./BaseTest.sol";

/**
 * @title AABankManagerTest
 * @dev Testes abrangentes para o contrato AABankManager
 */
contract AABankManagerTest is BaseTest {
    event BankRegistered(bytes32 indexed bankId, string name, address indexed admin);
    event BankAccountCreated(
        address indexed account,
        address indexed owner,
        bytes32 indexed bankId,
        uint256 salt
    );
    event AccountStatusChanged(
        address indexed account,
        AABankManager.AccountStatus oldStatus,
        AABankManager.AccountStatus newStatus,
        bytes32 reason
    );

    function testBankRegistration() public {
        bytes32 newBankId = keccak256("BRADESCO");
        string memory bankName = "Banco Bradesco";
        address newBankAdmin = makeAddr("bradescoAdmin");

        vm.startPrank(superAdmin);

        expectEventEmitted();
        emit BankRegistered(newBankId, bankName, newBankAdmin);

        bankManager.registerBank(newBankId, bankName, newBankAdmin);

        AABankManager.BankInfo memory bankInfo = bankManager.getBankInfo(newBankId);
        assertEq(bankInfo.bankId, newBankId);
        assertEq(bankInfo.name, bankName);
        assertEq(bankInfo.admin, newBankAdmin);
        assertTrue(bankInfo.isActive);
        assertGt(bankInfo.createdAt, 0);

        vm.stopPrank();
    }

    function testBankRegistrationUnauthorized() public {
        bytes32 newBankId = keccak256("UNAUTHORIZED");

        vm.startPrank(user1);

        vm.expectRevert();
        bankManager.registerBank(newBankId, "Test Bank", user1);

        vm.stopPrank();
    }

    function testBankRegistrationDuplicate() public {
        vm.startPrank(superAdmin);

        vm.expectRevert(
            abi.encodeWithSelector(
                AABankManager.BankAlreadyRegistered.selector,
                BANK_SANTANDER
            )
        );
        bankManager.registerBank(BANK_SANTANDER, "Duplicate Bank", bankAdmin);

        vm.stopPrank();
    }

    function testSetBankStatus() public {
        vm.startPrank(superAdmin);

        bankManager.setBankStatus(BANK_SANTANDER, false);

        AABankManager.BankInfo memory bankInfo = bankManager.getBankInfo(BANK_SANTANDER);
        assertFalse(bankInfo.isActive);

        vm.stopPrank();
    }

    function testCreateBankAccount() public {
        uint256 salt = 12345;

        vm.startPrank(bankAdmin);

        expectEventEmitted();
        emit BankAccountCreated(
            bankManager.getAccountAddress(BANK_SANTANDER, user1, salt),
            user1,
            BANK_SANTANDER,
            salt
        );

        address account = createTestAccount(user1, BANK_SANTANDER, salt);

        assertTrue(bankManager.isValidAccount(account));
        assertAccountActive(account);

        AABankManager.AccountInfo memory accountInfo = bankManager.getAccountInfo(account);
        assertEq(accountInfo.account, account);
        assertEq(accountInfo.owner, user1);
        assertEq(accountInfo.bankId, BANK_SANTANDER);
        assertEq(uint8(accountInfo.status), uint8(AABankManager.AccountStatus.ACTIVE));

        vm.stopPrank();
    }

    function testCreateBankAccountForInactiveBank() public {
        vm.startPrank(superAdmin);
        bankManager.setBankStatus(BANK_SANTANDER, false);
        vm.stopPrank();

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

        vm.startPrank(bankAdmin);
        vm.expectRevert(
            abi.encodeWithSelector(
                AABankManager.BankNotActive.selector,
                BANK_SANTANDER
            )
        );
        bankManager.createBankAccount(user1, BANK_SANTANDER, 12345, initData);
        vm.stopPrank();
    }

    function testCreateBankAccountUnauthorized() public {
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

        vm.startPrank(user1);
        vm.expectRevert();
        bankManager.createBankAccount(user1, BANK_SANTANDER, 12345, initData);
        vm.stopPrank();
    }

    function testGetAccountAddress() public {
        uint256 salt = 12345;
        address predictedAddress = bankManager.getAccountAddress(BANK_SANTANDER, user1, salt);

        address actualAddress = createTestAccount(user1, BANK_SANTANDER, salt);

        assertEq(predictedAddress, actualAddress);
    }

    function testSetAccountStatus() public {
        address account = createTestAccount(user1, BANK_SANTANDER, 12345);
        bytes32 reason = "Test freeze";

        vm.startPrank(complianceOfficer);

        expectEventEmitted();
        emit AccountStatusChanged(
            account,
            AABankManager.AccountStatus.ACTIVE,
            AABankManager.AccountStatus.FROZEN,
            reason
        );

        bankManager.setAccountStatus(account, AABankManager.AccountStatus.FROZEN, reason);

        assertAccountFrozen(account);

        vm.stopPrank();
    }

    function testEmergencyFreezeAccount() public {
        address account = createTestAccount(user1, BANK_SANTANDER, 12345);
        bytes32 reason = "Emergency freeze";

        vm.startPrank(complianceOfficer);

        bankManager.emergencyFreezeAccount(account, reason);

        assertAccountFrozen(account);

        vm.stopPrank();
    }

    function testUnfreezeAccount() public {
        address account = createTestAccount(user1, BANK_SANTANDER, 12345);
        bytes32 freezeReason = "Test freeze";
        bytes32 unfreezeReason = "Test unfreeze";

        vm.startPrank(complianceOfficer);

        // Primeiro congela
        bankManager.emergencyFreezeAccount(account, freezeReason);
        assertAccountFrozen(account);

        // Depois descongela
        bankManager.unfreezeAccount(account, unfreezeReason);
        assertAccountActive(account);

        vm.stopPrank();
    }

    function testUnfreezeNonFrozenAccount() public {
        address account = createTestAccount(user1, BANK_SANTANDER, 12345);

        vm.startPrank(complianceOfficer);

        vm.expectRevert(
            abi.encodeWithSelector(
                AABankManager.InvalidAccountStatus.selector,
                AABankManager.AccountStatus.ACTIVE,
                AABankManager.AccountStatus.FROZEN
            )
        );
        bankManager.unfreezeAccount(account, "Invalid unfreeze");

        vm.stopPrank();
    }

    function testUpdateGlobalLimits() public {
        AABankManager.GlobalLimits memory newLimits = AABankManager.GlobalLimits({
            dailyLimit: 20000 ether,
            weeklyLimit: 100000 ether,
            monthlyLimit: 400000 ether,
            transactionLimit: 10000 ether,
            multiSigThreshold: 20000 ether
        });

        vm.startPrank(riskManager);

        bankManager.updateGlobalLimits(newLimits);

        (
            uint256 dailyLimit,
            uint256 weeklyLimit,
            uint256 monthlyLimit,
            uint256 transactionLimit,
            uint256 multiSigThreshold
        ) = bankManager.globalLimits();
        assertEq(dailyLimit, newLimits.dailyLimit);
        assertEq(weeklyLimit, newLimits.weeklyLimit);
        assertEq(monthlyLimit, newLimits.monthlyLimit);
        assertEq(transactionLimit, newLimits.transactionLimit);
        assertEq(multiSigThreshold, newLimits.multiSigThreshold);

        vm.stopPrank();
    }

    function testUpdateGlobalLimitsInvalid() public {
        AABankManager.GlobalLimits memory invalidLimits = AABankManager.GlobalLimits({
            dailyLimit: 0, // Invalid
            weeklyLimit: 100000 ether,
            monthlyLimit: 400000 ether,
            transactionLimit: 10000 ether,
            multiSigThreshold: 20000 ether
        });

        vm.startPrank(riskManager);

        vm.expectRevert(
            abi.encodeWithSelector(AABankManager.InvalidLimits.selector)
        );
        bankManager.updateGlobalLimits(invalidLimits);

        vm.stopPrank();
    }

    function testLogAccountActivity() public {
        address account = createTestAccount(user1, BANK_SANTANDER, 12345);
        bytes32 activityType = "TEST_ACTIVITY";
        bytes memory data = abi.encode("test", "data");

        vm.startPrank(account);

        bankManager.logAccountActivity(account, activityType, data);

        // Verifica se a atividade foi registrada (último tempo de atividade atualizado)
        AABankManager.AccountInfo memory accountInfo = bankManager.getAccountInfo(account);
        assertEq(accountInfo.lastActivity, block.timestamp);

        vm.stopPrank();
    }

    function testLogAccountActivityUnauthorized() public {
        address account = createTestAccount(user1, BANK_SANTANDER, 12345);
        bytes32 activityType = "TEST_ACTIVITY";
        bytes memory data = abi.encode("test", "data");

        vm.startPrank(user2); // Usuário diferente tentando logar

        vm.expectRevert(
            abi.encodeWithSelector(
                AABankManager.UnauthorizedAccess.selector,
                user2,
                bytes32("ACCOUNT_ONLY")
            )
        );
        bankManager.logAccountActivity(account, activityType, data);

        vm.stopPrank();
    }

    function testGetBankAccounts() public {
        // Cria várias contas para o mesmo banco
        address account1 = createTestAccount(user1, BANK_SANTANDER, 1);
        address account2 = createTestAccount(user2, BANK_SANTANDER, 2);
        address account3 = createTestAccount(user3, BANK_SANTANDER, 3);

        address[] memory accounts = bankManager.getBankAccounts(BANK_SANTANDER);

        assertEq(accounts.length, 3);
        assertEq(accounts[0], account1);
        assertEq(accounts[1], account2);
        assertEq(accounts[2], account3);
    }

    function testGetSystemStats() public {
        // Cria algumas contas
        createTestAccount(user1, BANK_SANTANDER, 1);
        createTestAccount(user2, BANK_ITAU, 2);
        address account3 = createTestAccount(user3, BANK_CAIXA, 3);

        // Congela uma conta
        vm.startPrank(complianceOfficer);
        bankManager.setAccountStatus(account3, AABankManager.AccountStatus.FROZEN, "Test");
        vm.stopPrank();

        (
            uint256 totalBanks,
            uint256 totalAccounts,
            uint256 activeAccounts,
            uint256 frozenAccounts
        ) = bankManager.getSystemStats();

        assertEq(totalBanks, 3); // SANTANDER, ITAU, CAIXA
        assertEq(totalAccounts, 3);
        assertEq(activeAccounts, 2);
        assertEq(frozenAccounts, 1);
    }

    function testEmergencyPause() public {
        vm.startPrank(superAdmin);

        bankManager.emergencyPause();

        assertTrue(bankManager.paused());

        // Tenta criar conta com o sistema pausado
        vm.expectRevert(abi.encodeWithSignature("EnforcedPause()"));
        createTestAccount(user1, BANK_SANTANDER, 99999);

        vm.stopPrank();
    }

    function testUnpause() public {
        vm.startPrank(superAdmin);

        bankManager.emergencyPause();
        assertTrue(bankManager.paused());

        bankManager.unpause();
        assertFalse(bankManager.paused());

        // Agora deve conseguir criar conta
        address account = createTestAccount(user1, BANK_SANTANDER, 99999);
        assertTrue(bankManager.isValidAccount(account));

        vm.stopPrank();
    }

    function testAccountCounters() public {
        (,uint256 initialTotal, uint256 initialActive,) = bankManager.getSystemStats();

        // Cria uma conta
        address account = createTestAccount(user1, BANK_SANTANDER, 1);

        (,uint256 afterCreateTotal, uint256 afterCreateActive,) = bankManager.getSystemStats();
        assertEq(afterCreateTotal, initialTotal + 1);
        assertEq(afterCreateActive, initialActive + 1);

        // Congela a conta
        vm.startPrank(complianceOfficer);
        bankManager.setAccountStatus(account, AABankManager.AccountStatus.FROZEN, "Test");
        vm.stopPrank();

        (,uint256 afterFreezeTotal, uint256 afterFreezeActive,) = bankManager.getSystemStats();
        assertEq(afterFreezeTotal, afterCreateTotal); // Total não muda
        assertEq(afterFreezeActive, afterCreateActive - 1); // Ativa diminui

        // Descongela a conta
        vm.startPrank(complianceOfficer);
        bankManager.setAccountStatus(account, AABankManager.AccountStatus.ACTIVE, "Test");
        vm.stopPrank();

        (,uint256 afterUnfreezeTotal, uint256 afterUnfreezeActive,) = bankManager.getSystemStats();
        assertEq(afterUnfreezeTotal, afterFreezeTotal); // Total não muda
        assertEq(afterUnfreezeActive, afterFreezeActive + 1); // Ativa aumenta
    }

    function testMultipleAccountsForSameUser() public {
        // Um usuário pode ter múltiplas contas em bancos diferentes
        address account1 = createTestAccount(user1, BANK_SANTANDER, 1);
        address account2 = createTestAccount(user1, BANK_ITAU, 2);
        address account3 = createTestAccount(user1, BANK_CAIXA, 3);

        assertTrue(bankManager.isValidAccount(account1));
        assertTrue(bankManager.isValidAccount(account2));
        assertTrue(bankManager.isValidAccount(account3));

        // Verifica se cada conta pertence ao banco correto
        AABankManager.AccountInfo memory info1 = bankManager.getAccountInfo(account1);
        AABankManager.AccountInfo memory info2 = bankManager.getAccountInfo(account2);
        AABankManager.AccountInfo memory info3 = bankManager.getAccountInfo(account3);

        assertEq(info1.bankId, BANK_SANTANDER);
        assertEq(info2.bankId, BANK_ITAU);
        assertEq(info3.bankId, BANK_CAIXA);

        // Todos devem ter o mesmo owner
        assertEq(info1.owner, user1);
        assertEq(info2.owner, user1);
        assertEq(info3.owner, user1);
    }

    function testZeroAddressValidation() public {
        vm.startPrank(superAdmin);

        vm.expectRevert(abi.encodeWithSelector(AABankManager.ZeroAddress.selector));
        bankManager.registerBank(keccak256("TEST"), "Test Bank", address(0));

        vm.stopPrank();

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

        vm.startPrank(bankAdmin);
        vm.expectRevert(abi.encodeWithSelector(AABankManager.ZeroAddress.selector));
        bankManager.createBankAccount(address(0), BANK_SANTANDER, 1, initData);
        vm.stopPrank();
    }

    function testInvalidBankId() public {
        vm.startPrank(superAdmin);

        vm.expectRevert(abi.encodeWithSelector(AABankManager.InvalidBankId.selector));
        bankManager.registerBank(bytes32(0), "Test Bank", bankAdmin);

        vm.stopPrank();
    }
}