# 📑 LEITOR DE TRANSAÇÕES - VERSÃO 1.0

Sistema web de automação contábil para extração, classificação e estruturação inteligente de transações financeiras a partir de textos brutos (Contracheques e Despesas Manuais). Desenvolvido para rodar integrado ao **Google Sheets** via **Google Apps Script** e alimentado pelo motor de inferência **OpenAI GPT-OSS-120B** na **Groq Cloud API**.

---

## 🚀 Funcionalidades Principais

- **Autodescoberta de Modelos (Groq Cloud)**: O sistema consulta dinamicamente a API da Groq e seleciona o modelo de mais alta capacidade ativo na conta (`openai/gpt-oss-120b` / `openai/gpt-oss-20b`).
- **Regime de Competência vs. Regime de Caixa**: Separação rigorosa entre a data do fato gerador (`Data`) e a data efetiva do desembolso financeiro (`Entradas/Saídas`).
- **Leitura Inteligente de Contracheques**:
  - Identificação automática de Proventos (`P` $\rightarrow$ Positivo) e Descontos (`D` $\rightarrow$ Negativo).
  - Vinculação automática de `Data` e `Entradas/Saídas` à data do cabeçalho do contracheque.
  - Mapeamento específico de rubricas (ex: *Auxílio alimentação* $\rightarrow$ *Remuneração Bruta*; *Sind. Policial Civil* $\rightarrow$ *Provisões e seguros*; *Plano de Saúde/Convênio* $\rightarrow$ *Farmácia*; *Adiantamento 13º D* $\rightarrow$ *Retificação em receita*).
- **Leitura de Despesas Manuais por Bloco**:
  - Reconhecimento do título do bloco como `Subcategoria` e preservação **100% literal** da descrição de cada linha.
  - **Prioridade de Caixa**: Captura prioritária da data de pagamento explícita ao final da linha, com regras de fallback automáticas para contas `PicPay` (iguala à data da transação) e `Inter` (mantém em branco quando não informada).
- **Matriz Estratégica Automática**:
  - Preenchimento automático de **Essencialidade**, **Comportamento** e **Recorrência** para todas as despesas (incluindo regra de exceção para *"corte de cabelo"* dentro de *Vestuário*).
  - Manutenção automática dos campos estratégicos em branco para lançamentos da categoria `Receita`.
- **Higienização e Blindagem Numérica**:
  - Conversão precisa do padrão monetário brasileiro (`R$ 1.234,56`) para formato numérico nativo da planilha (`1234.56`).
  - Descarte automático de linhas com valores zerados (`R$ 0,00`).
- **Interface Web com Grid Editável**:
  - Visualização prévia com destaque cromático (verde para entradas, vermelho para saídas) e edição em tempo real antes da gravação no Google Sheets.
  - Memorização automática do ID da planilha via `PropertiesService`.

---

## 🛠️ Tecnologias Utilizadas

- **Front-end**: HTML5, CSS3, JavaScript (ES6+)
- **Back-end**: Google Apps Script (Runtime V8)
- **Motor de IA**: Groq Cloud API (`openai/gpt-oss-120b`)
- **Banco de Dados**: Google Sheets

---

## 📂 Estrutura do Repositório

```text
leitor-de-transacoes/
├── Código.gs          # Back-end no Google Apps Script e integração com Groq API
├── index.html         # Interface Web (Front-end) e Grid de conferência
├── appsscript.json    # Manifesto de configuração do Google Apps Script
├── .gitignore         # Proteção contra envio de chaves e arquivos locais
└── README.md          # Documentação oficial do projeto