# Documentação Completa: Sistema de Account Abstraction para Instituições Financeiras

Este documento fornece uma visão detalhada e completa do **Sistema de Account Abstraction (ERC-4337)**, uma solução de nível empresarial projetada para instituições financeiras que operam sobre a plataforma **Hyperledger Besu**.

O objetivo é fornecer um framework seguro, modular e em conformidade com as regulamentações do setor financeiro, permitindo a gestão de contas de contrato inteligente (Smart Contract Wallets) com funcionalidades avançadas de governança, risco e auditoria.

---

## 1. Visão Geral e Conceitos

### 1.1. O que é Account Abstraction (ERC-4337)?

O **ERC-4337** é um padrão Ethereum que permite a "abstração de contas" sem a necessidade de alterações no protocolo core da blockchain. Na prática, ele possibilita que contas de contrato inteligente (Smart Contracts) atuem como contas de primeira classe, capazes de iniciar transações e pagar por gas. Isso abre portas para funcionalidades inovadoras, como:

-   **Pagamento de Gas por Terceiros (Paymasters)**: O banco pode subsidiar as taxas de transação de seus clientes.
-   **Flexibilidade de Assinatura**: Uso de multi-assinaturas, chaves pós-quânticas, ou até mesmo autenticação biométrica (via webauthn).
-   **Recuperação Social**: Mecanismos seguros para recuperar o acesso à conta em caso de perda da chave privada.
-   **Lógica Customizada**: Implementação de regras de negócio, como limites de gastos e listas de permissão/bloqueio, diretamente na conta.

### 1.2. Componentes do ERC-4337

-   **`UserOperation`**: Uma estrutura de dados que descreve uma transação a ser executada em nome do usuário. É assinada pelo usuário e enviada a uma mempool específica.
-   **`EntryPoint`**: Contrato singleton e global que orquestra a validação e execução das `UserOperations`. Ele é o ponto de entrada confiável do sistema.
-   **`Bundler`**: Um serviço off-chain que "empacota" múltiplas `UserOperations` em uma única transação e a submete ao `EntryPoint`.
-   **Conta de Contrato Inteligente (Smart Contract Wallet)**: A própria conta do usuário, que implementa a lógica de validação (`validateUserOp`) e execução. No nosso caso, é a `AABankAccount`.
-   **`Paymaster`**: Contrato opcional que pode pagar pelas taxas de gas em nome do usuário.

---

## 2. 🏗️ Arquitetura Detalhada da Solução

A solução é composta por um conjunto de contratos modulares e interconectados, cada um com uma responsabilidade clara, garantindo a separação de preocupações e a extensibilidade.

