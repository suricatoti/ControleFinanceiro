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
  {
    id: "cat-transfer",
    name: "Transferência",
  },
  {
    id: "cat-salario",
    name: "Salário",
  },
  {
    id: "cat-moradia",
    name: "Moradia",
  },
  {
    id: "cat-alimentacao",
    name: "Alimentação",
  },
  {
    id: "cat-transporte",
    name: "Transporte",
  },
];

export const initialSubcategories = [
  // Subcategoria atrelada à categoria de transferência
  {
    id: "sub-transfer",
    categoryId: "cat-transfer",
    name: "Transferência",
    type: "Transferência",
    frequency: "N/A",
    nature: "N/A",
  },
  // Subcategorias de Salário
  {
    id: "sub-sal-fixo",
    categoryId: "cat-salario",
    name: "Salário Fixo",
    type: "Receita",
    frequency: "Fixo",
    nature: "Essencial",
  },
  {
    id: "sub-sal-extra",
    categoryId: "cat-salario",
    name: "Renda Extra",
    type: "Receita",
    frequency: "Variável",
    nature: "Qualidade de Vida",
  },
  // Subcategorias de Moradia
  {
    id: "sub-mor-aluguel",
    categoryId: "cat-moradia",
    name: "Aluguel",
    type: "Despesa",
    frequency: "Fixo",
    nature: "Essencial",
  },
  {
    id: "sub-mor-luz",
    categoryId: "cat-moradia",
    name: "Conta de Luz",
    type: "Despesa",
    frequency: "Variável",
    nature: "Essencial",
  },
  // Subcategorias de Alimentação
  {
    id: "sub-ali-mercado",
    categoryId: "cat-alimentacao",
    name: "Mercado",
    type: "Despesa",
    frequency: "Variável",
    nature: "Essencial",
  },
  {
    id: "sub-ali-ifood",
    categoryId: "cat-alimentacao",
    name: "Delivery",
    type: "Despesa",
    frequency: "Variável",
    nature: "Qualidade de Vida",
  },
  // Subcategorias de Transporte
  {
    id: "sub-tra-combustivel",
    categoryId: "cat-transporte",
    name: "Combustível",
    type: "Despesa",
    frequency: "Variável",
    nature: "Essencial",
  },
  {
    id: "sub-tra-app",
    categoryId: "cat-transporte",
    name: "Uber/99",
    type: "Despesa",
    frequency: "Variável",
    nature: "Qualidade de Vida",
  },
];
