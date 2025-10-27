// Substituir a função loadDREData
const loadDREData = async () => {
  setIsLoading(true);
  try {
    const { data: entries, error } = await supabase
      .from('financial_entries')
      .select('*')
      .eq('is_duplicate', false); // Excluir duplicatas

    if (error) throw error;

    if (!entries || entries.length === 0) {
      toast({
        title: "Sem dados",
        description: "Nenhum lançamento encontrado. Faça upload de uma planilha primeiro.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    // Usar valores CORRIGIDOS (sempre positivos)
    const valueField = selectedCurrency === "BRL" ? "corrected_value_brl" : "corrected_value_eur";
    
    let receitaBruta = 0;
    let deducoes = 0;
    let custosDirectos = 0;
    let despesasOperacionais = 0;

    entries.forEach(entry => {
      const value = Number(entry[valueField]) || 0;
      const macroType = (entry.macro_cost_type || "").toLowerCase();

      // Classificar baseado no Macro Cost Type
      if (macroType === "receita") {
        receitaBruta += value;
      } else if (macroType === "impostos") {
        deducoes += value;
      } else if (macroType === "custo direto") {
        custosDirectos += value;
      } else if (macroType === "despesa operacional") {
        despesasOperacionais += value;
      }
    });

    const receitaLiquida = receitaBruta - deducoes;
    const lucroBruto = receitaLiquida - custosDirectos;
    const resultadoOperacional = lucroBruto - despesasOperacionais;

    setDreData({
      receitaBruta,
      deducoes,
      receitaLiquida,
      custosDirectos,
      lucroBruto,
      despesasOperacionais,
      resultadoOperacional,
    });

  } catch (error) {
    console.error("Erro ao carregar dados:", error);
    toast({
      title: "Erro",
      description: "Não foi possível carregar os dados do DRE.",
      variant: "destructive",
    });
  } finally {
    setIsLoading(false);
  }
};
