-- DROP SCHEMA public;

CREATE SCHEMA public AUTHORIZATION pg_database_owner;

COMMENT ON SCHEMA public IS 'standard public schema';

-- DROP SEQUENCE public.account_events_id_seq;

CREATE SEQUENCE public.account_events_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 9223372036854775807
	START 1
	CACHE 1
	NO CYCLE;

-- Permissions

ALTER SEQUENCE public.account_events_id_seq OWNER TO explorer;
GRANT ALL ON SEQUENCE public.account_events_id_seq TO explorer;

-- DROP SEQUENCE public.account_events_id_seq1;

CREATE SEQUENCE public.account_events_id_seq1
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 9223372036854775807
	START 1
	CACHE 1
	NO CYCLE;

-- Permissions

ALTER SEQUENCE public.account_events_id_seq1 OWNER TO explorer;
GRANT ALL ON SEQUENCE public.account_events_id_seq1 TO explorer;

-- DROP SEQUENCE public.account_method_stats_id_seq;

CREATE SEQUENCE public.account_method_stats_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 9223372036854775807
	START 1
	CACHE 1
	NO CYCLE;

-- Permissions

ALTER SEQUENCE public.account_method_stats_id_seq OWNER TO explorer;
GRANT ALL ON SEQUENCE public.account_method_stats_id_seq TO explorer;

-- DROP SEQUENCE public.account_method_stats_id_seq1;

CREATE SEQUENCE public.account_method_stats_id_seq1
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 9223372036854775807
	START 1
	CACHE 1
	NO CYCLE;

-- Permissions

ALTER SEQUENCE public.account_method_stats_id_seq1 OWNER TO explorer;
GRANT ALL ON SEQUENCE public.account_method_stats_id_seq1 TO explorer;

-- DROP SEQUENCE public.account_transactions_id_seq;

CREATE SEQUENCE public.account_transactions_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 9223372036854775807
	START 1
	CACHE 1
	NO CYCLE;

-- Permissions

ALTER SEQUENCE public.account_transactions_id_seq OWNER TO explorer;
GRANT ALL ON SEQUENCE public.account_transactions_id_seq TO explorer;

-- DROP SEQUENCE public.account_transactions_id_seq1;

CREATE SEQUENCE public.account_transactions_id_seq1
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 9223372036854775807
	START 1
	CACHE 1
	NO CYCLE;

-- Permissions

ALTER SEQUENCE public.account_transactions_id_seq1 OWNER TO explorer;
GRANT ALL ON SEQUENCE public.account_transactions_id_seq1 TO explorer;

-- DROP SEQUENCE public.contract_interactions_id_seq;

CREATE SEQUENCE public.contract_interactions_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 9223372036854775807
	START 1
	CACHE 1
	NO CYCLE;

-- Permissions

ALTER SEQUENCE public.contract_interactions_id_seq OWNER TO explorer;
GRANT ALL ON SEQUENCE public.contract_interactions_id_seq TO explorer;

-- DROP SEQUENCE public.contract_interactions_id_seq1;

CREATE SEQUENCE public.contract_interactions_id_seq1
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 9223372036854775807
	START 1
	CACHE 1
	NO CYCLE;

-- Permissions

ALTER SEQUENCE public.contract_interactions_id_seq1 OWNER TO explorer;
GRANT ALL ON SEQUENCE public.contract_interactions_id_seq1 TO explorer;

-- DROP SEQUENCE public.smart_contract_daily_metrics_id_seq;

CREATE SEQUENCE public.smart_contract_daily_metrics_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;

-- Permissions

ALTER SEQUENCE public.smart_contract_daily_metrics_id_seq OWNER TO explorer;
GRANT ALL ON SEQUENCE public.smart_contract_daily_metrics_id_seq TO explorer;

-- DROP SEQUENCE public.smart_contract_daily_metrics_id_seq1;

CREATE SEQUENCE public.smart_contract_daily_metrics_id_seq1
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;

-- Permissions

ALTER SEQUENCE public.smart_contract_daily_metrics_id_seq1 OWNER TO explorer;
GRANT ALL ON SEQUENCE public.smart_contract_daily_metrics_id_seq1 TO explorer;

-- DROP SEQUENCE public.smart_contract_events_id_seq;

CREATE SEQUENCE public.smart_contract_events_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;

-- Permissions

ALTER SEQUENCE public.smart_contract_events_id_seq OWNER TO explorer;
GRANT ALL ON SEQUENCE public.smart_contract_events_id_seq TO explorer;

-- DROP SEQUENCE public.smart_contract_events_id_seq1;

CREATE SEQUENCE public.smart_contract_events_id_seq1
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;

-- Permissions

ALTER SEQUENCE public.smart_contract_events_id_seq1 OWNER TO explorer;
GRANT ALL ON SEQUENCE public.smart_contract_events_id_seq1 TO explorer;

-- DROP SEQUENCE public.smart_contract_functions_id_seq;

CREATE SEQUENCE public.smart_contract_functions_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;

-- Permissions

ALTER SEQUENCE public.smart_contract_functions_id_seq OWNER TO explorer;
GRANT ALL ON SEQUENCE public.smart_contract_functions_id_seq TO explorer;

-- DROP SEQUENCE public.smart_contract_functions_id_seq1;

CREATE SEQUENCE public.smart_contract_functions_id_seq1
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;

-- Permissions

ALTER SEQUENCE public.smart_contract_functions_id_seq1 OWNER TO explorer;
GRANT ALL ON SEQUENCE public.smart_contract_functions_id_seq1 TO explorer;

-- DROP SEQUENCE public.transaction_methods_id_seq;

CREATE SEQUENCE public.transaction_methods_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 9223372036854775807
	START 1
	CACHE 1
	NO CYCLE;

-- Permissions

ALTER SEQUENCE public.transaction_methods_id_seq OWNER TO explorer;
GRANT ALL ON SEQUENCE public.transaction_methods_id_seq TO explorer;

-- DROP SEQUENCE public.transaction_methods_id_seq1;

CREATE SEQUENCE public.transaction_methods_id_seq1
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 9223372036854775807
	START 1
	CACHE 1
	NO CYCLE;

-- Permissions

ALTER SEQUENCE public.transaction_methods_id_seq1 OWNER TO explorer;
GRANT ALL ON SEQUENCE public.transaction_methods_id_seq1 TO explorer;

-- DROP SEQUENCE public.user_sessions_id_seq;

CREATE SEQUENCE public.user_sessions_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;

-- Permissions

ALTER SEQUENCE public.user_sessions_id_seq OWNER TO explorer;
GRANT ALL ON SEQUENCE public.user_sessions_id_seq TO explorer;

-- DROP SEQUENCE public.users_id_seq;

CREATE SEQUENCE public.users_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;

-- Permissions

ALTER SEQUENCE public.users_id_seq OWNER TO explorer;
GRANT ALL ON SEQUENCE public.users_id_seq TO explorer;
-- public.account_events definition

-- Drop table

-- DROP TABLE public.account_events;

