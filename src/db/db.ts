import Dexie, { type EntityTable } from 'dexie';
import { initialCategories, initialSubcategories } from './initialData';

export interface Account {
  id: string;
  name: string;
  initialBalance: number;
  isCreditCard?: boolean;
  closingDay?: number;
  dueDay?: number;
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

export interface Recurrence {
  id: string;
  description: string;
  amount: number;
  accountId: string;
  categoryId: string;
  subcategoryId: string;
  startDate: string;
  period?: 'mensal' | 'anual';
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
  recurringGroupId?: string;
  status?: 'Pendente' | 'Paga';
  creditCardBillDate?: string;
  reconciled?: boolean;
}

export class AppDatabase extends Dexie {
  accounts!: EntityTable<Account, 'id'>;
  categories!: EntityTable<Category, 'id'>;
  subcategories!: EntityTable<Subcategory, 'id'>;
  transactions!: EntityTable<Transaction, 'id'>;
  recurrences!: EntityTable<Recurrence, 'id'>;

  constructor(dbName: string) {
    super(dbName);
    
    this.version(1).stores({
      accounts: 'id, name',
      categories: 'id, name, type',
      subcategories: 'id, categoryId, name, type',
      transactions: 'id, date, accountId, categoryId, subcategoryId',
    });

    // Popula o banco com cadastros iniciais caso ele esteja vazio (nova instalação)
    this.on('populate', async () => {
      // Como o usuário pediu, não vamos inserir contas iniciais, apenas categorias e subcategorias
      await this.categories.bulkAdd(initialCategories);
      await this.subcategories.bulkAdd(initialSubcategories as any);
    });

    this.version(2).stores({
      accounts: 'id, name',
    });

    this.version(3).stores({
      subcategories: 'id, name, categoryId',
    });

    this.version(4).stores({
      categories: 'id, name',
      subcategories: 'id, name, categoryId, type, frequency, nature',
    });

    this.version(5).stores({
      recurrences: 'id, accountId, categoryId, subcategoryId',
      transactions: 'id, date, accountId, categoryId, subcategoryId, recurringGroupId, status'
    }).upgrade(tx => {
      return tx.table('transactions').toCollection().modify(transaction => {
        transaction.status = 'Paga';
      });
    });

    this.version(6).stores({
      transactions: 'id, date, accountId, categoryId, subcategoryId, recurringGroupId, status, creditCardBillDate'
    });
  }
}

// Mantido para compatibilidade temporária onde o Contexto ainda não foi aplicado
export const db = new AppDatabase('FinanceDB');
