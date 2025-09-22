-- Adiciona coluna error_log para registrar erro de execução da transação
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS error_log TEXT;