CREATE TABLE public.account_events (
	id bigserial NOT NULL,
	account_address varchar(42) NOT NULL,
	event_id varchar(100) NOT NULL,
	transaction_hash varchar(66) NOT NULL,
	block_number int8 NOT NULL,
	log_index int8 NOT NULL,
	contract_address varchar(42) NOT NULL,
	contract_name varchar(100) NULL,
	event_name varchar(100) NOT NULL,
	event_signature varchar(200) NOT NULL,
	involvement_type varchar(20) NOT NULL, -- Tipo de envolvimento da conta no evento: emitter, participant, recipient
	topics jsonb NULL, -- Topics do evento em formato JSON
	decoded_data jsonb NULL, -- Dados do evento decodificados em formato JSON
	"timestamp" timestamptz DEFAULT now() NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	raw_data bytea NULL, -- Dados brutos do evento em formato binário
	updated_at timestamptz DEFAULT now() NOT NULL, -- Data e hora da última atualização do registro
	CONSTRAINT account_events_pkey PRIMARY KEY (id),
	CONSTRAINT unique_account_event UNIQUE (account_address, event_id)
);
CREATE INDEX idx_account_events_address ON public.account_events USING btree (account_address);
CREATE INDEX idx_account_events_address_timestamp ON public.account_events USING btree (account_address, "timestamp" DESC);
CREATE INDEX idx_account_events_contract ON public.account_events USING btree (contract_address);
CREATE INDEX idx_account_events_event_id ON public.account_events USING btree (event_id);
CREATE INDEX idx_account_events_involvement ON public.account_events USING btree (involvement_type);
CREATE INDEX idx_account_events_name ON public.account_events USING btree (event_name);
CREATE INDEX idx_account_events_timestamp ON public.account_events USING btree ("timestamp" DESC);
COMMENT ON TABLE public.account_events IS 'Tabela para tracking de eventos de smart contracts relacionados a uma conta';

-- Column comments

COMMENT ON COLUMN public.account_events.involvement_type IS 'Tipo de envolvimento da conta no evento: emitter, participant, recipient';
COMMENT ON COLUMN public.account_events.topics IS 'Topics do evento em formato JSON';
COMMENT ON COLUMN public.account_events.decoded_data IS 'Dados do evento decodificados em formato JSON';
COMMENT ON COLUMN public.account_events.raw_data IS 'Dados brutos do evento em formato binário';
COMMENT ON COLUMN public.account_events.updated_at IS 'Data e hora da última atualização do registro';

-- Constraint comments

COMMENT ON CONSTRAINT unique_account_event ON public.account_events IS 'Garante que cada evento é único por conta';

-- Permissions

ALTER TABLE public.account_events OWNER TO explorer;
GRANT DELETE, INSERT, REFERENCES, TRIGGER, UPDATE, SELECT, TRUNCATE ON TABLE public.account_events TO explorer;


-- public.account_method_stats definition

-- Drop table

-- DROP TABLE public.account_method_stats;

CREATE TABLE public.account_method_stats (
	id bigserial NOT NULL,
	account_address varchar(42) NOT NULL,
	method_name varchar(100) NOT NULL,
	method_signature varchar(200) NULL,
	contract_address varchar(42) NULL,
	contract_name varchar(100) NULL,
	execution_count int4 DEFAULT 0 NOT NULL, -- Número total de execuções do método
	success_count int4 DEFAULT 0 NOT NULL, -- Número de execuções bem-sucedidas
	failed_count int4 DEFAULT 0 NOT NULL, -- Número de execuções que falharam
	total_gas_used text DEFAULT '0'::text NOT NULL, -- Total de gas usado em todas as execuções
	total_value_sent text DEFAULT '0'::text NOT NULL,
	avg_gas_used int8 DEFAULT 0 NOT NULL, -- Média de gas usado por execução
	first_executed_at timestamptz DEFAULT now() NOT NULL,
	last_executed_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL, -- Data de criação do registro de estatísticas
	CONSTRAINT account_method_stats_pkey PRIMARY KEY (id)
);
CREATE INDEX idx_account_method_stats_address ON public.account_method_stats USING btree (account_address);
CREATE INDEX idx_account_method_stats_address_executions ON public.account_method_stats USING btree (account_address, execution_count DESC);
CREATE INDEX idx_account_method_stats_contract ON public.account_method_stats USING btree (contract_address);
CREATE INDEX idx_account_method_stats_executions ON public.account_method_stats USING btree (execution_count DESC);
CREATE INDEX idx_account_method_stats_last_executed ON public.account_method_stats USING btree (last_executed_at DESC);
CREATE INDEX idx_account_method_stats_method ON public.account_method_stats USING btree (method_name);
CREATE UNIQUE INDEX unique_account_method_with_contract ON public.account_method_stats USING btree (account_address, method_name, contract_address) WHERE (contract_address IS NOT NULL);
CREATE UNIQUE INDEX unique_account_method_without_contract ON public.account_method_stats USING btree (account_address, method_name) WHERE (contract_address IS NULL);
COMMENT ON TABLE public.account_method_stats IS 'Tabela para estatísticas agregadas de métodos executados por conta';

-- Column comments

COMMENT ON COLUMN public.account_method_stats.execution_count IS 'Número total de execuções do método';
COMMENT ON COLUMN public.account_method_stats.success_count IS 'Número de execuções bem-sucedidas';
COMMENT ON COLUMN public.account_method_stats.failed_count IS 'Número de execuções que falharam';
COMMENT ON COLUMN public.account_method_stats.total_gas_used IS 'Total de gas usado em todas as execuções';
COMMENT ON COLUMN public.account_method_stats.avg_gas_used IS 'Média de gas usado por execução';
COMMENT ON COLUMN public.account_method_stats.created_at IS 'Data de criação do registro de estatísticas';

-- Permissions

ALTER TABLE public.account_method_stats OWNER TO explorer;
GRANT DELETE, INSERT, REFERENCES, TRIGGER, UPDATE, SELECT, TRUNCATE ON TABLE public.account_method_stats TO explorer;


-- public.account_transactions definition

-- Drop table

-- DROP TABLE public.account_transactions;

CREATE TABLE public.account_transactions (
	id bigserial NOT NULL,
	account_address varchar(42) NOT NULL,
	transaction_hash varchar(66) NOT NULL,
	block_number int8 NOT NULL,
	transaction_index int4 NOT NULL,
	transaction_type varchar(20) NOT NULL, -- Tipo da transação: sent, received, contract_call, contract_creation
	from_address varchar(42) NOT NULL,
	to_address varchar(42) NULL,
	value text DEFAULT '0'::text NOT NULL,
	gas_limit int8 NOT NULL,
	gas_used int8 NULL,
	gas_price text NULL,
	status varchar(20) NOT NULL, -- Status da transação: success, failed, pending
	method_name varchar(100) NULL,
	method_signature varchar(200) NULL,
	contract_address varchar(42) NULL,
	contract_name varchar(100) NULL,
	decoded_input jsonb NULL, -- Input da transação decodificado em formato JSON
	error_message text NULL,
	"timestamp" timestamptz DEFAULT now() NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT account_transactions_pkey PRIMARY KEY (id),
	CONSTRAINT unique_account_transaction UNIQUE (account_address, transaction_hash)
);
CREATE INDEX idx_account_transactions_address ON public.account_transactions USING btree (account_address);
CREATE INDEX idx_account_transactions_address_timestamp ON public.account_transactions USING btree (account_address, "timestamp" DESC);
CREATE INDEX idx_account_transactions_block ON public.account_transactions USING btree (block_number);
CREATE INDEX idx_account_transactions_hash ON public.account_transactions USING btree (transaction_hash);
CREATE INDEX idx_account_transactions_method ON public.account_transactions USING btree (method_name);
CREATE INDEX idx_account_transactions_status ON public.account_transactions USING btree (status);
CREATE INDEX idx_account_transactions_timestamp ON public.account_transactions USING btree ("timestamp" DESC);
CREATE INDEX idx_account_transactions_type ON public.account_transactions USING btree (transaction_type);
COMMENT ON TABLE public.account_transactions IS 'Tabela para tracking detalhado de todas as transações relacionadas a uma conta';

-- Column comments

COMMENT ON COLUMN public.account_transactions.transaction_type IS 'Tipo da transação: sent, received, contract_call, contract_creation';
COMMENT ON COLUMN public.account_transactions.status IS 'Status da transação: success, failed, pending';
COMMENT ON COLUMN public.account_transactions.decoded_input IS 'Input da transação decodificado em formato JSON';

-- Permissions

ALTER TABLE public.account_transactions OWNER TO explorer;
GRANT DELETE, INSERT, REFERENCES, TRIGGER, UPDATE, SELECT, TRUNCATE ON TABLE public.account_transactions TO explorer;


