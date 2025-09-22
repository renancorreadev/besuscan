-- Permite block_number ser NULL para transações pendentes
ALTER TABLE transactions ALTER COLUMN block_number DROP NOT NULL;
