// SPDX-License-Identifier: MIT

// File contracts/IDBraDIDRegistry.sol

// Original license: SPDX_License_Identifier: MIT
pragma solidity ^0.8.20;

// File npm/@openzeppelin/contracts@5.4.0/access/IAccessControl.sol

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.4.0) (access/IAccessControl.sol)

pragma solidity >=0.8.4;

/**
 * @dev External interface of AccessControl declared to support ERC-165 detection.
 */
interface IAccessControl {
    /**
     * @dev The `account` is missing a role.
     */
    error AccessControlUnauthorizedAccount(address account, bytes32 neededRole);

    /**
     * @dev The caller of a function is not the expected one.
     *
     * NOTE: Don't confuse with {AccessControlUnauthorizedAccount}.
     */
    error AccessControlBadConfirmation();

    /**
     * @dev Emitted when `newAdminRole` is set as ``role``'s admin role, replacing `previousAdminRole`
     *
     * `DEFAULT_ADMIN_ROLE` is the starting admin for all roles, despite
     * {RoleAdminChanged} not being emitted to signal this.
     */
    event RoleAdminChanged(bytes32 indexed role, bytes32 indexed previousAdminRole, bytes32 indexed newAdminRole);

    /**
     * @dev Emitted when `account` is granted `role`.
     *
     * `sender` is the account that originated the contract call. This account bears the admin role (for the granted role).
     * Expected in cases where the role was granted using the internal {AccessControl-_grantRole}.
     */
    event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender);

    /**
     * @dev Emitted when `account` is revoked `role`.
     *
     * `sender` is the account that originated the contract call:
     *   - if using `revokeRole`, it is the admin role bearer
     *   - if using `renounceRole`, it is the role bearer (i.e. `account`)
     */
    event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender);

    /**
     * @dev Returns `true` if `account` has been granted `role`.
     */
    function hasRole(bytes32 role, address account) external view returns (bool);

    /**
     * @dev Returns the admin role that controls `role`. See {grantRole} and
     * {revokeRole}.
     *
     * To change a role's admin, use {AccessControl-_setRoleAdmin}.
     */
    function getRoleAdmin(bytes32 role) external view returns (bytes32);

    /**
     * @dev Grants `role` to `account`.
     *
     * If `account` had not been already granted `role`, emits a {RoleGranted}
     * event.
     *
     * Requirements:
     *
     * - the caller must have ``role``'s admin role.
     */
    function grantRole(bytes32 role, address account) external;

    /**
     * @dev Revokes `role` from `account`.
     *
     * If `account` had been granted `role`, emits a {RoleRevoked} event.
     *
     * Requirements:
     *
     * - the caller must have ``role``'s admin role.
     */
    function revokeRole(bytes32 role, address account) external;

    /**
     * @dev Revokes `role` from the calling account.
     *
     * Roles are often managed via {grantRole} and {revokeRole}: this function's
     * purpose is to provide a mechanism for accounts to lose their privileges
     * if they are compromised (such as when a trusted device is misplaced).
     *
     * If the calling account had been granted `role`, emits a {RoleRevoked}
     * event.
     *
     * Requirements:
     *
     * - the caller must be `callerConfirmation`.
     */
    function renounceRole(bytes32 role, address callerConfirmation) external;
}


// File npm/@openzeppelin/contracts@5.4.0/utils/Context.sol

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.0.1) (utils/Context.sol)

pragma solidity ^0.8.20;

/**
 * @dev Provides information about the current execution context, including the
 * sender of the transaction and its data. While these are generally available
 * via msg.sender and msg.data, they should not be accessed in such a direct
 * manner, since when dealing with meta-transactions the account sending and
 * paying for execution may not be the actual sender (as far as an application
 * is concerned).
 *
 * This contract is only required for intermediate, library-like contracts.
 */
abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }

    function _contextSuffixLength() internal view virtual returns (uint256) {
        return 0;
    }
}






// File npm/@openzeppelin/contracts@5.4.0/utils/introspection/IERC165.sol

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.4.0) (utils/introspection/IERC165.sol)

pragma solidity >=0.4.16;