-- public.accounts definition

-- Drop table

-- DROP TABLE public.accounts;

CREATE TABLE public.accounts (
	address varchar(42) NOT NULL, -- Endereço da conta (chave primária)
	account_type varchar(20) DEFAULT 'eoa'::character varying NOT NULL, -- Tipo de conta: eoa ou smart_account
	balance text DEFAULT '0'::text NOT NULL, -- Saldo da conta em wei (armazenado como string)
	nonce int8 DEFAULT 0 NOT NULL, -- Nonce atual da conta
	transaction_count int8 DEFAULT 0 NOT NULL, -- Número total de transações
	contract_interactions int8 DEFAULT 0 NOT NULL, -- Número de interações com contratos
	smart_contract_deployments int8 DEFAULT 0 NOT NULL, -- Número de contratos deployados
	first_seen timestamptz DEFAULT now() NOT NULL, -- Primeira vez que a conta foi vista
	last_activity timestamptz NULL, -- Última atividade da conta
	is_contract bool DEFAULT false NOT NULL, -- Indica se é um contrato
	contract_type varchar(50) NULL, -- Tipo do contrato (se aplicável)
	factory_address varchar(42) NULL, -- Endereço da factory (Smart Accounts)
	implementation_address varchar(42) NULL, -- Endereço da implementação (Smart Accounts)
	owner_address varchar(42) NULL, -- Endereço do owner (Smart Accounts)
	"label" varchar(255) NULL, -- Label personalizado da conta
	risk_score int4 NULL, -- Score de risco (0-10)
	compliance_status varchar(20) DEFAULT 'compliant'::character varying NOT NULL, -- Status de compliance
	compliance_notes text NULL, -- Notas de compliance
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT accounts_pkey PRIMARY KEY (address),
	CONSTRAINT accounts_risk_score_check CHECK (((risk_score >= 0) AND (risk_score <= 10)))
);
CREATE INDEX idx_accounts_address ON public.accounts USING hash (address);
CREATE INDEX idx_accounts_balance ON public.accounts USING btree (balance);
CREATE INDEX idx_accounts_compliance_status ON public.accounts USING btree (compliance_status);
CREATE INDEX idx_accounts_factory_address ON public.accounts USING btree (factory_address);
CREATE INDEX idx_accounts_first_seen ON public.accounts USING btree (first_seen);
CREATE INDEX idx_accounts_is_contract ON public.accounts USING btree (is_contract);
CREATE INDEX idx_accounts_last_activity ON public.accounts USING btree (last_activity);
CREATE INDEX idx_accounts_owner_address ON public.accounts USING btree (owner_address);
CREATE INDEX idx_accounts_risk_score ON public.accounts USING btree (risk_score);
CREATE INDEX idx_accounts_transaction_count ON public.accounts USING btree (transaction_count);
CREATE INDEX idx_accounts_tx_count ON public.accounts USING btree (transaction_count DESC) WHERE (transaction_count > 0);
CREATE INDEX idx_accounts_type ON public.accounts USING btree (account_type);
COMMENT ON TABLE public.accounts IS 'Tabela principal de contas (EOA e Smart Accounts)';

-- Column comments

COMMENT ON COLUMN public.accounts.address IS 'Endereço da conta (chave primária)';
COMMENT ON COLUMN public.accounts.account_type IS 'Tipo de conta: eoa ou smart_account';
COMMENT ON COLUMN public.accounts.balance IS 'Saldo da conta em wei (armazenado como string)';
COMMENT ON COLUMN public.accounts.nonce IS 'Nonce atual da conta';
COMMENT ON COLUMN public.accounts.transaction_count IS 'Número total de transações';
COMMENT ON COLUMN public.accounts.contract_interactions IS 'Número de interações com contratos';
COMMENT ON COLUMN public.accounts.smart_contract_deployments IS 'Número de contratos deployados';
COMMENT ON COLUMN public.accounts.first_seen IS 'Primeira vez que a conta foi vista';
COMMENT ON COLUMN public.accounts.last_activity IS 'Última atividade da conta';
COMMENT ON COLUMN public.accounts.is_contract IS 'Indica se é um contrato';
COMMENT ON COLUMN public.accounts.contract_type IS 'Tipo do contrato (se aplicável)';
COMMENT ON COLUMN public.accounts.factory_address IS 'Endereço da factory (Smart Accounts)';
COMMENT ON COLUMN public.accounts.implementation_address IS 'Endereço da implementação (Smart Accounts)';
COMMENT ON COLUMN public.accounts.owner_address IS 'Endereço do owner (Smart Accounts)';
COMMENT ON COLUMN public.accounts."label" IS 'Label personalizado da conta';
COMMENT ON COLUMN public.accounts.risk_score IS 'Score de risco (0-10)';
COMMENT ON COLUMN public.accounts.compliance_status IS 'Status de compliance';
COMMENT ON COLUMN public.accounts.compliance_notes IS 'Notas de compliance';

-- Permissions

ALTER TABLE public.accounts OWNER TO explorer;
GRANT DELETE, INSERT, REFERENCES, TRIGGER, UPDATE, SELECT, TRUNCATE ON TABLE public.accounts TO explorer;


-- public.blocks definition

-- Drop table

-- DROP TABLE public.blocks;

CREATE TABLE public.blocks (
	"number" int8 NOT NULL, -- Número sequencial do bloco
	hash varchar(66) NOT NULL, -- Hash único do bloco (chave primária)
	parent_hash varchar(66) NULL, -- Hash do bloco pai
	"timestamp" timestamptz NOT NULL, -- Timestamp do bloco na blockchain
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NOT NULL,
	deleted_at timestamptz NULL,
	miner varchar(42) NULL, -- Endereço do minerador
	difficulty text NULL, -- Dificuldade de mineração (armazenado como string)
	total_difficulty text NULL, -- Dificuldade total acumulada
	"size" int8 DEFAULT 0 NULL, -- Tamanho do bloco em bytes
	gas_limit int8 DEFAULT 0 NOT NULL, -- Limite de gas do bloco
	gas_used int8 DEFAULT 0 NOT NULL, -- Gas utilizado no bloco
	base_fee_per_gas text NULL, -- Taxa base por gas (EIP-1559)
	tx_count int4 DEFAULT 0 NOT NULL, -- Número de transações no bloco
	uncle_count int4 DEFAULT 0 NOT NULL, -- Número de uncle blocks
	bloom text NULL, -- Bloom filter do bloco para busca rápida de logs
	extra_data text NULL, -- Dados extras incluídos pelo minerador
	mix_digest varchar(66) NULL, -- Mix digest usado no consenso
	nonce int8 DEFAULT 0 NULL, -- Nonce do bloco
	receipt_hash varchar(66) NULL, -- Hash da árvore Merkle das receipts
	state_root varchar(66) NULL, -- Root da árvore Merkle do estado
	tx_hash varchar(66) NULL, -- Hash da árvore Merkle das transações
	CONSTRAINT blocks_pkey PRIMARY KEY (hash)
);
CREATE INDEX idx_blocks_created_at ON public.blocks USING btree (created_at);
CREATE INDEX idx_blocks_deleted_at ON public.blocks USING btree (deleted_at) WHERE (deleted_at IS NULL);
CREATE INDEX idx_blocks_gas_used ON public.blocks USING btree (gas_used);
CREATE INDEX idx_blocks_hash ON public.blocks USING hash (hash);
CREATE INDEX idx_blocks_miner ON public.blocks USING btree (miner);
CREATE UNIQUE INDEX idx_blocks_number ON public.blocks USING btree (number);
CREATE INDEX idx_blocks_number_timestamp ON public.blocks USING btree (number DESC, "timestamp" DESC);
CREATE INDEX idx_blocks_receipt_hash ON public.blocks USING btree (receipt_hash);
CREATE INDEX idx_blocks_state_root ON public.blocks USING btree (state_root);
CREATE INDEX idx_blocks_timestamp ON public.blocks USING btree ("timestamp");
CREATE INDEX idx_blocks_tx_hash ON public.blocks USING btree (tx_hash);
COMMENT ON TABLE public.blocks IS 'Tabela de blocos da blockchain';

