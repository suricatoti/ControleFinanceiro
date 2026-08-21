import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { AppDatabase, db as defaultDb } from '@/db/db';

export interface Wallet {
  id: string;
  name: string;
  dbName: string;
}

interface WalletContextType {
  wallets: Wallet[];
  activeWalletId: string;
  activeWallet: Wallet | undefined;
  db: AppDatabase;
  addWallet: (name: string) => void;
  switchWallet: (id: string) => void;
  renameWallet: (id: string, newName: string) => void;
  deleteWallet: (id: string) => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const DEFAULT_WALLETS: Wallet[] = [
  { id: 'default', name: 'Principal', dbName: 'FinanceDB' }
];

export function WalletProvider({ children }: { children: ReactNode }) {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [activeWalletId, setActiveWalletId] = useState<string>('default');
  const [dbInstance, setDbInstance] = useState<AppDatabase>(defaultDb);

  useEffect(() => {
    // Carregar carteiras do localStorage
    const savedWallets = localStorage.getItem('wallets');
    if (savedWallets) {
      setWallets(JSON.parse(savedWallets));
    } else {
      setWallets(DEFAULT_WALLETS);
      localStorage.setItem('wallets', JSON.stringify(DEFAULT_WALLETS));
    }

    // Carregar carteira ativa
    const savedActiveWalletId = localStorage.getItem('activeWalletId');
    if (savedActiveWalletId) {
      setActiveWalletId(savedActiveWalletId);
    } else {
      localStorage.setItem('activeWalletId', 'default');
    }
  }, []);

  useEffect(() => {
    // Quando a carteira ativa mudar, instanciar o banco correto
    const activeWallet = wallets.find(w => w.id === activeWalletId);
    if (activeWallet) {
      if (activeWallet.dbName === 'FinanceDB') {
        setDbInstance(defaultDb);
      } else {
        const newDb = new AppDatabase(activeWallet.dbName);
        setDbInstance(newDb);
      }
    }
  }, [activeWalletId, wallets]);

  const addWallet = (name: string) => {
    const id = crypto.randomUUID();
    const newWallet: Wallet = {
      id,
      name,
      dbName: `FinanceDB_${id}`
    };
    const newWallets = [...wallets, newWallet];
    setWallets(newWallets);
    localStorage.setItem('wallets', JSON.stringify(newWallets));
    switchWallet(id);
  };

  const switchWallet = (id: string) => {
    setActiveWalletId(id);
    localStorage.setItem('activeWalletId', id);
  };

  const renameWallet = (id: string, newName: string) => {
    const updatedWallets = wallets.map(w => w.id === id ? { ...w, name: newName } : w);
    setWallets(updatedWallets);
    localStorage.setItem('wallets', JSON.stringify(updatedWallets));
  };

  const deleteWallet = (id: string) => {
    if (id === 'default') {
      alert("Não é possível excluir a carteira Principal.");
      return;
    }
    
    // Optional: Delete the actual IndexedDB database to free up space
    // const walletToDelete = wallets.find(w => w.id === id);
    // if (walletToDelete) {
    //   new Dexie(walletToDelete.dbName).delete();
    // }

    const newWallets = wallets.filter(w => w.id !== id);
    setWallets(newWallets);
    localStorage.setItem('wallets', JSON.stringify(newWallets));
    
    if (activeWalletId === id) {
      switchWallet('default');
    }
  };

  const activeWallet = wallets.find(w => w.id === activeWalletId);

  return (
    <WalletContext.Provider 
      value={{ 
        wallets, 
        activeWalletId, 
        activeWallet,
        db: dbInstance, 
        addWallet, 
        switchWallet,
        renameWallet,
        deleteWallet
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
