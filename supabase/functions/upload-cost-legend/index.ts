import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as XLSX from 'https://esm.sh/xlsx@0.18.5'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Verify user authentication
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      throw new Error('Não autorizado')
    }

    console.log('Processing legend upload for user:', user.id)

    // Get the uploaded file from FormData
    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      throw new Error('Nenhum arquivo enviado')
    }

    console.log('File received:', file.name, 'Size:', file.size)

    // Read the file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    const data = new Uint8Array(arrayBuffer)

    // Parse Excel file
    const workbook = XLSX.read(data, { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]

    // Convert to JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][]

    if (jsonData.length < 2) {
      throw new Error('Planilha vazia ou inválida')
    }

    console.log('Parsed', jsonData.length, 'rows from Excel')

    // Header is in first row
    const headers = jsonData[0]
    const accountNumberIndex = headers.indexOf('Account number')
    const costTypeIndex = headers.indexOf('Cost type (ENG)')
    const descriptionIndex = headers.indexOf('Description')
    const macroCostTypeIndex = headers.indexOf('Macro cost type')
    const bsPlIndex = headers.indexOf('BS/P&L')
    const enelGroupIndex = headers.indexOf('ENEL Group/Externel')
    const ebitdaIndex = headers.indexOf('EBITDA (Y/N)')
    const brazilianDescIndex = headers.indexOf('Brazilian Description')
    const costTypeCapexIndex = headers.indexOf('Cost Type CAPEX')

    if (accountNumberIndex === -1 || costTypeIndex === -1 || macroCostTypeIndex === -1) {
      throw new Error('Colunas obrigatórias não encontradas na planilha')
    }

    // Clear existing legend data
    const { error: deleteError } = await supabaseClient
      .from('cost_class_legend')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

    if (deleteError) {
      console.error('Error clearing legend:', deleteError)
      throw new Error(`Erro ao limpar legenda existente: ${deleteError.message}`)
    }

    console.log('Cleared existing legend data')

    // Process rows and insert in batches
    const batchSize = 100
    const legendEntries = []

    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i]
      
      const accountNumber = row[accountNumberIndex]?.toString().trim()
      const costType = row[costTypeIndex]?.toString().trim()
      const macroCostType = row[macroCostTypeIndex]?.toString().trim()

      // Skip rows without required fields
      if (!accountNumber || !macroCostType) {
        continue
      }

      legendEntries.push({
        account_number: accountNumber,
        cost_type: costType || 'não classificado',
        description: row[descriptionIndex]?.toString().trim() || null,
        macro_cost_type: macroCostType,
        bs_pl: row[bsPlIndex]?.toString().trim() || null,
        enel_group_external: row[enelGroupIndex]?.toString().trim() || null,
        ebitda: row[ebitdaIndex]?.toString().trim() || null,
        brazilian_description: row[brazilianDescIndex]?.toString().trim() || null,
        cost_type_capex: row[costTypeCapexIndex]?.toString().trim() || null,
      })

      // Insert in batches
      if (legendEntries.length >= batchSize) {
        const { error: insertError } = await supabaseClient
          .from('cost_class_legend')
          .insert(legendEntries)

        if (insertError) {
          console.error('Error inserting batch:', insertError)
          throw new Error(`Erro ao inserir dados: ${insertError.message}`)
        }

        console.log(`Inserted batch of ${legendEntries.length} entries`)
        legendEntries.length = 0 // Clear array
      }
    }

    // Insert remaining entries
    if (legendEntries.length > 0) {
      const { error: insertError } = await supabaseClient
        .from('cost_class_legend')
        .insert(legendEntries)

      if (insertError) {
        console.error('Error inserting final batch:', insertError)
        throw new Error(`Erro ao inserir dados finais: ${insertError.message}`)
      }

      console.log(`Inserted final batch of ${legendEntries.length} entries`)
    }

    // Get total count
    const { count } = await supabaseClient
      .from('cost_class_legend')
      .select('*', { count: 'exact', head: true })

    console.log('Legend upload completed. Total entries:', count)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Legenda carregada com sucesso',
        totalEntries: count,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error in upload-cost-legend:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
