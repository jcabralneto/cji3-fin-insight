import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/browserClient";
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import DREStructure from "@/components/dashboard/DREStructure";
import DRECharts from "@/components/dashboard/DRECharts";

// ========================================
// INTERFACES E TIPOS
// ========================================

interface DREData {
  receitaBruta: number;
  deducoes: number;
  receitaLiquida: number;
  custosDirectos: number;
  lucroBruto: number;
  despesasOperacionais: number;
  resultadoOperacional: number;
}

type CurrencyType = "BRL" | "EUR";
type PeriodType = "all" | "month" | "quarter" | "year";

// ========================================
// COMPONENTE PRINCIPAL
// ========================================

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Estado
  const [dreData, setDreData] = useState<DREData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>("all");
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyType>("BRL");

  // ========================================
  // EFEITOS
  // ========================================

  useEffect(() => {
    loadDREData();
  }, [selectedPeriod, selectedCurrency]);

  // ========================================
  // FUNÇÕES DE CARREGAMENTO DE DADOS
  // ========================================

  const loadDREData = async () => {
    setIsLoading(true);
    
    try {
      // Buscar dados financeiros do usuário atual
      const { data: entries, error } = await supabase
        .from('financial_entries')
        .select('*')
        .eq('is_duplicate', false); // Excluir duplicatas

      if (error) {
        console.error("Erro ao buscar dados:", error);
        throw error;
      }

      if (!entries || entries.length === 0) {
        toast({
          title: "Sem dados disponíveis",
          description: "Nenhum lançamento encontrado. Faça upload de uma planilha CJI3 primeiro.",
          variant: "destructive",
        });
        setDreData(null);
        setIsLoading(false);
        return;
      }

      // Calcular DRE baseado nos dados
      const calculatedDRE = calculateDRE(entries);
      setDreData(calculatedDRE);

    } catch (error: any) {
      console.error("Erro ao carregar dados do DRE:", error);
      toast({
        title: "Erro ao carregar dados",
        description: error.message || "Não foi possível carregar os dados do DRE. Tente novamente.",
        variant: "destructive",
      });
      setDreData(null);
    } finally {
      setIsLoading(false);
    }
  };

  // ========================================
  // CÁLCULO DO DRE
  // ========================================

  const calculateDRE = (entries: any[]): DREData => {
    // Usar valores CORRIGIDOS (sempre positivos)
    const valueField = selectedCurrency === "BRL" ? "corrected_value_brl" : "corrected_value_eur";
    
    let receitaBruta = 0;
    let deducoes = 0;
    let custosDirectos = 0;
    let despesasOperacionais = 0;

    entries.forEach(entry => {
      const value = Number(entry[valueField]) || 0;
      const macroType = (entry.macro_cost_type || "").toLowerCase().trim();

      // Classificar baseado no Macro Cost Type da legenda
      switch (macroType) {
        case "receita":
          receitaBruta += value;
          break;
        case "impostos":
          deducoes += value;
          break;
        case "custo direto":
          custosDirectos += value;
          break;
        case "despesa operacional":
          despesasOperacionais += value;
          break;
        default:
          console.warn(`Macro Cost Type não reconhecido: "${macroType}"`);
      }
    });

    // Cálculos do DRE
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
  };

  // ========================================
  // FORMATAÇÃO DE MOEDA
  // ========================================

  const formatCurrency = (value: number): string => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: selectedCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // ========================================
  // RENDERIZAÇÃO
  // ========================================

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* ========================================
            HEADER
        ======================================== */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/")}
                className="shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-4xl font-bold bg-gradient-accent bg-clip-text text-transparent">
                Dashboard DRE
              </h1>
            </div>
            <p className="text-muted-foreground md:ml-14">
              Demonstração de Resultado do Exercício
            </p>
          </div>

          {/* Controles */}
          <div className="flex gap-3 md:ml-14 lg:ml-0">
            <Select value={selectedCurrency} onValueChange={(value) => setSelectedCurrency(value as CurrencyType)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BRL">BRL (R$)</SelectItem>
                <SelectItem value="EUR">EUR (€)</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedPeriod} onValueChange={(value) => setSelectedPeriod(value as PeriodType)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os períodos</SelectItem>
                <SelectItem value="month">Mês atual</SelectItem>
                <SelectItem value="quarter">Trimestre</SelectItem>
                <SelectItem value="year">Ano</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ========================================
            LOADING STATE
        ======================================== */}
        {isLoading && (
          <Card className="p-12">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              <p className="text-muted-foreground">Carregando dados do DRE...</p>
            </div>
          </Card>
        )}

        {/* ========================================
            EMPTY STATE
        ======================================== */}
        {!isLoading && !dreData && (
          <Card className="p-12">
            <div className="flex flex-col items-center justify-center space-y-4">
              <Calendar className="w-16 h-16 text-muted-foreground" />
              <div className="text-center space-y-2">
                <h3 className="text-xl font-semibold">Nenhum dado encontrado</h3>
                <p className="text-muted-foreground">
                  Faça upload de uma planilha CJI3 para visualizar o DRE
                </p>
              </div>
              <Button onClick={() => navigate("/upload")}>
                Fazer Upload
              </Button>
            </div>
          </Card>
        )}

        {/* ========================================
            KPI CARDS
        ======================================== */}
        {dreData && !isLoading && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Receita Líquida */}
              <Card className="p-6 hover:shadow-glow transition-all duration-300 border-2 border-border hover:border-success">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Receita Líquida</p>
                    <DollarSign className="w-4 h-4 text-success" />
                  </div>
                  <p className="text-2xl font-bold text-success">
                    {formatCurrency(dreData.receitaLiquida)}
                  </p>
                </div>
              </Card>

              {/* Lucro Bruto */}
              <Card className="p-6 hover:shadow-glow transition-all duration-300 border-2 border-border hover:border-primary">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Lucro Bruto</p>
                    <TrendingUp className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(dreData.lucroBruto)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Margem: {dreData.receitaLiquida > 0 ? ((dreData.lucroBruto / dreData.receitaLiquida) * 100).toFixed(1) : 0}%
                  </p>
                </div>
              </Card>

              {/* EBIT */}
              <Card className="p-6 hover:shadow-glow transition-all duration-300 border-2 border-border hover:border-secondary">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">EBIT</p>
                    <TrendingUp className="w-4 h-4 text-secondary" />
                  </div>
                  <p className="text-2xl font-bold text-secondary">
                    {formatCurrency(dreData.resultadoOperacional)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Margem: {dreData.receitaLiquida > 0 ? ((dreData.resultadoOperacional / dreData.receitaLiquida) * 100).toFixed(1) : 0}%
                  </p>
                </div>
              </Card>

              {/* Custos Totais */}
              <Card className="p-6 hover:shadow-glow transition-all duration-300 border-2 border-border hover:border-warning">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Custos Totais</p>
                    <TrendingDown className="w-4 h-4 text-warning" />
                  </div>
                  <p className="text-2xl font-bold text-warning">
                    {formatCurrency(dreData.custosDirectos + dreData.despesasOperacionais)}
                  </p>
                </div>
              </Card>
            </div>

            {/* ========================================
                DRE STRUCTURE
            ======================================== */}
            <DREStructure data={dreData} formatCurrency={formatCurrency} />

            {/* ========================================
                CHARTS
            ======================================== */}
            <DRECharts data={dreData} currency={selectedCurrency} />

            {/* ========================================
                ACTIONS
            ======================================== */}
            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => navigate("/upload")}
              >
                Novo Upload
              </Button>
              <Button
                onClick={() => {
                  toast({
                    title: "Funcionalidade em desenvolvimento",
                    description: "A exportação para PDF estará disponível em breve.",
                  });
                }}
              >
                Exportar DRE (PDF)
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
