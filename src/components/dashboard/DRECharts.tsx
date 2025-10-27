import { Card } from "@/components/ui/card";
import { BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

interface DREData {
  receitaBruta: number;
  deducoes: number;
  receitaLiquida: number;
  custosDirectos: number;
  lucroBruto: number;
  despesasOperacionais: number;
  resultadoOperacional: number;
}

interface DREChartsProps {
  data: DREData;
  currency: string;
}

const DRECharts = ({ data, currency }: DREChartsProps) => {
  const waterfall = [
    { name: "Receita Bruta", value: data.receitaBruta, fill: "hsl(var(--success))" },
    { name: "Deduções", value: -data.deducoes, fill: "hsl(var(--destructive))" },
    { name: "Custos Diretos", value: -data.custosDirectos, fill: "hsl(var(--warning))" },
    { name: "Despesas Op.", value: -data.despesasOperacionais, fill: "hsl(var(--accent))" },
    { name: "EBIT", value: data.resultadoOperacional, fill: "hsl(var(--secondary))" },
  ];

  const composition = [
    { name: "Receita Líquida", value: data.receitaLiquida, fill: "hsl(var(--success))" },
    { name: "Custos Diretos", value: data.custosDirectos, fill: "hsl(var(--warning))" },
    { name: "Despesas Op.", value: data.despesasOperacionais, fill: "hsl(var(--accent))" },
    { name: "EBIT", value: data.resultadoOperacional, fill: "hsl(var(--secondary))" },
  ];

  const margins = [
    { 
      name: "Margem Bruta",
      percentage: (data.lucroBruto / data.receitaLiquida) * 100,
      fill: "hsl(var(--primary))"
    },
    { 
      name: "Margem EBIT",
      percentage: (data.resultadoOperacional / data.receitaLiquida) * 100,
      fill: "hsl(var(--secondary))"
    },
  ];

  // ========================================
  // CORREÇÃO: Normalizar código de moeda
  // ========================================
  const formatCurrency = (value: number) => {
    // Garantir que o código de moeda seja válido (BRL ou EUR)
    const currencyCode = currency === "BRL" || currency === "EUR" ? currency : "BRL";
    
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border p-3 rounded-lg shadow-glow">
          <p className="font-semibold">{payload[0].name}</p>
          <p className="text-sm text-primary">
            {formatCurrency(Math.abs(payload[0].value))}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Waterfall Chart */}
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4">Composição do Resultado</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={waterfall}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="name" 
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={100}
            />
            <YAxis 
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              tickFormatter={formatCurrency}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="value" radius={[8, 8, 0, 0]}>
              {waterfall.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Pie Chart */}
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4">Distribuição por Categoria</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={composition}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {composition.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </Card>

      {/* Margins Chart */}
      <Card className="p-6 lg:col-span-2">
        <h3 className="text-xl font-semibold mb-4">Análise de Margens</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={margins} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              type="number" 
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              tickFormatter={(value) => `${value.toFixed(1)}%`}
            />
            <YAxis 
              dataKey="name" 
              type="category"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            />
            <Tooltip 
              formatter={(value: number) => `${value.toFixed(2)}%`}
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
            />
            <Bar dataKey="percentage" radius={[0, 8, 8, 0]}>
              {margins.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
};

export default DRECharts;
