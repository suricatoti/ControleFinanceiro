# 📊 Controle Financeiro Pessoal

Um sistema completo, rápido e seguro para você gerenciar suas finanças de forma estratégica. Todo o seu banco de dados fica salvo **localmente** no seu navegador, garantindo que só você tenha acesso às suas informações financeiras!

---

## 🚀 Como Instalar

O sistema foi construído em React + Vite. Para prepará-lo para rodar no seu computador pela primeira vez, você precisa baixar as dependências do projeto.

### No Windows
1. Dê um duplo clique no arquivo `install.bat`.
2. Aguarde a tela preta (Prompt de Comando) finalizar a instalação dos pacotes. 

### No Linux / Mac
1. Abra o terminal na pasta do projeto.
2. Execute o comando: `./install.sh`
3. Aguarde a mensagem de sucesso.

*(Isso precisa ser feito apenas uma vez, ou sempre que baixar uma atualização do código-fonte).*

---

## ⚡ Como Inicializar (Rodar o Sistema)

Sempre que você quiser abrir o seu Controle Financeiro, você deve iniciar o servidor local.

### No Windows
1. Dê um duplo clique no arquivo `start.bat`.
2. O servidor será ligado. Em seguida, acesse no seu navegador o endereço (geralmente `http://localhost:5173`).

### No Linux / Mac
1. Abra o terminal na pasta do projeto.
2. Execute o comando: `./start.sh`
3. Abra o navegador no endereço indicado no terminal.

> **Nota sobre o Banco de Dados (Carga Inicial):** Na primeira vez que você abrir o sistema, um banco de dados novinho será criado e preenchido automaticamente com as contas principais (Corrente e Carteira) e as categorias essenciais do dia a dia (Moradia, Transporte, Alimentação, etc), prontas para uso!

---

## 📖 Como Usar o Sistema

O sistema é dividido nas seguintes telas no menu lateral:

### 1. 📊 Visão Geral (Dashboard)
O coração da sua estratégia financeira.
- **Filtro de Período:** Use o filtro no canto superior direito para analisar "Mês Atual", "Ano atual", ou janelas de longo prazo (5 anos, 10 anos, Todo Período, Personalizado).
- **Gráfico de Barras:** Em janelas curtas, exibe barras por mês. Em filtros de longo prazo, agrupa os anos estrategicamente para você comparar seu crescimento anual.
- **Gráficos de Rosca:** Analise de onde o dinheiro vem e para onde ele vai. Você pode habilitar a caixinha **"Ver Subcategorias"** no gráfico de saídas para um detalhamento profundo dos seus gastos!

### 2. 📝 Transações
Aqui é o seu Extrato Bancário em tempo real.
- **Nova Transação:** Adicione receitas e despesas.
- **Parcelamentos Inteligentes:** Se você comprar algo parcelado, basta digitar o número de parcelas. O sistema fará a divisão matemática perfeita (sem erros de centavos) e empurrará cada parcela para os meses futuros com uma anotação visual (ex: *Parcela 1 de 3*).
- **Transferências:** Ao escolher uma categoria de Transferência, a tela muda e pede uma "Conta de Destino". O valor sairá de uma e entrará na outra automaticamente.
- **Saldo Automático:** O sistema calcula o "Saldo Anterior" em relação à data pesquisada e lista o saldo correndo ao lado de cada registro.

### 3. 📂 Categorias e Subcategorias
Controle suas árvores de gastos.
- **Hierarquia:** Toda transação precisa pertencer a uma Subcategoria (ex: Mercado), que por sua vez pertence a uma Categoria Pai (ex: Alimentação).
- **Classificação Sistêmica:** O sistema te obriga a preencher *Frequência* (Fixo/Variável) e *Natureza* (Essencial/Qualidade de Vida). Isso ajuda a disciplinar como você enxerga o dinheiro!
- **Regras Imutáveis:** A categoria de `Transferência` possui proteções de sistema e não pode ser apagada.

### 4. 🏦 Contas
Gerencie os saldos de diferentes origens.
- Você pode criar contas separadas (ex: Itaú, Nubank, Dinheiro Físico) e consultar o extrato filtrando por elas na tela de transações.

---

*Desenvolvido com 🩵 usando React, TypeScript, TailwindCSS e Dexie (IndexedDB).*
