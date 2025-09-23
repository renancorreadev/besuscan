// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title AuditLogger
 * @dev Sistema centralizado de auditoria para instituições financeiras
 * @notice Logs imutáveis para compliance e rastreabilidade completa
 */
contract AuditLogger is AccessControl, Pausable, ReentrancyGuard {
    // ============= ROLES =============
    bytes32 public constant AUDIT_ADMIN = keccak256("AUDIT_ADMIN");
    bytes32 public constant LOGGER = keccak256("LOGGER");
    bytes32 public constant VIEWER = keccak256("VIEWER");
    bytes32 public constant COMPLIANCE_OFFICER = keccak256("COMPLIANCE_OFFICER");

    // ============= ENUMS =============
    enum EventCategory {
        TRANSACTION,
        COMPLIANCE,
        SECURITY,
        ADMIN,
        RECOVERY,
        MULTISIG,
        LIMITS,
        KYC_AML
    }

    enum EventSeverity {
        INFO,
        WARNING,
        ERROR,
        CRITICAL
    }

    // ============= STRUCTS =============
    struct AuditEvent {
        uint256 id;
        EventCategory category;
        EventSeverity severity;
        address actor;
        address target;
        bytes32 eventType;
        bytes data;
        uint256 timestamp;
        uint256 blockNumber;
        bytes32 txHash;
        string description;
    }

    struct AuditSummary {
        uint256 totalEvents;
        uint256 criticalEvents;
        uint256 errorEvents;
        uint256 warningEvents;
        uint256 lastEventId;
        uint256 lastAuditTime;
    }

    struct ComplianceReport {
        uint256 reportId;
        address requester;
        uint256 fromTime;
        uint256 toTime;
        EventCategory[] categories;
        bytes32[] eventTypes;
        uint256 totalEvents;
        uint256 generatedAt;
        bytes32 reportHash;
    }

    // ============= STATE VARIABLES =============

    // Eventos de auditoria
    mapping(uint256 => AuditEvent) public auditEvents;
    uint256 public eventCounter;

    // Índices para busca eficiente
    mapping(address => uint256[]) public eventsByActor;
    mapping(address => uint256[]) public eventsByTarget;
    mapping(EventCategory => uint256[]) public eventsByCategory;
    mapping(bytes32 => uint256[]) public eventsByType;
    mapping(uint256 => uint256[]) public eventsByDay; // timestamp do dia => eventos

    // Resumos por entidade
    mapping(address => AuditSummary) public entitySummaries;

    // Relatórios de compliance
    mapping(uint256 => ComplianceReport) public complianceReports;
    uint256 public reportCounter;

    // Configurações
    uint256 public retentionPeriod = 2555 days; // 7 anos (requisito bancário)
    uint256 public maxEventsPerBatch = 100;
    bool public autoArchiving = true;

    // Estatísticas globais
    uint256 public totalCriticalEvents;
    uint256 public totalErrorEvents;
    uint256 public totalWarningEvents;
    uint256 public totalComplianceReports;

    // ============= EVENTS =============
    event AuditEventLogged(
        uint256 indexed eventId,
        EventCategory indexed category,
        EventSeverity indexed severity,
        address actor,
        address target,
        bytes32 eventType
    );
    event ComplianceReportGenerated(
        uint256 indexed reportId,
        address indexed requester,
        uint256 fromTime,
        uint256 toTime,
        uint256 totalEvents
    );
    event AuditConfigUpdated(
        uint256 retentionPeriod,
        uint256 maxEventsPerBatch,
        bool autoArchiving
    );
    event EventsArchived(uint256 fromId, uint256 toId, uint256 archivedCount);

    // ============= CUSTOM ERRORS =============
    error UnauthorizedLogger(address caller);
    error InvalidEventData();
    error InvalidTimeRange(uint256 fromTime, uint256 toTime);
    error EventNotFound(uint256 eventId);
    error ReportNotFound(uint256 reportId);
    error BatchSizeExceeded(uint256 requested, uint256 max);
    error RetentionPeriodNotMet(uint256 eventTime, uint256 retentionEnd);

    // ============= CONSTRUCTOR =============
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(AUDIT_ADMIN, msg.sender);
        _grantRole(LOGGER, msg.sender);
        _grantRole(VIEWER, msg.sender);
        _grantRole(COMPLIANCE_OFFICER, msg.sender);
    }

    // ============= LOGGING FUNCTIONS =============

    /**
     * @dev Registra um evento de auditoria
     */
    function logEvent(
        EventCategory category,
        EventSeverity severity,
        address target,
        bytes32 eventType,
        bytes calldata data,
        string calldata description
    ) external onlyRole(LOGGER) whenNotPaused returns (uint256 eventId) {
        if (target == address(0) && category != EventCategory.ADMIN) {
            revert InvalidEventData();
        }

        eventId = ++eventCounter;

        AuditEvent storage auditEvent = auditEvents[eventId];
        auditEvent.id = eventId;
        auditEvent.category = category;
        auditEvent.severity = severity;
        auditEvent.actor = msg.sender;
        auditEvent.target = target;
        auditEvent.eventType = eventType;
        auditEvent.data = data;
        auditEvent.timestamp = block.timestamp;
        auditEvent.blockNumber = block.number;
        auditEvent.txHash = blockhash(block.number - 1);
        auditEvent.description = description;

        // Atualiza índices
        _updateIndices(eventId, msg.sender, target, category, eventType);

        // Atualiza contadores
        _updateCounters(severity);

        // Atualiza resumo da entidade
        _updateEntitySummary(target, severity);

        emit AuditEventLogged(eventId, category, severity, msg.sender, target, eventType);

        return eventId;
    }

    /**
     * @dev Registra múltiplos eventos em lote
     */
    function logEventsBatch(
        EventCategory[] calldata categories,
        EventSeverity[] calldata severities,
        address[] calldata targets,
        bytes32[] calldata eventTypes,
        bytes[] calldata dataArray,
        string[] calldata descriptions
    ) external onlyRole(LOGGER) whenNotPaused returns (uint256[] memory eventIds) {
        if (categories.length > maxEventsPerBatch) {
            revert BatchSizeExceeded(categories.length, maxEventsPerBatch);
        }

        if (categories.length != severities.length ||
            categories.length != targets.length ||
            categories.length != eventTypes.length ||
            categories.length != dataArray.length ||
            categories.length != descriptions.length) {
            revert InvalidEventData();
        }

        eventIds = new uint256[](categories.length);

        for (uint256 i = 0; i < categories.length; i++) {
            eventIds[i] = this.logEvent(
                categories[i],
                severities[i],
                targets[i],
                eventTypes[i],
                dataArray[i],
                descriptions[i]
            );
        }

        return eventIds;
    }

    /**
     * @dev Logs específicos para diferentes tipos de evento
     */
    function logTransactionEvent(
        address account,
        address target,
        uint256 value,
        bool success,
        string calldata description
    ) external onlyRole(LOGGER) {
        bytes memory data = abi.encode(target, value, success);
        this.logEvent(
            EventCategory.TRANSACTION,
            success ? EventSeverity.INFO : EventSeverity.WARNING,
            account,
            "TRANSACTION_EXECUTED",
            data,
            description
        );
    }

    function logComplianceEvent(
        address account,
        bytes32 complianceType,
        bool passed,
        bytes calldata details,
        string calldata description
    ) external onlyRole(LOGGER) {
        bytes memory data = abi.encode(complianceType, passed, details);
        this.logEvent(
            EventCategory.COMPLIANCE,
            passed ? EventSeverity.INFO : EventSeverity.ERROR,
            account,
            complianceType,
            data,
            description
        );
    }

    function logSecurityEvent(
        address account,
        bytes32 threatType,
        EventSeverity severity,
        bytes calldata threatData,
        string calldata description
    ) external onlyRole(LOGGER) {
        this.logEvent(
            EventCategory.SECURITY,
            severity,
            account,
            threatType,
            threatData,
            description
        );
    }

    // ============= QUERY FUNCTIONS =============

    /**
     * @dev Busca eventos por ID
     */
    function getEvent(uint256 eventId) external view onlyRole(VIEWER) returns (AuditEvent memory) {
        if (eventId == 0 || eventId > eventCounter) revert EventNotFound(eventId);
        return auditEvents[eventId];
    }

    /**
     * @dev Busca eventos por ator
     */
    function getEventsByActor(
        address actor,
        uint256 offset,
        uint256 limit
    ) external view onlyRole(VIEWER) returns (AuditEvent[] memory events) {
        uint256[] memory eventIds = eventsByActor[actor];
        return _getEventsByIds(eventIds, offset, limit);
    }

    /**
     * @dev Busca eventos por target
     */
    function getEventsByTarget(
        address target,
        uint256 offset,
        uint256 limit
    ) external view onlyRole(VIEWER) returns (AuditEvent[] memory events) {
        uint256[] memory eventIds = eventsByTarget[target];
        return _getEventsByIds(eventIds, offset, limit);
    }

    /**
     * @dev Busca eventos por categoria
     */
    function getEventsByCategory(
        EventCategory category,
        uint256 offset,
        uint256 limit
    ) external view onlyRole(VIEWER) returns (AuditEvent[] memory events) {
        uint256[] memory eventIds = eventsByCategory[category];
        return _getEventsByIds(eventIds, offset, limit);
    }

    /**
     * @dev Busca eventos por tipo
     */
    function getEventsByType(
        bytes32 eventType,
        uint256 offset,
        uint256 limit
    ) external view onlyRole(VIEWER) returns (AuditEvent[] memory events) {
        uint256[] memory eventIds = eventsByType[eventType];
        return _getEventsByIds(eventIds, offset, limit);
    }

    /**
     * @dev Busca eventos por intervalo de tempo
     */
    function getEventsByTimeRange(
        uint256 fromTime,
        uint256 toTime,
        uint256 offset,
        uint256 limit
    ) external view onlyRole(VIEWER) returns (AuditEvent[] memory events) {
        if (fromTime >= toTime) revert InvalidTimeRange(fromTime, toTime);

        uint256 count = 0;
        uint256 startId = offset + 1;

        // Conta eventos no intervalo
        for (uint256 i = startId; i <= eventCounter && count < limit; i++) {
            if (auditEvents[i].timestamp >= fromTime && auditEvents[i].timestamp <= toTime) {
                count++;
            }
        }

        events = new AuditEvent[](count);
        count = 0;

        // Popula array
        for (uint256 i = startId; i <= eventCounter && count < limit; i++) {
            if (auditEvents[i].timestamp >= fromTime && auditEvents[i].timestamp <= toTime) {
                events[count++] = auditEvents[i];
            }
        }

        return events;
    }

    /**
     * @dev Busca avançada com múltiplos filtros
     */
    function advancedSearch(
        address actor,
        address target,
        EventCategory category,
        EventSeverity minSeverity,
        uint256 fromTime,
        uint256 toTime,
        uint256 offset,
        uint256 limit
    ) external view onlyRole(VIEWER) returns (AuditEvent[] memory events) {
        if (fromTime >= toTime) revert InvalidTimeRange(fromTime, toTime);

        uint256 count = 0;
        uint256 startId = offset + 1;

        // Conta eventos que atendem aos critérios
        for (uint256 i = startId; i <= eventCounter && count < limit; i++) {
            if (_matchesSearchCriteria(
                auditEvents[i],
                actor,
                target,
                category,
                minSeverity,
                fromTime,
                toTime
            )) {
                count++;
            }
        }

        events = new AuditEvent[](count);
        count = 0;

        // Popula array
        for (uint256 i = startId; i <= eventCounter && count < limit; i++) {
            if (_matchesSearchCriteria(
                auditEvents[i],
                actor,
                target,
                category,
                minSeverity,
                fromTime,
                toTime
            )) {
                events[count++] = auditEvents[i];
            }
        }

        return events;
    }

    // ============= COMPLIANCE REPORTING =============

    /**
     * @dev Gera relatório de compliance
     */
    function generateComplianceReport(
        uint256 fromTime,
        uint256 toTime,
        EventCategory[] calldata categories,
        bytes32[] calldata eventTypes
    ) external onlyRole(COMPLIANCE_OFFICER) returns (uint256 reportId) {
        if (fromTime >= toTime) revert InvalidTimeRange(fromTime, toTime);

        reportId = ++reportCounter;

        uint256 eventCount = _countEventsForReport(fromTime, toTime, categories, eventTypes);

        bytes32 reportHash = keccak256(abi.encodePacked(
            reportId,
            fromTime,
            toTime,
            categories,
            eventTypes,
            eventCount,
            block.timestamp
        ));

        complianceReports[reportId] = ComplianceReport({
            reportId: reportId,
            requester: msg.sender,
            fromTime: fromTime,
            toTime: toTime,
            categories: categories,
            eventTypes: eventTypes,
            totalEvents: eventCount,
            generatedAt: block.timestamp,
            reportHash: reportHash
        });

        totalComplianceReports++;

        emit ComplianceReportGenerated(reportId, msg.sender, fromTime, toTime, eventCount);

        return reportId;
    }

    /**
     * @dev Retorna dados do relatório de compliance
     */
    function getComplianceReport(uint256 reportId)
        external
        view
        onlyRole(COMPLIANCE_OFFICER)
        returns (ComplianceReport memory)
    {
        if (reportId == 0 || reportId > reportCounter) revert ReportNotFound(reportId);
        return complianceReports[reportId];
    }

    /**
     * @dev Exporta eventos para relatório
     */
    function exportEventsForReport(
        uint256 reportId,
        uint256 offset,
        uint256 limit
    ) external view onlyRole(COMPLIANCE_OFFICER) returns (AuditEvent[] memory events) {
        ComplianceReport memory report = complianceReports[reportId];
        if (report.reportId == 0) revert ReportNotFound(reportId);

        return this.getEventsByTimeRange(report.fromTime, report.toTime, offset, limit);
    }

    // ============= STATISTICS =============

    /**
     * @dev Retorna estatísticas gerais
     */
    function getGlobalStatistics() external view returns (
        uint256 totalEvents,
        uint256 _totalCriticalEvents,
        uint256 _totalErrorEvents,
        uint256 _totalWarningEvents,
        uint256 _totalComplianceReports,
        uint256 eventsLastDay,
        uint256 eventsLastWeek
    ) {
        totalEvents = eventCounter;
        _totalCriticalEvents = totalCriticalEvents;
        _totalErrorEvents = totalErrorEvents;
        _totalWarningEvents = totalWarningEvents;
        _totalComplianceReports = totalComplianceReports;

        // Eventos nas últimas 24h e 7 dias
        uint256 oneDayAgo = block.timestamp - 1 days;
        uint256 oneWeekAgo = block.timestamp - 7 days;

        for (uint256 i = eventCounter; i > 0; i--) {
            if (auditEvents[i].timestamp >= oneDayAgo) {
                eventsLastDay++;
            }
            if (auditEvents[i].timestamp >= oneWeekAgo) {
                eventsLastWeek++;
            }
            if (auditEvents[i].timestamp < oneWeekAgo) {
                break; // Para de contar se passou de uma semana
            }
        }
    }

    /**
     * @dev Retorna estatísticas de uma entidade
     */
    function getEntityStatistics(address entity) external view returns (AuditSummary memory) {
        return entitySummaries[entity];
    }

    // ============= ADMIN FUNCTIONS =============

    /**
     * @dev Atualiza configurações de auditoria
     */
    function updateAuditConfig(
        uint256 _retentionPeriod,
        uint256 _maxEventsPerBatch,
        bool _autoArchiving
    ) external onlyRole(AUDIT_ADMIN) {
        retentionPeriod = _retentionPeriod;
        maxEventsPerBatch = _maxEventsPerBatch;
        autoArchiving = _autoArchiving;

        emit AuditConfigUpdated(_retentionPeriod, _maxEventsPerBatch, _autoArchiving);
    }

    /**
     * @dev Arquiva eventos antigos (apenas para limpeza, não remove)
     */
    function archiveOldEvents(uint256 batchSize) external onlyRole(AUDIT_ADMIN) {
        uint256 cutoffTime = block.timestamp - retentionPeriod;
        uint256 archived = 0;
        uint256 startId = 1;

        // Encontra eventos para arquivar
        for (uint256 i = startId; i <= eventCounter && archived < batchSize; i++) {
            if (auditEvents[i].timestamp < cutoffTime) {
                // Marca como arquivado (implementação pode variar)
                archived++;
            }
        }

        if (archived > 0) {
            emit EventsArchived(startId, startId + archived - 1, archived);
        }
    }

    /**
     * @dev Pausa sistema de auditoria
     */
    function pauseAudit() external onlyRole(AUDIT_ADMIN) {
        _pause();
    }

    /**
     * @dev Despausa sistema de auditoria
     */
    function unpauseAudit() external onlyRole(AUDIT_ADMIN) {
        _unpause();
    }

    // ============= INTERNAL FUNCTIONS =============

    /**
     * @dev Atualiza índices de busca
     */
    function _updateIndices(
        uint256 eventId,
        address actor,
        address target,
        EventCategory category,
        bytes32 eventType
    ) internal {
        eventsByActor[actor].push(eventId);

        if (target != address(0)) {
            eventsByTarget[target].push(eventId);
        }

        eventsByCategory[category].push(eventId);
        eventsByType[eventType].push(eventId);

        // Índice por dia
        uint256 dayKey = block.timestamp / 1 days;
        eventsByDay[dayKey].push(eventId);
    }

    /**
     * @dev Atualiza contadores globais
     */
    function _updateCounters(EventSeverity severity) internal {
        if (severity == EventSeverity.CRITICAL) {
            totalCriticalEvents++;
        } else if (severity == EventSeverity.ERROR) {
            totalErrorEvents++;
        } else if (severity == EventSeverity.WARNING) {
            totalWarningEvents++;
        }
    }

    /**
     * @dev Atualiza resumo da entidade
     */
    function _updateEntitySummary(address entity, EventSeverity severity) internal {
        if (entity == address(0)) return;

        AuditSummary storage summary = entitySummaries[entity];
        summary.totalEvents++;
        summary.lastEventId = eventCounter;
        summary.lastAuditTime = block.timestamp;

        if (severity == EventSeverity.CRITICAL) {
            summary.criticalEvents++;
        } else if (severity == EventSeverity.ERROR) {
            summary.errorEvents++;
        } else if (severity == EventSeverity.WARNING) {
            summary.warningEvents++;
        }
    }

    /**
     * @dev Retorna eventos por IDs
     */
    function _getEventsByIds(
        uint256[] memory eventIds,
        uint256 offset,
        uint256 limit
    ) internal view returns (AuditEvent[] memory events) {
        uint256 startIndex = offset;
        uint256 endIndex = offset + limit;

        if (endIndex > eventIds.length) {
            endIndex = eventIds.length;
        }

        if (startIndex >= eventIds.length) {
            return new AuditEvent[](0);
        }

        uint256 resultLength = endIndex - startIndex;
        events = new AuditEvent[](resultLength);

        for (uint256 i = 0; i < resultLength; i++) {
            events[i] = auditEvents[eventIds[startIndex + i]];
        }

        return events;
    }

    /**
     * @dev Verifica se evento atende critérios de busca
     */
    function _matchesSearchCriteria(
        AuditEvent memory auditEvent,
        address actor,
        address target,
        EventCategory category,
        EventSeverity minSeverity,
        uint256 fromTime,
        uint256 toTime
    ) internal pure returns (bool) {
        if (actor != address(0) && auditEvent.actor != actor) return false;
        if (target != address(0) && auditEvent.target != target) return false;
        if (uint8(auditEvent.category) != uint8(category) && uint8(category) != 255) return false;
        if (uint8(auditEvent.severity) < uint8(minSeverity)) return false;
        if (auditEvent.timestamp < fromTime || auditEvent.timestamp > toTime) return false;

        return true;
    }

    /**
     * @dev Conta eventos para relatório
     */
    function _countEventsForReport(
        uint256 fromTime,
        uint256 toTime,
        EventCategory[] calldata categories,
        bytes32[] calldata eventTypes
    ) internal view returns (uint256 count) {
        for (uint256 i = 1; i <= eventCounter; i++) {
            AuditEvent memory auditEvent = auditEvents[i];

            if (auditEvent.timestamp < fromTime || auditEvent.timestamp > toTime) {
                continue;
            }

            // Verifica categorias se especificadas
            if (categories.length > 0) {
                bool categoryMatch = false;
                for (uint256 j = 0; j < categories.length; j++) {
                    if (auditEvent.category == categories[j]) {
                        categoryMatch = true;
                        break;
                    }
                }
                if (!categoryMatch) continue;
            }

            // Verifica tipos se especificados
            if (eventTypes.length > 0) {
                bool typeMatch = false;
                for (uint256 j = 0; j < eventTypes.length; j++) {
                    if (auditEvent.eventType == eventTypes[j]) {
                        typeMatch = true;
                        break;
                    }
                }
                if (!typeMatch) continue;
            }

            count++;
        }

        return count;
    }
}
