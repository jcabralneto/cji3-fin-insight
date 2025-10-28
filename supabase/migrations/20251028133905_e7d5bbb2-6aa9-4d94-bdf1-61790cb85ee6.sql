-- Corrigir classificação para aceitar termos em português (case-insensitive)
UPDATE financial_entries
SET 
  dre_line = CASE
    -- NÍVEL 1: Classes específicas de impostos sobre vendas
    WHEN cost_class IN ('PCR1TAZ050', 'PCR1TAZL08', 'PCR1TAZL10', 'ACR1TA1L05') 
         AND entry_type = 'debit' 
      THEN 'DEDUCOES_RECEITA_IMPOSTOS'
    
    -- NÍVEL 1: Impostos sobre o lucro
    WHEN cost_class IN ('PCLT000000', 'ACNT000010', 'ACNT000L42', 'PCR1TA2L9J', 'RI11000000', 'RI12000000')
         AND entry_type = 'debit'
      THEN 'IMPOSTOS_LUCRO'
    
    -- NÍVEL 2: Revenues + entry_type (inglês e português)
    WHEN LOWER(macro_cost_type) IN ('revenues', 'receita')
         AND cost_type IN ('Revenues Devices', 'Revenues Services')
         AND entry_type = 'credit'
      THEN 'RECEITA_BRUTA'
    
    WHEN LOWER(macro_cost_type) IN ('revenues', 'receita')
         AND cost_type IN ('Revenues Devices', 'Revenues Services')
         AND entry_type = 'debit'
      THEN 'DEVOLUCOES_ABATIMENTOS'
    
    -- NÍVEL 2: Manufacturing (Custos Diretos)
    WHEN cost_type = 'Manufacturing' AND entry_type = 'debit'
      THEN 'CUSTOS_DIRETOS'
    WHEN cost_type = 'Manufacturing' AND entry_type = 'credit'
      THEN 'CUSTOS_DIRETOS_RECUPERACAO'
    
    -- NÍVEL 2: Despesas com Vendas
    WHEN cost_type IN ('Travel', 'Marketing') AND entry_type = 'debit'
      THEN 'DESPESAS_VENDAS'
    WHEN cost_type IN ('Travel', 'Marketing') AND entry_type = 'credit'
      THEN 'DESPESAS_VENDAS_RECUPERACAO'
    
    -- NÍVEL 2: Despesas Administrativas
    WHEN cost_type IN ('Personnel', 'Advisory', 'DH', 'Other costs') AND entry_type = 'debit'
      THEN 'DESPESAS_ADMINISTRATIVAS'
    WHEN cost_type IN ('Personnel', 'Advisory', 'DH', 'Other costs') AND entry_type = 'credit'
      THEN 'DESPESAS_ADMINISTRATIVAS_RECUPERACAO'
    
    -- NÍVEL 2: Despesas Gerais
    WHEN cost_type IN ('Logistics', 'Management fee', 'Capex D&A') AND entry_type = 'debit'
      THEN 'DESPESAS_GERAIS'
    WHEN cost_type IN ('Logistics', 'Management fee', 'Capex D&A') AND entry_type = 'credit'
      THEN 'DESPESAS_GERAIS_RECUPERACAO'
    
    -- NÍVEL 2: Resultado Financeiro
    WHEN cost_type = 'Financial income' AND entry_type = 'credit'
      THEN 'RECEITAS_FINANCEIRAS'
    WHEN cost_type = 'Financial expenses' AND entry_type = 'debit'
      THEN 'DESPESAS_FINANCEIRAS'
    
    -- NÍVEL 2: Impostos genéricos
    WHEN cost_type = 'Taxes' AND entry_type = 'debit'
      THEN 'DESPESAS_OPERACIONAIS_IMPOSTOS'
    
    -- NÍVEL 3: Fallback por Macro Type (inglês e português, case-insensitive)
    WHEN LOWER(macro_cost_type) IN ('revenues', 'receita') AND entry_type = 'credit'
      THEN 'OUTRAS_RECEITAS'
    WHEN LOWER(macro_cost_type) IN ('revenues', 'receita') AND entry_type = 'debit'
      THEN 'OUTRAS_DEDUCOES'
    WHEN LOWER(macro_cost_type) IN ('costs', 'custo', 'despesa operacional') AND entry_type = 'debit'
      THEN 'OUTRAS_DESPESAS'
    WHEN LOWER(macro_cost_type) IN ('costs', 'custo', 'despesa operacional') AND entry_type = 'credit'
      THEN 'OUTRAS_RECUPERACOES'
    
    -- NÍVEL 4: Residual
    WHEN entry_type = 'credit' THEN 'NAO_CLASSIFICADO_CREDITO'
    ELSE 'NAO_CLASSIFICADO_DEBITO'
  END,
  
  classification_rule = CASE
    WHEN cost_class IN ('PCR1TAZ050', 'PCR1TAZL08', 'PCR1TAZL10', 'ACR1TA1L05') 
         AND entry_type = 'debit' THEN 'NIVEL1_IMPOSTO_VENDAS'
    WHEN cost_class IN ('PCLT000000', 'ACNT000010', 'ACNT000L42', 'PCR1TA2L9J', 'RI11000000', 'RI12000000')
         AND entry_type = 'debit' THEN 'NIVEL1_IMPOSTO_LUCRO'
    WHEN LOWER(macro_cost_type) IN ('revenues', 'receita') AND cost_type IN ('Revenues Devices', 'Revenues Services')
         AND entry_type = 'credit' THEN 'NIVEL2_REVENUES_CREDIT'
    WHEN LOWER(macro_cost_type) IN ('revenues', 'receita') AND cost_type IN ('Revenues Devices', 'Revenues Services')
         AND entry_type = 'debit' THEN 'NIVEL2_REVENUES_DEBIT'
    WHEN cost_type = 'Manufacturing' AND entry_type = 'debit' THEN 'NIVEL2_MANUFACTURING_DEBIT'
    WHEN cost_type = 'Manufacturing' AND entry_type = 'credit' THEN 'NIVEL2_MANUFACTURING_CREDIT'
    WHEN cost_type IN ('Travel', 'Marketing') AND entry_type = 'debit' THEN 'NIVEL2_VENDAS_DEBIT'
    WHEN cost_type IN ('Travel', 'Marketing') AND entry_type = 'credit' THEN 'NIVEL2_VENDAS_CREDIT'
    WHEN cost_type IN ('Personnel', 'Advisory', 'DH', 'Other costs') AND entry_type = 'debit' THEN 'NIVEL2_ADMIN_DEBIT'
    WHEN cost_type IN ('Personnel', 'Advisory', 'DH', 'Other costs') AND entry_type = 'credit' THEN 'NIVEL2_ADMIN_CREDIT'
    WHEN cost_type IN ('Logistics', 'Management fee', 'Capex D&A') AND entry_type = 'debit' THEN 'NIVEL2_GERAIS_DEBIT'
    WHEN cost_type IN ('Logistics', 'Management fee', 'Capex D&A') AND entry_type = 'credit' THEN 'NIVEL2_GERAIS_CREDIT'
    WHEN cost_type = 'Financial income' AND entry_type = 'credit' THEN 'NIVEL2_FIN_INCOME'
    WHEN cost_type = 'Financial expenses' AND entry_type = 'debit' THEN 'NIVEL2_FIN_EXPENSES'
    WHEN cost_type = 'Taxes' AND entry_type = 'debit' THEN 'NIVEL2_TAXES_OTHER'
    WHEN LOWER(macro_cost_type) IN ('revenues', 'receita') AND entry_type = 'credit' THEN 'NIVEL3_REVENUES_CREDIT'
    WHEN LOWER(macro_cost_type) IN ('revenues', 'receita') AND entry_type = 'debit' THEN 'NIVEL3_REVENUES_DEBIT'
    WHEN LOWER(macro_cost_type) IN ('costs', 'custo', 'despesa operacional') AND entry_type = 'debit' THEN 'NIVEL3_COSTS_DEBIT'
    WHEN LOWER(macro_cost_type) IN ('costs', 'custo', 'despesa operacional') AND entry_type = 'credit' THEN 'NIVEL3_COSTS_CREDIT'
    WHEN entry_type = 'credit' THEN 'NIVEL4_RESIDUAL'
    ELSE 'NIVEL4_RESIDUAL'
  END;