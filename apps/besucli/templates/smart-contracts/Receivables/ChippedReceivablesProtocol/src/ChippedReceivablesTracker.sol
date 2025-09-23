// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {ERC1155Supply} from "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title ChippedReceivablesTracker
 * @dev Protocolo SIMPLES para rastreabilidade de recebíveis físicos tokenizados
 *      Foco: Transparência, auditoria e prova de existência
 * @author Renan Correa
 */

contract ChippedReceivablesTracker is
    ERC1155,
    ERC1155Supply,
    AccessControl,
    Pausable
{
    // =====================================================
    // ROLES
    // =====================================================
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");
    bytes32 public constant VALIDATOR_ROLE = keccak256("VALIDATOR_ROLE");
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    // =====================================================
    // COUNTERS
    // =====================================================
    uint256 private _currentTokenId;
    uint256 private _totalReceivablesValue;

    // =====================================================
    // ENUMS
    // =====================================================
    enum ReceivableStatus {
        CREATED,           // Recém criado
        VALIDATED,         // Validado pelo oracle
        ACTIVE,           // Ativo (aguardando pagamento)
        PAID,             // Pago
        OVERDUE,          // Vencido
        CANCELLED         // Cancelado
    }

    enum DocumentType {
        NFE,              // Nota Fiscal Eletrônica
        DUPLICATA,        // Duplicata
        BOLETO,           // Boleto
        CONTRATO,         // Contrato
        OUTROS            // Outros documentos
    }

    // =====================================================
    // ESTRUTURAS PRINCIPAIS
    // =====================================================

    /**
     * @dev Estrutura do recebível físico (simplificada)
     */
    struct ReceivableDocument {
        uint256 tokenId;
        string documentNumber;
        DocumentType documentType;
        address issuer;
        string payerCNPJ;
        uint256 originalValue;
        uint256 currentValue;
        uint256 dueDate;
        ReceivableStatus status;
        bool isValidated;
        address validator;
        uint256 validationTimestamp;
        bytes32 documentHash;
        uint256 lastUpdateTimestamp;
        address lastUpdatedBy;
    }

    /**
     * @dev Estrutura para histórico de mudanças
     */
    struct StatusChange {
        uint256 timestamp;
        ReceivableStatus fromStatus;
        ReceivableStatus toStatus;
        address changedBy;
        string reason;
        bytes32 evidenceHash;       // Hash de evidência da mudança
    }

    /**
     * @dev Estrutura para pagamentos
     */
    struct PaymentRecord {
        uint256 timestamp;
        uint256 amount;
        string paymentMethod;       // "PIX", "TED", "BOLETO", etc
        string transactionId;       // ID da transação bancária
        address recordedBy;
        bytes32 proofHash;          // Hash da prova de pagamento
        bool isPartial;             // Se é pagamento parcial
    }

    // =====================================================
    // MAPPINGS
    // =====================================================
    mapping(uint256 => ReceivableDocument) public receivables;
    mapping(uint256 => StatusChange[]) public statusHistory;
    mapping(uint256 => PaymentRecord[]) public paymentHistory;
    mapping(string => uint256) public documentNumberToTokenId;
    mapping(address => uint256[]) public issuerReceivables;
    mapping(string => uint256[]) public cnpjReceivables; // Por CNPJ do pagador

    // Estatísticas
    mapping(address => uint256) public issuerTotalValue;
    mapping(string => uint256) public cnpjTotalOwed; // Total devido por CNPJ
    mapping(ReceivableStatus => uint256) public statusCount;

    // =====================================================
    // EVENTS
    // =====================================================
    event ReceivableTokenized(
        uint256 indexed tokenId,
        string indexed documentNumber,
        address indexed issuer,
        string payerCNPJ,
        uint256 value,
        uint256 dueDate,
        DocumentType documentType,
        uint256 timestamp
    );

    event ReceivableValidated(
        uint256 indexed tokenId,
        address indexed validator,
        bool isValid,
        string validationNotes,
        uint256 timestamp
    );

    event StatusChanged(
        uint256 indexed tokenId,
        ReceivableStatus indexed oldStatus,
        ReceivableStatus indexed newStatus,
        address changedBy,
        string reason,
        uint256 timestamp
    );

    event PaymentRecorded(
        uint256 indexed tokenId,
        uint256 amount,
        string paymentMethod,
        string transactionId,
        bool isPartial,
        uint256 timestamp
    );

    event DocumentUpdated(
        uint256 indexed tokenId,
        string field,
        string oldValue,
        string newValue,
        address updatedBy,
        uint256 timestamp
    );

    // =====================================================
    // ERRORS
    // =====================================================
    error TokenNotExists(uint256 tokenId);
    error DocumentAlreadyExists(string documentNumber);
    error NotAuthorized(address caller, string action);
    error InvalidInput(string parameter);
    error InvalidStatus(ReceivableStatus current, ReceivableStatus target);
    error DocumentNotValidated(uint256 tokenId);

    // =====================================================
    // MODIFIERS
    // =====================================================
    modifier onlyValidToken(uint256 tokenId) {
        if (!exists(tokenId)) revert TokenNotExists(tokenId);
        _;
    }

    modifier onlyIssuerOrAuthorized(uint256 tokenId) {
        if (receivables[tokenId].issuer != msg.sender &&
            !hasRole(AUDITOR_ROLE, msg.sender) &&
            !hasRole(DEFAULT_ADMIN_ROLE, msg.sender)) {
            revert NotAuthorized(msg.sender, "modify");
        }
        _;
    }

    // =====================================================
    // CONSTRUCTOR
    // =====================================================
    constructor(string memory uri) ERC1155(uri) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(VALIDATOR_ROLE, msg.sender);
        _grantRole(AUDITOR_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
    }

    // =====================================================
    // ESTRUTURAS PARA PARÂMETROS
    // =====================================================

    struct TokenizeParams {
        string documentNumber;
        DocumentType documentType;
        string issuerName;
        string issuerCNPJ;
        string payerName;
        string payerCNPJ;
        uint256 originalValue;
        uint256 dueDate;
        string ipfsHash;
        bytes32 documentHash;
        string description;
    }

    struct ProtocolStats {
        uint256 totalReceivables;
        uint256 totalValue;
        uint256 createdCount;
        uint256 validatedCount;
        uint256 activeCount;
        uint256 paidCount;
        uint256 overdueCount;
        uint256 cancelledCount;
    }

    struct CNPJSummary {
        uint256 totalReceivables;
        uint256 totalValue;
        uint256 paidValue;
        uint256 pendingValue;
        uint256 overdueCount;
    }

    // =====================================================
    // TOKENIZAÇÃO DE RECEBÍVEIS
    // =====================================================

    /**
     * @dev Tokeniza um documento de recebível
     */
    function tokenizeReceivable(
        TokenizeParams memory params
    ) external onlyRole(ISSUER_ROLE) whenNotPaused returns (uint256) {
        // Validações básicas
        if (bytes(params.documentNumber).length == 0) revert InvalidInput("documentNumber");
        if (params.originalValue == 0) revert InvalidInput("originalValue");
        if (params.dueDate <= block.timestamp) revert InvalidInput("dueDate");
        if (documentNumberToTokenId[params.documentNumber] != 0) {
            revert DocumentAlreadyExists(params.documentNumber);
        }

        // Incrementar contador
        ++_currentTokenId;
        uint256 newTokenId = _currentTokenId;

        // Criar recebível
        _createReceivableDocument(newTokenId, params);

        // Mint token representativo (quantidade 1 = documento único)
        _mint(msg.sender, newTokenId, 1, "");

        // Atualizar mappings e estatísticas
        _updateMappingsAndStats(newTokenId, params);

        // Registrar mudança de status inicial
        statusHistory[newTokenId].push(StatusChange({
            timestamp: block.timestamp,
            fromStatus: ReceivableStatus.CREATED, // Mesmo status inicial para log
            toStatus: ReceivableStatus.CREATED,
            changedBy: msg.sender,
            reason: "Initial creation",
            evidenceHash: params.documentHash
        }));

        emit ReceivableTokenized(
            newTokenId,
            params.documentNumber,
            msg.sender,
            params.payerCNPJ,
            params.originalValue,
            params.dueDate,
            params.documentType,
            block.timestamp
        );

        return newTokenId;
    }

    // =====================================================
    // VALIDAÇÃO E AUDITORIA
    // =====================================================

    /**
     * @dev Valida um recebível após verificação da documentação
     */
    function validateReceivable(
        uint256 _tokenId,
        bool _isValid,
        string memory _validationNotes,
        uint256 _adjustedValue
    ) external onlyRole(VALIDATOR_ROLE) onlyValidToken(_tokenId) {
        ReceivableDocument storage receivable = receivables[_tokenId];

        if (receivable.isValidated) revert InvalidInput("alreadyValidated");

        receivable.isValidated = true;
        receivable.validator = msg.sender;
        receivable.validationTimestamp = block.timestamp;
        receivable.lastUpdateTimestamp = block.timestamp;
        receivable.lastUpdatedBy = msg.sender;

        if (_adjustedValue > 0 && _adjustedValue != receivable.currentValue) {
            receivable.currentValue = _adjustedValue;
        }

        ReceivableStatus newStatus = _isValid ? ReceivableStatus.VALIDATED : ReceivableStatus.CANCELLED;
        _changeStatus(_tokenId, newStatus, "Validation completed", bytes32(0));

        emit ReceivableValidated(_tokenId, msg.sender, _isValid, _validationNotes, block.timestamp);
    }

    /**
     * @dev Ativa um recebível validado
     */
    function activateReceivable(
        uint256 _tokenId,
        string memory _reason
    ) external onlyIssuerOrAuthorized(_tokenId) onlyValidToken(_tokenId) {
        ReceivableDocument storage receivable = receivables[_tokenId];

        if (!receivable.isValidated) revert DocumentNotValidated(_tokenId);
        if (receivable.status != ReceivableStatus.VALIDATED) {
            revert InvalidStatus(receivable.status, ReceivableStatus.ACTIVE);
        }

        _changeStatus(_tokenId, ReceivableStatus.ACTIVE, _reason, bytes32(0));
    }

    // =====================================================
    // GESTÃO DE PAGAMENTOS
    // =====================================================

    /**
     * @dev Registra um pagamento (total ou parcial)
     */
    function recordPayment(
        uint256 _tokenId,
        uint256 _amount,
        string memory _paymentMethod,
        string memory _transactionId,
        bytes32 _proofHash
    ) external onlyIssuerOrAuthorized(_tokenId) onlyValidToken(_tokenId) {
        ReceivableDocument storage receivable = receivables[_tokenId];

        if (receivable.status != ReceivableStatus.ACTIVE && receivable.status != ReceivableStatus.OVERDUE) {
            revert InvalidStatus(receivable.status, ReceivableStatus.PAID);
        }

        if (_amount == 0 || _amount > receivable.currentValue) revert InvalidInput("amount");

        bool isPartial = _amount < receivable.currentValue;

        // Registrar pagamento
        paymentHistory[_tokenId].push(PaymentRecord({
            timestamp: block.timestamp,
            amount: _amount,
            paymentMethod: _paymentMethod,
            transactionId: _transactionId,
            recordedBy: msg.sender,
            proofHash: _proofHash,
            isPartial: isPartial
        }));

        // Atualizar valor atual
        receivable.currentValue -= _amount;
        receivable.lastUpdateTimestamp = block.timestamp;
        receivable.lastUpdatedBy = msg.sender;

        // Atualizar status
        if (receivable.currentValue == 0) {
            _changeStatus(_tokenId, ReceivableStatus.PAID, "Full payment received", _proofHash);

            // Atualizar estatísticas
            cnpjTotalOwed[receivable.payerCNPJ] -= _amount;
        } else {
            string memory reason = string(abi.encodePacked("Partial payment: ", _paymentMethod));
            _changeStatus(_tokenId, receivable.status, reason, _proofHash); // Manter status atual
        }

        emit PaymentRecorded(
            _tokenId,
            _amount,
            _paymentMethod,
            _transactionId,
            isPartial,
            block.timestamp
        );
    }

    /**
     * @dev Marca como vencido
     */
    function markAsOverdue(
        uint256 _tokenId,
        string memory _reason
    ) external onlyRole(AUDITOR_ROLE) onlyValidToken(_tokenId) {
        ReceivableDocument storage receivable = receivables[_tokenId];

        if (block.timestamp <= receivable.dueDate) revert InvalidInput("notDueYet");
        if (receivable.status != ReceivableStatus.ACTIVE) {
            revert InvalidStatus(receivable.status, ReceivableStatus.OVERDUE);
        }

        _changeStatus(_tokenId, ReceivableStatus.OVERDUE, _reason, bytes32(0));
    }

    /**
     * @dev Cancela um recebível
     */
    function cancelReceivable(
        uint256 _tokenId,
        string memory _reason,
        bytes32 _evidenceHash
    ) external onlyIssuerOrAuthorized(_tokenId) onlyValidToken(_tokenId) {
        _changeStatus(_tokenId, ReceivableStatus.CANCELLED, _reason, _evidenceHash);
    }

    // =====================================================
    // FUNÇÕES INTERNAS
    // =====================================================

    function _createReceivableDocument(uint256 tokenId, TokenizeParams memory params) internal {
        receivables[tokenId] = ReceivableDocument({
            tokenId: tokenId,
            documentNumber: params.documentNumber,
            documentType: params.documentType,
            issuer: msg.sender,
            payerCNPJ: params.payerCNPJ,
            originalValue: params.originalValue,
            currentValue: params.originalValue,
            dueDate: params.dueDate,
            status: ReceivableStatus.CREATED,
            isValidated: false,
            validator: address(0),
            validationTimestamp: 0,
            documentHash: params.documentHash,
            lastUpdateTimestamp: block.timestamp,
            lastUpdatedBy: msg.sender
        });
    }

    function _updateMappingsAndStats(uint256 tokenId, TokenizeParams memory params) internal {
        // Atualizar mappings
        documentNumberToTokenId[params.documentNumber] = tokenId;
        issuerReceivables[msg.sender].push(tokenId);
        cnpjReceivables[params.payerCNPJ].push(tokenId);

        // Atualizar estatísticas
        issuerTotalValue[msg.sender] += params.originalValue;
        cnpjTotalOwed[params.payerCNPJ] += params.originalValue;
        statusCount[ReceivableStatus.CREATED]++;
        _totalReceivablesValue += params.originalValue;
    }

    function _changeStatus(
        uint256 _tokenId,
        ReceivableStatus _newStatus,
        string memory _reason,
        bytes32 _evidenceHash
    ) internal {
        ReceivableDocument storage receivable = receivables[_tokenId];
        ReceivableStatus oldStatus = receivable.status;

        if (oldStatus == _newStatus) return; // Não mudar se for o mesmo status

        // Atualizar contadores
        statusCount[oldStatus]--;
        statusCount[_newStatus]++;

        // Atualizar recebível
        receivable.status = _newStatus;
        receivable.lastUpdateTimestamp = block.timestamp;
        receivable.lastUpdatedBy = msg.sender;

        // Registrar histórico
        statusHistory[_tokenId].push(StatusChange({
            timestamp: block.timestamp,
            fromStatus: oldStatus,
            toStatus: _newStatus,
            changedBy: msg.sender,
            reason: _reason,
            evidenceHash: _evidenceHash
        }));

        emit StatusChanged(_tokenId, oldStatus, _newStatus, msg.sender, _reason, block.timestamp);
    }

    // =====================================================
    // FUNÇÕES DE CONSULTA
    // =====================================================

    /**
     * @dev Obtém detalhes completos de um recebível
     */
    function getReceivableDetails(uint256 _tokenId)
        external view onlyValidToken(_tokenId) returns (ReceivableDocument memory) {
        return receivables[_tokenId];
    }

    /**
     * @dev Obtém histórico de mudanças de status
     */
    function getStatusHistory(uint256 _tokenId)
        external view onlyValidToken(_tokenId) returns (StatusChange[] memory) {
        return statusHistory[_tokenId];
    }

    /**
     * @dev Obtém histórico de pagamentos
     */
    function getPaymentHistory(uint256 _tokenId)
        external view onlyValidToken(_tokenId) returns (PaymentRecord[] memory) {
        return paymentHistory[_tokenId];
    }

    /**
     * @dev Obtém todos os recebíveis de um emissor
     */
    function getIssuerReceivables(address _issuer)
        external view returns (uint256[] memory) {
        return issuerReceivables[_issuer];
    }

    /**
     * @dev Obtém todos os recebíveis de um CNPJ pagador
     */
    function getCNPJReceivables(string memory _cnpj)
        external view returns (uint256[] memory) {
        return cnpjReceivables[_cnpj];
    }

    /**
     * @dev Verifica se um documento já foi tokenizado
     */
    function isDocumentTokenized(string memory _documentNumber)
        external view returns (bool, uint256) {
        uint256 tokenId = documentNumberToTokenId[_documentNumber];
        return (tokenId != 0, tokenId);
    }

    /**
     * @dev Obtém estatísticas gerais
     */
    function getProtocolStats() external view returns (ProtocolStats memory stats) {
        stats.totalReceivables = _currentTokenId;
        stats.totalValue = _totalReceivablesValue;
        stats.createdCount = statusCount[ReceivableStatus.CREATED];
        stats.validatedCount = statusCount[ReceivableStatus.VALIDATED];
        stats.activeCount = statusCount[ReceivableStatus.ACTIVE];
        stats.paidCount = statusCount[ReceivableStatus.PAID];
        stats.overdueCount = statusCount[ReceivableStatus.OVERDUE];
        stats.cancelledCount = statusCount[ReceivableStatus.CANCELLED];
    }

    /**
     * @dev Obtém resumo de um CNPJ
     */
    function getCNPJSummary(string memory _cnpj) external view returns (CNPJSummary memory summary) {
        uint256[] memory tokenIds = cnpjReceivables[_cnpj];

        for (uint256 i = 0; i < tokenIds.length; i++) {
            ReceivableDocument memory receivable = receivables[tokenIds[i]];
            summary.totalReceivables++;
            summary.totalValue += receivable.originalValue;

            if (receivable.status == ReceivableStatus.PAID) {
                summary.paidValue += receivable.originalValue;
            } else if (receivable.status == ReceivableStatus.OVERDUE) {
                summary.overdueCount++;
                summary.pendingValue += receivable.currentValue;
            } else if (receivable.status == ReceivableStatus.ACTIVE) {
                summary.pendingValue += receivable.currentValue;
            }
        }
    }

    /**
     * @dev Verifica se token existe
     */
    function exists(uint256 _tokenId) public view override returns (bool) {
        return totalSupply(_tokenId) > 0;
    }

    // =====================================================
    // FUNÇÕES ADMINISTRATIVAS
    // =====================================================

    /**
     * @dev Atualizar URI base
     */
    function setURI(string memory _newURI) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _setURI(_newURI);
    }

    /**
     * @dev Pausar protocolo
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /**
     * @dev Adicionar observações a um recebível
     */
    function addNotes(
        uint256 _tokenId,
        string memory _notes
    ) external onlyIssuerOrAuthorized(_tokenId) onlyValidToken(_tokenId) {
        ReceivableDocument storage receivable = receivables[_tokenId];
        receivable.lastUpdateTimestamp = block.timestamp;
        receivable.lastUpdatedBy = msg.sender;

        emit DocumentUpdated(_tokenId, "notes", "", _notes, msg.sender, block.timestamp);
    }

    /**
     * @dev Atualizar hash IPFS
     */
    function updateIPFSHash(
        uint256 _tokenId,
        string memory _newHash
    ) external onlyIssuerOrAuthorized(_tokenId) onlyValidToken(_tokenId) {
        ReceivableDocument storage receivable = receivables[_tokenId];
        receivable.lastUpdateTimestamp = block.timestamp;
        receivable.lastUpdatedBy = msg.sender;

        emit DocumentUpdated(_tokenId, "ipfsHash", "", _newHash, msg.sender, block.timestamp);
    }

    // =====================================================
    // OVERRIDES NECESSÁRIOS
    // =====================================================

    function _update(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values
    ) internal override(ERC1155, ERC1155Supply) {
        super._update(from, to, ids, values);
    }

    function supportsInterface(bytes4 interfaceId)
        public view override(ERC1155, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
