-- Migration: Add unique constraint to account_events
-- Description: Adiciona constraint única para account_address + event_id
-- Created: 2024

-- Adicionar constraint única
ALTER TABLE account_events ADD CONSTRAINT unique_account_event 
    UNIQUE (account_address, event_id);

-- Comentário na constraint
COMMENT ON CONSTRAINT unique_account_event ON account_events 
    IS 'Garante que cada evento é único por conta'; 