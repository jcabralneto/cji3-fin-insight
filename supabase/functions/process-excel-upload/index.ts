import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExcelRow {
  'Data de Lançamento': string;
  'Objeto': string;
  'Classe de Custo': string;
  'Valor BRL': number;
  'Valor EUR': number;
  'Tipo de Custo'?: string;
  'Macro Tipo de Custo'?: string;
  'Elemento PEP'?: string;
  'Texto do Documento'?: string;
  'Número do Documento'?: string;
  'Documento de Compra'?: string;
  'Documento de Referência'?: string;
  'Tipo de Lançamento'?: string;
  'Moeda'?: string;
}

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
      auth: {
        persistSession: false,
      },
      global: {
        headers: { Authorization: authHeader },
      },
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

    // Validar tamanho (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      throw new Error('Arquivo muito grande. Máximo: 10MB');
    }

    console.log(`[process-excel-upload] Arquivo recebido: ${file.name}, tamanho: ${file.size} bytes`);

    // Criar registro de upload_history
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

    // Processar Excel com leitura explícita de cabeçalho
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Lê todas as linhas como arrays, a primeira será o cabeçalho
    const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, raw: false }) as any[][];
    if (!rows || rows.length < 2) {
      throw new Error('Planilha sem dados após o cabeçalho');
    }

    const headersRaw = (rows[0] as any[]).map((h) => (typeof h === 'string' ? h.trim() : ''));
    const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/\s+/g, ' ').trim();
    const headersNorm = headersRaw.map(normalize);

    const findIdx = (...cands: string[]) => {
      for (const c of cands) {
        const idx = headersNorm.findIndex((h) => h.includes(normalize(c)));
        if (idx !== -1) return idx;
      }
      return -1;
    };

    const idxDate = findIdx('data de lancamento', 'data');
    const idxObject = findIdx('denominacao de objeto', 'objeto');
    const idxCostClass = findIdx('classe de custo', 'classe');
    const idxValLocal = findIdx('montante em moeda interna', 'valor brl');
    const idxValDoc = findIdx('montante na moeda do documento', 'montante em moeda do documento', 'valor eur');
    const idxCurrencyDoc = findIdx('moeda do documento', 'moeda do doc', 'moeda');

    console.log('[process-excel-upload] Cabeçalho detectado:', headersRaw);
    console.log('[process-excel-upload] Índices -> data:', idxDate, 'obj:', idxObject, 'classe:', idxCostClass, 'valLocal:', idxValLocal, 'valDoc:', idxValDoc, 'moedaDoc:', idxCurrencyDoc);

    const dataRows = rows.slice(1);

    // Buscar legenda de classificação
    const { data: legend, error: legendError } = await supabaseClient
      .from('cost_class_legend')
      .select('*');

    if (legendError) {
      console.error('[process-excel-upload] Erro ao buscar legenda:', legendError);
      throw legendError;
    }

    console.log(`[process-excel-upload] ${legend?.length || 0} entradas na legenda`);

    // Processar e enriquecer dados
    const entries = [];
    let duplicates = 0;
    let unrecognized = 0;
    let skipped = 0;

    for (const arr of dataRows) {
      const row = arr as any[];
      const postingDate = idxDate >= 0 ? row[idxDate] : undefined;
      const objectCode = idxObject >= 0 ? row[idxObject] : undefined;
      const costClass = idxCostClass >= 0 ? row[idxCostClass] : undefined;
      const rawLocal = idxValLocal >= 0 ? row[idxValLocal] : undefined;
      const rawDoc = idxValDoc >= 0 ? row[idxValDoc] : undefined;
      const currencyDoc = (idxCurrencyDoc >= 0 ? row[idxCurrencyDoc] : undefined) as string | undefined;

      const parseNumber = (v: any) => {
        if (v === null || v === undefined || v === '') return undefined;
        if (typeof v === 'number') return v;
        const s = String(v).replace(/\./g, '').replace(/,/g, '.').replace(/[^0-9.-]/g, '');
        const n = parseFloat(s);
        return isNaN(n) ? undefined : n;
      };

      const valueBRL = parseNumber(rawLocal);
      const valueEUR = parseNumber(rawDoc);

      // Validar campos obrigatórios
      if (!postingDate || !objectCode || !costClass || valueBRL === undefined || valueEUR === undefined) {
        console.log('[process-excel-upload] Linha ignorada por falta de dados obrigatórios:', { postingDate, objectCode, costClass, valueBRL, valueEUR, currencyDoc });
        skipped++;
        continue;
      }

      // Converter data
      let formattedDate: string;
      if (typeof postingDate === 'number') {
        const excelEpoch = new Date(1899, 11, 30);
        const date = new Date(excelEpoch.getTime() + postingDate * 86400000);
        formattedDate = date.toISOString().split('T')[0];
      } else if (typeof postingDate === 'string') {
        const s = postingDate.trim();
        const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (m) {
          const [_, d, mo, y] = m;
          formattedDate = `${y}-${mo}-${d}`;
        } else {
          const d = new Date(s);
          if (isNaN(d.getTime())) {
            console.log('[process-excel-upload] Data inválida, pulando:', s);
            skipped++;
            continue;
          }
          formattedDate = d.toISOString().split('T')[0];
        }
      } else {
        formattedDate = new Date(postingDate as any).toISOString().split('T')[0];
      }


      // Buscar classificação na legenda
      const classification = legend?.find(l => l.account_number === costClass);
      
      if (!classification) {
        unrecognized++;
      }

      // Verificar duplicatas (mesma data, objeto, valor)
      const { data: existing } = await supabaseClient
        .from('financial_entries')
        .select('id')
        .eq('posting_date', formattedDate)
        .eq('object_code', objectCode)
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
        object_code: objectCode,
        object_name: objectCode,
        cost_class: costClass,
        cost_class_description: classification?.description || null,
        cost_type: classification?.cost_type || null,
        macro_cost_type: classification?.macro_cost_type || null,
        value_brl: valueBRL,
        value_eur: valueEUR,
        corrected_value_brl: valueBRL,
        corrected_value_eur: valueEUR,
        is_duplicate: isDuplicate,
        is_unrecognized: !classification,
        pep_element: null,
        document_text: null,
        document_number: null,
        purchase_document: null,
        reference_document: null,
        entry_type: null,
        currency: currencyDoc || null,
      });
    }

    console.log(`[process-excel-upload] Preparando inserção de ${entries.length} entradas`);
    console.log(`[process-excel-upload] Duplicatas: ${duplicates}, Não reconhecidos: ${unrecognized}, Ignoradas: ${skipped}`);

    // Inserir entradas
    const { error: insertError } = await supabaseClient
      .from('financial_entries')
      .insert(entries);

    if (insertError) {
      console.error('[process-excel-upload] Erro ao inserir entradas:', insertError);
      
      // Atualizar status com erro
      await supabaseClient
        .from('upload_history')
        .update({
          status: 'failed',
          error_message: insertError.message,
        })
        .eq('id', uploadHistory.id);

      throw insertError;
    }

    // Atualizar upload_history com sucesso
    const { error: updateError } = await supabaseClient
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

    if (updateError) {
      console.error('[process-excel-upload] Erro ao atualizar upload_history:', updateError);
    }

    console.log(`[process-excel-upload] Processamento concluído com sucesso`);

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
