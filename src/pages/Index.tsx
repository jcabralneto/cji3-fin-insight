import { Link } from "react-router-dom";
import { Upload, BarChart3, Sparkles, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-accent opacity-20"></div>
        <div className="relative max-w-7xl mx-auto px-6 py-24">
          <div className="text-center space-y-8">
            <div className="space-y-4">
              <h1 className="text-6xl font-bold bg-gradient-accent bg-clip-text text-transparent leading-tight">
                Gridspertise Financial Analytics
              </h1>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Transforme suas planilhas SAP CJI3 em dashboards financeiros inteligentes com análise automática e insights em tempo real
              </p>
            </div>
            
            <div className="flex gap-4 justify-center">
              <Link to="/upload">
                <Button size="lg" className="text-lg px-8 shadow-glow">
                  <Upload className="w-5 h-5 mr-2" />
                  Começar Análise
                </Button>
              </Link>
              <Link to="/dashboard">
                <Button size="lg" variant="outline" className="text-lg px-8">
                  <BarChart3 className="w-5 h-5 mr-2" />
                  Ver Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 hover:shadow-glow transition-all duration-300 border-2 border-border hover:border-primary">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-4">
              <FileSpreadsheet className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Upload Inteligente</h3>
            <p className="text-muted-foreground">
              Validação automática com detecção de duplicatas e classificação inteligente dos lançamentos
            </p>
          </Card>

          <Card className="p-6 hover:shadow-glow transition-all duration-300 border-2 border-border hover:border-secondary">
            <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center mb-4">
              <BarChart3 className="w-6 h-6 text-secondary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Dashboard DRE</h3>
            <p className="text-muted-foreground">
              Visualize receitas, custos e resultado operacional com KPIs e filtros avançados
            </p>
          </Card>

          <Card className="p-6 hover:shadow-glow transition-all duration-300 border-2 border-border hover:border-accent">
            <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-accent" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Insights com IA</h3>
            <p className="text-muted-foreground">
              Análises automáticas em linguagem natural com tendências e alertas inteligentes
            </p>
          </Card>
        </div>

        {/* Process Steps */}
        <div className="mt-16 space-y-8">
          <h2 className="text-3xl font-bold text-center">Como Funciona</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { step: "1", title: "Upload", desc: "Envie sua planilha .xlsx" },
              { step: "2", title: "Validação", desc: "Classificação automática" },
              { step: "3", title: "Dashboard", desc: "Visualize KPIs e DRE" },
              { step: "4", title: "Insights", desc: "Análises com IA" }
            ].map((item, i) => (
              <div key={i} className="text-center space-y-2">
                <div className="w-16 h-16 rounded-full bg-gradient-accent flex items-center justify-center mx-auto text-2xl font-bold">
                  {item.step}
                </div>
                <h4 className="font-semibold">{item.title}</h4>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
