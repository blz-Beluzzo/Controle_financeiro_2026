/**
 * LEITOR DE TRANSAÇÕES - VERSÃO 1.0
 * Desenvolvedor Sênior - Configurado para OpenAI GPT-OSS-120B (Groq Cloud)
 */

const GROQ_API_KEY = 'SUA_CHAVE_GROQ_AQUI'; // Insira sua chave gsk_... aqui

function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
      .setTitle('Controle Financeiro Avançado - Versão 21.0')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getSavedSpreadsheetId() {
  try {
    return PropertiesService.getScriptProperties().getProperty('LAST_SHEET_ID') || '';
  } catch(e) {
    return '';
  }
}

/**
 * Seleciona o melhor modelo ativo na sua conta da Groq
 */
function descobrirModeloGroqAtivo(chaveLimpa) {
  const url = "https://api.groq.com/openai/v1/models";
  
  try {
    const response = UrlFetchApp.fetch(url, {
      method: "get",
      headers: { "Authorization": "Bearer " + chaveLimpa },
      muteHttpExceptions: true
    });
    
    const json = JSON.parse(response.getContentText());
    
    if (json.data && json.data.length > 0) {
      const todosIds = json.data.map(m => m.id);
      
      // Lista de preferência baseada nos modelos liberados na sua conta
      const preferencia = [
        "openai/gpt-oss-120b",
        "openai/gpt-oss-20b",
        "llama-3.3-70b-versatile",
        "llama-3.1-8b-instant"
      ];
      
      for (let p of preferencia) {
        if (todosIds.includes(p)) return p;
      }
    }
  } catch(e) {
    // Caso haja erro na listagem, usa o padrão liberado da sua conta
  }
  
  return "openai/gpt-oss-120b";
}

