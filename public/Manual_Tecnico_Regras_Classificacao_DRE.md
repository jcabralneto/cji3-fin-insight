# 📘 MANUAL TÉCNICO DE CLASSIFICAÇÃO DRE
## Sistema de Regras para Classificação de Classes de Custo

---

## 1. ARQUITETURA DO SISTEMA DE CLASSIFICAÇÃO

### 1.1 Estrutura de Dados Base

O sistema utiliza duas planilhas principais:

**PLANILHA LEGENDA (Regra Fixa)**
- **Função:** Dicionário de classificação permanente
- **Campos-chave:**
  - `Account Number` (Col A): Código único da classe de custo
  - `Cost Type` (Col B): Categoria detalhada da conta
  - `Macro Cost Type` (Col D): Categoria macro (Revenues/Costs)
  - `BS/P&L` (Col E): Identifica se é conta de resultado
  - `EBITDA (Y/N)` (Col G): Indica impacto no EBITDA

**PLANILHA CJI3 (Dados Transacionais)**
- **Função:** Lançamentos mensais a classificar
- **Campos utilizados:**
  - `Classe de custo` (Col F): Código para cruzamento com Legenda
  - `Data de lançamento` (Col B): Data do lançamento
  - `Valor/moeda ACC` (Col J): Valor em Euro
  - `Valor variável/MObj` (Col U): Valor em Reais

---

## 2. REGRAS DE PREPROCESSAMENTO

### 2.1 Correção de Sinais

**Regra Fundamental:**
```
SE valor_original < 0 ENTÃO
    tipo_transacao = "CRÉDITO (Entrada)"
    valor_absoluto = ABS(valor_original)
SENÃO SE valor_original > 0 ENTÃO
    tipo_transacao = "DÉBITO (Saída)"
    valor_absoluto = valor_original
SENÃO
    tipo_transacao = "ZERO"
    valor_absoluto = 0
```

### 2.2 Enriquecimento de Dados

Para cada lançamento, o sistema realiza:
1. **JOIN** entre CJI3.`Classe de custo` e Legenda.`Account Number`
2. **Adiciona** campos da Legenda: `cost_type`, `macro_cost_type`, `ebitda_yn`
3. **Calcula** `Tipo_Transacao` baseado no sinal do valor
4. **Mantém** valores originais e absolutos para rastreabilidade

---

## 3. HIERARQUIA DE CLASSIFICAÇÃO DRE

### 3.1 Estrutura DRE Padrão

```
DEMONSTRAÇÃO DO RESULTADO DO EXERCÍCIO
├── (+) RECEITA BRUTA
├── (-) DEDUÇÕES DA RECEITA
│   ├── Impostos sobre Vendas
│   └── Devoluções e Abatimentos
├── (=) RECEITA LÍQUIDA
├── (-) CUSTOS DOS PRODUTOS/SERVIÇOS
├── (=) LUCRO BRUTO
├── (-) DESPESAS OPERACIONAIS
│   ├── Despesas com Vendas
│   ├── Despesas Administrativas
│   └── Despesas Gerais
├── (=) RESULTADO OPERACIONAL (EBIT)
├── (+/-) RESULTADO FINANCEIRO
│   ├── (+) Receitas Financeiras
│   └── (-) Despesas Financeiras
├── (=) RESULTADO ANTES DOS IMPOSTOS (EBT)
├── (-) IMPOSTOS SOBRE O LUCRO
└── (=) LUCRO LÍQUIDO
```

---

## 4. REGRAS DE CLASSIFICAÇÃO DETALHADAS

### 4.1 RECEITA BRUTA

**Condições de Classificação:**
```python
IF macro_cost_type == "Revenues" AND
   cost_type IN ["Revenues Devices", "Revenues Services"] AND
   tipo_transacao == "CRÉDITO (Entrada)"
THEN
   classificar_como("RECEITA_BRUTA")
```

**Classes de Custo Típicas:**
- Prefixo RAA: Revenues - Vendas de produtos
- Prefixo RAS: Revenues - Prestação de serviços

---

