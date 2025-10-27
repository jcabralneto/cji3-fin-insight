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

interface DREData {
  receitaBruta: number;
  deducoes: number;
  receitaLiquida: number;
  custosDirectos: number;
  lucroBruto: number;
  despesasOperacionais: number;
  resultadoOperacional: number;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [dreData, setDreData] = useState<DREData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState("all");
  const [selectedCurrency, setSelectedCurrency] = useState("BRL");

  useEffect(() => {
    loadDREData();
  }, [selectedPeriod, selectedCurrency]);

  const loadDREData = async () => {
    setIsLoading(true);
    try {
      const { data: entries, error } = await supabase
        .from('financial_entries')
        .select('*');

      if (error) throw error;

      if (!entries || entries.length === 0) {
        toast({
          title: "Sem dados",
          description: "Nenhum lançamento encontrado. Faça upload de uma planilha primeiro.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Calcular DRE baseado nos dados
      const valueField = selectedCurrency === "BRL" ? "corrected_value_brl" : "corrected_value_eur";
      
      let receitaBruta = 0;
      let deducoes = 0;
      let custosDirectos = 0;
      let despesasOperacionais = 0;

      entries.forEach(entry => {
        const value = Number(entry[valueField]) || 0;
        const macroType = entry.macro_cost_type?.toLowerCase() || "";

        if (macroType.includes("receita") || macroType.includes("revenue")) {
          receitaBruta += value;
        } else if (macroType.includes("deduc") || macroType.includes("imposto") || macroType.includes("tax")) {
          deducoes += Math.abs(value);
        } else if (macroType.includes("custo") || macroType.includes("cost")) {
          custosDirectos += Math.abs(value);
        } else if (macroType.includes("despesa") || macroType.includes("expense")) {
          despesasOperacionais += Math.abs(value);
        }
      });

      const receitaLiquida = receitaBruta - deducoes;
      const lucroBruto = receitaLiquida - custosDirectos;
      const resultadoOperacional = lucroBruto - despesasOperacionais;

      setDreData({
        receitaBruta,
        deducoes,
        receitaLiquida,
        custosDirectos,
        lucroBruto,
        despesasOperacionais,
        resultadoOperacional,
      });

    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados do DRE.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    const currency = selectedCurrency === "BRL" ? "BRL" : "EUR";
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    });
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/")}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-4xl font-bold bg-gradient-accent bg-clip-text text-transparent">
                Dashboard DRE
              </h1>
            </div>
            <p className="text-muted-foreground ml-14">
              Demonstração de Resultado do Exercício
            </p>
          </div>

          <div className="flex gap-3">
            <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BRL">BRL (R$)</SelectItem>
                <SelectItem value="EUR">EUR (€)</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
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

        {/* KPI Cards */}
        {dreData && !isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                  Margem: {((dreData.lucroBruto / dreData.receitaLiquida) * 100).toFixed(1)}%
                </p>
              </div>
            </Card>

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
                  Margem: {((dreData.resultadoOperacional / dreData.receitaLiquida) * 100).toFixed(1)}%
                </p>
              </div>
            </Card>

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
        )}

        {/* DRE Structure */}
        {dreData && !isLoading && (
          <DREStructure data={dreData} formatCurrency={formatCurrency} />
        )}

        {/* Charts */}
        {dreData && !isLoading && (
          <DRECharts data={dreData} currency={selectedCurrency} />
        )}

        {/* Loading State */}
        {isLoading && (
          <Card className="p-12">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              <p className="text-muted-foreground">Carregando dados do DRE...</p>
            </div>
          </Card>
        )}

        {/* Empty State */}
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
      </div>
    </div>
  );
};

export default Dashboard;
