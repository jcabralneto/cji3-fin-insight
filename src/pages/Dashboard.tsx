const loadDREData = async () => {
  setIsLoading(true);
  
  try {
    // ========================================
    // DEBUG: Verificar usuário autenticado
    // ========================================
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error("❌ Erro de autenticação:", userError);
      toast({
        title: "Erro de autenticação",
        description: "Você precisa estar logado para visualizar o dashboard.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }
    
    console.log("✅ Usuário autenticado:", user.id);

    // ========================================
    // DEBUG: Buscar TODOS os dados primeiro
    // ========================================
    const { data: allEntries, error: allError, count } = await supabase
      .from('financial_entries')
      .select('*', { count: 'exact' });
    
    console.log("📊 Total de registros na tabela:", count);
    console.log("📊 Dados retornados:", allEntries?.length || 0);
    
    if (allError) {
      console.error("❌ Erro ao buscar todos os dados:", allError);
    }
    
    if (allEntries && allEntries.length > 0) {
      console.log("✅ Amostra de dados:", allEntries[0]);
      console.log("✅ user_id do primeiro registro:", allEntries[0].user_id);
      console.log("✅ user_id atual:", user.id);
      console.log("✅ user_ids são iguais?", allEntries[0].user_id === user.id);
    }

    // ========================================
    // Buscar dados do usuário atual
    // ========================================
    const { data: entries, error } = await supabase
      .from('financial_entries')
      .select('*')
      .eq('is_duplicate', false);

    console.log("📊 Dados do usuário atual:", entries?.length || 0);

    if (error) {
      console.error("❌ Erro ao buscar dados:", error);
      throw error;
    }

    if (!entries || entries.length === 0) {
      console.warn("⚠️ Nenhum dado encontrado para o usuário");
      toast({
        title: "Sem dados disponíveis",
        description: "Nenhum lançamento encontrado. Faça upload de uma planilha CJI3 primeiro.",
        variant: "destructive",
      });
      setDreData(null);
      setIsLoading(false);
      return;
    }

    console.log("✅ Dados carregados com sucesso:", entries.length, "registros");

    // Calcular DRE
    const calculatedDRE = calculateDRE(entries);
    console.log("✅ DRE calculado:", calculatedDRE);
    setDreData(calculatedDRE);

  } catch (error: any) {
    console.error("❌ Erro ao carregar dados do DRE:", error);
    toast({
      title: "Erro ao carregar dados",
      description: error.message || "Não foi possível carregar os dados do DRE. Tente novamente.",
      variant: "destructive",
    });
    setDreData(null);
  } finally {
    setIsLoading(false);
  }
};
