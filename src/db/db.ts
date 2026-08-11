import Dexie, { type EntityTable } from 'dexie';
import { initialAccounts, initialCategories, initialSubcategories } from './initialData';

export interface Account {
  id: string;
  name: string;
  initialBalance: number;
}

export interface Category {
  id: string;
  name: string;
}

export interface Subcategory {
  id: string;
  name: string;
  categoryId: string;
  type: 'Receita' | 'Despesa' | 'Transferência';
  frequency: 'Fixo' | 'Variável' | 'N/A';
  nature: 'Essencial' | 'Qualidade de Vida' | 'N/A';
}

export interface Transaction {
  id: string;
  date: string;
  accountId: string;
  categoryId: string;
  subcategoryId?: string;
  description: string;
  amount: number;
  linkedTransactionId?: string;
}

const db = new Dexie('FinanceDB') as Dexie & {
  accounts: EntityTable<Account, 'id'>;
  categories: EntityTable<Category, 'id'>;
  subcategories: EntityTable<Subcategory, 'id'>;
  transactions: EntityTable<Transaction, 'id'>;
};

db.version(1).stores({
  accounts: 'id, name',
  categories: 'id, name, type',
  subcategories: 'id, categoryId, name, type',
  transactions: 'id, date, accountId, categoryId, subcategoryId',
});

// Popula o banco com cadastros iniciais caso ele esteja vazio (nova instalação)
db.on('populate', async () => {
  await db.accounts.bulkAdd(initialAccounts);
  await db.categories.bulkAdd(initialCategories);
  await db.subcategories.bulkAdd(initialSubcategories);
});

db.version(2).stores({
  accounts: 'id, name',
});

db.version(3).stores({
  subcategories: 'id, name, categoryId',
});

db.version(4).stores({
  categories: 'id, name',
  subcategories: 'id, name, categoryId, type, frequency, nature',
});

export { db };
