-- Adicionar coluna dre_line para classificação DRE
ALTER TABLE financial_entries 
ADD COLUMN IF NOT EXISTS dre_line TEXT;

-- Adicionar coluna para rastrear a regra aplicada
ALTER TABLE financial_entries 
ADD COLUMN IF NOT EXISTS classification_rule TEXT;

-- Comentários para documentação
COMMENT ON COLUMN financial_entries.dre_line IS 'Linha da DRE onde o lançamento será classificado';
COMMENT ON COLUMN financial_entries.classification_rule IS 'Regra de classificação aplicada (para auditoria)';