/**
 * @dev Interface of the ERC-165 standard, as defined in the
 * https://eips.ethereum.org/EIPS/eip-165[ERC].
 *
 * Implementers can declare support of contract interfaces, which can then be
 * queried by others ({ERC165Checker}).
 *
 * For an implementation, see {ERC165}.
 */
interface IERC165 {
    /**
     * @dev Returns true if this contract implements the interface defined by
     * `interfaceId`. See the corresponding
     * https://eips.ethereum.org/EIPS/eip-165#how-interfaces-are-identified[ERC section]
     * to learn more about how these ids are created.
     *
     * This function call must use less than 30 000 gas.
     */
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}

// File npm/@openzeppelin/contracts@5.4.0/utils/introspection/ERC165.sol

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.4.0) (utils/introspection/ERC165.sol)

pragma solidity ^0.8.20;

/**
 * @dev Implementation of the {IERC165} interface.
 *
 * Contracts that want to implement ERC-165 should inherit from this contract and override {supportsInterface} to check
 * for the additional interface id that will be supported. For example:
 *
 * ```solidity
 * function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
 *     return interfaceId == type(MyInterface).interfaceId || super.supportsInterface(interfaceId);
 * }
 * ```
 */
abstract contract ERC165 is IERC165 {
    /// @inheritdoc IERC165
    function supportsInterface(bytes4 interfaceId) public view virtual returns (bool) {
        return interfaceId == type(IERC165).interfaceId;
    }
}

// File npm/@openzeppelin/contracts@5.4.0/access/AccessControl.sol

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.4.0) (access/AccessControl.sol)

pragma solidity ^0.8.20;



/**
 * @dev Contract module that allows children to implement role-based access
 * control mechanisms. This is a lightweight version that doesn't allow enumerating role
 * members except through off-chain means by accessing the contract event logs. Some
 * applications may benefit from on-chain enumerability, for those cases see
 * {AccessControlEnumerable}.
 *
 * Roles are referred to by their `bytes32` identifier. These should be exposed
 * in the external API and be unique. The best way to achieve this is by
 * using `public constant` hash digests:
 *
 * ```solidity
 * bytes32 public constant MY_ROLE = keccak256("MY_ROLE");
 * ```
 *
 * Roles can be used to represent a set of permissions. To restrict access to a
 * function call, use {hasRole}:
 *
 * ```solidity
 * function foo() public {
 *     require(hasRole(MY_ROLE, msg.sender));
 *     ...
 * }
 * ```
 *
 * Roles can be granted and revoked dynamically via the {grantRole} and
 * {revokeRole} functions. Each role has an associated admin role, and only
 * accounts that have a role's admin role can call {grantRole} and {revokeRole}.
 *
 * By default, the admin role for all roles is `DEFAULT_ADMIN_ROLE`, which means
 * that only accounts with this role will be able to grant or revoke other
 * roles. More complex role relationships can be created by using
 * {_setRoleAdmin}.
 *
 * WARNING: The `DEFAULT_ADMIN_ROLE` is also its own admin: it has permission to
 * grant and revoke this role. Extra precautions should be taken to secure
 * accounts that have been granted it. We recommend using {AccessControlDefaultAdminRules}
 * to enforce additional security measures for this role.
 */