![Diagrama de Arquitetura (Conceitual)](https://i.imgur.com/your-diagram-image.png) <!-- Placeholder para um diagrama -->

### 2.1. Contratos Principais

#### 2.1.1. `AABankManager.sol`
-   **Propósito**: É o coração administrativo do sistema. Atua como uma **Factory** para a criação de novas `AABankAccount` e como um **Gerenciador** central para políticas globais e controle de acesso.
-   **Principais Responsabilidades**:
    -   Registrar e gerenciar as instituições financeiras (`BankInfo`) que utilizam o sistema.
    -   Criar novas contas de clientes (`AABankAccount`) de forma determinística usando `Clones` (proxy mínimo) para economizar gas.
    -   Administrar um sistema de controle de acesso hierárquico (`AccessControl`) com roles como `SUPER_ADMIN`, `BANK_ADMIN`, `COMPLIANCE_OFFICER`, etc.
    -   Definir e atualizar limites globais de transação.
    -   Gerenciar o ciclo de vida das contas (e.g., `emergencyFreezeAccount`, `unfreezeAccount`).
    -   Servir como um ponto central de log para atividades de alto nível através do `AuditLogger`.

#### 2.1.2. `AABankAccount.sol`
-   **Propósito**: É a implementação da conta de contrato inteligente do cliente final. Herda de `BaseAccount` (padrão do ERC-4337) e adiciona a lógica de negócio bancário.
-   **Principais Responsabilidades**:
    -   Implementar a função `_validateSignature` para verificar a assinatura do proprietário da conta.
    -   Orquestrar o fluxo de validação em camadas, chamando os validadores externos (`KYCAMLValidator`, `TransactionLimits`, etc.) durante a execução de uma `UserOperation`.
    -   Implementar a lógica de execução de transações (`execute` e `executeBatch`).
    -   Gerenciar o estado interno da conta, como `status` (ACTIVE, FROZEN, etc.) e configurações de limites específicos.
    -   Conter a lógica para transações que exigem multi-assinatura, interagindo com o `MultiSignatureValidator`.

### 2.2. Módulos de Validação e Segurança

Estes contratos são chamados pela `AABankAccount` para aplicar regras de negócio específicas.

#### 2.2.1. `KYCAMLValidator.sol`
-   **Propósito**: Centraliza todas as regras de compliance relacionadas a "Know Your Customer" e "Anti-Money Laundering".
-   **Funcionalidades**:
    -   **Gestão de KYC**: Permite que um `KYC_OFFICER` atualize o status KYC de um usuário (e.g., `VERIFIED`, `REJECTED`), com data de expiração.
    -   **Validação AML**: Analisa transações para detectar atividades suspeitas.
    -   **Scoring de Risco**: Calcula um "score de risco" para cada transação com base em fatores como valor, destino, frequência e perfil do usuário.
    -   **Gestão de Listas de Sanções**: Mantém listas de endereços bloqueados, impedindo transações de/para eles.

#### 2.2.2. `TransactionLimits.sol`
-   **Propósito**: Gerencia e aplica políticas de limites de gastos para as contas.
-   **Funcionalidades**:
    -   **Limites Temporais**: Controla os gastos totais em janelas de tempo (diária, semanal, mensal).
    -   **Limite por Transação**: Define um valor máximo para uma única transação.
    -   **Controle de Velocidade (Velocity Limit)**: Limita o número de transações em um curto período para mitigar ataques automatizados.
    -   **Overrides de Emergência**: Permite que um `EMERGENCY_MANAGER` autorize uma transação que excederia os limites em situações excepcionais.

#### 2.2.3. `MultiSignatureValidator.sol`
-   **Propósito**: Adiciona uma camada de segurança para transações de alto valor, exigindo múltiplas aprovações.
-   **Funcionalidades**:
    -   **Configuração por Conta**: Cada conta pode ter sua própria configuração de multi-sig (número de assinaturas, valor do threshold).
    -   **Gestão de Signatários com Roles e Pesos**: Permite adicionar signatários com diferentes "pesos" e "funções" (`OPERATOR`, `SUPERVISOR`), possibilitando aprovações hierárquicas.
    -   **Timelock**: Impõe um atraso entre a aprovação final e a execução da transação, como uma janela para cancelamento de emergência.
    -   **Gestão de Transações Pendentes**: Mantém o registro de propostas de transação e suas aprovações.

#### 2.2.4. `SocialRecovery.sol`
-   **Propósito**: Fornece um mecanismo seguro para que os usuários recuperem o acesso às suas contas caso percam suas chaves privadas.
-   **Funcionalidades**:
    -   **Gestão de Guardiões**: O usuário pode designar um conjunto de "guardiões" (outras contas, dispositivos, ou a própria instituição).
    -   **Processo de Recuperação**: Para recuperar a conta, uma proposta de troca de proprietário deve ser aprovada por um número mínimo de guardiões.
    -   **Delay de Segurança**: Após as aprovações, um período de espera (`recoveryDelay`) é acionado antes que a troca de proprietário possa ser executada.
    -   **Cooldown**: Previne tentativas de recuperação sucessivas e maliciosas.

### 2.3. Módulo de Auditoria

#### 2.3.1. `AuditLogger.sol`
-   **Propósito**: Funciona como o "livro-razão" imutável de todo o sistema.
-   **Funcionalidades**:
    -   **Registro Centralizado**: Todos os outros contratos reportam eventos críticos para o `AuditLogger`.
    -   **Eventos Categorizados e com Severidade**: Os logs são classificados por categoria (`TRANSACTION`, `COMPLIANCE`, `SECURITY`) и severidade (`INFO`, `WARNING`, `CRITICAL`).
    -   **Busca e Indexação**: Mantém índices para facilitar a busca de eventos por ator, alvo, categoria ou tipo.
    -   **Geração de Relatórios**: Permite que um `COMPLIANCE_OFFICER` gere relatórios de atividades em um determinado período para fins de auditoria externa ou interna.

---

## 3. 🔐 Segurança, Risco e Compliance

A segurança é o pilar fundamental desta solução, implementada através de múltiplas camadas.

### 3.1. Controle de Acesso (Roles)

O sistema utiliza o `AccessControl` do OpenZeppelin para uma gestão granular de permissões.

| Role                  | Contrato(s) Gerenciador(es) | Responsabilidades Principais                                                              |
| --------------------- | --------------------------- | ----------------------------------------------------------------------------------------- |
| `SUPER_ADMIN`         | `AABankManager`             | Gerencia o sistema como um todo: registra bancos, pausa/despausa o sistema.             |
| `BANK_ADMIN`          | `AABankManager`             | Gerencia um banco específico: cria contas de clientes, gerencia roles de nível inferior.  |
| `COMPLIANCE_OFFICER`  | `AABankManager`, `KYCAMLValidator` | Gerencia o status KYC/AML, congela contas suspeitas, gera relatórios de auditoria.      |
| `RISK_MANAGER`        | `AABankManager`, `TransactionLimits` | Define e ajusta os limites de transação globais e por conta.                          |
| `SIGNER_MANAGER`      | `MultiSignatureValidator`   | Adiciona e remove signatários de uma configuração multi-sig.                              |
| `GUARDIAN_MANAGER`    | `SocialRecovery`            | Adiciona e remove guardiões para o processo de recuperação social.                        |
| `EMERGENCY_MANAGER`   | Vários                      | Executa ações de emergência, como overrides de limites ou recuperação forçada.          |

### 3.2. Ciclo de Vida e Status da Conta

Uma `AABankAccount` pode existir em vários estados, gerenciados pelo `AABankManager`:

-   `ACTIVE`: Operacional, pode executar transações normalmente.
-   `FROZEN`: Congelada por um `COMPLIANCE_OFFICER`. Não pode executar transações. Usado para investigações de segurança ou compliance.
-   `SUSPENDED`: Suspensa por violação de políticas. Similar a `FROZEN`, mas indica uma ação administrativa.
-   `RECOVERING`: A conta está em processo de recuperação social. Transações são bloqueadas até que o processo seja concluído ou cancelado.
-   `CLOSED`: Encerrada permanentemente. Nenhuma ação é permitida.

### 3.3. Conformidade Regulatória

-   **LGPD/GDPR**: Dados pessoais sensíveis (como documentos) não são armazenados on-chain. Apenas hashes (`documentHash`) são mantidos como prova de verificação.
-   **Prevenção à Lavagem de Dinheiro (AML)**: O `KYCAMLValidator` e o `TransactionLimits` trabalham em conjunto para monitorar o comportamento transacional, identificar padrões suspeitos (alta velocidade, valores atípicos) e bloquear transações com endereços sancionados.
-   **Rastreabilidade e Auditoria (BACEN, Basel III)**: O `AuditLogger` garante que todas as operações sejam registradas em um log imutável, fornecendo uma trilha de auditoria completa e exportável, essencial para a conformidade regulatória.

---

## 4. 🧪 Testes e Verificação

A robustez do sistema é garantida por uma suíte de testes completa utilizando o framework **Foundry**.

-   **Localização**: `/test`
-   **Contrato Base**: `BaseTest.sol` é a fundação de todos os testes. Ele realiza a configuração inicial do ambiente, incluindo:
    -   Deploy de todos os contratos do sistema.
    -   Criação e atribuição de todos os roles de acesso (`superAdmin`, `bankAdmin`, etc.).
    -   Provisionamento de contas de teste com fundos.
    -   Registro de bancos de teste (`SANTANDER`, `ITAU`, `CAIXA`).
-   **Testes de Unidade e Integração**:
    -   `AABankManager.t.sol`: Cobre todos os aspectos do gerenciador de contas, desde o registro de um banco até a criação e o congelamento de contas, testando rigorosamente as permissões de cada ação.
    -   `KYCAMLValidator.t.sol`: Valida o fluxo de aprovação de KYC, a expiração, a adição de endereços a listas de sanções e a lógica de cálculo de risco.
-   **Como Executar**:
    ```bash
    # Executar todos os testes
    forge test -vv

    # Executar testes de um contrato específico
    forge test --match-contract AABankManagerTest

    # Gerar relatório de cobertura de código
    forge coverage
    ```

---

## 5. 🚀 Guia de Uso e Exemplos Práticos

### 5.1. Configuração e Deploy

1.  **Instale as dependências**:
    ```bash
    forge install
    ```
2.  **Configure o Ambiente**: Crie um arquivo `.env` com as variáveis de ambiente necessárias (RPC_URL, chaves privadas, etc.).
3.  **Execute o Script de Deploy**:
    ```bash
    forge script script/DeployAABanking.s.sol:DeployAABankingScript --rpc-url $RPC_URL --broadcast
    ```

### 5.2. Exemplos de Interação (Solidity)

#### Cenário 1: Onboarding de um Novo Cliente

```solidity
// 1. O SUPER_ADMIN registra o "Banco Exemplo"
// Pré-requisito: msg.sender é o SUPER_ADMIN
bytes32 bancoId = keccak256("BANCO_EXEMPLO");
bankManager.registerBank(bancoId, "Banco Exemplo S.A.", bankAdminAddress);

// 2. O BANK_ADMIN cria a conta para o cliente `userAddress`
// Pré-requisito: msg.sender é o bankAdminAddress
bytes memory initData = abi.encode(...); // Configurações iniciais da conta
address userAccount = bankManager.createBankAccount(userAddress, bancoId, 0, initData);

// 3. O COMPLIANCE_OFFICER aprova o KYC do cliente
// Pré-requisito: msg.sender tem o role COMPLIANCE_OFFICER
bytes32 docHash = keccak256("HASH_DO_DOCUMENTO_DO_CLIENTE");
kycAmlValidator.updateKYCStatus(userAddress, IKYCAMLValidator.KYCStatus.VERIFIED, block.timestamp + 365 days, docHash);
```

#### Cenário 2: Transação de Alto Valor com Multi-Sig

```solidity
// 1. O BANK_ADMIN configura o multi-sig para a conta `userAccount`
// Pré-requisito: msg.sender tem o role MULTISIG_ADMIN
IMultiSignatureValidator.MultiSigConfig memory msConfig = ...;
multiSigValidator.setMultiSigConfig(userAccount, msConfig);
multiSigValidator.addSigner(userAccount, signer1, SignerRole.OPERATOR, 100);
multiSigValidator.addSigner(userAccount, signer2, SignerRole.SUPERVISOR, 100);

// 2. O usuário inicia uma transação de alto valor (acima do threshold)
// Esta chamada normalmente viria de uma UserOperation
bytes32 txHash = multiSigValidator.createTransaction(userAccount, targetAddress, amount, data);

// 3. Os signatários aprovam a transação
// Pré-requisito: msg.sender é signer1
multiSigValidator.approveTransaction(userAccount, txHash);

// Pré-requisito: msg.sender é signer2
multiSigValidator.approveTransaction(userAccount, txHash);

// 4. Após o timelock, qualquer um pode executar a transação
// vm.warp(block.timestamp + timelock + 1); // Em testes
multiSigValidator.executeTransaction(userAccount, txHash);
```

#### Cenário 3: Processo de Recuperação Social

```solidity
// 1. O BANK_ADMIN configura os guardiões para `userAccount`
socialRecovery.addGuardian(userAccount, guardian1, GuardianType.FAMILY, 100, "metadata1");
socialRecovery.addGuardian(userAccount, guardian2, GuardianType.INSTITUTION, 100, "metadata2");

// 2. Um guardião inicia a recuperação para um `newOwnerAddress`
// Pré-requisito: msg.sender é guardian1
bytes32 requestId = socialRecovery.initiateRecovery(userAccount, newOwnerAddress, "Perda de chave");

// 3. Outro guardião aprova a recuperação
// Pré-requisito: msg.sender é guardian2
socialRecovery.approveRecovery(userAccount, requestId);

// 4. Após o delay de segurança, a recuperação pode ser executada
// vm.warp(block.timestamp + recoveryDelay + 1); // Em testes
// A execução notificará a AABankAccount para trocar o proprietário.
socialRecovery.executeRecovery(userAccount, requestId);
```

---

## 6. 🛠️ Extensibilidade

A arquitetura modular foi projetada para ser facilmente extensível. Por exemplo, para adicionar um novo módulo de validação (e.g., `FraudDetectorValidator`):

1.  **Crie a Interface**: Defina a interface `IFraudDetectorValidator.sol`.
2.  **Implemente o Contrato**: Crie o contrato `FraudDetectorValidator.sol` que implementa a interface.
3.  **Adicione ao `AABankAccount`**:
    -   Adicione uma variável de estado: `IFraudDetectorValidator public fraudDetector;`.
    -   Adicione uma função para configurar o endereço do validador: `setFraudDetector(...)`.
    -   Chame a função de validação do novo módulo dentro da função `_validateSignature` ou `execute` da `AABankAccount`.
4.  **Atualize o Deploy Script**: Adicione o deploy do novo contrato no script de deploy.

Este padrão de design permite adicionar novas camadas de segurança e lógica de negócio sem modificar o core do sistema existente.
