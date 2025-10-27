-- Tabela de Legenda de Classe de Custo (fixa)
CREATE TABLE IF NOT EXISTS public.cost_class_legend (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_number TEXT NOT NULL UNIQUE, -- Coluna A (Classe de custo)
  cost_type TEXT NOT NULL, -- Coluna B (Cost Type)
  description TEXT, -- Descrição
  macro_cost_type TEXT NOT NULL, -- Coluna D (Macro Cost Type)
  bs_pl TEXT, -- BS/P&L
  enel_group_external TEXT, -- ENEL Group/External
  ebitda TEXT, -- EBITDA (Y/N)
  brazilian_description TEXT, -- Brazilian Description
  cost_type_capex TEXT, -- Cost Type CAPEX
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Lançamentos Financeiros (CJI3)
CREATE TABLE IF NOT EXISTS public.financial_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  upload_id UUID, -- Referência ao upload
  
  -- Dados da CJI3
  posting_date DATE NOT NULL, -- Coluna B
  pep_element TEXT, -- Coluna C
  object_code TEXT NOT NULL, -- Coluna D
  object_name TEXT, -- Coluna E
  cost_class TEXT NOT NULL, -- Coluna F (chave para legenda)
  cost_class_description TEXT, -- Coluna G
  value_eur DECIMAL(15,2) NOT NULL, -- Coluna J (original)
  value_brl DECIMAL(15,2) NOT NULL, -- Coluna U (original)
  
  -- Valores corrigidos (inversão de sinal)
  corrected_value_eur DECIMAL(15,2) NOT NULL, -- Valor invertido
  corrected_value_brl DECIMAL(15,2) NOT NULL, -- Valor invertido
  
  -- Classificação da Legenda
  cost_type TEXT, -- Da legenda
  macro_cost_type TEXT, -- Da legenda
  
  -- Status e metadados
  entry_type TEXT CHECK (entry_type IN ('credit', 'debit')), -- crédito ou débito
  is_duplicate BOOLEAN DEFAULT false,
  is_unrecognized BOOLEAN DEFAULT false, -- Não encontrou na legenda
  
  -- Campos adicionais da CJI3
  currency TEXT, -- Moeda da transação
  document_text TEXT, -- Texto de cabeçalho de documento
  document_number TEXT, -- Nº documento
  purchase_document TEXT, -- Documento de compras
  reference_document TEXT, -- Nº doc.de referência
  entry_date DATE, -- Data de entrada
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Histórico de Uploads
CREATE TABLE IF NOT EXISTS public.upload_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  total_entries INTEGER DEFAULT 0,
  classified_entries INTEGER DEFAULT 0,
  duplicate_entries INTEGER DEFAULT 0,
  unrecognized_entries INTEGER DEFAULT 0,
  status TEXT CHECK (status IN ('processing', 'completed', 'failed')) DEFAULT 'processing',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_cost_class_legend_account ON public.cost_class_legend(account_number);
CREATE INDEX IF NOT EXISTS idx_financial_entries_user ON public.financial_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_entries_upload ON public.financial_entries(upload_id);
CREATE INDEX IF NOT EXISTS idx_financial_entries_date ON public.financial_entries(posting_date);
CREATE INDEX IF NOT EXISTS idx_financial_entries_object ON public.financial_entries(object_code);
CREATE INDEX IF NOT EXISTS idx_financial_entries_cost_class ON public.financial_entries(cost_class);
CREATE INDEX IF NOT EXISTS idx_upload_history_user ON public.upload_history(user_id);

-- Índice composto para detecção de duplicatas
CREATE INDEX IF NOT EXISTS idx_financial_entries_duplicate_check 
ON public.financial_entries(posting_date, object_code, cost_class, value_eur);

-- Habilitar RLS
ALTER TABLE public.cost_class_legend ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upload_history ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para cost_class_legend (todos podem ler, admin pode editar)
CREATE POLICY "Todos podem ler a legenda"
ON public.cost_class_legend FOR SELECT
USING (true);

-- Políticas RLS para financial_entries (usuário vê apenas seus dados)
CREATE POLICY "Usuários veem seus próprios lançamentos"
ON public.financial_entries FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir seus próprios lançamentos"
ON public.financial_entries FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seus próprios lançamentos"
ON public.financial_entries FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar seus próprios lançamentos"
ON public.financial_entries FOR DELETE
USING (auth.uid() = user_id);

-- Políticas RLS para upload_history
CREATE POLICY "Usuários veem seu próprio histórico"
ON public.upload_history FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar histórico de upload"
ON public.upload_history FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seu histórico"
ON public.upload_history FOR UPDATE
USING (auth.uid() = user_id);

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_cost_class_legend_updated_at
BEFORE UPDATE ON public.cost_class_legend
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_financial_entries_updated_at
BEFORE UPDATE ON public.financial_entries
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_upload_history_updated_at
BEFORE UPDATE ON public.upload_history
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();