-- Column comments

COMMENT ON COLUMN public.blocks."number" IS 'Número sequencial do bloco';
COMMENT ON COLUMN public.blocks.hash IS 'Hash único do bloco (chave primária)';
COMMENT ON COLUMN public.blocks.parent_hash IS 'Hash do bloco pai';
COMMENT ON COLUMN public.blocks."timestamp" IS 'Timestamp do bloco na blockchain';
COMMENT ON COLUMN public.blocks.miner IS 'Endereço do minerador';
COMMENT ON COLUMN public.blocks.difficulty IS 'Dificuldade de mineração (armazenado como string)';
COMMENT ON COLUMN public.blocks.total_difficulty IS 'Dificuldade total acumulada';
COMMENT ON COLUMN public.blocks."size" IS 'Tamanho do bloco em bytes';
COMMENT ON COLUMN public.blocks.gas_limit IS 'Limite de gas do bloco';
COMMENT ON COLUMN public.blocks.gas_used IS 'Gas utilizado no bloco';
COMMENT ON COLUMN public.blocks.base_fee_per_gas IS 'Taxa base por gas (EIP-1559)';
COMMENT ON COLUMN public.blocks.tx_count IS 'Número de transações no bloco';
COMMENT ON COLUMN public.blocks.uncle_count IS 'Número de uncle blocks';
COMMENT ON COLUMN public.blocks.bloom IS 'Bloom filter do bloco para busca rápida de logs';
COMMENT ON COLUMN public.blocks.extra_data IS 'Dados extras incluídos pelo minerador';
COMMENT ON COLUMN public.blocks.mix_digest IS 'Mix digest usado no consenso';
COMMENT ON COLUMN public.blocks.nonce IS 'Nonce do bloco';
COMMENT ON COLUMN public.blocks.receipt_hash IS 'Hash da árvore Merkle das receipts';
COMMENT ON COLUMN public.blocks.state_root IS 'Root da árvore Merkle do estado';
COMMENT ON COLUMN public.blocks.tx_hash IS 'Hash da árvore Merkle das transações';

-- Permissions

ALTER TABLE public.blocks OWNER TO explorer;
GRANT DELETE, INSERT, REFERENCES, TRIGGER, UPDATE, SELECT, TRUNCATE ON TABLE public.blocks TO explorer;


-- public.events definition

-- Drop table

-- DROP TABLE public.events;

CREATE TABLE public.events (
	id varchar(255) NOT NULL,
	contract_address varchar(42) NOT NULL,
	contract_name varchar(255) NULL,
	event_name varchar(255) NOT NULL,
	event_signature varchar(66) NOT NULL,
	transaction_hash varchar(66) NOT NULL,
	block_number int8 NOT NULL,
	block_hash varchar(66) NOT NULL,
	log_index int8 NOT NULL,
	transaction_index int8 NOT NULL,
	from_address varchar(42) NOT NULL,
	to_address varchar(42) NULL,
	topics jsonb DEFAULT '[]'::jsonb NOT NULL,
	"data" bytea NULL,
	decoded_data jsonb NULL,
	gas_used int8 DEFAULT 0 NOT NULL,
	gas_price varchar(78) DEFAULT '0'::character varying NOT NULL,
	status varchar(20) DEFAULT 'success'::character varying NOT NULL,
	removed bool DEFAULT false NOT NULL,
	"timestamp" timestamptz NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT events_pkey PRIMARY KEY (id)
);
CREATE UNIQUE INDEX idx_events_block_log ON public.events USING btree (block_number, log_index, transaction_hash);
CREATE INDEX idx_events_block_number ON public.events USING btree (block_number);
CREATE INDEX idx_events_contract_address ON public.events USING btree (contract_address);
CREATE INDEX idx_events_contract_name_block ON public.events USING btree (contract_address, event_name, block_number DESC);
CREATE INDEX idx_events_decoded_data_gin ON public.events USING gin (decoded_data);
CREATE INDEX idx_events_event_name ON public.events USING btree (event_name);
CREATE INDEX idx_events_event_signature ON public.events USING btree (event_signature);
CREATE INDEX idx_events_from_address ON public.events USING btree (from_address);
CREATE INDEX idx_events_status ON public.events USING btree (status);
CREATE INDEX idx_events_timestamp ON public.events USING btree ("timestamp" DESC);
CREATE INDEX idx_events_timestamp_id ON public.events USING btree ("timestamp" DESC, id);
CREATE INDEX idx_events_to_address ON public.events USING btree (to_address);
CREATE INDEX idx_events_topics_gin ON public.events USING gin (topics);
CREATE INDEX idx_events_transaction_hash ON public.events USING btree (transaction_hash);
CREATE INDEX idx_events_tx_hash ON public.events USING btree (transaction_hash);

-- Permissions

ALTER TABLE public.events OWNER TO explorer;
GRANT DELETE, INSERT, REFERENCES, TRIGGER, UPDATE, SELECT, TRUNCATE ON TABLE public.events TO explorer;


-- public.smart_contracts definition

-- Drop table

-- DROP TABLE public.smart_contracts;

CREATE TABLE public.smart_contracts (
	address varchar(42) NOT NULL,
	"name" varchar(255) NULL,
	symbol varchar(50) NULL,
	contract_type varchar(50) NULL,
	creator_address varchar(42) NOT NULL,
	creation_tx_hash varchar(66) NOT NULL,
	creation_block_number int8 NOT NULL,
	creation_timestamp timestamptz NOT NULL,
	is_verified bool DEFAULT false NULL,
	verification_date timestamptz NULL,
	compiler_version varchar(50) NULL,
	optimization_enabled bool NULL,
	optimization_runs int4 NULL,
	license_type varchar(50) NULL,
	source_code text NULL,
	abi jsonb NULL,
	bytecode text NULL,
	constructor_args text NULL,
	balance numeric(78) DEFAULT 0 NULL, -- Balance do contrato em Wei
	nonce int8 DEFAULT 0 NULL,
	code_size int4 NULL,
	storage_size int4 NULL,
	total_transactions int8 DEFAULT 0 NULL,
	total_internal_transactions int8 DEFAULT 0 NULL,
	total_events int8 DEFAULT 0 NULL,
	unique_addresses_count int8 DEFAULT 0 NULL,
	total_gas_used numeric(78) DEFAULT 0 NULL, -- Total de gas usado por todas as transações do contrato
	total_value_transferred numeric(78) DEFAULT 0 NULL, -- Valor total transferido através do contrato em Wei
	first_transaction_at timestamptz NULL,
	last_transaction_at timestamptz NULL,
	last_activity_at timestamptz NULL,
	is_active bool DEFAULT true NULL,
	is_proxy bool DEFAULT false NULL, -- Indica se o contrato é um proxy (EIP-1967, etc.)
	proxy_implementation varchar(42) NULL, -- Endereço da implementação se for um proxy
	is_token bool DEFAULT false NULL,
	description text NULL,
	website_url varchar(500) NULL,
	github_url varchar(500) NULL,
	documentation_url varchar(500) NULL,
	tags _text NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NOT NULL,
	last_metrics_update timestamptz NULL,
	CONSTRAINT smart_contracts_pkey PRIMARY KEY (address)
);
CREATE INDEX idx_smart_contracts_active ON public.smart_contracts USING btree (is_active);
CREATE INDEX idx_smart_contracts_address ON public.smart_contracts USING hash (address);
CREATE INDEX idx_smart_contracts_creation_block ON public.smart_contracts USING btree (creation_block_number);
CREATE INDEX idx_smart_contracts_creator ON public.smart_contracts USING btree (creator_address);
CREATE INDEX idx_smart_contracts_last_activity ON public.smart_contracts USING btree (last_activity_at);
CREATE INDEX idx_smart_contracts_tags ON public.smart_contracts USING gin (tags);
CREATE INDEX idx_smart_contracts_token ON public.smart_contracts USING btree (is_token);
CREATE INDEX idx_smart_contracts_total_transactions ON public.smart_contracts USING btree (total_transactions);
CREATE INDEX idx_smart_contracts_type ON public.smart_contracts USING btree (contract_type);
CREATE INDEX idx_smart_contracts_type_verified ON public.smart_contracts USING btree (contract_type, is_verified);
CREATE INDEX idx_smart_contracts_verified ON public.smart_contracts USING btree (is_verified);
COMMENT ON TABLE public.smart_contracts IS 'Tabela principal para armazenar informações de smart contracts';