### 4.2 DEDUÇÕES DA RECEITA

#### 4.2.1 Impostos sobre Vendas

**Condições de Classificação:**
```python
IF (cost_type == "Taxes" OR 
    classe_custo IN [impostos_sobre_vendas_list]) AND
   tipo_transacao == "DÉBITO (Saída)"
THEN
   classificar_como("DEDUCOES_RECEITA_IMPOSTOS")
```

**Classes Específicas de Impostos sobre Vendas:**
```
PCR1TAZ050 → ISS sobre faturamento
PCR1TAZL08 → PIS a recolher
PCR1TAZL10 → COFINS a recolher
ACR1TA1L05 → ICMS energia
```

#### 4.2.2 Devoluções e Abatimentos

**Condições de Classificação:**
```python
IF macro_cost_type == "Revenues" AND
   cost_type IN ["Revenues Devices", "Revenues Services"] AND
   tipo_transacao == "DÉBITO (Saída)"
THEN
   classificar_como("DEVOLUCOES_ABATIMENTOS")
```

**Interpretação:** Revenues como débito representam reversão de vendas

---

### 4.3 CUSTOS DOS PRODUTOS/SERVIÇOS

#### 4.3.1 Custos Diretos

**Condições de Classificação:**
```python
IF macro_cost_type == "Costs" AND
   cost_type == "Manufacturing" AND
   tipo_transacao == "DÉBITO (Saída)"
THEN
   classificar_como("CUSTOS_DIRETOS")
```

**Classes de Custo Típicas:**
- Prefixo RCC1B: Mão de obra direta
- Prefixo RCC1C: Matéria-prima
- Prefixo RCF: Custos de fabricação

#### 4.3.2 Recuperação de Custos

**Condições de Classificação:**
```python
IF macro_cost_type == "Costs" AND
   cost_type == "Manufacturing" AND
   tipo_transacao == "CRÉDITO (Entrada)"
THEN
   classificar_como("CUSTOS_DIRETOS_RECUPERACAO")
```

---

### 4.4 DESPESAS OPERACIONAIS

#### 4.4.1 Despesas com Vendas

**Condições de Classificação:**
```python
IF macro_cost_type == "Costs" AND
   cost_type IN ["Marketing", "Travel"] AND
   tipo_transacao == "DÉBITO (Saída)"
THEN
   classificar_como("DESPESAS_VENDAS")
```

**Classes de Custo Típicas:**
- Marketing: Publicidade, propaganda, eventos
- Travel: Viagens comerciais, hospedagem vendas

#### 4.4.2 Despesas Administrativas

**Condições de Classificação:**
```python
IF macro_cost_type == "Costs" AND
   cost_type IN ["Personnel", "Advisory", "DH", "Other costs"] AND
   tipo_transacao == "DÉBITO (Saída)"
THEN
   classificar_como("DESPESAS_ADMINISTRATIVAS")
```

**Classes de Custo Típicas:**
- Personnel: RCE1B (Pessoal administrativo)
- Advisory: Consultorias e assessorias
- DH: Recursos humanos
- Other costs: Despesas administrativas gerais

#### 4.4.3 Despesas Gerais

**Condições de Classificação:**
```python
IF macro_cost_type == "Costs" AND
   cost_type IN ["Logistics", "Management fee", "Capex D&A"] AND
   tipo_transacao == "DÉBITO (Saída)"
THEN
   classificar_como("DESPESAS_GERAIS")
```

#### 4.4.4 Recuperação de Despesas Operacionais

**Condições de Classificação:**
```python
IF macro_cost_type == "Costs" AND
   cost_type IN [despesas_operacionais_types] AND
   tipo_transacao == "CRÉDITO (Entrada)"
THEN
   classificar_como("DESPESAS_OPERACIONAIS_RECUPERACAO")
```

---

### 4.5 RESULTADO FINANCEIRO

#### 4.5.1 Receitas Financeiras

**Condições de Classificação:**
```python
IF cost_type == "Financial income" AND
   tipo_transacao == "CRÉDITO (Entrada)"
THEN
   classificar_como("RECEITAS_FINANCEIRAS")
```

