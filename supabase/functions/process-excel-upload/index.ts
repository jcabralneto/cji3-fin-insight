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

    // Detectar cabeçalhos e mapear colunas de forma resiliente
    const headerRow = jsonData[0] as any[];
    const normalize = (s: any) =>
      String(s || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();

    const headersNorm = headerRow.map(normalize);
    const findIndex = (candidates: string[]) =>
      headersNorm.findIndex((h) => candidates.some((c) => h.includes(c)));

    // Candidatos por coluna (com fallback por índice fixo caso não encontre)
    const idxDate = (() => {
      const i = findIndex(['data de lancamento']);
      return i >= 0 ? i : 1; // Coluna B
    })();

    const idxObject = (() => {
      const i = findIndex(['denominacao de objeto', 'objeto']);
      return i >= 0 ? i : 3; // Coluna D
    })();

    const idxCostClass = (() => {
      const i = findIndex(['classe de custo']);
      return i >= 0 ? i : 5; // Coluna F
    })();

    const idxValueEUR = (() => {
      const i = findIndex([
        'valor moed transacao',
        'valor moeda transacao',
        'valor em euro',
        'valor eur',
      ]);
      return i >= 0 ? i : 9; // Coluna J
    })();

    const idxValueBRL = (() => {
      const i = findIndex([
        'valor moeda acc',
        'valor em reais',
        'valor brl',
        'valor em real',
      ]);
      return i >= 0 ? i : 20; // Coluna U
    })();

    const idxCurrencyDoc = (() => {
      const i = findIndex(['moeda da transacao']);
      return i >= 0 ? i : -1;
    })();

    console.log(
      `[process-excel-upload] Cabeçalho detectado:`, JSON.stringify(headerRow, null, 2)
    );
    console.log(
      `[process-excel-upload] Índices -> data: ${idxDate} obj: ${idxObject} classe: ${idxCostClass} valEUR: ${idxValueEUR} valBRL: ${idxValueBRL} moedaDoc: ${idxCurrencyDoc}`
    );

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

    for (const rowRaw of dataRows) {
      try {
        const row = rowRaw as any[];
        const postingDateRaw = row[idxDate];
        const objectCode = row[idxObject];
        const costClass = String(row[idxCostClass] || '').trim();
        const valueEURRaw = row[idxValueEUR];
        const valueBRLRaw = row[idxValueBRL];

        // Validar campos obrigatórios
        if (!postingDateRaw || !objectCode || !costClass || (valueEURRaw == null && valueBRLRaw == null)) {
          continue;
        }

        // Parsear valores
        const parseValue = (v: any): number => {
          if (typeof v === 'number') return v;
          const str = String(v)
            .replace(/\./g, '')
            .replace(',', '.')
            .replace(/[^0-9.-]/g, '');
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
          // Tentar parse de string (suporta dd/mm/yyyy, mm/dd/yyyy, m/d/yy)
          const dateStr = String(postingDateRaw).trim();
          const parts = dateStr.split(/[\\/]/).map((p) => p.trim());
          if (parts.length === 3) {
            let p1 = parseInt(parts[0], 10);
            let p2 = parseInt(parts[1], 10);
            let year = parseInt(parts[2], 10);
            if (parts[2].length <= 2) {
              year = 2000 + year; // assume século 2000+ para 2 dígitos
            }
            let day: number;
            let month: number;
            if (p1 > 12 && p2 <= 12) {
              // dd/mm
              day = p1; month = p2;
            } else if (p2 > 12 && p1 <= 12) {
              // mm/dd
              day = p2; month = p1;
            } else {
              // Ambíguo: assumir mm/dd (mais comum em "9/3/25")
              day = p2; month = p1;
            }
            const d = new Date(Date.UTC(year, month - 1, day));
            if (!isNaN(d.getTime())) {
              formattedDate = d.toISOString().split('T')[0];
            } else {
              const d2 = new Date(dateStr);
              if (isNaN(d2.getTime())) continue;
              formattedDate = d2.toISOString().split('T')[0];
            }
          } else {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) continue;
            formattedDate = d.toISOString().split('T')[0];
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
          cost_class_description: classification?.description || 'Sem legenda',
          cost_type: classification?.cost_type || 'não classificado',
          macro_cost_type: classification?.macro_cost_type || (valueEUR < 0 ? 'receita' : 'despesa operacional'),
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
