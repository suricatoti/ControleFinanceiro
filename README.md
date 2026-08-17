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
- **Parcelamentos Inteligentes:** Ao digitar o número de parcelas, o sistema fará a divisão exata (corrigindo arredondamentos de centavos na primeira parcela) e lançará cada cota nos meses futuros com anotação visual (ex: *Parcela 1 de 3*).
- **Transferências:** Escolhendo o tipo "Transferência", o sistema pede uma "Conta de Origem" e "Conta de Destino". O valor debita de uma e credita na outra.
- **Previsões e Baixas (Status Pendente):** Você pode marcar uma transação como "Pendente" (previsão). Ela fica opaca na lista. Quando o dinheiro de fato sair ou entrar, você clica em **"Baixa"**, podendo inclusive ajustar o valor final se for diferente da previsão.
- **Conciliação Bancária (Conferência):** Clicando no ícone redondo vazio ao lado de "Excluir", você marca a transação com um "✓" verde, indicando que ela já foi conferida e está igual ao seu extrato bancário oficial. A descrição fica com um risco sutil para facilitar sua revisão.
- **Saldo Automático:** O sistema calcula o "Saldo Anterior" antes do período filtrado e lista o saldo correndo dinamicamente ao lado de cada registro.

### 3. 💳 Cartões de Crédito (Novo!)
Contas de cartão de crédito possuem regras exclusivas e muito mais inteligência.
- Ao criar uma conta e marcar a caixinha "É Cartão de Crédito", você informa o **Dia de Fechamento** e **Dia de Vencimento**.
- As compras lançadas no cartão deixam de ser agrupadas pelo calendário normal e passam a ser **agrupadas por ciclo de Fatura**. O sistema exibe uma caixa azul avisando qual o ciclo atual, a data das compras abrangidas e o dia do pagamento!
- **Mover Fatura:** Comprou perto do fechamento e o lançamento caiu na fatura errada? O botão "Mover" na tabela de transações permite forçar manualmente para qual mês/fatura aquela compra específica deve entrar.

### 4. 🔄 Recorrências (Lançamentos Mensais)
Abandone o trabalho manual! 
- Na tela de **Recorrências**, você cadastra suas despesas e receitas fixas infinitas (ex: Assinatura da Netflix, Salário Mensal). 
- O sistema varre automaticamente todos os meses e insere essas transações pendentes no seu fluxo, assim você sempre sabe o quanto já está comprometido para o futuro!

### 5. 📂 Categorias e Subcategorias
Controle suas árvores de gastos.
- **Hierarquia:** Toda transação precisa pertencer a uma Subcategoria (ex: Mercado), que por sua vez pertence a uma Categoria Pai (ex: Alimentação).
- **Classificação Sistêmica:** O sistema pede *Frequência* (Fixo/Variável) e *Natureza* (Essencial/Qualidade de Vida). Isso ajuda a disciplinar como você enxerga o dinheiro!
- As categorias de transferência do sistema não podem ser excluídas para proteger a integridade do banco de dados.

### 6. 🏦 Contas
Gerencie os saldos de diferentes origens.
- Você pode criar contas separadas (ex: Itaú, Nubank, Dinheiro Físico) e consultar o extrato filtrando por elas na tela de transações. Conta corrente ou cartão de crédito, tudo centralizado aqui.

---

*Desenvolvido com 🩵 usando React, TypeScript, TailwindCSS e Dexie (IndexedDB).*