-- Column comments

COMMENT ON COLUMN public.smart_contracts.balance IS 'Balance do contrato em Wei';
COMMENT ON COLUMN public.smart_contracts.total_gas_used IS 'Total de gas usado por todas as transações do contrato';
COMMENT ON COLUMN public.smart_contracts.total_value_transferred IS 'Valor total transferido através do contrato em Wei';
COMMENT ON COLUMN public.smart_contracts.is_proxy IS 'Indica se o contrato é um proxy (EIP-1967, etc.)';
COMMENT ON COLUMN public.smart_contracts.proxy_implementation IS 'Endereço da implementação se for um proxy';

-- Permissions

ALTER TABLE public.smart_contracts OWNER TO explorer;
GRANT DELETE, INSERT, REFERENCES, TRIGGER, UPDATE, SELECT, TRUNCATE ON TABLE public.smart_contracts TO explorer;


-- public.transactions definition

-- Drop table

-- DROP TABLE public.transactions;

CREATE TABLE public.transactions (
	hash varchar(66) NOT NULL, -- Hash único da transação (chave primária)
	block_number int8 NULL, -- Número do bloco (NULL para pendentes)
	block_hash varchar(66) NULL, -- Hash do bloco (NULL para pendentes)
	transaction_index int8 NULL, -- Índice da transação dentro do bloco
	from_address varchar(42) NOT NULL, -- Endereço remetente
	to_address varchar(42) NULL, -- Endereço destinatário (NULL para criação de contrato)
	value text DEFAULT '0'::text NOT NULL, -- Valor transferido (em wei, armazenado como string)
	gas_limit int8 NOT NULL, -- Limite de gas definido para a transação
	gas_price text NULL, -- Preço do gas (legacy)
	gas_used int8 NULL, -- Gas efetivamente utilizado
	max_fee_per_gas text NULL, -- Taxa máxima por gas (EIP-1559)
	max_priority_fee_per_gas text NULL, -- Taxa de prioridade máxima por gas (EIP-1559)
	nonce int8 NOT NULL, -- Nonce da transação
	"data" bytea NULL, -- Dados de entrada da transação (input data)
	transaction_type int2 DEFAULT 0 NOT NULL, -- Tipo da transação (0=Legacy, 1=AccessList, 2=DynamicFee)
	access_list bytea NULL,
	status varchar(20) DEFAULT 'pending'::character varying NOT NULL, -- Status da transação (pending, success, failed, dropped, replaced)
	contract_address varchar(42) NULL, -- Endereço do contrato criado (se aplicável)
	logs_bloom bytea NULL, -- Bloom filter dos logs da transação
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NOT NULL,
	mined_at timestamptz NULL, -- Timestamp de quando a transação foi minerada
	deleted_at timestamptz NULL,
	CONSTRAINT chk_mined_transactions CHECK (((((status)::text = 'pending'::text) AND (block_number IS NULL)) OR (((status)::text <> 'pending'::text) AND (block_number IS NOT NULL)))),
	CONSTRAINT transactions_pkey PRIMARY KEY (hash),
	CONSTRAINT unique_tx_per_block UNIQUE (block_hash, transaction_index)
);
CREATE INDEX idx_transactions_address_composite ON public.transactions USING btree (from_address, created_at DESC);
CREATE INDEX idx_transactions_addresses ON public.transactions USING gin ((ARRAY[from_address, to_address]));
CREATE INDEX idx_transactions_block_hash ON public.transactions USING btree (block_hash);
CREATE INDEX idx_transactions_block_number ON public.transactions USING btree (block_number);
CREATE INDEX idx_transactions_block_tx_index ON public.transactions USING btree (block_number, transaction_index);
CREATE INDEX idx_transactions_contract_address ON public.transactions USING btree (contract_address);
CREATE INDEX idx_transactions_created_at ON public.transactions USING btree (created_at);
CREATE INDEX idx_transactions_deleted_at ON public.transactions USING btree (deleted_at) WHERE (deleted_at IS NULL);
CREATE INDEX idx_transactions_from_address ON public.transactions USING btree (from_address);
CREATE INDEX idx_transactions_gas_used ON public.transactions USING btree (gas_used);
CREATE INDEX idx_transactions_hash ON public.transactions USING hash (hash);
CREATE INDEX idx_transactions_mined_at ON public.transactions USING btree (mined_at);
CREATE INDEX idx_transactions_nonce ON public.transactions USING btree (from_address, nonce);
CREATE INDEX idx_transactions_status ON public.transactions USING btree (status);
CREATE INDEX idx_transactions_to_address ON public.transactions USING btree (to_address);
CREATE INDEX idx_transactions_to_address_composite ON public.transactions USING btree (to_address, created_at DESC);
CREATE INDEX idx_transactions_transaction_index ON public.transactions USING btree (transaction_index);
CREATE INDEX idx_transactions_type ON public.transactions USING btree (transaction_type);
COMMENT ON TABLE public.transactions IS 'Tabela de transações da blockchain';

-- Column comments

COMMENT ON COLUMN public.transactions.hash IS 'Hash único da transação (chave primária)';
COMMENT ON COLUMN public.transactions.block_number IS 'Número do bloco (NULL para pendentes)';
COMMENT ON COLUMN public.transactions.block_hash IS 'Hash do bloco (NULL para pendentes)';
COMMENT ON COLUMN public.transactions.transaction_index IS 'Índice da transação dentro do bloco';
COMMENT ON COLUMN public.transactions.from_address IS 'Endereço remetente';
COMMENT ON COLUMN public.transactions.to_address IS 'Endereço destinatário (NULL para criação de contrato)';
COMMENT ON COLUMN public.transactions.value IS 'Valor transferido (em wei, armazenado como string)';
COMMENT ON COLUMN public.transactions.gas_limit IS 'Limite de gas definido para a transação';
COMMENT ON COLUMN public.transactions.gas_price IS 'Preço do gas (legacy)';
COMMENT ON COLUMN public.transactions.gas_used IS 'Gas efetivamente utilizado';
COMMENT ON COLUMN public.transactions.max_fee_per_gas IS 'Taxa máxima por gas (EIP-1559)';
COMMENT ON COLUMN public.transactions.max_priority_fee_per_gas IS 'Taxa de prioridade máxima por gas (EIP-1559)';
COMMENT ON COLUMN public.transactions.nonce IS 'Nonce da transação';
COMMENT ON COLUMN public.transactions."data" IS 'Dados de entrada da transação (input data)';
COMMENT ON COLUMN public.transactions.transaction_type IS 'Tipo da transação (0=Legacy, 1=AccessList, 2=DynamicFee)';
COMMENT ON COLUMN public.transactions.status IS 'Status da transação (pending, success, failed, dropped, replaced)';
COMMENT ON COLUMN public.transactions.contract_address IS 'Endereço do contrato criado (se aplicável)';
COMMENT ON COLUMN public.transactions.logs_bloom IS 'Bloom filter dos logs da transação';
COMMENT ON COLUMN public.transactions.mined_at IS 'Timestamp de quando a transação foi minerada';

