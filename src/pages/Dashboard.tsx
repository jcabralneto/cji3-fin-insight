import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/browserClient";
import { toast } from "@/components/ui/use-toast";
import DRECharts from "@/components/dashboard/DRECharts";
import DREStructure from "@/components/dashboard/DREStructure";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Tipagem alinhada com os componentes de DRE
interface DREData {
  receitaBruta: number;
  deducoes: number;
  receitaLiquida: number;
  custosDirectos: number;
  lucroBruto: number;
  despesasOperacionais: number;
  resultadoOperacional: number;
}

const initialData: DREData = {
  receitaBruta: 0,
  deducoes: 0,
  receitaLiquida: 0,
  custosDirectos: 0,
  lucroBruto: 0,
  despesasOperacionais: 0,
  resultadoOperacional: 0,
};

export default function Dashboard() {
  const [isLoading, setIsLoading] = useState(false);
  const [dreData, setDreData] = useState<DREData>(initialData);
  const [selectedCurrency, setSelectedCurrency] = useState<"BRL" | "EUR">("BRL");

  // SEO básico
  useEffect(() => {
    document.title = "Dashboard DRE | Análises Financeiras";
  }, []);

  const formatCurrency = useCallback(
    (value: number) =>
      new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: selectedCurrency,
        maximumFractionDigits: 2,
      }).format(value || 0),
    [selectedCurrency]
  );

  // Substituir a função loadDREData
  const loadDREData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: entries, error } = await supabase
        .from("financial_entries")
        .select("*")
        .eq("is_duplicate", false); // Excluir duplicatas

      if (error) throw error;

      if (!entries || entries.length === 0) {
        toast({
          title: "Sem dados",
          description: "Nenhum lançamento encontrado. Faça upload de uma planilha primeiro.",
          variant: "destructive",
        });
        setDreData(initialData);
        setIsLoading(false);
        return;
      }

      // Usar valores CORRIGIDOS (sempre positivos)
      const valueField = selectedCurrency === "BRL" ? "corrected_value_brl" : "corrected_value_eur";

      let receitaBruta = 0;
      let deducoes = 0;
      let custosDirectos = 0;
      let despesasOperacionais = 0;

      entries.forEach((entry: any) => {
        const value = Number(entry[valueField]) || 0;
        const macroType = String(entry.macro_cost_type || "").toLowerCase();

        // Classificar baseado no Macro Cost Type
        if (macroType === "receita") {
          receitaBruta += value;
        } else if (macroType === "impostos") {
          deducoes += value;
        } else if (macroType === "custo direto") {
          custosDirectos += value;
        } else if (macroType === "despesa operacional") {
          despesasOperacionais += value;
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
  }, [selectedCurrency]);

  useEffect(() => {
    loadDREData();
  }, [loadDREData]);

  const currencySymbol = useMemo(() => (selectedCurrency === "BRL" ? "R$" : "€"), [selectedCurrency]);

  return (
    <main className="container mx-auto p-4 space-y-6">
      <section className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard DRE</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Moeda:</span>
          <Select value={selectedCurrency} onValueChange={(v) => setSelectedCurrency(v as "BRL" | "EUR")}> 
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Selecione a moeda" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="BRL">BRL - Real</SelectItem>
              <SelectItem value="EUR">EUR - Euro</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Estrutura do DRE</CardTitle>
          </CardHeader>
          <CardContent>
            <DREStructure data={dreData as any} formatCurrency={formatCurrency} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gráficos</CardTitle>
          </CardHeader>
          <CardContent>
            <DRECharts data={dreData as any} currency={currencySymbol} />
          </CardContent>
        </Card>
      </section>

      {isLoading && (
        <p className="text-sm text-muted-foreground">Carregando dados...</p>
      )}
    </main>
  );
}
