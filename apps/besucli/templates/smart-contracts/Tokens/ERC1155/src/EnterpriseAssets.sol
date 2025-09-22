// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ERC1155Supply} from "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import {ERC1155URIStorage} from "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155URIStorage.sol";

/**
 * @title EnterpriseAssets
 * @dev ERC1155 contract for managing enterprise digital assets and resources
 * @notice This contract manages various types of enterprise assets like licenses, credits, resources, etc.
 */
contract EnterpriseAssets is ERC1155, ERC1155Supply, ERC1155URIStorage, AccessControl {

    // Asset Type Constants - Enterprise Resources
    uint256 public constant SOFTWARE_LICENSE = 0;      // Software licenses (Office, Adobe, etc.)
    uint256 public constant CLOUD_CREDITS = 1;         // Cloud computing credits (AWS, Azure, GCP)
    uint256 public constant TRAINING_VOUCHER = 2;      // Employee training vouchers
    uint256 public constant MEETING_ROOM_HOUR = 3;     // Meeting room booking hours
    uint256 public constant EQUIPMENT_VOUCHER = 4;     // Equipment purchase vouchers
    uint256 public constant TRAVEL_BUDGET = 5;         // Travel budget allocation
    uint256 public constant MARKETING_BUDGET = 6;      // Marketing campaign budget
    uint256 public constant RESEARCH_GRANT = 7;        // R&D research grants

    // Roles
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant ASSET_MANAGER_ROLE = keccak256("ASSET_MANAGER_ROLE");
    bytes32 public constant DEPARTMENT_HEAD_ROLE = keccak256("DEPARTMENT_HEAD_ROLE");
    bytes32 public constant EMPLOYEE_ROLE = keccak256("EMPLOYEE_ROLE");

    // Asset metadata structure
    struct AssetInfo {
        string name;
        string description;
        uint256 unitValue;        // Value in wei or points
        uint256 maxSupply;        // Maximum mintable supply
        bool transferable;        // Whether asset can be transferred between users
        bool active;             // Whether asset is currently active
        uint256 expirationTime;  // Expiration timestamp (0 = no expiration)
        string department;       // Department responsible for this asset
    }

    // Mappings
    mapping(uint256 => AssetInfo) public assetInfo;
    mapping(uint256 => mapping(address => uint256)) public userSpentAmount;
    mapping(address => string) public userDepartments;

    // Custom Errors
    error InvalidAssetType(uint256 assetType);
    error InsufficientBalance(address user, uint256 assetType, uint256 requested, uint256 available);
    error AssetNotTransferable(uint256 assetType);
    error AssetExpired(uint256 assetType, uint256 expiration);
    error AssetInactive(uint256 assetType);
    error ExceedsMaxSupply(uint256 assetType, uint256 requested, uint256 maxSupply);
    error InvalidAmount(uint256 amount);
    error InvalidAddress(address addr);
    error UnauthorizedDepartment(string userDept, string assetDept);
    error AssetAlreadyExists(uint256 assetType);
    error InvalidExpirationTime(uint256 expiration);

    // Events
    event AssetCreated(
        uint256 indexed assetType,
        string name,
        uint256 maxSupply,
        string indexed department
    );
    event AssetSpent(
        address indexed user,
        uint256 indexed assetType,
        uint256 amount,
        string purpose
    );
    event AssetAllocated(
        address indexed recipient,
        uint256 indexed assetType,
        uint256 amount,
        address indexed allocatedBy
    );
    event AssetReclaimed(
        address indexed from,
        uint256 indexed assetType,
        uint256 amount,
        address indexed reclaimedBy
    );
    event AssetStatusChanged(uint256 indexed assetType, bool active);
    event DepartmentAssigned(address indexed user, string department);
    event AssetExpiredNotification(uint256 indexed assetType, uint256 expiration);

    constructor(address initialAdmin) ERC1155("https://enterprise.company.com/api/asset/{id}.json") {
        if (initialAdmin == address(0)) revert InvalidAddress(initialAdmin);

        _grantRole(DEFAULT_ADMIN_ROLE, initialAdmin);
        _grantRole(ADMIN_ROLE, initialAdmin);

        // Initialize default enterprise assets
        _initializeDefaultAssets();
    }

    /**
     * @dev Initialize default enterprise asset types
     */
    function _initializeDefaultAssets() private {
        _createAssetType(SOFTWARE_LICENSE, "Software License", "Corporate software licenses", 1000 ether, 10000, true, 0, "IT");
        _createAssetType(CLOUD_CREDITS, "Cloud Credits", "Cloud computing credits", 1 ether, type(uint256).max, false, 0, "IT");
        _createAssetType(TRAINING_VOUCHER, "Training Voucher", "Employee training vouchers", 500 ether, 1000, true, 365 days, "HR");
        _createAssetType(MEETING_ROOM_HOUR, "Meeting Room Hour", "Conference room booking hours", 50 ether, 10000, true, 30 days, "Operations");
        _createAssetType(EQUIPMENT_VOUCHER, "Equipment Voucher", "Equipment purchase vouchers", 2000 ether, 500, false, 180 days, "Procurement");
        _createAssetType(TRAVEL_BUDGET, "Travel Budget", "Business travel budget allocation", 1 ether, type(uint256).max, false, 0, "Finance");
        _createAssetType(MARKETING_BUDGET, "Marketing Budget", "Marketing campaign budget", 1 ether, type(uint256).max, false, 0, "Marketing");
        _createAssetType(RESEARCH_GRANT, "Research Grant", "R&D research funding", 10000 ether, 100, false, 365 days, "Research");
    }

    /**
     * @dev Create a new asset type
     */
    function createAssetType(
        uint256 assetType,
        string memory name,
        string memory description,
        uint256 unitValue,
        uint256 maxSupply,
        bool transferable,
        uint256 expirationDays,
        string memory department
    ) external onlyRole(ADMIN_ROLE) {
        if (assetInfo[assetType].active) revert AssetAlreadyExists(assetType);

        uint256 expiration = expirationDays > 0 ? block.timestamp + (expirationDays * 1 days) : 0;
        _createAssetType(assetType, name, description, unitValue, maxSupply, transferable, expiration, department);
    }

    function _createAssetType(
        uint256 assetType,
        string memory name,
        string memory description,
        uint256 unitValue,
        uint256 maxSupply,
        bool transferable,
        uint256 expiration,
        string memory department
    ) private {
        assetInfo[assetType] = AssetInfo({
            name: name,
            description: description,
            unitValue: unitValue,
            maxSupply: maxSupply,
            transferable: transferable,
            active: true,
            expirationTime: expiration,
            department: department
        });

        emit AssetCreated(assetType, name, maxSupply, department);
    }

    /**
     * @dev Allocate assets to users (mint)
     */
    function allocateAssets(
        address recipient,
        uint256 assetType,
        uint256 amount
    ) external onlyRole(ASSET_MANAGER_ROLE) {
        if (recipient == address(0)) revert InvalidAddress(recipient);
        if (amount == 0) revert InvalidAmount(amount);

        AssetInfo memory info = assetInfo[assetType];
        if (!info.active) revert AssetInactive(assetType);
        if (info.expirationTime > 0 && block.timestamp > info.expirationTime) {
            revert AssetExpired(assetType, info.expirationTime);
        }
        if (totalSupply(assetType) + amount > info.maxSupply) {
            revert ExceedsMaxSupply(assetType, amount, info.maxSupply);
        }

        _mint(recipient, assetType, amount, "");
        emit AssetAllocated(recipient, assetType, amount, msg.sender);
    }

    /**
     * @dev Batch allocate multiple asset types
     */
    function batchAllocateAssets(
        address recipient,
        uint256[] memory assetTypes,
        uint256[] memory amounts
    ) external onlyRole(ASSET_MANAGER_ROLE) {
        if (recipient == address(0)) revert InvalidAddress(recipient);
        if (assetTypes.length != amounts.length) revert InvalidAmount(0);

        for (uint256 i = 0; i < assetTypes.length; i++) {
            AssetInfo memory info = assetInfo[assetTypes[i]];
            if (!info.active) revert AssetInactive(assetTypes[i]);
            if (info.expirationTime > 0 && block.timestamp > info.expirationTime) {
                revert AssetExpired(assetTypes[i], info.expirationTime);
            }
            if (totalSupply(assetTypes[i]) + amounts[i] > info.maxSupply) {
                revert ExceedsMaxSupply(assetTypes[i], amounts[i], info.maxSupply);
            }
        }

        _mintBatch(recipient, assetTypes, amounts, "");

        for (uint256 i = 0; i < assetTypes.length; i++) {
            emit AssetAllocated(recipient, assetTypes[i], amounts[i], msg.sender);
        }
    }

    /**
     * @dev Spend/consume assets
     */
    function spendAsset(
        uint256 assetType,
        uint256 amount,
        string memory purpose
    ) external {
        if (amount == 0) revert InvalidAmount(amount);

        uint256 balance = balanceOf(msg.sender, assetType);
        if (balance < amount) revert InsufficientBalance(msg.sender, assetType, amount, balance);

        AssetInfo memory info = assetInfo[assetType];
        if (!info.active) revert AssetInactive(assetType);
        if (info.expirationTime > 0 && block.timestamp > info.expirationTime) {
            revert AssetExpired(assetType, info.expirationTime);
        }

        _burn(msg.sender, assetType, amount);
        userSpentAmount[assetType][msg.sender] += amount;

        emit AssetSpent(msg.sender, assetType, amount, purpose);
    }

    /**
     * @dev Reclaim unused assets from users
     */
    function reclaimAssets(
        address from,
        uint256 assetType,
        uint256 amount
    ) external onlyRole(ASSET_MANAGER_ROLE) {
        if (from == address(0)) revert InvalidAddress(from);
        if (amount == 0) revert InvalidAmount(amount);

        uint256 balance = balanceOf(from, assetType);
        if (balance < amount) revert InsufficientBalance(from, assetType, amount, balance);

        _burn(from, assetType, amount);
        emit AssetReclaimed(from, assetType, amount, msg.sender);
    }

    /**
     * @dev Override transfer functions to check transferability
     */
    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 value,
        bytes memory data
    ) public override {
        if (!assetInfo[id].transferable) revert AssetNotTransferable(id);
        super.safeTransferFrom(from, to, id, value, data);
    }

    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values,
        bytes memory data
    ) public override {
        for (uint256 i = 0; i < ids.length; i++) {
            if (!assetInfo[ids[i]].transferable) revert AssetNotTransferable(ids[i]);
        }
        super.safeBatchTransferFrom(from, to, ids, values, data);
    }

    /**
     * @dev Assign department to user
     */
    function assignDepartment(address user, string memory department) external onlyRole(ADMIN_ROLE) {
        if (user == address(0)) revert InvalidAddress(user);
        userDepartments[user] = department;
        emit DepartmentAssigned(user, department);
    }

    /**
     * @dev Toggle asset active status
     */
    function setAssetStatus(uint256 assetType, bool active) external onlyRole(ADMIN_ROLE) {
        assetInfo[assetType].active = active;
        emit AssetStatusChanged(assetType, active);
    }

    /**
     * @dev Get user's total spent amount for an asset type
     */
    function getUserSpentAmount(address user, uint256 assetType) external view returns (uint256) {
        return userSpentAmount[assetType][user];
    }

    /**
     * @dev Check if asset is expired
     */
    function isAssetExpired(uint256 assetType) external view returns (bool) {
        uint256 expiration = assetInfo[assetType].expirationTime;
        return expiration > 0 && block.timestamp > expiration;
    }

    /**
     * @dev Get remaining supply for an asset type
     */
    function getRemainingSupply(uint256 assetType) external view returns (uint256) {
        uint256 maxSup = assetInfo[assetType].maxSupply;
        uint256 currentSupply = totalSupply(assetType);
        return maxSup > currentSupply ? maxSup - currentSupply : 0;
    }

    // Role management functions
    function addAssetManager(address manager) external onlyRole(ADMIN_ROLE) {
        if (manager == address(0)) revert InvalidAddress(manager);
        _grantRole(ASSET_MANAGER_ROLE, manager);
    }

    function addDepartmentHead(address head) external onlyRole(ADMIN_ROLE) {
        if (head == address(0)) revert InvalidAddress(head);
        _grantRole(DEPARTMENT_HEAD_ROLE, head);
    }

    function addEmployee(address employee) external onlyRole(ASSET_MANAGER_ROLE) {
        if (employee == address(0)) revert InvalidAddress(employee);
        _grantRole(EMPLOYEE_ROLE, employee);
    }

    // Required overrides
    function uri(uint256 tokenId) public view override(ERC1155, ERC1155URIStorage) returns (string memory) {
        return super.uri(tokenId);
    }

    function _update(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values
    ) internal override(ERC1155, ERC1155Supply) {
        super._update(from, to, ids, values);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC1155, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
