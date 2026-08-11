export const initialAccounts = [
  {
    id: "acc-1",
    name: "Conta Corrente",
    initialBalance: 0,
  },
  {
    id: "acc-2",
    name: "Carteira",
    initialBalance: 0,
  },
];

export const initialCategories = [
  { id: "cat-animais", name: "Animais de Estimação" },
  { id: "cat-banco", name: "Banco" },
  { id: "cat-carro", name: "Carro" },
  { id: "cat-cartao", name: "Cartão" },
  { id: "cat-diversao", name: "Diversão" },
  { id: "cat-familia", name: "Família" },
  { id: "cat-moradia", name: "Moradia" },
  { id: "cat-outros", name: "Outros" },
  { id: "cat-receita", name: "Receita" },
  { id: "cat-transfer", name: "Transferência" },
  { id: "cat-viagem", name: "Viagem" },
];

export const initialSubcategories = [
  // --- Animais de Estimação ---
  { id: "sub-1", categoryId: "cat-animais", name: "Alimentação", type: "Despesa", frequency: "Fixo", nature: "Essencial" },
  { id: "sub-2", categoryId: "cat-animais", name: "Banho e Tosa", type: "Despesa", frequency: "Fixo", nature: "Essencial" },
  { id: "sub-3", categoryId: "cat-animais", name: "Vacinas", type: "Despesa", frequency: "Variável", nature: "Essencial" },
  { id: "sub-4", categoryId: "cat-animais", name: "Veterinário", type: "Despesa", frequency: "Variável", nature: "Essencial" },

  // --- Banco ---
  { id: "sub-5", categoryId: "cat-banco", name: "Taxas", type: "Despesa", frequency: "Variável", nature: "Essencial" },

  // --- Carro ---
  { id: "sub-6", categoryId: "cat-carro", name: "Estacionamento", type: "Despesa", frequency: "Fixo", nature: "Qualidade de Vida" },
  { id: "sub-7", categoryId: "cat-carro", name: "Gasolina", type: "Despesa", frequency: "Fixo", nature: "Qualidade de Vida" },
  { id: "sub-8", categoryId: "cat-carro", name: "IPVA", type: "Despesa", frequency: "Variável", nature: "Qualidade de Vida" },
  { id: "sub-9", categoryId: "cat-carro", name: "Licenciamento", type: "Despesa", frequency: "Variável", nature: "Qualidade de Vida" },
  { id: "sub-10", categoryId: "cat-carro", name: "Manutenção", type: "Despesa", frequency: "Variável", nature: "Qualidade de Vida" },
  { id: "sub-11", categoryId: "cat-carro", name: "Multas", type: "Despesa", frequency: "Variável", nature: "Qualidade de Vida" },
  { id: "sub-12", categoryId: "cat-carro", name: "Seguro", type: "Despesa", frequency: "Variável", nature: "Qualidade de Vida" },
  { id: "sub-13", categoryId: "cat-carro", name: "Seguro Obrigatório", type: "Despesa", frequency: "Variável", nature: "Qualidade de Vida" },

  // --- Cartão ---
  { id: "sub-14", categoryId: "cat-cartao", name: "VISA Infinity", type: "Despesa", frequency: "Fixo", nature: "Essencial" },

  // --- Diversão ---
  { id: "sub-15", categoryId: "cat-diversao", name: "Academia", type: "Despesa", frequency: "Fixo", nature: "Qualidade de Vida" },
  { id: "sub-16", categoryId: "cat-diversao", name: "Condomínio Clube", type: "Despesa", frequency: "Fixo", nature: "Qualidade de Vida" },
  { id: "sub-17", categoryId: "cat-diversao", name: "Passeios", type: "Despesa", frequency: "Variável", nature: "Qualidade de Vida" },
  { id: "sub-18", categoryId: "cat-diversao", name: "Stream", type: "Despesa", frequency: "Fixo", nature: "Qualidade de Vida" },

  // --- Família ---
  { id: "sub-19", categoryId: "cat-familia", name: "Alimentação", type: "Despesa", frequency: "Fixo", nature: "Essencial" },
  { id: "sub-20", categoryId: "cat-familia", name: "Farmácia", type: "Despesa", frequency: "Variável", nature: "Essencial" },
  { id: "sub-21", categoryId: "cat-familia", name: "Nutricionista", type: "Despesa", frequency: "Variável", nature: "Qualidade de Vida" },
  { id: "sub-22", categoryId: "cat-familia", name: "Presentes", type: "Despesa", frequency: "Variável", nature: "Qualidade de Vida" },
  { id: "sub-23", categoryId: "cat-familia", name: "Roupas", type: "Despesa", frequency: "Variável", nature: "Essencial" },
  { id: "sub-24", categoryId: "cat-familia", name: "Salão de Beleza", type: "Despesa", frequency: "Variável", nature: "Qualidade de Vida" },
  { id: "sub-25", categoryId: "cat-familia", name: "Supermercado", type: "Despesa", frequency: "Fixo", nature: "Essencial" },
  { id: "sub-26", categoryId: "cat-familia", name: "Taxi/Uber", type: "Despesa", frequency: "Variável", nature: "Qualidade de Vida" },

  // --- Moradia ---
  { id: "sub-27", categoryId: "cat-moradia", name: "Água", type: "Despesa", frequency: "Fixo", nature: "Essencial" },
  { id: "sub-28", categoryId: "cat-moradia", name: "Condomínio", type: "Despesa", frequency: "Fixo", nature: "Essencial" },
  { id: "sub-29", categoryId: "cat-moradia", name: "Empregada Doméstica", type: "Despesa", frequency: "Variável", nature: "Qualidade de Vida" },
  { id: "sub-30", categoryId: "cat-moradia", name: "IPTU", type: "Despesa", frequency: "Variável", nature: "Essencial" },
  { id: "sub-31", categoryId: "cat-moradia", name: "Mobílias", type: "Despesa", frequency: "Variável", nature: "Qualidade de Vida" },
  { id: "sub-mor-luz", categoryId: "cat-moradia", name: "Conta de Luz", type: "Despesa", frequency: "Variável", nature: "Essencial" }, // Mantida da base anterior
  { id: "sub-mor-aluguel", categoryId: "cat-moradia", name: "Aluguel", type: "Despesa", frequency: "Fixo", nature: "Essencial" }, // Mantida da base anterior

  // --- Outros ---
  { id: "sub-32", categoryId: "cat-outros", name: "Cemitério", type: "Despesa", frequency: "Variável", nature: "Essencial" },
  { id: "sub-33", categoryId: "cat-outros", name: "Outros", type: "Despesa", frequency: "Variável", nature: "Qualidade de Vida" },

  // --- Receita ---
  { id: "sub-34", categoryId: "cat-receita", name: "Salário", type: "Receita", frequency: "Fixo", nature: "Essencial" },
  { id: "sub-sal-extra", categoryId: "cat-receita", name: "Renda Extra", type: "Receita", frequency: "Variável", nature: "Qualidade de Vida" }, // Mantida da base anterior

  // --- Transferência ---
  { id: "sub-transfer", categoryId: "cat-transfer", name: "Transferência", type: "Transferência", frequency: "N/A", nature: "N/A" },

  // --- Viagem ---
  { id: "sub-35", categoryId: "cat-viagem", name: "Alimentação", type: "Despesa", frequency: "Variável", nature: "Qualidade de Vida" },
  { id: "sub-36", categoryId: "cat-viagem", name: "Diversão", type: "Despesa", frequency: "Variável", nature: "Qualidade de Vida" },
  { id: "sub-37", categoryId: "cat-viagem", name: "Hotel", type: "Despesa", frequency: "Variável", nature: "Qualidade de Vida" },
  { id: "sub-38", categoryId: "cat-viagem", name: "Outros", type: "Despesa", frequency: "Variável", nature: "Qualidade de Vida" },
  { id: "sub-39", categoryId: "cat-viagem", name: "Presentes", type: "Despesa", frequency: "Variável", nature: "Qualidade de Vida" },
  { id: "sub-40", categoryId: "cat-viagem", name: "Supermercado", type: "Despesa", frequency: "Variável", nature: "Qualidade de Vida" },
  { id: "sub-41", categoryId: "cat-viagem", name: "Transporte", type: "Despesa", frequency: "Variável", nature: "Qualidade de Vida" },
];
