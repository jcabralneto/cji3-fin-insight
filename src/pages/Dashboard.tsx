import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import DREStructure from '@/components/dashboard/DREStructure';
import DRECharts from '@/components/dashboard/DRECharts';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Types aligned with components
interface DREData {
  receitaBruta: number;
  deducoes: number;
  receitaLiquida: number;
  custosDirectos: number;
  lucroBruto: number;
  despesasOperacionais: number;
  resultadoOperacional: number;
}

interface FinancialEntry {
  posting_date: string;
  macro_cost_type: string | null;
  dre_line: string | null;
  corrected_value_brl: number;
  corrected_value_eur: number;
  value_brl: number;
  value_eur: number;
  is_duplicate: boolean | null;
}

function calculateDRE(entries: FinancialEntry[], currency: 'BRL' | 'EUR'): DREData {
  const getVal = (e: FinancialEntry) => currency === 'EUR' ? (Number(e.corrected_value_eur ?? e.value_eur) || 0) : (Number(e.corrected_value_brl ?? e.value_brl) || 0);

  const receitaBruta = entries
    .filter(e => e.dre_line === 'RECEITA_BRUTA' || e.dre_line === 'OUTRAS_RECEITAS')
    .reduce((sum, e) => sum + getVal(e), 0);

  const deducoes = entries
    .filter(e => ['DEDUCOES_RECEITA_IMPOSTOS', 'DEVOLUCOES_ABATIMENTOS', 'OUTRAS_DEDUCOES'].includes(e.dre_line || ''))
    .reduce((sum, e) => sum + Math.abs(getVal(e)), 0);

  const custosDirectos = entries
    .filter(e => e.dre_line === 'CUSTOS_DIRETOS')
    .reduce((sum, e) => sum + Math.abs(getVal(e)), 0);

  const despesasOperacionais = entries
    .filter(e => [
      'DESPESAS_VENDAS', 
      'DESPESAS_ADMINISTRATIVAS', 
      'DESPESAS_GERAIS',
      'DESPESAS_OPERACIONAIS_IMPOSTOS',
      'DESPESAS_FINANCEIRAS',
      'OUTRAS_DESPESAS'
    ].includes(e.dre_line || ''))
    .reduce((sum, e) => sum + Math.abs(getVal(e)), 0);

  const receitaLiquida = receitaBruta - deducoes;
  const lucroBruto = receitaLiquida - custosDirectos;
  const resultadoOperacional = lucroBruto - despesasOperacionais;

  return {
    receitaBruta,
    deducoes,
    receitaLiquida,
    custosDirectos,
    lucroBruto,
    despesasOperacionais,
    resultadoOperacional,
  };
}

const Dashboard = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [entries, setEntries] = useState<FinancialEntry[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState<'BRL' | 'EUR'>('BRL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  useEffect(() => {
    document.title = 'Dashboard DRE | Análise Financeira';
  }, []);

  const loadDREData = async () => {
    setIsLoading(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        toast({
          title: 'Erro de autenticação',
          description: 'Você precisa estar logado para visualizar o dashboard.',
          variant: 'destructive',
        });
        return;
      }

      const { data, error } = await supabase
        .from('financial_entries')
        .select('*')
        .eq('is_duplicate', false);

      if (error) throw error;

      if (!data || data.length === 0) {
        toast({
          title: 'Sem dados disponíveis',
          description: 'Nenhum lançamento encontrado. Faça upload de uma planilha CJI3 primeiro.',
        });
        setEntries([]);
        return;
      }

      setEntries(data as FinancialEntry[]);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar dados',
        description: error.message || 'Não foi possível carregar os dados do DRE. Tente novamente.',
        variant: 'destructive',
      });
      setEntries([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDREData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredEntries = useMemo(() => {
    let filtered = entries;
    
    if (startDate) {
      filtered = filtered.filter(e => e.posting_date >= startDate);
    }
    
    if (endDate) {
      filtered = filtered.filter(e => e.posting_date <= endDate);
    }
    
    return filtered;
  }, [entries, startDate, endDate]);

  const dreData = useMemo(() => calculateDRE(filteredEntries, selectedCurrency), [filteredEntries, selectedCurrency]);

  const formatCurrency = (value: number) => {
    const code = selectedCurrency;
    try {
      return value.toLocaleString('pt-BR', { style: 'currency', currency: code, minimumFractionDigits: 0, maximumFractionDigits: 0 });
    } catch {
      const symbol = code === 'EUR' ? '€' : 'R$';
      return `${symbol} ${value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    }
  };

  return (
    <main className="container mx-auto p-6 space-y-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Dashboard DRE</h1>
        <p className="text-muted-foreground">Demonstração do Resultado por composição e gráficos</p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex flex-col gap-2">
            <span className="text-sm text-muted-foreground">Moeda:</span>
            <Select value={selectedCurrency} onValueChange={(v: 'BRL' | 'EUR') => setSelectedCurrency(v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Moeda" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BRL">BRL (R$)</SelectItem>
                <SelectItem value="EUR">EUR (€)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="start-date" className="text-sm text-muted-foreground">Data Inicial:</label>
            <input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 border rounded-md bg-background text-foreground"
            />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="end-date" className="text-sm text-muted-foreground">Data Final:</label>
            <input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 border rounded-md bg-background text-foreground"
            />
          </div>
        </Card>
      </section>

      {(startDate || endDate) && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Exibindo {filteredEntries.length} de {entries.length} lançamentos
              {startDate && ` • A partir de ${new Date(startDate).toLocaleDateString('pt-BR')}`}
              {endDate && ` • Até ${new Date(endDate).toLocaleDateString('pt-BR')}`}
            </p>
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
              className="text-sm text-primary hover:underline"
            >
              Limpar filtros
            </button>
          </div>
        </Card>
      )}

      {isLoading ? (
        <p className="text-muted-foreground">Carregando dados...</p>
      ) : entries.length === 0 ? (
        <p className="text-muted-foreground">Nenhum dado para exibir.</p>
      ) : (
        <section className="space-y-6">
          <DREStructure data={dreData} formatCurrency={formatCurrency} />
          <DRECharts data={dreData} currency={selectedCurrency} />
        </section>
      )}
    </main>
  );
};

export default Dashboard;
