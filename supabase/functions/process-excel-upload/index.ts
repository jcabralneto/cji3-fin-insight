// supabase/functions/process-excel-upload/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      throw new Error('Não autorizado');
    }

    const supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      throw new Error('Não autorizado');
    }

    console.log(`[process-excel-upload] Processando upload para usuário: ${user.id}`);

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      throw new Error('Arquivo não encontrado');
    }

    if (file.size > 10 * 1024 * 1024) {
      throw new Error('Arquivo muito grande. Máximo: 10MB');
    }

    console.log(`[process-excel-upload] Arquivo: ${file.name}, tamanho: ${file.size} bytes`);

    // Criar registro de upload
    const { data: uploadHistory, error: uploadError } = await supabaseClient
      .from('upload_history')
      .insert({
        file_name: file.name,
        file_size: file.size,
        user_id: user.id,
        status: 'processing',
      })
      .select()
      .single();

    if (uploadError) {
      console.error('[process-excel-upload] Erro ao criar upload_history:', uploadError);
      throw uploadError;
    }

    console.log(`[process-excel-upload] Upload history criado: ${uploadHistory.id}`);

    // Processar Excel
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Ler com range para pegar a primeira linha como cabeçalho
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1, 
      raw: false,
      defval: null 
    });

    if (!jsonData || jsonData.length < 2) {
      throw new Error('Planilha sem dados');
    }

    // MAPEAMENTO CORRETO DAS COLUNAS CJI3
    // Índice 0 = Coluna A, Índice 1 = Coluna B, etc.
    const COL_POSTING_DATE = 1;  // Coluna B
    const COL_OBJECT = 3;         // Coluna D  
    const COL_COST_CLASS = 5;     // Coluna F
    const COL_VALUE_EUR = 9;      // Coluna J
    const COL_VALUE_BRL = 20;     // Coluna U

    const dataRows = jsonData.slice(1); // Pular cabeçalho

    // Buscar legenda
    const { data: legend, error: legendError } = await supabaseClient
      .from('cost_class_legend')
      .select('*');

    if (legendError) {
      console.error('[process-excel-upload] Erro ao buscar legenda:', legendError);
      throw legendError;
    }

    console.log(`[process-excel-upload] ${legend?.length || 0} classes na legenda`);

    // Processar linhas
    const entries = [];
    let duplicates = 0;
    let unrecognized = 0;
    let processed = 0;

    for (const row of dataRows) {
      try {
        const postingDateRaw = row[COL_POSTING_DATE];
        const objectCode = row[COL_OBJECT];
        const costClass = String(row[COL_COST_CLASS] || '').trim();
        const valueEURRaw = row[COL_VALUE_EUR];
        const valueBRLRaw = row[COL_VALUE_BRL];

        // Validar campos obrigatórios
        if (!postingDateRaw || !objectCode || !costClass || valueEURRaw === null || valueBRLRaw === null) {
          continue;
        }

        // Parsear valores
        const parseValue = (v: any): number => {
          if (typeof v === 'number') return v;
          const str = String(v).replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, '');
          const num = parseFloat(str);
          return isNaN(num) ? 0 : num;
        };

        const valueEUR = parseValue(valueEURRaw);
        const valueBRL = parseValue(valueBRLRaw);

        // Converter data
        let formattedDate: string;
        if (typeof postingDateRaw === 'number') {
          // Data serial do Excel
          const excelEpoch = new Date(1899, 11, 30);
          const date = new Date(excelEpoch.getTime() + postingDateRaw * 86400000);
          formattedDate = date.toISOString().split('T')[0];
        } else {
          // Tentar parse de string
          const dateStr = String(postingDateRaw).trim();
          const match = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
          if (match) {
            const [_, day, month, year] = match;
            formattedDate = `${year}-${month}-${day}`;
          } else {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) continue;
            formattedDate = date.toISOString().split('T')[0];
          }
        }

        // Buscar classificação
        const classification = legend?.find(l => l.account_number === costClass);
        
        if (!classification) {
          unrecognized++;
        }

        // ========================================
        // CORREÇÃO DE SINAIS (REGRA SAP CJI3)
        // ========================================
        // Valores NEGATIVOS no SAP = RECEITAS (Crédito) → Converter para POSITIVO
        // Valores POSITIVOS no SAP = DESPESAS (Débito) → Manter POSITIVO
        const correctedValueEUR = Math.abs(valueEUR);
        const correctedValueBRL = Math.abs(valueBRL);

        // Verificar duplicatas
        const { data: existing } = await supabaseClient
          .from('financial_entries')
          .select('id')
          .eq('posting_date', formattedDate)
          .eq('object_code', objectCode)
          .eq('cost_class', costClass)
          .eq('value_brl', valueBRL)
          .eq('user_id', user.id)
          .maybeSingle();

        const isDuplicate = !!existing;
        if (isDuplicate) {
          duplicates++;
        }

        entries.push({
          user_id: user.id,
          upload_id: uploadHistory.id,
          posting_date: formattedDate,
          object_code: String(objectCode).trim(),
          object_name: String(objectCode).trim(),
          cost_class: costClass,
          cost_class_description: classification?.description || null,
          cost_type: classification?.cost_type || null,
          macro_cost_type: classification?.macro_cost_type || null,
          value_brl: valueBRL,  // Valor original (com sinal)
          value_eur: valueEUR,  // Valor original (com sinal)
          corrected_value_brl: correctedValueBRL,  // Valor corrigido (sempre positivo)
          corrected_value_eur: correctedValueEUR,  // Valor corrigido (sempre positivo)
          is_duplicate: isDuplicate,
          is_unrecognized: !classification,
          entry_type: valueEUR < 0 ? 'credit' : 'debit',
          pep_element: null,
          document_text: null,
          document_number: null,
          purchase_document: null,
          reference_document: null,
          currency: null,
        });

        processed++;
      } catch (rowError) {
        console.error('[process-excel-upload] Erro ao processar linha:', rowError);
        continue;
      }
    }

    console.log(`[process-excel-upload] Processadas ${processed} linhas, inserindo ${entries.length} entradas`);

    // Inserir entradas
    if (entries.length > 0) {
      const { error: insertError } = await supabaseClient
        .from('financial_entries')
        .insert(entries);

      if (insertError) {
        console.error('[process-excel-upload] Erro ao inserir:', insertError);
        
        await supabaseClient
          .from('upload_history')
          .update({
            status: 'failed',
            error_message: insertError.message,
          })
          .eq('id', uploadHistory.id);

        throw insertError;
      }
    }

    // Atualizar upload_history
    await supabaseClient
      .from('upload_history')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        total_entries: entries.length,
        classified_entries: entries.length - unrecognized,
        unrecognized_entries: unrecognized,
        duplicate_entries: duplicates,
      })
      .eq('id', uploadHistory.id);

    console.log(`[process-excel-upload] Concluído com sucesso`);

    return new Response(
      JSON.stringify({
        success: true,
        uploadId: uploadHistory.id,
        summary: {
          total: entries.length,
          classified: entries.length - unrecognized,
          unrecognized,
          duplicates,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('[process-excel-upload] Erro:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