abstract contract AccessControl is Context, IAccessControl, ERC165 {
    struct RoleData {
        mapping(address account => bool) hasRole;
        bytes32 adminRole;
    }

    mapping(bytes32 role => RoleData) private _roles;

    bytes32 public constant DEFAULT_ADMIN_ROLE = 0x00;

    /**
     * @dev Modifier that checks that an account has a specific role. Reverts
     * with an {AccessControlUnauthorizedAccount} error including the required role.
     */
    modifier onlyRole(bytes32 role) {
        _checkRole(role);
        _;
    }

    /// @inheritdoc IERC165
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return interfaceId == type(IAccessControl).interfaceId || super.supportsInterface(interfaceId);
    }

    /**
     * @dev Returns `true` if `account` has been granted `role`.
     */
    function hasRole(bytes32 role, address account) public view virtual returns (bool) {
        return _roles[role].hasRole[account];
    }

    /**
     * @dev Reverts with an {AccessControlUnauthorizedAccount} error if `_msgSender()`
     * is missing `role`. Overriding this function changes the behavior of the {onlyRole} modifier.
     */
    function _checkRole(bytes32 role) internal view virtual {
        _checkRole(role, _msgSender());
    }

    /**
     * @dev Reverts with an {AccessControlUnauthorizedAccount} error if `account`
     * is missing `role`.
     */
    function _checkRole(bytes32 role, address account) internal view virtual {
        if (!hasRole(role, account)) {
            revert AccessControlUnauthorizedAccount(account, role);
        }
    }

    /**
     * @dev Returns the admin role that controls `role`. See {grantRole} and
     * {revokeRole}.
     *
     * To change a role's admin, use {_setRoleAdmin}.
     */
    function getRoleAdmin(bytes32 role) public view virtual returns (bytes32) {
        return _roles[role].adminRole;
    }

    /**
     * @dev Grants `role` to `account`.
     *
     * If `account` had not been already granted `role`, emits a {RoleGranted}
     * event.
     *
     * Requirements:
     *
     * - the caller must have ``role``'s admin role.
     *
     * May emit a {RoleGranted} event.
     */
    function grantRole(bytes32 role, address account) public virtual onlyRole(getRoleAdmin(role)) {
        _grantRole(role, account);
    }

    /**
     * @dev Revokes `role` from `account`.
     *
     * If `account` had been granted `role`, emits a {RoleRevoked} event.
     *
     * Requirements:
     *
     * - the caller must have ``role``'s admin role.
     *
     * May emit a {RoleRevoked} event.
     */
    function revokeRole(bytes32 role, address account) public virtual onlyRole(getRoleAdmin(role)) {
        _revokeRole(role, account);
    }

    /**
     * @dev Revokes `role` from the calling account.
     *
     * Roles are often managed via {grantRole} and {revokeRole}: this function's
     * purpose is to provide a mechanism for accounts to lose their privileges
     * if they are compromised (such as when a trusted device is misplaced).
     *
     * If the calling account had been revoked `role`, emits a {RoleRevoked}
     * event.
     *
     * Requirements:
     *
     * - the caller must be `callerConfirmation`.
     *
     * May emit a {RoleRevoked} event.
     */
    function renounceRole(bytes32 role, address callerConfirmation) public virtual {
        if (callerConfirmation != _msgSender()) {
            revert AccessControlBadConfirmation();
        }

        _revokeRole(role, callerConfirmation);
    }

    /**
     * @dev Sets `adminRole` as ``role``'s admin role.
     *
     * Emits a {RoleAdminChanged} event.
     */
    function _setRoleAdmin(bytes32 role, bytes32 adminRole) internal virtual {
        bytes32 previousAdminRole = getRoleAdmin(role);
        _roles[role].adminRole = adminRole;
        emit RoleAdminChanged(role, previousAdminRole, adminRole);
    }

    /**
     * @dev Attempts to grant `role` to `account` and returns a boolean indicating if `role` was granted.
     *
     * Internal function without access restriction.
     *
     * May emit a {RoleGranted} event.
     */
    function _grantRole(bytes32 role, address account) internal virtual returns (bool) {
        if (!hasRole(role, account)) {
            _roles[role].hasRole[account] = true;
            emit RoleGranted(role, account, _msgSender());
            return true;
        } else {
            return false;
        }
    }

    /**
     * @dev Attempts to revoke `role` from `account` and returns a boolean indicating if `role` was revoked.
     *
     * Internal function without access restriction.
     *
     * May emit a {RoleRevoked} event.
     */
    function _revokeRole(bytes32 role, address account) internal virtual returns (bool) {
        if (hasRole(role, account)) {
            _roles[role].hasRole[account] = false;
            emit RoleRevoked(role, account, _msgSender());
            return true;
        } else {
            return false;
        }
    }
}




// File npm/@openzeppelin/contracts@5.4.0/utils/Pausable.sol

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.3.0) (utils/Pausable.sol)

pragma solidity ^0.8.20;

/**
 * @dev Contract module which allows children to implement an emergency stop
 * mechanism that can be triggered by an authorized account.
 *
 * This module is used through inheritance. It will make available the
 * modifiers `whenNotPaused` and `whenPaused`, which can be applied to
 * the functions of your contract. Note that they will not be pausable by
 * simply including this module, only once the modifiers are put in place.
 */