**Classes de Custo Típicas:**
- RFHT: Juros ativos
- RFST: Rendimentos de aplicações

#### 4.5.2 Despesas Financeiras

**Condições de Classificação:**
```python
IF cost_type == "Financial expenses" AND
   tipo_transacao == "DÉBITO (Saída)"
THEN
   classificar_como("DESPESAS_FINANCEIRAS")
```

**Classes de Custo Típicas:**
- RFST: Juros passivos
- RFHT: Taxas bancárias

---

### 4.6 IMPOSTOS SOBRE O LUCRO

**Condições de Classificação:**
```python
IF cost_type == "Taxes" AND
   classe_custo IN [impostos_lucro_list] AND
   tipo_transacao == "DÉBITO (Saída)"
THEN
   classificar_como("IMPOSTOS_LUCRO")
```

**Classes Específicas:**
```
PCLT000000 → Imposto de Renda a Pagar
ACNT000010 → IRPJ
ACNT000L42 → IRRF
PCR1TA2L9J → IR Retido
RI11000000 → IRES
RI12000000 → IRAP
```

---

## 5. ALGORITMO DE CLASSIFICAÇÃO

### 5.1 Fluxo de Decisão

```
PARA CADA lançamento EM CJI3:
    1. CORRIGIR sinal do valor
    2. DETERMINAR tipo_transacao (CRÉDITO/DÉBITO)
    3. BUSCAR classe_custo na Legenda
    4. OBTER cost_type e macro_cost_type
    
    5. APLICAR hierarquia de regras:
       NÍVEL 1: Verificar classe_custo específica
       NÍVEL 2: Verificar cost_type + tipo_transacao
       NÍVEL 3: Verificar macro_cost_type + tipo_transacao
       NÍVEL 4: Classificar como OUTROS
    
    6. ATRIBUIR linha_DRE
    7. REGISTRAR classificação
```

### 5.2 Ordem de Prioridade das Regras

1. **Mais Específico:** Classe de custo exata (ex: PCR1TAZ050 = ISS)
2. **Específico:** Cost type + Tipo transação
3. **Geral:** Macro cost type + Tipo transação
4. **Default:** Outras receitas/despesas

---

## 6. MATRIZ DE DECISÃO COMPLETA

| Macro Cost Type | Cost Type | Tipo Transação | → Classificação DRE |
|-----------------|-----------|----------------|---------------------|
| Revenues | Revenues Devices | CRÉDITO | Receita Bruta |
| Revenues | Revenues Services | CRÉDITO | Receita Bruta |
| Revenues | Revenues Devices | DÉBITO | Devoluções |
| Revenues | Revenues Services | DÉBITO | Devoluções |
| Costs | Manufacturing | DÉBITO | Custos Diretos |
| Costs | Manufacturing | CRÉDITO | Recuperação Custos |
| Costs | Personnel | DÉBITO | Desp. Administrativas |
| Costs | Personnel | CRÉDITO | Recuperação Despesas |
| Costs | Travel | DÉBITO | Desp. Vendas |
| Costs | Marketing | DÉBITO | Desp. Vendas |
| Costs | Advisory | DÉBITO | Desp. Administrativas |
| Costs | Other costs | DÉBITO | Desp. Administrativas |
| Costs | Logistics | DÉBITO | Desp. Gerais |
| Costs | Management fee | DÉBITO | Desp. Gerais |
| Costs | Capex D&A | DÉBITO | Desp. Gerais |
| Costs | Financial income | CRÉDITO | Receitas Financeiras |
| Costs | Financial expenses | DÉBITO | Despesas Financeiras |
| Costs | Taxes | DÉBITO | (Varia conforme tipo) |

---

## 7. TRATAMENTO DE CASOS ESPECIAIS

### 7.1 Recuperações e Estornos

**Regra Geral:**
```
SE cost_type normalmente é DESPESA/CUSTO
   E tipo_transacao == "CRÉDITO"
ENTÃO
   Classificar como RECUPERAÇÃO da respectiva categoria
   Efeito: REDUZ despesas/custos
```

