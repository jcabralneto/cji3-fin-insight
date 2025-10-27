-- Preencher classificação padrão para entradas já inseridas sem legenda
UPDATE public.financial_entries
SET 
  macro_cost_type = CASE 
    WHEN macro_cost_type IS NULL THEN CASE WHEN entry_type = 'credit' THEN 'receita' ELSE 'despesa operacional' END 
    ELSE macro_cost_type 
  END,
  cost_type = COALESCE(cost_type, 'não classificado'),
  cost_class_description = COALESCE(cost_class_description, 'Sem legenda')
WHERE macro_cost_type IS NULL;