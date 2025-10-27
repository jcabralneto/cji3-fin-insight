-- Criar enum para roles (preparando para futuro sistema de roles)
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Garantir que a função update_updated_at_column existe
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Tabela de legendas de classe de custo (dados de referência)
CREATE TABLE IF NOT EXISTS public.cost_class_legend (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_number TEXT NOT NULL,
  cost_type TEXT NOT NULL,
  macro_cost_type TEXT NOT NULL,
  enel_group_external TEXT,
  bs_pl TEXT,
  description TEXT,
  cost_type_capex TEXT,
  ebitda TEXT,
  brazilian_description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de histórico de uploads
CREATE TABLE IF NOT EXISTS public.upload_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  status TEXT DEFAULT 'processing',
  total_entries INTEGER DEFAULT 0,
  classified_entries INTEGER DEFAULT 0,
  unrecognized_entries INTEGER DEFAULT 0,
  duplicate_entries INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Tabela de lançamentos financeiros
CREATE TABLE IF NOT EXISTS public.financial_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  upload_id UUID REFERENCES public.upload_history(id) ON DELETE CASCADE,
  posting_date DATE NOT NULL,
  entry_date DATE,
  object_code TEXT NOT NULL,
  object_name TEXT,
  pep_element TEXT,
  cost_class TEXT NOT NULL,
  cost_class_description TEXT,
  cost_type TEXT,
  macro_cost_type TEXT,
  entry_type TEXT,
  value_brl NUMERIC NOT NULL,
  value_eur NUMERIC NOT NULL,
  corrected_value_brl NUMERIC NOT NULL,
  corrected_value_eur NUMERIC NOT NULL,
  currency TEXT,
  document_text TEXT,
  document_number TEXT,
  purchase_document TEXT,
  reference_document TEXT,
  is_duplicate BOOLEAN DEFAULT false,
  is_unrecognized BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.cost_class_legend ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upload_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_entries ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para cost_class_legend (leitura pública)
DROP POLICY IF EXISTS "Todos podem ler a legenda" ON public.cost_class_legend;
CREATE POLICY "Todos podem ler a legenda"
  ON public.cost_class_legend
  FOR SELECT
  USING (true);

-- Políticas RLS para upload_history
DROP POLICY IF EXISTS "Usuários veem seu próprio histórico" ON public.upload_history;
CREATE POLICY "Usuários veem seu próprio histórico"
  ON public.upload_history
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários podem criar histórico de upload" ON public.upload_history;
CREATE POLICY "Usuários podem criar histórico de upload"
  ON public.upload_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários podem atualizar seu histórico" ON public.upload_history;
CREATE POLICY "Usuários podem atualizar seu histórico"
  ON public.upload_history
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Políticas RLS para financial_entries
DROP POLICY IF EXISTS "Usuários veem seus próprios lançamentos" ON public.financial_entries;
CREATE POLICY "Usuários veem seus próprios lançamentos"
  ON public.financial_entries
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários podem inserir seus próprios lançamentos" ON public.financial_entries;
CREATE POLICY "Usuários podem inserir seus próprios lançamentos"
  ON public.financial_entries
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios lançamentos" ON public.financial_entries;
CREATE POLICY "Usuários podem atualizar seus próprios lançamentos"
  ON public.financial_entries
  FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários podem deletar seus próprios lançamentos" ON public.financial_entries;
CREATE POLICY "Usuários podem deletar seus próprios lançamentos"
  ON public.financial_entries
  FOR DELETE
  USING (auth.uid() = user_id);

-- Triggers para atualizar updated_at automaticamente
DROP TRIGGER IF EXISTS update_cost_class_legend_updated_at ON public.cost_class_legend;
CREATE TRIGGER update_cost_class_legend_updated_at
  BEFORE UPDATE ON public.cost_class_legend
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_financial_entries_updated_at ON public.financial_entries;
CREATE TRIGGER update_financial_entries_updated_at
  BEFORE UPDATE ON public.financial_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();