### 7.2 Devoluções de Vendas

**Regra Específica:**
```
SE macro_cost_type == "Revenues"
   E tipo_transacao == "DÉBITO"
ENTÃO
   NÃO é receita negativa
   É devolução (dedução da receita bruta)
```

### 7.3 Impostos Diferenciados

**Classificação por Natureza:**
```
Impostos sobre Vendas (ISS, ICMS, PIS, COFINS):
   → Dedução da Receita Bruta

Impostos sobre Lucro (IRPJ, CSLL):
   → Após o EBIT

Outros Impostos e Taxas:
   → Despesas Operacionais
```

---

## 8. VALIDAÇÕES E CONTROLES

### 8.1 Validações Obrigatórias

1. **Completude:** Todo lançamento deve ter classificação
2. **Unicidade:** Cada lançamento tem apenas uma classificação
3. **Rastreabilidade:** Manter registro da regra aplicada
4. **Integridade:** Soma dos componentes deve fechar com totais

### 8.2 Controles de Qualidade

```python
VALIDAR:
    - 100% dos lançamentos classificados
    - Nenhuma classe_custo sem correspondência
    - Sinais corrigidos antes da classificação
    - Valores absolutos calculados corretamente
    - Tipo_transacao definido para todos
```

---

## 9. ESTRUTURA DE SAÍDA

### 9.1 Campos Adicionados ao Lançamento

```
LANÇAMENTO ORIGINAL + CLASSIFICAÇÃO:
├── Campos originais CJI3
├── + cost_type (da Legenda)
├── + macro_cost_type (da Legenda)
├── + ebitda_yn (da Legenda)
├── + tipo_transacao (calculado)
├── + valor_absoluto (calculado)
├── + linha_DRE (classificação final)
└── + regra_aplicada (auditoria)
```

### 9.2 Agregação para DRE

```python
DRE_LINHA = SOMAR(
    valor_absoluto 
    ONDE linha_DRE == categoria_específica
)

APLICAR sinais conforme estrutura DRE:
    (+) para receitas e recuperações
    (-) para custos, despesas e deduções
```

---

## 10. MANUTENÇÃO DO SISTEMA

### 10.1 Adição de Novas Classes de Custo

1. Incluir na planilha Legenda com classificação apropriada
2. Sistema reconhecerá automaticamente na próxima execução
3. Não requer alteração no código

### 10.2 Modificação de Regras

Para alterar classificação:
1. Ajustar `cost_type` ou `macro_cost_type` na Legenda
2. Para regras especiais, adicionar classe específica nas listas

### 10.3 Monitoramento

Verificar periodicamente:
- Classes não classificadas (aparecem como OUTROS)
- Proporção de recuperações vs. lançamentos normais
- Consistência de devoluções

---

## ANEXO A - PREFIXOS COMUNS DE CLASSES

| Prefixo | Categoria Típica | Linha DRE Usual |
|---------|------------------|-----------------|
| RAA | Revenues - Vendas | Receita Bruta |
| RCC | Costs - Operacional | Despesas/Custos |
| RCE | Costs - Pessoal | Despesas Admin |
| RCF | Costs - Fabricação | Custos Diretos |
| RFH | Financial | Resultado Financeiro |
| RFS | Financial | Resultado Financeiro |
| PCR | Passivos | Varia |
| ACR | Ativos | Varia |
| RI | Impostos | Varia |

---

## ANEXO B - CHECKLIST DE IMPLEMENTAÇÃO

- [ ] Carregar planilha Legenda
- [ ] Carregar planilha CJI3
- [ ] Corrigir sinais dos valores
- [ ] Realizar JOIN por classe de custo
- [ ] Aplicar hierarquia de classificação
- [ ] Validar 100% classificação
- [ ] Gerar estrutura DRE
- [ ] Calcular subtotais e margens
- [ ] Exportar resultados
- [ ] Documentar exceções

---

*Manual Técnico - Sistema de Classificação DRE*  
*Versão 1.0 - Outubro/2025*
