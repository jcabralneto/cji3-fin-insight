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

    // Processar Excel
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json<ExcelRow>(worksheet);

    console.log(`[process-excel-upload] ${data.length} linhas encontradas no Excel`);

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

    for (const row of data) {
      // Buscar classificação na legenda
      const classification = legend?.find(l => l.account_number === row['Classe de Custo']);
      
      if (!classification) {
        unrecognized++;
      }

      // Verificar duplicatas (mesma data, objeto, valor)
      const { data: existing } = await supabaseClient
        .from('financial_entries')
        .select('id')
        .eq('posting_date', row['Data de Lançamento'])
        .eq('object_code', row['Objeto'])
        .eq('value_brl', row['Valor BRL'])
        .eq('user_id', user.id)
        .maybeSingle();

      const isDuplicate = !!existing;
      if (isDuplicate) {
        duplicates++;
      }

      entries.push({
        user_id: user.id,
        upload_id: uploadHistory.id,
        posting_date: row['Data de Lançamento'],
        object_code: row['Objeto'],
        object_name: row['Objeto'],
        cost_class: row['Classe de Custo'],
        cost_class_description: classification?.description || null,
        cost_type: classification?.cost_type || row['Tipo de Custo'] || null,
        macro_cost_type: classification?.macro_cost_type || row['Macro Tipo de Custo'] || null,
        value_brl: row['Valor BRL'],
        value_eur: row['Valor EUR'],
        corrected_value_brl: row['Valor BRL'],
        corrected_value_eur: row['Valor EUR'],
        is_duplicate: isDuplicate,
        is_unrecognized: !classification,
        pep_element: row['Elemento PEP'] || null,
        document_text: row['Texto do Documento'] || null,
        document_number: row['Número do Documento'] || null,
        purchase_document: row['Documento de Compra'] || null,
        reference_document: row['Documento de Referência'] || null,
        entry_type: row['Tipo de Lançamento'] || null,
        currency: row['Moeda'] || null,
      });
    }

    console.log(`[process-excel-upload] Preparando inserção de ${entries.length} entradas`);
    console.log(`[process-excel-upload] Duplicatas: ${duplicates}, Não reconhecidos: ${unrecognized}`);

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
