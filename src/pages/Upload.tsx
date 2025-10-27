import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Upload as UploadIcon, FileSpreadsheet, AlertCircle, CheckCircle2, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/browserClient";

interface ValidationResult {
  status: 'success' | 'warning' | 'error';
  message: string;
  count?: number;
}

interface PreviewRow {
  date: string;
  object: string;
  costClass: string;
  valueBRL: number;
  valueEUR: number;
  costType: string;
  macroCostType: string;
  status: 'ok' | 'duplicate' | 'unrecognized';
}

const Upload = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [previewData, setPreviewData] = useState<PreviewRow[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith('.xlsx')) {
      processFile(droppedFile);
    } else {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, envie apenas arquivos .xlsx",
        variant: "destructive",
      });
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  };

  const processFile = async (uploadedFile: File) => {
    setFile(uploadedFile);
    setIsProcessing(true);
    setProgress(0);

    // Simular processamento
    const steps = [
      { progress: 20, message: "Lendo planilha..." },
      { progress: 40, message: "Validando estrutura..." },
      { progress: 60, message: "Classificando lançamentos..." },
      { progress: 80, message: "Identificando duplicatas..." },
      { progress: 100, message: "Concluído!" }
    ];

    for (const step of steps) {
      await new Promise(resolve => setTimeout(resolve, 500));
      setProgress(step.progress);
    }

    // Resultados de validação simulados
    setValidationResults([
      { status: 'success', message: '1.247 lançamentos processados', count: 1247 },
      { status: 'success', message: '1.189 classificados automaticamente', count: 1189 },
      { status: 'warning', message: '34 duplicatas encontradas', count: 34 },
      { status: 'error', message: '24 sem classificação (verificar)', count: 24 },
    ]);

    // Preview simulado
    setPreviewData([
      {
        date: "01/09/2025",
        object: "BR18D50001Y0000000000000",
        costClass: "RCC1T5Z000",
        valueBRL: -700000.00,
        valueEUR: -109890.97,
        costType: "Consultoria",
        macroCostType: "Custos",
        status: "ok"
      },
      {
        date: "01/09/2025",
        object: "BR18D50001Y0000000000000",
        costClass: "RCC1T5Z000",
        valueBRL: -700000.00,
        valueEUR: -109890.97,
        costType: "Consultoria",
        macroCostType: "Custos",
        status: "duplicate"
      },
      {
        date: "01/09/2025",
        object: "BR18D50024Y00OPXRENTAL00",
        costClass: "RCC1GZZ00Z",
        valueBRL: 55941.00,
        valueEUR: 8804.61,
        costType: "Outros custos",
        macroCostType: "Custos",
        status: "ok"
      },
      {
        date: "01/09/2025",
        object: "BR18D50024YJTTESG0IT70RD",
        costClass: "RAA2GZ0001",
        valueBRL: 696289.58,
        valueEUR: 110039.21,
        costType: "Não reconhecido",
        macroCostType: "Não reconhecido",
        status: "unrecognized"
      },
    ]);

    setIsProcessing(false);
    
    toast({
      title: "Processamento concluído",
      description: "Planilha processada com sucesso. Revise os resultados abaixo.",
    });
  };

  const clearFile = () => {
    setFile(null);
    setValidationResults([]);
    setPreviewData([]);
    setProgress(0);
  };

  const handleConfirmAndProcess = async () => {
    if (!file) return;
    
    setIsSaving(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Você precisa estar autenticado');
      }

      const formData = new FormData();
      formData.append('file', file);

      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-excel-upload`;

      const res = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
        },
        body: formData,
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const msg = (data && (data.error || data.message)) || 'Falha ao processar upload';
        throw new Error(msg);
      }

      toast({
        title: "Upload processado com sucesso!",
        description: `${data?.summary?.total ?? 0} lançamentos processados.`,
      });

      navigate('/dashboard');
    } catch (error: any) {
      console.error('Erro ao processar upload:', error);
      toast({
        title: "Erro ao processar upload",
        description: error.message || "Ocorreu um erro. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusBadge = (status: PreviewRow['status']) => {
    switch (status) {
      case 'ok':
        return <Badge className="bg-success text-success-foreground">OK</Badge>;
      case 'duplicate':
        return <Badge className="bg-warning text-warning-foreground">Duplicata</Badge>;
      case 'unrecognized':
        return <Badge variant="destructive">Não reconhecido</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-accent bg-clip-text text-transparent">
            Upload de Planilha CJI3
          </h1>
          <p className="text-muted-foreground">
            Envie sua planilha SAP para análise automática e geração do dashboard DRE
          </p>
        </div>

        {/* Upload Area */}
        <Card className="border-2 border-dashed transition-all duration-300 hover:border-primary">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`p-12 text-center transition-colors ${
              isDragging ? 'bg-primary/10' : ''
            }`}
          >
            {!file ? (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
                    <UploadIcon className="w-10 h-10 text-primary" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold">
                    Arraste sua planilha aqui
                  </h3>
                  <p className="text-muted-foreground">
                    ou clique no botão abaixo para selecionar
                  </p>
                </div>
                <div>
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    accept=".xlsx"
                    onChange={handleFileInput}
                  />
                  <label htmlFor="file-upload">
                    <Button asChild>
                      <span className="cursor-pointer">
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                        Selecionar arquivo .xlsx
                      </span>
                    </Button>
                  </label>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="w-8 h-8 text-primary" />
                    <div className="text-left">
                      <p className="font-semibold">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={clearFile}
                    disabled={isProcessing}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {isProcessing && (
                  <div className="space-y-2">
                    <Progress value={progress} className="h-2" />
                    <p className="text-sm text-muted-foreground">
                      Processando... {progress}%
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Validation Results */}
        {validationResults.length > 0 && (
          <Card className="p-6">
            <h2 className="text-2xl font-semibold mb-4">Resultados da Validação</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {validationResults.map((result, index) => (
                <div
                  key={index}
                  className="p-4 rounded-lg border-2 transition-all hover:shadow-glow"
                  style={{
                    borderColor: result.status === 'success' ? 'hsl(var(--success))' :
                                result.status === 'warning' ? 'hsl(var(--warning))' :
                                'hsl(var(--destructive))'
                  }}
                >
                  <div className="flex items-start gap-3">
                    {result.status === 'success' && (
                      <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
                    )}
                    {result.status === 'warning' && (
                      <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                    )}
                    {result.status === 'error' && (
                      <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="font-semibold text-2xl">{result.count}</p>
                      <p className="text-sm text-muted-foreground">{result.message}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Preview Table */}
        {previewData.length > 0 && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold">Preview dos Dados</h2>
              <Button onClick={handleConfirmAndProcess} disabled={isSaving}>
                {isSaving ? "Salvando..." : "Confirmar e Processar"}
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-2 font-semibold">Status</th>
                    <th className="text-left py-3 px-2 font-semibold">Data</th>
                    <th className="text-left py-3 px-2 font-semibold">Objeto</th>
                    <th className="text-left py-3 px-2 font-semibold">Classe</th>
                    <th className="text-right py-3 px-2 font-semibold">Valor BRL</th>
                    <th className="text-right py-3 px-2 font-semibold">Valor EUR</th>
                    <th className="text-left py-3 px-2 font-semibold">Tipo de Custo</th>
                    <th className="text-left py-3 px-2 font-semibold">Macro Tipo</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((row, index) => (
                    <tr
                      key={index}
                      className={`border-b border-border/50 transition-colors hover:bg-muted/30 ${
                        row.status === 'unrecognized' ? 'bg-destructive/10' :
                        row.status === 'duplicate' ? 'bg-warning/10' : ''
                      }`}
                    >
                      <td className="py-3 px-2">{getStatusBadge(row.status)}</td>
                      <td className="py-3 px-2 text-sm">{row.date}</td>
                      <td className="py-3 px-2 text-sm font-mono">{row.object}</td>
                      <td className="py-3 px-2 text-sm font-mono">{row.costClass}</td>
                      <td className={`py-3 px-2 text-sm text-right font-mono ${
                        row.valueBRL < 0 ? 'text-success' : 'text-destructive'
                      }`}>
                        {row.valueBRL.toLocaleString('pt-BR', { 
                          style: 'currency', 
                          currency: 'BRL' 
                        })}
                      </td>
                      <td className={`py-3 px-2 text-sm text-right font-mono ${
                        row.valueEUR < 0 ? 'text-success' : 'text-destructive'
                      }`}>
                        {row.valueEUR.toLocaleString('pt-BR', { 
                          style: 'currency', 
                          currency: 'EUR' 
                        })}
                      </td>
                      <td className="py-3 px-2 text-sm">{row.costType}</td>
                      <td className="py-3 px-2 text-sm">{row.macroCostType}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Upload;