-- Permissions

ALTER TABLE public.transactions OWNER TO explorer;
GRANT DELETE, INSERT, REFERENCES, TRIGGER, UPDATE, SELECT, TRUNCATE ON TABLE public.transactions TO explorer;


-- public.users definition

-- Drop table

-- DROP TABLE public.users;

CREATE TABLE public.users (
	id serial4 NOT NULL,
	username varchar(50) NOT NULL,
	email varchar(255) NOT NULL,
	password_hash varchar(255) NOT NULL,
	is_active bool DEFAULT true NULL,
	is_admin bool DEFAULT false NULL,
	last_login timestamp NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT users_email_key UNIQUE (email),
	CONSTRAINT users_pkey PRIMARY KEY (id),
	CONSTRAINT users_username_key UNIQUE (username)
);
CREATE INDEX idx_users_email ON public.users USING btree (email);
CREATE INDEX idx_users_is_active ON public.users USING btree (is_active);
CREATE INDEX idx_users_username ON public.users USING btree (username);

-- Table Triggers

create trigger update_users_updated_at before
update
    on
    public.users for each row execute function update_updated_at_column();

-- Permissions

ALTER TABLE public.users OWNER TO explorer;
GRANT ALL ON TABLE public.users TO explorer;


-- public.validators definition

-- Drop table

-- DROP TABLE public.validators;

CREATE TABLE public.validators (
	address varchar(42) NOT NULL,
	proposed_block_count text DEFAULT '0'::text NOT NULL,
	last_proposed_block_number text DEFAULT '0'::text NOT NULL,
	status varchar(20) DEFAULT 'inactive'::character varying NOT NULL,
	is_active bool DEFAULT false NOT NULL,
	uptime numeric(5, 2) DEFAULT 0.0 NOT NULL,
	first_seen timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	last_seen timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT validators_pkey PRIMARY KEY (address)
);
CREATE INDEX idx_validators_address ON public.validators USING hash (address);
CREATE INDEX idx_validators_is_active ON public.validators USING btree (is_active);
CREATE INDEX idx_validators_last_seen ON public.validators USING btree (last_seen DESC);
CREATE INDEX idx_validators_status ON public.validators USING btree (status);
CREATE INDEX idx_validators_uptime ON public.validators USING btree (uptime DESC);

-- Permissions

ALTER TABLE public.validators OWNER TO explorer;
GRANT DELETE, INSERT, REFERENCES, TRIGGER, UPDATE, SELECT, TRUNCATE ON TABLE public.validators TO explorer;


-- public.account_analytics definition

-- Drop table

-- DROP TABLE public.account_analytics;

CREATE TABLE public.account_analytics (
	address varchar(42) NOT NULL,
	"date" date NOT NULL,
	transactions_count int8 DEFAULT 0 NOT NULL,
	unique_addresses_count int8 DEFAULT 0 NOT NULL,
	gas_used text DEFAULT '0'::text NOT NULL,
	value_transferred text DEFAULT '0'::text NOT NULL,
	avg_gas_per_tx text DEFAULT '0'::text NOT NULL,
	success_rate numeric(5, 4) DEFAULT 0.0000 NOT NULL,
	contract_calls_count int8 DEFAULT 0 NOT NULL,
	token_transfers_count int8 DEFAULT 0 NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT account_analytics_pkey PRIMARY KEY (address, date),
	CONSTRAINT account_analytics_address_fkey FOREIGN KEY (address) REFERENCES public.accounts(address) ON DELETE CASCADE
);
CREATE INDEX idx_account_analytics_date ON public.account_analytics USING btree (date);
CREATE INDEX idx_account_analytics_transactions_count ON public.account_analytics USING btree (transactions_count);
CREATE INDEX idx_account_analytics_value_transferred ON public.account_analytics USING btree (value_transferred);
COMMENT ON TABLE public.account_analytics IS 'Métricas analíticas diárias das contas';

-- Permissions

ALTER TABLE public.account_analytics OWNER TO explorer;
GRANT DELETE, INSERT, REFERENCES, TRIGGER, UPDATE, SELECT, TRUNCATE ON TABLE public.account_analytics TO explorer;


-- public.account_tags definition

-- Drop table

-- DROP TABLE public.account_tags;

CREATE TABLE public.account_tags (
	address varchar(42) NOT NULL,
	tag varchar(100) NOT NULL,
	created_by varchar(255) DEFAULT 'system'::character varying NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT account_tags_pkey PRIMARY KEY (address, tag),
	CONSTRAINT account_tags_address_fkey FOREIGN KEY (address) REFERENCES public.accounts(address) ON DELETE CASCADE
);
CREATE INDEX idx_account_tags_created_at ON public.account_tags USING btree (created_at);
CREATE INDEX idx_account_tags_tag ON public.account_tags USING btree (tag);
COMMENT ON TABLE public.account_tags IS 'Tags associadas às contas';

-- Permissions

ALTER TABLE public.account_tags OWNER TO explorer;
GRANT DELETE, INSERT, REFERENCES, TRIGGER, UPDATE, SELECT, TRUNCATE ON TABLE public.account_tags TO explorer;


-- public.contract_interactions definition

-- Drop table

-- DROP TABLE public.contract_interactions;

CREATE TABLE public.contract_interactions (
	id bigserial NOT NULL,
	account_address varchar(42) NOT NULL,
	contract_address varchar(42) NOT NULL,
	contract_name varchar(255) NULL,
	"method" varchar(100) NULL,
	interactions_count int8 DEFAULT 1 NOT NULL,
	last_interaction timestamptz DEFAULT now() NOT NULL,
	first_interaction timestamptz DEFAULT now() NOT NULL,
	total_gas_used text DEFAULT '0'::text NOT NULL,
	total_value_sent text DEFAULT '0'::text NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT contract_interactions_account_address_contract_address_meth_key UNIQUE (account_address, contract_address, method),
	CONSTRAINT contract_interactions_pkey PRIMARY KEY (id),
	CONSTRAINT contract_interactions_account_address_fkey FOREIGN KEY (account_address) REFERENCES public.accounts(address) ON DELETE CASCADE
);
CREATE INDEX idx_contract_interactions_contract_address ON public.contract_interactions USING btree (contract_address);
CREATE INDEX idx_contract_interactions_interactions_count ON public.contract_interactions USING btree (interactions_count);
CREATE INDEX idx_contract_interactions_last_interaction ON public.contract_interactions USING btree (last_interaction);
CREATE INDEX idx_contract_interactions_method ON public.contract_interactions USING btree (method);
COMMENT ON TABLE public.contract_interactions IS 'Interações das contas com contratos';

-- Permissions

ALTER TABLE public.contract_interactions OWNER TO explorer;
GRANT DELETE, INSERT, REFERENCES, TRIGGER, UPDATE, SELECT, TRUNCATE ON TABLE public.contract_interactions TO explorer;


-- public.smart_contract_daily_metrics definition

-- Drop table

-- DROP TABLE public.smart_contract_daily_metrics;

CREATE TABLE public.smart_contract_daily_metrics (
	id serial4 NOT NULL,
	contract_address varchar(42) NOT NULL,
	"date" date NOT NULL,
	transactions_count int8 DEFAULT 0 NULL,
	unique_addresses_count int8 DEFAULT 0 NULL,
	gas_used numeric(78) DEFAULT 0 NULL,
	value_transferred numeric(78) DEFAULT 0 NULL,
	events_count int8 DEFAULT 0 NULL,
	avg_gas_per_tx numeric(20, 2) NULL,
	success_rate numeric(5, 4) NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT smart_contract_daily_metrics_contract_address_date_key UNIQUE (contract_address, date),
	CONSTRAINT smart_contract_daily_metrics_pkey PRIMARY KEY (id),
	CONSTRAINT smart_contract_daily_metrics_contract_address_fkey FOREIGN KEY (contract_address) REFERENCES public.smart_contracts(address) ON DELETE CASCADE
);
CREATE INDEX idx_contract_daily_metrics_address ON public.smart_contract_daily_metrics USING btree (contract_address);
CREATE INDEX idx_contract_daily_metrics_date ON public.smart_contract_daily_metrics USING btree (date);
CREATE INDEX idx_contract_daily_metrics_transactions ON public.smart_contract_daily_metrics USING btree (transactions_count);
COMMENT ON TABLE public.smart_contract_daily_metrics IS 'Métricas diárias agregadas por smart contract';