abstract contract Pausable is Context {
    bool private _paused;

    /**
     * @dev Emitted when the pause is triggered by `account`.
     */
    event Paused(address account);

    /**
     * @dev Emitted when the pause is lifted by `account`.
     */
    event Unpaused(address account);

    /**
     * @dev The operation failed because the contract is paused.
     */
    error EnforcedPause();

    /**
     * @dev The operation failed because the contract is not paused.
     */
    error ExpectedPause();

    /**
     * @dev Modifier to make a function callable only when the contract is not paused.
     *
     * Requirements:
     *
     * - The contract must not be paused.
     */
    modifier whenNotPaused() {
        _requireNotPaused();
        _;
    }

    /**
     * @dev Modifier to make a function callable only when the contract is paused.
     *
     * Requirements:
     *
     * - The contract must be paused.
     */
    modifier whenPaused() {
        _requirePaused();
        _;
    }

    /**
     * @dev Returns true if the contract is paused, and false otherwise.
     */
    function paused() public view virtual returns (bool) {
        return _paused;
    }

    /**
     * @dev Throws if the contract is paused.
     */
    function _requireNotPaused() internal view virtual {
        if (paused()) {
            revert EnforcedPause();
        }
    }

    /**
     * @dev Throws if the contract is not paused.
     */
    function _requirePaused() internal view virtual {
        if (!paused()) {
            revert ExpectedPause();
        }
    }

    /**
     * @dev Triggers stopped state.
     *
     * Requirements:
     *
     * - The contract must not be paused.
     */
    function _pause() internal virtual whenNotPaused {
        _paused = true;
        emit Paused(_msgSender());
    }

    /**
     * @dev Returns to normal state.
     *
     * Requirements:
     *
     * - The contract must be paused.
     */
    function _unpause() internal virtual whenPaused {
        _paused = false;
        emit Unpaused(_msgSender());
    }
}


// File npm/@openzeppelin/contracts@5.4.0/utils/ReentrancyGuard.sol

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.1.0) (utils/ReentrancyGuard.sol)

pragma solidity ^0.8.20;

/**
 * @dev Contract module that helps prevent reentrant calls to a function.
 *
 * Inheriting from `ReentrancyGuard` will make the {nonReentrant} modifier
 * available, which can be applied to functions to make sure there are no nested
 * (reentrant) calls to them.
 *
 * Note that because there is a single `nonReentrant` guard, functions marked as
 * `nonReentrant` may not call one another. This can be worked around by making
 * those functions `private`, and then adding `external` `nonReentrant` entry
 * points to them.
 *
 * TIP: If EIP-1153 (transient storage) is available on the chain you're deploying at,
 * consider using {ReentrancyGuardTransient} instead.
 *
 * TIP: If you would like to learn more about reentrancy and alternative ways
 * to protect against it, check out our blog post
 * https://blog.openzeppelin.com/reentrancy-after-istanbul/[Reentrancy After Istanbul].
 */
abstract contract ReentrancyGuard {
    // Booleans are more expensive than uint256 or any type that takes up a full
    // word because each write operation emits an extra SLOAD to first read the
    // slot's contents, replace the bits taken up by the boolean, and then write
    // back. This is the compiler's defense against contract upgrades and
    // pointer aliasing, and it cannot be disabled.

    // The values being non-zero value makes deployment a bit more expensive,
    // but in exchange the refund on every call to nonReentrant will be lower in
    // amount. Since refunds are capped to a percentage of the total
    // transaction's gas, it is best to keep them low in cases like this one, to
    // increase the likelihood of the full refund coming into effect.
    uint256 private constant NOT_ENTERED = 1;
    uint256 private constant ENTERED = 2;

    uint256 private _status;

    /**
     * @dev Unauthorized reentrant call.
     */
    error ReentrancyGuardReentrantCall();

    constructor() {
        _status = NOT_ENTERED;
    }

    /**
     * @dev Prevents a contract from calling itself, directly or indirectly.
     * Calling a `nonReentrant` function from another `nonReentrant`
     * function is not supported. It is possible to prevent this from happening
     * by making the `nonReentrant` function external, and making it call a
     * `private` function that does the actual work.
     */
    modifier nonReentrant() {
        _nonReentrantBefore();
        _;
        _nonReentrantAfter();
    }

    function _nonReentrantBefore() private {
        // On the first call to nonReentrant, _status will be NOT_ENTERED
        if (_status == ENTERED) {
            revert ReentrancyGuardReentrantCall();
        }

        // Any calls to nonReentrant after this point will fail
        _status = ENTERED;
    }

    function _nonReentrantAfter() private {
        // By storing the original value once again, a refund is triggered (see
        // https://eips.ethereum.org/EIPS/eip-2200)
        _status = NOT_ENTERED;
    }

    /**
     * @dev Returns true if the reentrancy guard is currently set to "entered", which indicates there is a
     * `nonReentrant` function in the call stack.
     */
    function _reentrancyGuardEntered() internal view returns (bool) {
        return _status == ENTERED;
    }
}


