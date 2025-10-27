import { Card } from "@/components/ui/card";
import { Plus, Minus, Equal } from "lucide-react";

interface DREData {
  receitaBruta: number;
  deducoes: number;
  receitaLiquida: number;
  custosDirectos: number;
  lucroBruto: number;
  despesasOperacionais: number;
  resultadoOperacional: number;
}

interface DREStructureProps {
  data: DREData;
  formatCurrency: (value: number) => string;
}

const DREStructure = ({ data, formatCurrency }: DREStructureProps) => {
  const getRowColor = (type: "positive" | "negative" | "result") => {
    if (type === "positive") return "text-success";
    if (type === "negative") return "text-destructive";
    return "text-primary";
  };

  const getIcon = (type: "plus" | "minus" | "equals") => {
    const iconClass = "w-5 h-5 shrink-0";
    if (type === "plus") return <Plus className={iconClass} />;
    if (type === "minus") return <Minus className={iconClass} />;
    return <Equal className={iconClass} />;
  };

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-semibold mb-6">Estrutura DRE</h2>
      
      <div className="space-y-1">
        {/* Receita Bruta */}
        <div className="flex items-center justify-between py-4 px-4 hover:bg-muted/30 rounded-lg transition-colors">
          <div className="flex items-center gap-3">
            {getIcon("plus")}
            <div>
              <p className="font-semibold">Receita Bruta</p>
              <p className="text-xs text-muted-foreground">Total de receitas antes das deduções</p>
            </div>
          </div>
          <p className={`text-lg font-bold ${getRowColor("positive")}`}>
            {formatCurrency(data.receitaBruta)}
          </p>
        </div>

        {/* Deduções */}
        <div className="flex items-center justify-between py-4 px-4 hover:bg-muted/30 rounded-lg transition-colors">
          <div className="flex items-center gap-3">
            {getIcon("minus")}
            <div>
              <p className="font-semibold">Deduções</p>
              <p className="text-xs text-muted-foreground">Impostos sobre receita (ISS, IRRF, INSS)</p>
            </div>
          </div>
          <p className={`text-lg font-bold ${getRowColor("negative")}`}>
            ({formatCurrency(data.deducoes)})
          </p>
        </div>

        {/* Receita Líquida */}
        <div className="flex items-center justify-between py-4 px-4 bg-success/10 rounded-lg border-2 border-success/30">
          <div className="flex items-center gap-3">
            {getIcon("equals")}
            <div>
              <p className="font-bold text-success">Receita Líquida</p>
              <p className="text-xs text-muted-foreground">Receita após deduções</p>
            </div>
          </div>
          <p className="text-xl font-bold text-success">
            {formatCurrency(data.receitaLiquida)}
          </p>
        </div>

        {/* Custos Diretos */}
        <div className="flex items-center justify-between py-4 px-4 hover:bg-muted/30 rounded-lg transition-colors mt-3">
          <div className="flex items-center gap-3">
            {getIcon("minus")}
            <div>
              <p className="font-semibold">Custos Diretos</p>
              <p className="text-xs text-muted-foreground">Custos diretamente ligados à produção</p>
            </div>
          </div>
          <p className={`text-lg font-bold ${getRowColor("negative")}`}>
            ({formatCurrency(data.custosDirectos)})
          </p>
        </div>

        {/* Lucro Bruto */}
        <div className="flex items-center justify-between py-4 px-4 bg-primary/10 rounded-lg border-2 border-primary/30">
          <div className="flex items-center gap-3">
            {getIcon("equals")}
            <div>
              <p className="font-bold text-primary">Lucro Bruto</p>
              <p className="text-xs text-muted-foreground">
                Margem: {((data.lucroBruto / data.receitaLiquida) * 100).toFixed(1)}%
              </p>
            </div>
          </div>
          <p className="text-xl font-bold text-primary">
            {formatCurrency(data.lucroBruto)}
          </p>
        </div>

        {/* Despesas Operacionais */}
        <div className="flex items-center justify-between py-4 px-4 hover:bg-muted/30 rounded-lg transition-colors mt-3">
          <div className="flex items-center gap-3">
            {getIcon("minus")}
            <div>
              <p className="font-semibold">Despesas Operacionais</p>
              <p className="text-xs text-muted-foreground">Despesas administrativas e comerciais</p>
            </div>
          </div>
          <p className={`text-lg font-bold ${getRowColor("negative")}`}>
            ({formatCurrency(data.despesasOperacionais)})
          </p>
        </div>

        {/* Resultado Operacional (EBIT) */}
        <div className="flex items-center justify-between py-4 px-4 bg-secondary/10 rounded-lg border-2 border-secondary/30">
          <div className="flex items-center gap-3">
            {getIcon("equals")}
            <div>
              <p className="font-bold text-secondary">Resultado Operacional (EBIT)</p>
              <p className="text-xs text-muted-foreground">
                Margem: {((data.resultadoOperacional / data.receitaLiquida) * 100).toFixed(1)}%
              </p>
            </div>
          </div>
          <p className="text-xl font-bold text-secondary">
            {formatCurrency(data.resultadoOperacional)}
          </p>
        </div>
      </div>
    </Card>
  );
};

export default DREStructure;
