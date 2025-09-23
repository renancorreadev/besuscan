// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

contract CompanyAsset is ERC721, ERC721URIStorage, AccessControl {
    uint256 private _nextTokenId = 1;

    // Custom roles for the company
    bytes32 public constant ADMIN = keccak256("ADMIN");
    bytes32 public constant MANAGER = keccak256("MANAGER");
    bytes32 public constant EMPLOYEE = keccak256("EMPLOYEE");

    // Asset mapping
    mapping(uint256 => Asset) public assets;

    struct Asset {
        string name;
        string description;
        uint256 value;
        uint256 creationDate;
        address responsible;
    }

    // Custom Errors
    error NotTokenOwner(address caller, uint256 tokenId);
    error InsufficientPermissions(address user, bytes32 requiredRole);
    error InvalidAddress(address addr);
    error AssetNotFound(uint256 tokenId);
    error EmptyAssetName();
    error ZeroValue();
    error SameResponsible(address current, address new_);

    // Events
    event AssetCreated(uint256 indexed tokenId, string name, address indexed responsible, uint256 value);
    event AssetTransferred(uint256 indexed tokenId, address indexed from, address indexed to);
    event AssetValueUpdated(uint256 indexed tokenId, uint256 oldValue, uint256 newValue);
    event AssetDescriptionUpdated(uint256 indexed tokenId, address indexed updatedBy);
    event EmployeeAdded(address indexed employee, address indexed addedBy);
    event EmployeeRemoved(address indexed employee, address indexed removedBy);
    event ManagerAdded(address indexed manager, address indexed addedBy);
    event ManagerRemoved(address indexed manager, address indexed removedBy);

    constructor(address initialAdmin) ERC721("CompanyAsset", "CMP") {
        if (initialAdmin == address(0)) revert InvalidAddress(initialAdmin);

        // Set up initial roles
        _grantRole(DEFAULT_ADMIN_ROLE, initialAdmin);
        _grantRole(ADMIN, initialAdmin);
    }

    function createAsset(
        address to,
        string memory name,
        string memory description,
        uint256 value,
        string memory uri
    ) public onlyRole(ADMIN) returns (uint256) {
        if (to == address(0)) revert InvalidAddress(to);
        if (bytes(name).length == 0) revert EmptyAssetName();
        if (value == 0) revert ZeroValue();

        uint256 tokenId = _nextTokenId++;

        // Create the asset
        assets[tokenId] = Asset(
            name,
            description,
            value,
            block.timestamp,
            to
        );

        // Mint the NFT
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);

        emit AssetCreated(tokenId, name, to, value);
        return tokenId;
    }

    function transferAsset(
        uint256 tokenId,
        address newResponsible
    ) public {
        if (_ownerOf(tokenId) != msg.sender) revert NotTokenOwner(msg.sender, tokenId);
        if (newResponsible == address(0)) revert InvalidAddress(newResponsible);

        if (!hasRole(EMPLOYEE, newResponsible) &&
            !hasRole(MANAGER, newResponsible) &&
            !hasRole(ADMIN, newResponsible)) {
            revert InsufficientPermissions(newResponsible, EMPLOYEE);
        }

        address currentResponsible = assets[tokenId].responsible;
        if (currentResponsible == newResponsible) revert SameResponsible(currentResponsible, newResponsible);

        address from = msg.sender;
        _transfer(from, newResponsible, tokenId);
        assets[tokenId].responsible = newResponsible;

        emit AssetTransferred(tokenId, from, newResponsible);
    }

    function getAsset(uint256 tokenId) public view returns (Asset memory) {
        _requireOwned(tokenId);
        return assets[tokenId];
    }

    function addEmployee(address employee) public onlyRole(ADMIN) {
        if (employee == address(0)) revert InvalidAddress(employee);

        _grantRole(EMPLOYEE, employee);
        emit EmployeeAdded(employee, msg.sender);
    }

    function addManager(address manager) public onlyRole(ADMIN) {
        if (manager == address(0)) revert InvalidAddress(manager);

        _grantRole(MANAGER, manager);
        emit ManagerAdded(manager, msg.sender);
    }

    function removeEmployee(address employee) public onlyRole(ADMIN) {
        if (employee == address(0)) revert InvalidAddress(employee);

        _revokeRole(EMPLOYEE, employee);
        emit EmployeeRemoved(employee, msg.sender);
    }

    function removeManager(address manager) public onlyRole(ADMIN) {
        if (manager == address(0)) revert InvalidAddress(manager);

        _revokeRole(MANAGER, manager);
        emit ManagerRemoved(manager, msg.sender);
    }

    function updateAssetValue(uint256 tokenId, uint256 newValue) public onlyRole(ADMIN) {
        _requireOwned(tokenId);
        if (newValue == 0) revert ZeroValue();

        uint256 oldValue = assets[tokenId].value;
        assets[tokenId].value = newValue;

        emit AssetValueUpdated(tokenId, oldValue, newValue);
    }

    function updateAssetDescription(uint256 tokenId, string memory newDescription) public {
        if (_ownerOf(tokenId) != msg.sender && !hasRole(ADMIN, msg.sender)) {
            revert NotTokenOwner(msg.sender, tokenId);
        }

        assets[tokenId].description = newDescription;
        emit AssetDescriptionUpdated(tokenId, msg.sender);
    }

    function getTotalAssets() public view returns (uint256) {
        return _nextTokenId - 1;
    }

    // Override required functions
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