/**
 * @title IDBraUnifiedRegistry
 * @notice Contrato unificado EIP-1056 + StatusList + Revogação para Hyperledger Besu
 * @dev Implementação completa para identidade digital bancária com máxima rastreabilidade
 */
 contract DIDW3C is AccessControl, Pausable, ReentrancyGuard {

    // ========= Roles =========
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");

    // ========= EIP-1056 Core State =========

    /// @dev Mapeia identidade para delegates por tipo e validade (EIP-1056 padrão)
    mapping(address => mapping(bytes32 => mapping(address => uint256))) public delegates;

    /// @dev Último bloco que mudou cada identidade (EIP-1056 padrão)
    mapping(address => uint256) public changed;

    // ========= Identity Management State =========

    /// @dev Status de verificação KYC para compliance bancária
    mapping(address => bool) public isKYCVerified;

    /// @dev Metadata IPFS para documentos DID W3C
    mapping(address => string) public didDocuments;

    /// @dev Controle de existência de DID
    mapping(address => bool) public didExists;

    /// @dev Timestamps para auditoria
    mapping(address => uint256) public lastActivity;

    // ========= Credential Revocation State =========

    struct RevocationRecord {
        bool revoked;
        uint256 timestamp;
        address revoker;
        string reason;
        bytes32 credentialHash; // Hash da credencial para verificação
    }

    /// @dev Registro de revogações de credenciais
    mapping(bytes32 => RevocationRecord) public credentialRevocations;

    /// @dev Mapeamento de identidade para suas credenciais
    mapping(address => bytes32[]) public identityCredentials;

    /// @dev Contador de credenciais por identidade
    mapping(address => uint256) public credentialCount;



    // ========= Metrics State =========

    uint256 public totalDIDs;
    uint256 public totalVerifiedDIDs;
    uint256 public totalCredentials;
    uint256 public totalRevokedCredentials;
    uint256 public totalOperations;

    // ========= EIP-1056 Standard Events =========

    event DIDOwnerChanged(
        address indexed identity,
        address owner,
        uint256 previousChange
    );

    event DIDDelegateChanged(
        address indexed identity,
        bytes32 delegateType,
        address delegate,
        uint256 validTo,
        uint256 previousChange
    );

    event DIDAttributeChanged(
        address indexed identity,
        bytes32 name,
        bytes value,
        uint256 validTo,
        uint256 previousChange
    );

    // ========= Identity Events =========

    event DIDCreated(
        address indexed identity,
        address indexed creator,
        string didDocument,
        uint256 timestamp
    );

    event DIDUpdated(
        address indexed identity,
        address indexed updater,
        string newDocument,
        uint256 timestamp
    );

    event KYCStatusChanged(
        address indexed identity,
        bool verified,
        address indexed verifier,
        uint256 timestamp
    );

    // ========= Credential Events =========

    event CredentialIssued(
        bytes32 indexed credentialId,
        address indexed issuer,
        address indexed subject,
        bytes32 credentialHash,
        uint256 timestamp
    );

    event CredentialRevoked(
        bytes32 indexed credentialId,
        address indexed revoker,
        address indexed subject,
        string reason,
        uint256 timestamp
    );

    event CredentialRestored(
        bytes32 indexed credentialId,
        address indexed restorer,
        address indexed subject,
        string reason,
        uint256 timestamp
    );

    // ========= Audit Events =========

    event BankingAuditLog(
        address indexed identity,
        string indexed action,
        address indexed actor,
        bytes32 dataHash,
        uint256 timestamp
    );

    event SystemMetricsUpdated(
        uint256 totalDIDs,
        uint256 totalCredentials,
        uint256 totalRevoked,
        uint256 timestamp
    );

    // ========= Errors =========

    error NotOwner();
    error DIDAlreadyExists();
    error DIDNotFound();
    error InvalidDocument();
    error CredentialAlreadyExists();
    error CredentialNotFound();
    error CredentialAlreadyRevoked();
    error CredentialNotRevoked();

    // ========= Modifiers =========

    modifier onlyOwner(address identity, address actor) {
        if (actor != identity) revert NotOwner();
        _;
    }

    modifier didMustExist(address identity) {
        if (!didExists[identity]) revert DIDNotFound();
        _;
    }

    modifier credentialMustExist(bytes32 credentialId) {
        if (credentialRevocations[credentialId].credentialHash == bytes32(0)) revert CredentialNotFound();
        _;
    }

    // ========= Constructor =========

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(EMERGENCY_ROLE, admin);
    }

    // ========= EIP-1056 Core Functions =========

    /**
     * @notice Retorna o owner atual de uma identidade (EIP-1056)
     */
    function identityOwner(address identity) public pure returns (address) {
        return identity;
    }

    /**
     * @notice Verifica se address é delegate válido para identidade (EIP-1056)
     */
    function validDelegate(
        address identity,
        bytes32 delegateType,
        address delegate
    ) public view returns (bool) {
        return delegates[identity][delegateType][delegate] >= block.timestamp;
    }

    /**
     * @notice Retorna timestamp de validade do delegate
     */
    function validDelegateFrom(
        address identity,
        bytes32 delegateType,
        address delegate
    ) public view returns (uint256) {
        return delegates[identity][delegateType][delegate];
    }

    /**
     * @notice Adiciona delegate para identidade (EIP-1056)
     */
    function addDelegate(
        address identity,
        bytes32 delegateType,
        address delegate,
        uint256 validity
    ) external whenNotPaused onlyOwner(identity, msg.sender) didMustExist(identity) {
        uint256 prev = changed[identity];
        delegates[identity][delegateType][delegate] = block.timestamp + validity;
        changed[identity] = block.number;
        lastActivity[identity] = block.timestamp;
        totalOperations++;

        emit DIDDelegateChanged(identity, delegateType, delegate, block.timestamp + validity, prev);
        emit BankingAuditLog(
            identity,
            "DELEGATE_ADDED",
            msg.sender,
            keccak256(abi.encodePacked(delegateType, delegate, validity)),
            block.timestamp
        );
    }

    /**
     * @notice Remove delegate da identidade (EIP-1056)
     */
    function revokeDelegate(
        address identity,
        bytes32 delegateType,
        address delegate
    ) external whenNotPaused onlyOwner(identity, msg.sender) didMustExist(identity) {
        uint256 prev = changed[identity];
        delegates[identity][delegateType][delegate] = block.timestamp;
        changed[identity] = block.number;
        lastActivity[identity] = block.timestamp;
        totalOperations++;

        emit DIDDelegateChanged(identity, delegateType, delegate, block.timestamp, prev);
        emit BankingAuditLog(
            identity,
            "DELEGATE_REVOKED",
            msg.sender,
            keccak256(abi.encodePacked(delegateType, delegate)),
            block.timestamp
        );
    }

    /**
     * @notice Define atributo para identidade (EIP-1056)
     */
    function setAttribute(
        address identity,
        bytes32 name,
        bytes calldata value,
        uint256 validity
    ) external whenNotPaused onlyOwner(identity, msg.sender) didMustExist(identity) {
        uint256 prev = changed[identity];
        changed[identity] = block.number;
        lastActivity[identity] = block.timestamp;
        totalOperations++;

        emit DIDAttributeChanged(identity, name, value, block.timestamp + validity, prev);
        emit BankingAuditLog(
            identity,
            "ATTRIBUTE_SET",
            msg.sender,
            keccak256(abi.encodePacked(name, value)),
            block.timestamp
        );
    }

    /**
     * @notice Remove atributo da identidade (EIP-1056)
     */
    function revokeAttribute(
        address identity,
        bytes32 name,
        bytes calldata value
    ) external whenNotPaused onlyOwner(identity, msg.sender) didMustExist(identity) {
        uint256 prev = changed[identity];
        changed[identity] = block.number;
        lastActivity[identity] = block.timestamp;
        totalOperations++;

        emit DIDAttributeChanged(identity, name, value, 0, prev);
        emit BankingAuditLog(
            identity,
            "ATTRIBUTE_REVOKED",
            msg.sender,
            keccak256(abi.encodePacked(name, value)),
            block.timestamp
        );
    }

    // ========= Identity Management Functions =========

    /**
     * @notice Cria nova identidade DID
     */
    function createDID(
        address identity,
        string calldata didDocument
    ) external whenNotPaused nonReentrant returns (bool) {
        if (didExists[identity]) revert DIDAlreadyExists();
        if (bytes(didDocument).length == 0) revert InvalidDocument();

        didExists[identity] = true;
        didDocuments[identity] = didDocument;
        lastActivity[identity] = block.timestamp;

        totalDIDs++;
        totalOperations++;

        uint256 prev = changed[identity];
        changed[identity] = block.number;

        emit DIDCreated(identity, msg.sender, didDocument, block.timestamp);
        emit DIDOwnerChanged(identity, identity, prev);
        emit BankingAuditLog(
            identity,
            "DID_CREATED",
            msg.sender,
            keccak256(bytes(didDocument)),
            block.timestamp
        );

        return true;
    }

    /**
     * @notice Atualiza documento DID
     */
    function updateDIDDocument(
        address identity,
        string calldata newDidDocument
    ) external whenNotPaused onlyOwner(identity, msg.sender) didMustExist(identity) {
        if (bytes(newDidDocument).length == 0) revert InvalidDocument();

        string memory oldDocument = didDocuments[identity];
        didDocuments[identity] = newDidDocument;
        lastActivity[identity] = block.timestamp;
        totalOperations++;

        emit DIDUpdated(identity, msg.sender, newDidDocument, block.timestamp);
        emit BankingAuditLog(
            identity,
            "DID_UPDATED",
            msg.sender,
            keccak256(abi.encodePacked(oldDocument, newDidDocument)),
            block.timestamp
        );
    }

    /**
     * @notice Define status KYC
     */
    function setKYCStatus(
        address identity,
        bool verified
    ) external whenNotPaused onlyRole(REGISTRAR_ROLE) didMustExist(identity) {
        bool wasVerified = isKYCVerified[identity];
        isKYCVerified[identity] = verified;
        lastActivity[identity] = block.timestamp;
        totalOperations++;

        if (verified && !wasVerified) {
            totalVerifiedDIDs++;
        } else if (!verified && wasVerified) {
            totalVerifiedDIDs--;
        }

        emit KYCStatusChanged(identity, verified, msg.sender, block.timestamp);
        emit BankingAuditLog(
            identity,
            verified ? "KYC_VERIFIED" : "KYC_REVOKED",
            msg.sender,
            keccak256(abi.encodePacked(verified, wasVerified)),
            block.timestamp
        );
    }

    // ========= Credential Management Functions =========

    /**
     * @notice Registra uma nova credencial
     */
    function issueCredential(
        bytes32 credentialId,
        address subject,
        bytes32 credentialHash
    ) external whenNotPaused onlyRole(ISSUER_ROLE) didMustExist(subject) returns (bool) {
        if (credentialRevocations[credentialId].credentialHash != bytes32(0)) revert CredentialAlreadyExists();

        credentialRevocations[credentialId] = RevocationRecord({
            revoked: false,
            timestamp: block.timestamp,
            revoker: msg.sender,
            reason: "",
            credentialHash: credentialHash
        });

        identityCredentials[subject].push(credentialId);
        credentialCount[subject]++;
        totalCredentials++;
        totalOperations++;

        emit CredentialIssued(credentialId, msg.sender, subject, credentialHash, block.timestamp);
        emit BankingAuditLog(
            subject,
            "CREDENTIAL_ISSUED",
            msg.sender,
            credentialHash,
            block.timestamp
        );

        return true;
    }

    /**
     * @notice Revoga uma credencial
     */
    function revokeCredential(
        bytes32 credentialId,
        address subject,
        string calldata reason
    ) external whenNotPaused onlyRole(ISSUER_ROLE) credentialMustExist(credentialId) {
        RevocationRecord storage record = credentialRevocations[credentialId];
        if (record.revoked) revert CredentialAlreadyRevoked();

        record.revoked = true;
        record.timestamp = block.timestamp;
        record.revoker = msg.sender;
        record.reason = reason;

        totalRevokedCredentials++;
        totalOperations++;

        emit CredentialRevoked(credentialId, msg.sender, subject, reason, block.timestamp);
        emit BankingAuditLog(
            subject,
            "CREDENTIAL_REVOKED",
            msg.sender,
            keccak256(abi.encodePacked(credentialId, reason)),
            block.timestamp
        );
    }

    /**
     * @notice Restaura uma credencial revogada
     */
    function restoreCredential(
        bytes32 credentialId,
        address subject,
        string calldata reason
    ) external whenNotPaused onlyRole(ISSUER_ROLE) credentialMustExist(credentialId) {
        RevocationRecord storage record = credentialRevocations[credentialId];
        if (!record.revoked) revert CredentialNotRevoked();

        record.revoked = false;
        record.timestamp = block.timestamp;
        record.revoker = msg.sender;
        record.reason = reason;

        totalRevokedCredentials--;
        totalOperations++;

        emit CredentialRestored(credentialId, msg.sender, subject, reason, block.timestamp);
        emit BankingAuditLog(
            subject,
            "CREDENTIAL_RESTORED",
            msg.sender,
            keccak256(abi.encodePacked(credentialId, reason)),
            block.timestamp
        );
    }

    /**
     * @notice Verifica se uma credencial está revogada
     */
    function isCredentialRevoked(bytes32 credentialId) external view returns (bool) {
        return credentialRevocations[credentialId].revoked;
    }

    // ========= View Functions =========

    /**
     * @notice Retorna informações completas da identidade
     */
    function getIdentityInfo(address identity) external view returns (
        address owner,
        string memory didDocument,
        bool kycVerified,
        uint256 lastActivityTime,
        uint256 lastChanged,
        uint256 credentialCountForIdentity
    ) {
        return (
            identity,
            didDocuments[identity],
            isKYCVerified[identity],
            lastActivity[identity],
            changed[identity],
            credentialCount[identity]
        );
    }

    /**
     * @notice Retorna registro de revogação de credencial
     */
    function getCredentialRevocation(bytes32 credentialId) external view returns (RevocationRecord memory) {
        return credentialRevocations[credentialId];
    }

    /**
     * @notice Retorna credenciais de uma identidade
     */
    function getIdentityCredentials(address identity) external view returns (bytes32[] memory) {
        return identityCredentials[identity];
    }

    /**
     * @notice Retorna métricas do sistema
     */
    function getSystemMetrics() external view returns (
        uint256 totalDIDCount,
        uint256 totalVerifiedDIDCount,
        uint256 totalCredentialCount,
        uint256 totalRevokedCredentialCount,
        uint256 totalOperationCount
    ) {
        return (
            totalDIDs,
            totalVerifiedDIDs,
            totalCredentials,
            totalRevokedCredentials,
            totalOperations
        );
    }

    /**
     * @notice Verifica se DID existe
     */
    function exists(address identity) external view returns (bool) {
        return didExists[identity];
    }

    // ========= Admin Functions =========

    function pause() external onlyRole(EMERGENCY_ROLE) {
        _pause();
        emit BankingAuditLog(msg.sender, "SYSTEM_PAUSED", msg.sender, bytes32(0), block.timestamp);
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
        emit BankingAuditLog(msg.sender, "SYSTEM_UNPAUSED", msg.sender, bytes32(0), block.timestamp);
    }
}