function processarFinanceiro(textoBruto) {
  if (!GROQ_API_KEY || GROQ_API_KEY.includes('CHAVE')) {
    throw new Error("Chave Groq não configurada na linha 8 do Código.gs.");
  }

  const chaveLimpa = GROQ_API_KEY.trim();
  const modeloEscolhido = descobrirModeloGroqAtivo(chaveLimpa);
  
  const url = "https://api.groq.com/openai/v1/chat/completions";
  
  const prompt = `Aja estritamente como Perito Contábil Especialista em Classificação de Dados Financeiros.
  Seu objetivo é processar os dados brutos e retornar EXCLUSIVAMENTE um objeto JSON válido, sem explicações antes ou depois.

  FORMATO EXATO DE SAÍDA:
  {"transacoes": [{"data":"DD/MM/AAAA", "Entradas/Saídas":"DD/MM/AAAA", "valor":0.00, "descricao":"...", "categoria":"...", "subcategoria":"...", "essencialidade":"...", "comportamento":"...", "recorrencia":"..."}] }

  PREMISSAS CRÍTICAS DE TAXONOMIA:
  - NUNCA invente categorias ou subcategorias, e NUNCA utilize identificadores numéricos ou IDs.
  - Categoria DEVE ser exclusivamente: Receita, Despesa, Transferência, Restituição ou Retificação.
  - Subcategoria DEVE ser exclusivamente um destes nomes por extenso: Remuneração Bruta, Remuneração Extra, Restituições, Venda de Bens, Impostos e taxas, Provisões e seguros, Aluguel, Condomínio/Limpeza, Água/Luz/Gás, Internet e TV, Alimentação, Farmácia, Academia, Futebol, Vestuário, Casa, Combustível, Uber, Estacionamento/Pedágio, Manutenção veículo, Seguro Veícular, Documentação (Impostos e Multas), Imprevistos, Lazer, Retificação em receita, Retificação em despesa.

  RESOLUÇÃO DE CONFLITOS DE DESCRIÇÃO:
  - Descrição é a EXTRAÇÃO LITERAL da descrição e informações contidas na linha original de compra ou desconto do contracheque. Preserve detalhes contábeis e de estabelecimentos por extenso.

  LÓGICA CRÍTICA PARA A COLUNA "Entradas/Saídas" (REGIME DE CAIXA EM DESPESAS MANUAIS):
  - No caso de Despesas Manuais, o formato textual segue o seguinte padrão posicional por linha:
    [Valor] [Data Transação] [Descrição] [Forma de Pagamento] [Data Pagamento]
    Exemplo: "R$ 42,68 13/12/2025 Growth Supplements ... Inter 3689400-1/1 02/06/2025"
  
  Regras de prioridade de Caixa para preenchimento do campo 'Entradas/Saídas':
  1. PRIORIDADE MÁXIMA: Se houver uma data de pagamento ao FINAL da linha, após a Forma de Pagamento (ex: "02/06/2025" após "Inter..."), use essa data como valor de 'Entradas/Saídas'.
  2. REGRAS DE COOLDOWN / FALLBACK (Caso NÃO haja uma data explícita fornecida ao fim do texto de cada linha):
     - Se o texto contiver "PicPay 65091183-0/1": O campo 'Entradas/Saídas' recebe a mesma data do campo 'data'.
     - Se o texto contiver "Inter 3689400-1/11" ou "Inter 3689400-1/1": O campo 'Entradas/Saídas' fica VAZIO "".

  REGRAS FINANCEIRAS DE VALORES E ATRIBUIÇÕES:
  - Categoria "Despesa" ou subcategoria "Retificação em receita" -> Valor sempre NEGATIVO (-) (Ex: -42.68).
  - Categoria "Receita" ou subcategoria "Retificação em despesa" -> Valor sempre POSITIVO (+).
  - Categoria "Receita" -> Os campos de essencialidade, comportamento e recorrencia devem ficar VAZIOS "".
  - Valores zerados (R$ 0,00) de qualquer linha (como Condomínio de valor R$ 0,00) DEVEM ser sumariamente ignorados e removidos da resposta.

  MATRIZ AUTOMÁTICA DE ATRIBUIÇÕES (APLICAÇÃO EXCLUSIVA PARA DESPESAS E RETIFICAÇÕES):
  - Alimentação, Água/Luz/Gás -> essencialidade="Essencial", comportamento="Variável", recorrencia="Sim"
  - Aluguel, Condomínio/Limpeza, Internet e TV -> essencialidade="Essencial", comportamento="Fixo", recorrencia="Sim"
  - Academia -> essencialidade="Não essencial", comportamento="Fixo", recorrencia="Sim"
  - Futebol -> essencialidade="Não essencial", comportamento="Variável", recorrencia="Não"
  - Farmácia -> essencialidade="Essencial", comportamento="Variável", recorrencia="Não"
  - Casa -> essencialidade="Não essencial", comportamento="Variável", recorrencia="Não"
  - Combustível -> essencialidade="Essencial", comportamento="Variável", recorrencia="Sim"
  - Estacionamento/Pedágio, Manutenção veículo -> essencialidade="Essencial", comportamento="Variável", recorrencia="Não"
  - Seguro Veícular -> essencialidade="Essencial", comportamento="Fixo", recorrencia="Sim"
  - Documentação (Impostos e Multas) -> essencialidade="Essencial", comportamento="Fixo", recorrencia="Não"
  - Imprevistos -> essencialidade="Não essencial", comportamento="Variável", recorrencia="Não"
  - Vestuário -> essencialidade="Não essencial", comportamento="Variável", recorrencia="Não"
  
  * EXCEÇÃO PARA VESTUÁRIO: Se a subcategoria for "Vestuário" E a propriedade 'descricao' contiver "corte de cabelo", obrigatoriamente preencha: essencialidade="Essencial", comportamento="Variável", recorrencia="Sim".

  DIVISÕES DE REGIME DE COMPILAÇÃO (PARSING) E BÔNUS DE CONTRACHEQUE:
  A. REGIME CONTRACHEQUE ("Contracheque - DD/MM/AAAA"):
     - data E Entradas/Saídas devem assumir estritamente a data apontada na linha de cabeçalho "Contracheque - ...".
     - Tipo P -> Receita. Tipo D -> Despesa (Exemplo de IRRF ou IPREV).
     - MAPAS DE SUBCATEGORIAS DO CONTRACHEQUE:
       * Se a descrição for "Auxílio alimentação" ou correspondente -> subcategoria: "Remuneração Bruta".
       * Se a descrição for "Sind. Policial Civil" -> subcategoria: "Provisões e seguros".
       * Se a descrição for "Plano de Saúde/Convênio" -> subcategoria: "Farmácia".
       * Se adiantamento 13 salário precedido de D (Desconto) -> categoria: "Retificação" / subcategoria: "Retificação em receita" / valor: NEGATIVO.
     - Demais rubricas: "IPREV" ou "IR" -> Subcat "Impostos e taxas".
     
  B. REGIME MANUAL EXCEL:
     - Título independente no topo identifica a subcategoria principal das despesas dispostas.
     - data: Campo individual extraído na linha de competência (formato DD/MM/AAAA).
     - Entradas/Saídas: Preencha com as restrições apontadas em MEIOS DE PAGAMENTO ("PicPay", "Inter") caso referenciadas na linha do fato contábil.

  TEXTO PARA EXTRAIR E CLASSIFICAR:
  ${textoBruto}`;

  const payload = {
    "model": modeloEscolhido,
    "messages": [
      { "role": "system", "content": "Você é o Controle Financeiro Avançado. Responda APENAS com o objeto JSON válido." },
      { "role": "user", "content": prompt }
    ],
    "temperature": 0
  };

  const options = {
    "method": "post",
    "contentType": "application/json",
    "headers": { "Authorization": "Bearer " + chaveLimpa },
    "payload": JSON.stringify(payload),
    "muteHttpExceptions": true
  };

  const response = UrlFetchApp.fetch(url, options);
  const json = JSON.parse(response.getContentText());

  if (json.error) throw new Error("Erro Groq API: " + json.error.message);

  try {
    let rawResult = json.choices[0].message.content;
    rawResult = rawResult.replace(/```json/gi, '').replace(/```/g, '').trim();
    
    const inicioObj = rawResult.indexOf('{');
    const fimObj = rawResult.lastIndexOf('}') + 1;
    
    let parser;
    if (inicioObj !== -1 && fimObj > inicioObj) {
      parser = JSON.parse(rawResult.substring(inicioObj, fimObj));
    } else {
      const inicioArr = rawResult.indexOf('[');
      const fimArr = rawResult.lastIndexOf(']') + 1;
      if (inicioArr !== -1 && fimArr > inicioArr) {
        parser = { transacoes: JSON.parse(rawResult.substring(inicioArr, fimArr)) };
      } else {
        throw new Error("JSON não localizado na resposta da IA.");
      }
    }
    
    const lista = parser.transacoes || parser.data || (Array.isArray(parser) ? parser : Object.values(parser)[0]);
    
    const transacoesFiltradas = lista.filter(item => {
      let cleanedVal = String(item.valor).replace('R$', '').replace(/\s/g, '').replace(',', '.');
      return parseFloat(cleanedVal) !== 0;
    });
    
    return transacoesFiltradas;
  } catch (e) {
    throw new Error("Erro de conversão estrutural do JSON do servidor: " + e.message);
  }
}

function salvarTransacoes(dados, planilhaId) {
  try {
    PropertiesService.getScriptProperties().setProperty('LAST_SHEET_ID', planilhaId);
    const ss = SpreadsheetApp.openById(planilhaId.trim());
    const sheet = ss.getSheets()[0];
    
    dados.forEach(item => {
      let vStr = String(item.valor).replace('R$', '').replace(/\s/g, '');
      if (vStr.includes(',') && vStr.includes('.')) vStr = vStr.replace(/\./g, '');
      vStr = vStr.replace(',', '.');
      let valorFinal = parseFloat(vStr) || 0;
      
      if (valorFinal === 0) return;

      sheet.appendRow([
        "", // ID
        item.data || "", 
        item['Entradas/Saídas'] || "", 
        valorFinal, 
        item.descricao || "", 
        item.categoria || "", 
        item.subcategoria || "", 
        item.essencialidade || "", 
        item.comportamento || "", 
        item.recorrencia || ""
      ]);
    });
    return "OK";
  } catch (e) { throw new Error(e.message); }
}