-- Permissions

ALTER TABLE public.smart_contract_daily_metrics OWNER TO explorer;
GRANT DELETE, INSERT, REFERENCES, TRIGGER, UPDATE, SELECT, TRUNCATE ON TABLE public.smart_contract_daily_metrics TO explorer;


-- public.smart_contract_events definition

-- Drop table

-- DROP TABLE public.smart_contract_events;

CREATE TABLE public.smart_contract_events (
	id serial4 NOT NULL,
	contract_address varchar(42) NOT NULL,
	event_name varchar(255) NOT NULL,
	event_signature varchar(66) NOT NULL,
	inputs jsonb NULL,
	anonymous bool DEFAULT false NULL,
	emission_count int8 DEFAULT 0 NULL,
	last_emitted_at timestamptz NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT smart_contract_events_contract_address_event_signature_key UNIQUE (contract_address, event_signature),
	CONSTRAINT smart_contract_events_pkey PRIMARY KEY (id),
	CONSTRAINT smart_contract_events_contract_address_fkey FOREIGN KEY (contract_address) REFERENCES public.smart_contracts(address) ON DELETE CASCADE
);
CREATE INDEX idx_contract_events_address ON public.smart_contract_events USING btree (contract_address);
CREATE INDEX idx_contract_events_name ON public.smart_contract_events USING btree (event_name);
CREATE INDEX idx_contract_events_signature ON public.smart_contract_events USING btree (event_signature);
COMMENT ON TABLE public.smart_contract_events IS 'Eventos definidos em cada smart contract (parsed do ABI)';

-- Permissions

ALTER TABLE public.smart_contract_events OWNER TO explorer;
GRANT DELETE, INSERT, REFERENCES, TRIGGER, UPDATE, SELECT, TRUNCATE ON TABLE public.smart_contract_events TO explorer;


-- public.smart_contract_functions definition

-- Drop table

-- DROP TABLE public.smart_contract_functions;

CREATE TABLE public.smart_contract_functions (
	id serial4 NOT NULL,
	contract_address varchar(42) NOT NULL,
	function_name varchar(255) NOT NULL,
	function_signature varchar(10) NOT NULL,
	function_type varchar(20) NOT NULL,
	state_mutability varchar(20) NULL,
	inputs jsonb NULL,
	outputs jsonb NULL,
	call_count int8 DEFAULT 0 NULL,
	last_called_at timestamptz NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT smart_contract_functions_contract_address_function_signatur_key UNIQUE (contract_address, function_signature),
	CONSTRAINT smart_contract_functions_pkey PRIMARY KEY (id),
	CONSTRAINT smart_contract_functions_contract_address_fkey FOREIGN KEY (contract_address) REFERENCES public.smart_contracts(address) ON DELETE CASCADE
);
CREATE INDEX idx_contract_functions_address ON public.smart_contract_functions USING btree (contract_address);
CREATE INDEX idx_contract_functions_name ON public.smart_contract_functions USING btree (function_name);
CREATE INDEX idx_contract_functions_signature ON public.smart_contract_functions USING btree (function_signature);
CREATE INDEX idx_contract_functions_type ON public.smart_contract_functions USING btree (function_type);
COMMENT ON TABLE public.smart_contract_functions IS 'Funções disponíveis em cada smart contract (parsed do ABI)';

-- Permissions

ALTER TABLE public.smart_contract_functions OWNER TO explorer;
GRANT DELETE, INSERT, REFERENCES, TRIGGER, UPDATE, SELECT, TRUNCATE ON TABLE public.smart_contract_functions TO explorer;


-- public.token_holdings definition

-- Drop table

-- DROP TABLE public.token_holdings;

CREATE TABLE public.token_holdings (
	account_address varchar(42) NOT NULL,
	token_address varchar(42) NOT NULL,
	token_symbol varchar(20) NOT NULL,
	token_name varchar(255) NOT NULL,
	token_decimals int2 DEFAULT 18 NOT NULL,
	balance text DEFAULT '0'::text NOT NULL,
	value_usd text DEFAULT '0'::text NOT NULL,
	last_updated timestamptz DEFAULT now() NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT token_holdings_pkey PRIMARY KEY (account_address, token_address),
	CONSTRAINT token_holdings_account_address_fkey FOREIGN KEY (account_address) REFERENCES public.accounts(address) ON DELETE CASCADE
);
CREATE INDEX idx_token_holdings_balance ON public.token_holdings USING btree (balance);
CREATE INDEX idx_token_holdings_last_updated ON public.token_holdings USING btree (last_updated);
CREATE INDEX idx_token_holdings_token_address ON public.token_holdings USING btree (token_address);
CREATE INDEX idx_token_holdings_token_symbol ON public.token_holdings USING btree (token_symbol);
CREATE INDEX idx_token_holdings_value_usd ON public.token_holdings USING btree (value_usd);
COMMENT ON TABLE public.token_holdings IS 'Holdings de tokens das contas';

-- Permissions

ALTER TABLE public.token_holdings OWNER TO explorer;
GRANT DELETE, INSERT, REFERENCES, TRIGGER, UPDATE, SELECT, TRUNCATE ON TABLE public.token_holdings TO explorer;


-- public.transaction_methods definition

-- Drop table

-- DROP TABLE public.transaction_methods;

CREATE TABLE public.transaction_methods (
	id bigserial NOT NULL,
	transaction_hash varchar(66) NOT NULL, -- Hash da transação
	method_name varchar(100) NOT NULL, -- Nome do método (ex: transfer, approve) ou "Transfer ETH" ou "Deploy Contract"
	method_signature varchar(10) NULL, -- Signature do método (4 bytes) - NULL para ETH transfers
	method_type varchar(50) NOT NULL, -- Tipo do método (transfer, approve, deploy, transferETH, unknown)
	contract_address varchar(42) NULL, -- Endereço do contrato (se aplicável)
	decoded_params jsonb NULL, -- Parâmetros decodificados em JSON (opcional)
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT transaction_methods_pkey PRIMARY KEY (id),
	CONSTRAINT transaction_methods_transaction_hash_key UNIQUE (transaction_hash),
	CONSTRAINT fk_transaction_methods_hash FOREIGN KEY (transaction_hash) REFERENCES public.transactions(hash) ON DELETE CASCADE
);
CREATE INDEX idx_transaction_methods_contract ON public.transaction_methods USING btree (contract_address);
CREATE INDEX idx_transaction_methods_hash ON public.transaction_methods USING btree (transaction_hash);
CREATE INDEX idx_transaction_methods_signature ON public.transaction_methods USING btree (method_signature);
CREATE INDEX idx_transaction_methods_type ON public.transaction_methods USING btree (method_type);
COMMENT ON TABLE public.transaction_methods IS 'Métodos identificados para cada transação';

-- Column comments

COMMENT ON COLUMN public.transaction_methods.transaction_hash IS 'Hash da transação';
COMMENT ON COLUMN public.transaction_methods.method_name IS 'Nome do método (ex: transfer, approve) ou "Transfer ETH" ou "Deploy Contract"';
COMMENT ON COLUMN public.transaction_methods.method_signature IS 'Signature do método (4 bytes) - NULL para ETH transfers';
COMMENT ON COLUMN public.transaction_methods.method_type IS 'Tipo do método (transfer, approve, deploy, transferETH, unknown)';
COMMENT ON COLUMN public.transaction_methods.contract_address IS 'Endereço do contrato (se aplicável)';
COMMENT ON COLUMN public.transaction_methods.decoded_params IS 'Parâmetros decodificados em JSON (opcional)';

