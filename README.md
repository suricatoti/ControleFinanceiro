# 📊 Controle Financeiro Pessoal

> # ⚠️ AVISO IMPORTANTE SOBRE SEUS DADOS E BACKUP
>
> ### 🔒 SEUS DADOS SÃO 100% LOCAIS E PRIVADOS
> **Este sistema NÃO armazena seus dados em servidores externos ou na nuvem.**
> Todos os seus lançamentos, contas, carteiras e configurações ficam salvos **exclusivamente na memória local do seu navegador/dispositivo (IndexedDB)**.
>
> ### 💾 A RESPONSABILIDADE DO BACKUP É DO USUÁRIO
> - **Faça backups regulares:** Acesse o menu **Perfil** e clique em **Exportar Dados (Backup)** para baixar seu arquivo `.json` de segurança.
> - **Risco de perda:** Limpar o histórico/dados do navegador, formatar o aparelho ou trocar de celular/computador sem ter feito o backup resultará na **perda definitiva dos seus dados**.
> - **Sincronização entre aparelhos:** Para usar os mesmos dados em outro dispositivo (ex: do computador para o celular), basta exportar o arquivo no primeiro e importar na tela de **Perfil** do segundo.

---

## 🌐 Como Acessar

Acesse diretamente pelo navegador no link oficial:
👉 **[https://suricatoti.github.io/ControleFinanceiro/](https://suricatoti.github.io/ControleFinanceiro/)**

---

## 📱 Como Instalar no Celular e Computador (PWA)

O Controle Financeiro é um **Progressive Web App (PWA)**. Ele pode ser instalado como um aplicativo nativo no seu celular (Android ou iPhone) ou computador (Windows, Mac ou Linux), funcionando **100% offline**, com carregamento instantâneo e sem precisar baixar nada em lojas de aplicativos.

### 🍎 No iPhone e iPad (iOS - Safari)
> **Atenção:** A Apple não permite botões de instalação automática direta. A instalação deve ser feita pelo Safari:

1. Abra o link **[https://suricatoti.github.io/ControleFinanceiro/](https://suricatoti.github.io/ControleFinanceiro/)** obrigatoriamente no navegador **Safari** *(não use navegadores internos de apps como WhatsApp ou Instagram)*.
2. Na barra inferior do Safari, toque no botão **Compartilhar** 📤 *(ícone de quadrado com a seta para cima)*.
3. Role as opções para baixo e toque em **"Adicionar à Tela de Início"** ➕ *(Add to Home Screen)*.
4. No canto superior direito, toque em **"Adicionar"**.
5. O ícone do **Finanças** aparecerá na tela de início do seu iPhone e abrirá em tela cheia (modo app nativo).

---

### 🤖 No Android (Google Chrome / Samsung Internet)
1. Abra o link no **Google Chrome** no seu celular.
2. Você pode:
   - Tocar no botão **"Instalar Aplicativo Agora"** na tela de **Perfil** do app; OU
   - Tocar no menu de **3 pontinhos** no canto superior direito do Chrome e escolher **"Instalar aplicativo"** ou **"Adicionar à tela inicial"**.
3. O app será adicionado à sua gaveta de aplicativos e tela inicial.

---

### 💻 No Computador (Windows, Mac ou Linux)
1. Abra o link no **Google Chrome** ou **Microsoft Edge**.
2. Clique no ícone de instalação ⊕ no canto direito da barra de endereços (ou menu `...` > *Instalar Controle Financeiro*).
3. Um atalho será criado na sua **Área de Trabalho** e no **Menu Iniciar**, rodando em janela própria como um software desktop.

---

## ✨ Funcionalidades e Layout Responsivo

O sistema foi desenhado para oferecer a melhor experiência tanto em computadores widescreen quanto em smartphones:

### 📱 Navegação Mobile Otimizada
- **Bottom Navigation Bar:** Barra inferior fixa no celular para alternar rapidamente entre *Dashboard, Transações, Cadastros, Recorrências e Perfil* com uma só mão.
- **Gestão de Múltiplas Carteiras no Mobile:** Crie, alterne, renomeie e exclua carteiras direto pelo topo da tela no celular.
- **Cards Nativos de Transações:** No celular, substitui tabelas largas por cards fáceis de tocar, com badges de status, categoria, valor em destaque e conciliação rápida.
- **Tema Claro e Escuro (Dark Mode):** Alternância instantânea com contraste e legibilidade ajustados.

### 📊 1. Visão Geral (Dashboard)
- **Saldos em Tempo Real:** Tabela consolidada de saldos por conta e total geral do mês.
- **Contas Pendentes:** Acompanhe os vencimentos futuros do mês selecionado.
- **Receitas vs Despesas:** Gráficos anuais comparativos e evolução de fluxo.
- **Gráficos de Rosca por Categoria:** Detalhamento por categoria com opção de visualizar subcategorias e valores em R$.
- **Planejamento Anual:** Evolução projetada de saldo ao longo dos 12 meses.

### 📝 2. Transações
- **Lançamentos Simples e Parcelados:** Divisão automática de parcelas com cálculo exato de centavos e projeção nos meses correspondentes.
- **Transferências entre Contas:** Debita da conta de origem e credita na de destino em um único lançamento sincronizado.
- **Previsões e Baixa:** Transações pendentes com baixa rápida e ajuste do valor efetivamente realizado.
- **Conciliação Bancária:** Marque como conferido para auditar com seu extrato real.

### 💳 3. Cartões de Crédito Inteligentes
- **Ciclos de Fatura:** Lançamentos agrupados pelo ciclo de fechamento e vencimento, e não pelo mês calendário.
- **Vigência Personalizada:** Ajuste manual de datas de início, fechamento e vencimento de faturas específicas.
- **Mover Fatura:** Transfira compras entre faturas com facilidade.

### 🔄 4. Recorrências (Assinaturas e Contas Fixas)
- Cadastre contas fixas mensais ou anuais (aluguel, streaming, salários).
- Projeção automática contínua de lançamentos pendentes no fluxo futuro.

### 📂 5. Cadastros
- **Contas:** Contas correntes, carteiras físicas, cartões de crédito e investimentos.
- **Categorias e Subcategorias:** Classificação por tipo (*Receita/Despesa/Transferência*), frequência (*Fixo/Variável*) e natureza (*Essencial/Qualidade de Vida*).

### ⚙️ 6. Perfil, Backup e Restauração
- **Exportação Master:** Exporta todas as carteiras e históricos em um arquivo `.json` padronizado.
- **Restauração Completa:** Importe seus backups a qualquer momento em qualquer navegador ou aparelho.

---

## 🛠️ Para Desenvolvedores (Rodando Localmente)

### Pré-requisitos
- Node.js 18+ instalado.

### Instalação e Execução
```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev

# Gerar build de produção
npm run build
```

---

## ⚙️ Ativação do GitHub Pages (Deploy Contínuo)

1. Acesse o repositório no GitHub: `https://github.com/suricatoti/ControleFinanceiro`
2. Vá em **Settings** > **Pages**.
3. Em **Build and deployment** > **Source**, selecione: **`GitHub Actions`**.
4. A cada `git push` na branch `main`, a compilação e publicação acontecerão automaticamente.

---

*Desenvolvido com 🩵 usando React, TypeScript, TailwindCSS, Lucide Icons, Recharts e Dexie (IndexedDB).*

