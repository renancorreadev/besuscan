// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IKYCAMLValidator
 * @dev Interface para validação de KYC/AML
 */
interface IKYCAMLValidator {
    // ============= ENUMS =============
    enum KYCStatus {
        NOT_VERIFIED,
        PENDING,
        VERIFIED,
        REJECTED,
        EXPIRED
    }

    enum RiskLevel {
        LOW,
        MEDIUM,
        HIGH,
        CRITICAL
    }

    // ============= STRUCTS =============
    struct KYCData {
        KYCStatus status;
        uint256 verifiedAt;
        uint256 expiresAt;
        bytes32 documentHash;
        RiskLevel riskLevel;
    }

    struct AMLCheckResult {
        bool passed;
        RiskLevel riskLevel;
        bytes32[] flags;
        uint256 score;
        uint256 checkedAt;
    }

    // ============= EVENTS =============
    event KYCStatusUpdated(
        address indexed user,
        KYCStatus oldStatus,
        KYCStatus newStatus,
        uint256 expiresAt
    );
    event AMLCheckPerformed(
        address indexed user,
        address indexed target,
        uint256 value,
        bool passed,
        RiskLevel riskLevel,
        uint256 score
    );
    event RiskLevelChanged(
        address indexed user,
        RiskLevel oldLevel,
        RiskLevel newLevel,
        bytes32 reason
    );
    event SanctionListUpdated(bytes32 indexed listId, uint256 entriesCount);

    // ============= CUSTOM ERRORS =============
    error KYCNotVerified(address user, KYCStatus status);
    error KYCExpired(address user, uint256 expiredAt);
    error AMLCheckFailed(address user, RiskLevel riskLevel, bytes32[] flags);
    error HighRiskTransaction(address user, uint256 value, RiskLevel riskLevel);
    error SanctionedAddress(address target);
    error InvalidKYCData();
    error UnauthorizedValidator(address caller);

    // ============= KYC FUNCTIONS =============
    function updateKYCStatus(
        address user,
        KYCStatus status,
        uint256 expiresAt,
        bytes32 documentHash
    ) external;

    function validateKYC(address user) external view returns (bool);

    function getKYCData(address user) external view returns (KYCData memory);

    function isKYCValid(address user) external view returns (bool);

    // ============= AML FUNCTIONS =============
    function validateAML(
        address target,
        uint256 value,
        bytes calldata data
    ) external view returns (bool);

    function performAMLCheck(
        address user,
        address target,
        uint256 value,
        bytes calldata data
    ) external returns (AMLCheckResult memory);

    function getAMLHistory(address user, uint256 limit)
        external
        view
        returns (AMLCheckResult[] memory);

    // ============= RISK MANAGEMENT =============
    function updateRiskLevel(
        address user,
        RiskLevel newLevel,
        bytes32 reason
    ) external;

    function getRiskLevel(address user) external view returns (RiskLevel);

    function calculateTransactionRisk(
        address user,
        address target,
        uint256 value,
        bytes calldata data
    ) external view returns (uint256 score, RiskLevel level);

    // ============= SANCTIONS & BLACKLIST =============
    function addToSanctionList(bytes32 listId, address[] calldata addresses) external;

    function removeFromSanctionList(bytes32 listId, address[] calldata addresses) external;

    function isSanctioned(address target) external view returns (bool);

    function getSanctionLists(address target) external view returns (bytes32[] memory);

    // ============= CONFIGURATION =============
    function setRiskThresholds(
        uint256 lowThreshold,
        uint256 mediumThreshold,
        uint256 highThreshold
    ) external;

    function setKYCValidityPeriod(uint256 validityPeriod) external;

    function addAuthorizedValidator(address validator) external;

    function removeAuthorizedValidator(address validator) external;
}