-- Permissions

ALTER TABLE public.transaction_methods OWNER TO explorer;
GRANT DELETE, INSERT, REFERENCES, TRIGGER, UPDATE, SELECT, TRUNCATE ON TABLE public.transaction_methods TO explorer;


-- public.user_sessions definition

-- Drop table

-- DROP TABLE public.user_sessions;

CREATE TABLE public.user_sessions (
	id serial4 NOT NULL,
	user_id int4 NOT NULL,
	"token" varchar(500) NOT NULL,
	expires_at timestamp NOT NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	is_active bool DEFAULT true NULL,
	CONSTRAINT user_sessions_pkey PRIMARY KEY (id),
	CONSTRAINT user_sessions_token_key UNIQUE (token),
	CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);
CREATE INDEX idx_user_sessions_expires_at ON public.user_sessions USING btree (expires_at);
CREATE INDEX idx_user_sessions_is_active ON public.user_sessions USING btree (is_active);
CREATE INDEX idx_user_sessions_token ON public.user_sessions USING btree (token);
CREATE INDEX idx_user_sessions_user_id ON public.user_sessions USING btree (user_id);

-- Permissions

ALTER TABLE public.user_sessions OWNER TO explorer;
GRANT ALL ON TABLE public.user_sessions TO explorer;



-- DROP FUNCTION public.pg_stat_statements(in bool, out oid, out oid, out bool, out int8, out text, out int8, out float8, out float8, out float8, out float8, out float8, out int8, out float8, out float8, out float8, out float8, out float8, out int8, out int8, out int8, out int8, out int8, out int8, out int8, out int8, out int8, out int8, out int8, out float8, out float8, out float8, out float8, out int8, out int8, out numeric, out int8, out float8, out int8, out float8, out int8, out float8, out int8, out float8);

CREATE OR REPLACE FUNCTION public.pg_stat_statements(showtext boolean, OUT userid oid, OUT dbid oid, OUT toplevel boolean, OUT queryid bigint, OUT query text, OUT plans bigint, OUT total_plan_time double precision, OUT min_plan_time double precision, OUT max_plan_time double precision, OUT mean_plan_time double precision, OUT stddev_plan_time double precision, OUT calls bigint, OUT total_exec_time double precision, OUT min_exec_time double precision, OUT max_exec_time double precision, OUT mean_exec_time double precision, OUT stddev_exec_time double precision, OUT rows bigint, OUT shared_blks_hit bigint, OUT shared_blks_read bigint, OUT shared_blks_dirtied bigint, OUT shared_blks_written bigint, OUT local_blks_hit bigint, OUT local_blks_read bigint, OUT local_blks_dirtied bigint, OUT local_blks_written bigint, OUT temp_blks_read bigint, OUT temp_blks_written bigint, OUT blk_read_time double precision, OUT blk_write_time double precision, OUT temp_blk_read_time double precision, OUT temp_blk_write_time double precision, OUT wal_records bigint, OUT wal_fpi bigint, OUT wal_bytes numeric, OUT jit_functions bigint, OUT jit_generation_time double precision, OUT jit_inlining_count bigint, OUT jit_inlining_time double precision, OUT jit_optimization_count bigint, OUT jit_optimization_time double precision, OUT jit_emission_count bigint, OUT jit_emission_time double precision)
 RETURNS SETOF record
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pg_stat_statements', $function$pg_stat_statements_1_10$function$
;

-- Permissions

ALTER FUNCTION public.pg_stat_statements(in bool, out oid, out oid, out bool, out int8, out text, out int8, out float8, out float8, out float8, out float8, out float8, out int8, out float8, out float8, out float8, out float8, out float8, out int8, out int8, out int8, out int8, out int8, out int8, out int8, out int8, out int8, out int8, out int8, out float8, out float8, out float8, out float8, out int8, out int8, out numeric, out int8, out float8, out int8, out float8, out int8, out float8, out int8, out float8) OWNER TO explorer;
GRANT ALL ON FUNCTION public.pg_stat_statements(in bool, out oid, out oid, out bool, out int8, out text, out int8, out float8, out float8, out float8, out float8, out float8, out int8, out float8, out float8, out float8, out float8, out float8, out int8, out int8, out int8, out int8, out int8, out int8, out int8, out int8, out int8, out int8, out int8, out float8, out float8, out float8, out float8, out int8, out int8, out numeric, out int8, out float8, out int8, out float8, out int8, out float8, out int8, out float8) TO public;
GRANT ALL ON FUNCTION public.pg_stat_statements(in bool, out oid, out oid, out bool, out int8, out text, out int8, out float8, out float8, out float8, out float8, out float8, out int8, out float8, out float8, out float8, out float8, out float8, out int8, out int8, out int8, out int8, out int8, out int8, out int8, out int8, out int8, out int8, out int8, out float8, out float8, out float8, out float8, out int8, out int8, out numeric, out int8, out float8, out int8, out float8, out int8, out float8, out int8, out float8) TO explorer;

-- DROP FUNCTION public.pg_stat_statements_info(out int8, out timestamptz);

CREATE OR REPLACE FUNCTION public.pg_stat_statements_info(OUT dealloc bigint, OUT stats_reset timestamp with time zone)
 RETURNS record
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pg_stat_statements', $function$pg_stat_statements_info$function$
;

-- Permissions

ALTER FUNCTION public.pg_stat_statements_info(out int8, out timestamptz) OWNER TO explorer;
GRANT ALL ON FUNCTION public.pg_stat_statements_info(out int8, out timestamptz) TO public;
GRANT ALL ON FUNCTION public.pg_stat_statements_info(out int8, out timestamptz) TO explorer;

-- DROP FUNCTION public.pg_stat_statements_reset(oid, oid, int8);

CREATE OR REPLACE FUNCTION public.pg_stat_statements_reset(userid oid DEFAULT 0, dbid oid DEFAULT 0, queryid bigint DEFAULT 0)
 RETURNS void
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pg_stat_statements', $function$pg_stat_statements_reset_1_7$function$
;

-- Permissions

ALTER FUNCTION public.pg_stat_statements_reset(oid, oid, int8) OWNER TO explorer;
GRANT ALL ON FUNCTION public.pg_stat_statements_reset(oid, oid, int8) TO public;
GRANT ALL ON FUNCTION public.pg_stat_statements_reset(oid, oid, int8) TO explorer;

-- DROP FUNCTION public.update_events_updated_at();

CREATE OR REPLACE FUNCTION public.update_events_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

-- Permissions

ALTER FUNCTION public.update_events_updated_at() OWNER TO explorer;
GRANT ALL ON FUNCTION public.update_events_updated_at() TO public;
GRANT ALL ON FUNCTION public.update_events_updated_at() TO explorer;

-- DROP FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$function$
;

-- Permissions

ALTER FUNCTION public.update_updated_at_column() OWNER TO explorer;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO public;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO explorer;

-- DROP FUNCTION public.update_validators_updated_at();

CREATE OR REPLACE FUNCTION public.update_validators_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$ BEGIN NEW.updated_at = CURRENT_TIMESTAMP; RETURN NEW; END; $function$
;

-- Permissions

ALTER FUNCTION public.update_validators_updated_at() OWNER TO explorer;
GRANT ALL ON FUNCTION public.update_validators_updated_at() TO public;
GRANT ALL ON FUNCTION public.update_validators_updated_at() TO explorer;


-- Permissions

GRANT ALL ON SCHEMA public TO pg_database_owner;
GRANT USAGE ON SCHEMA public TO public;
