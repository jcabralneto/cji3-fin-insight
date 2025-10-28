import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function UploadLegend() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
        toast({
          title: "Arquivo inválido",
          description: "Por favor, envie um arquivo Excel (.xlsx ou .xls)",
          variant: "destructive",
        });
        return;
      }
      setFile(selectedFile);
      setUploadStatus('idle');
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setUploadStatus('idle');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Usuário não autenticado');
      }

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-cost-legend`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: formData,
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Erro ao fazer upload da legenda');
      }

      setUploadStatus('success');
      toast({
        title: "Sucesso!",
        description: `Legenda carregada com ${result.totalEntries} registros`,
      });
      setFile(null);
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      setUploadStatus('error');
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao fazer upload da legenda",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Upload Legenda de Classe de Custo</h1>
          <p className="text-muted-foreground">
            Faça upload da planilha "Legenda classe de custo" para configurar as regras de classificação.
          </p>
        </div>

        <Card className="p-8">
          <div className="space-y-6">
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
                id="legend-upload"
              />
              <label
                htmlFor="legend-upload"
                className="cursor-pointer inline-block"
              >
                <Button variant="outline" asChild>
                  <span>Selecionar Arquivo Excel</span>
                </Button>
              </label>
              {file && (
                <p className="mt-4 text-sm text-muted-foreground">
                  Arquivo selecionado: <strong>{file.name}</strong>
                </p>
              )}
            </div>

            {uploadStatus === 'success' && (
              <div className="flex items-center gap-2 text-green-600 bg-green-50 p-4 rounded-lg">
                <CheckCircle className="w-5 h-5" />
                <span>Legenda carregada com sucesso!</span>
              </div>
            )}

            {uploadStatus === 'error' && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 p-4 rounded-lg">
                <XCircle className="w-5 h-5" />
                <span>Erro ao carregar legenda. Tente novamente.</span>
              </div>
            )}

            <div className="bg-muted p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Estrutura esperada da planilha:</h3>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Coluna A: Account number (Classe de custo)</li>
                <li>• Coluna B: Cost type (ENG)</li>
                <li>• Coluna C: Description</li>
                <li>• Coluna D: Macro cost type</li>
                <li>• Demais colunas: informações complementares</li>
              </ul>
            </div>

            <Button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="w-full"
              size="lg"
            >
              {uploading ? "Processando..." : "Carregar Legenda"}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
