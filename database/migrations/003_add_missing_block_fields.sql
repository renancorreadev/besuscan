-- Migration: 003_add_missing_block_fields.sql
-- Descrição: Adiciona campos faltantes na tabela de blocos

-- Adicionar campos que estavam faltando
ALTER TABLE blocks ADD COLUMN IF NOT EXISTS bloom TEXT; -- Bloom filter
ALTER TABLE blocks ADD COLUMN IF NOT EXISTS extra_data TEXT; -- Dados extras do bloco
ALTER TABLE blocks ADD COLUMN IF NOT EXISTS mix_digest VARCHAR(66); -- Mix digest (para consenso)
ALTER TABLE blocks ADD COLUMN IF NOT EXISTS nonce BIGINT DEFAULT 0; -- Nonce do bloco
ALTER TABLE blocks ADD COLUMN IF NOT EXISTS receipt_hash VARCHAR(66); -- Hash das receipts
ALTER TABLE blocks ADD COLUMN IF NOT EXISTS state_root VARCHAR(66); -- Root do estado
ALTER TABLE blocks ADD COLUMN IF NOT EXISTS tx_hash VARCHAR(66); -- Hash das transações

-- Adicionar índices para os novos campos importantes
CREATE INDEX IF NOT EXISTS idx_blocks_state_root ON blocks(state_root);
CREATE INDEX IF NOT EXISTS idx_blocks_receipt_hash ON blocks(receipt_hash);
CREATE INDEX IF NOT EXISTS idx_blocks_tx_hash ON blocks(tx_hash);

-- Comentários para documentação dos novos campos
COMMENT ON COLUMN blocks.bloom IS 'Bloom filter do bloco para busca rápida de logs';
COMMENT ON COLUMN blocks.extra_data IS 'Dados extras incluídos pelo minerador';
COMMENT ON COLUMN blocks.mix_digest IS 'Mix digest usado no consenso';
COMMENT ON COLUMN blocks.nonce IS 'Nonce do bloco';
COMMENT ON COLUMN blocks.receipt_hash IS 'Hash da árvore Merkle das receipts';
COMMENT ON COLUMN blocks.state_root IS 'Root da árvore Merkle do estado';
COMMENT ON COLUMN blocks.tx_hash IS 'Hash da árvore Merkle das transações'; 