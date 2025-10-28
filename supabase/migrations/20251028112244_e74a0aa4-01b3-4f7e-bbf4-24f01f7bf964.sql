-- Limpar dados existentes da tabela de legenda
TRUNCATE TABLE public.cost_class_legend;

-- Popular tabela cost_class_legend com dados da planilha
-- Baseado na estrutura: Account number | Cost type (ENG) | Description | Macro cost type | BS/P&L | ENEL Group/External | EBITDA | Brazilian Description | Cost Type CAPEX

-- Inserir dados de receitas (Revenues)
INSERT INTO public.cost_class_legend (account_number, cost_type, description, macro_cost_type, bs_pl, enel_group_external, ebitda, brazilian_description, cost_type_capex) VALUES
('RAA2GZ0001', 'Revenues Services', 'Servizi valore aggiu', 'Revenues', 'P&L', 'ENEL Group', 'YES', 'Value added services-services provided-Group', NULL),
('RAA2GZ0021', 'Revenues Services', 'Serv Val Agg', 'Revenues', 'P&L', 'ENEL Group', 'YES', 'SERVICOS PRESTADOS NO EXTERIOR - GRUPO', NULL),
('RAA2T81027', 'Revenues Services', 'Serv Val Agg', 'Revenues', 'P&L', 'External', 'YES', 'RECEITAS E RENDAS-SERVIÇOS', NULL),
('RAA2T81SA1', 'Revenues Services', 'Servizi valore aggiu', 'Revenues', 'P&L', 'External', 'YES', '(-) ANV - TRIBUTOS SOBRE A RECEITA - PIS', NULL),
('RAA2T81SP1', 'Revenues Services', 'Servizi valore aggiu', 'Revenues', 'P&L', 'External', 'YES', '(-) TRIBUTOS SOBRE A RECEITA - COFINS', NULL),
('RAA2T81SP2', 'Revenues Services', 'Servizi valore aggiu', 'Revenues', 'P&L', 'External', 'YES', 'RAA2T81SP2 (-) TRIBUTOS SOBRE A RECEITA - ISS', NULL),
('RAA1TZ0000', 'Revenues Devices', 'Ricavi Materiale', 'Revenues', 'P&L', 'External', 'YES', NULL, NULL),
('RAA1TZZSA1', 'Revenues Devices', 'Ricavi Materiale', 'Revenues', 'P&L', 'External', 'YES', NULL, NULL),
('RAA1TZZSA2', 'Revenues Devices', 'Ricavi Materiale', 'Revenues', 'P&L', 'External', 'YES', NULL, NULL),
('RAA1TZZ004', 'Revenues Devices', 'Ricavi Materiale', 'Revenues', 'P&L', 'External', 'YES', NULL, NULL),
('RARZGZ0006', 'Revenues Services', 'Servizi valore aggiu', 'Costs', 'P&L', 'ENEL Group', 'YES', 'RARZGZ0006 RECEITAS E RENDAS-MATERIAIS GRUPO', NULL);

-- Inserir dados de custos e despesas
INSERT INTO public.cost_class_legend (account_number, cost_type, description, macro_cost_type, bs_pl, enel_group_external, ebitda, brazilian_description, cost_type_capex) VALUES
('RCJ5GZ0000', 'Other costs', 'Altri oneri diversi di gestione - Grupp', 'Costs', 'P&L', 'ENEL Group', 'YES', NULL, NULL),
('RCJ5T2Z000', 'Other costs', 'Altre imposte e tasse', 'Costs', 'P&L', 'External', 'YES', NULL, NULL),
('RCJ5T2Z010', 'Other costs', 'Imposta di bollo su documenti diversi', 'Costs', 'P&L', 'External', 'YES', NULL, NULL),
('RCC1GZ3000', 'DH', 'Serv.assist.sistemistica/applicativa-G', 'Costs', 'P&L', 'ENEL Group', 'YES', NULL, 'EXTERNAL DIGITAL'),
('RCC1GZ8000', 'Management fee', 'Management fee ed altri serv.di coord-G', 'Costs', 'P&L', 'ENEL Group', 'YES', NULL, 'PERSONNEL'),
('RCA1G00000', 'Manufacturing', 'Acq.altre mat.prime/sussid/consu/merci-', 'Costs', 'P&L', 'ENEL Group', 'YES', NULL, 'EXTERNAL SERVICES'),
('RCA1T12000', 'Manufacturing', 'Acq altri materiali e apparecchi a maga', 'Costs', 'P&L', 'External', 'YES', NULL, NULL),
('RCA1T13000', 'Manufacturing', 'Acq altri materiali e apparecchi non a', 'Costs', 'P&L', 'External', 'YES', NULL, 'EXTERNAL SERVICES'),
('RCE1A10100', 'Personnel', 'RETRIBUZIONI: MANAGER (EX DIRIGENTI)', 'Costs', 'P&L', 'External', 'YES', NULL, NULL),
('RCE1A11100', 'Personnel', 'RETRIBUZIONI: MIDDLE MANAGER QUADRI', 'Costs', 'P&L', 'External', 'YES', NULL, NULL),
('RCE1A12100', 'Personnel', 'RETRIBUZIONI: WHITE COLLAR (EX IMPIEGAT', 'Costs', 'P&L', 'External', 'YES', NULL, NULL),
('RCE1B10000', 'Personnel', 'Oneri sociali benefici a b/t INPS-MGR', 'Costs', 'P&L', 'External', 'YES', NULL, NULL),
('RCC1TF2009', 'Travel', 'Spese di viaggio e t', 'Costs', 'P&L', 'External', 'YES', 'LANCHES E REFEICOES', NULL),
('RCH1125092', 'Capex D&A', 'AMM.TO ALTR IMP&MACC', 'Costs', 'P&L', 'External', 'NO', 'RES-IMOB DEPREC-M&S-UTENS E MOVEIS', NULL),
('RFF1200000', 'Financial income', 'Int.att.disp.-sist.b', 'Costs', 'P&L', 'External', 'NO', 'RECEITA COM APLICAÇÕES FINANCEIRAS', NULL),
('RFST500000', 'Financial expenses', 'On.fin. cess. cred. con cancellazione-T', 'Costs', 'P&L', 'External', 'NO', NULL, NULL),
('RARZTZ0900', 'Other costs', 'Servizi valore aggiu', 'Costs', 'P&L', 'External', 'YES', 'RECEITAS E RENDAS-MATERIAIS', NULL),
('R999999999', 'Managerial Adjustments', 'Managerial Adjustments', 'Costs', 'P&L', 'External', 'NO', NULL, NULL);

-- Atualizar registros existentes em financial_entries para usar a legenda
UPDATE public.financial_entries fe
SET 
  cost_type = cl.cost_type,
  macro_cost_type = cl.macro_cost_type,
  cost_class_description = cl.description
FROM public.cost_class_legend cl
WHERE fe.cost_class = cl.account_number;

-- Para registros sem correspondência na legenda, manter classificação baseada em entry_type
UPDATE public.financial_entries
SET 
  cost_type = COALESCE(cost_type, 'não classificado'),
  macro_cost_type = COALESCE(macro_cost_type, CASE WHEN entry_type = 'credit' THEN 'Revenues' ELSE 'Costs' END),
  cost_class_description = COALESCE(cost_class_description, 'Sem legenda')
WHERE cost_type IS NULL OR macro_cost_type IS NULL;