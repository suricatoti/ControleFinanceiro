import { AppDatabase } from "@/db/db";
import { exportDB } from "dexie-export-import";
import { useState, useEffect, useCallback } from "react";
import type { Wallet } from "@/contexts/WalletContext";

const BACKUP_CHANGES_KEY = 'hasUnsavedBackupChanges';
const LAST_BACKUP_TIME_KEY = 'lastBackupTime';
const LAST_CHANGE_TIME_KEY = 'lastDataChangeTime';

/**
 * Marca que houve inserção ou modificação de dados no sistema desde o último backup.
 */
export function markDataChanged() {
  try {
    localStorage.setItem(BACKUP_CHANGES_KEY, 'true');
    localStorage.setItem(LAST_CHANGE_TIME_KEY, Date.now().toString());
    window.dispatchEvent(new CustomEvent('backupStatusChanged', { detail: { hasPending: true } }));
  } catch (err) {
    console.error("Erro ao registrar alteração de dados:", err);
  }
}

/**
 * Marca que o backup foi realizado com sucesso.
 */
export function markBackupDone() {
  try {
    localStorage.setItem(BACKUP_CHANGES_KEY, 'false');
    localStorage.setItem(LAST_BACKUP_TIME_KEY, Date.now().toString());
    window.dispatchEvent(new CustomEvent('backupStatusChanged', { detail: { hasPending: false } }));
  } catch (err) {
    console.error("Erro ao registrar backup concluído:", err);
  }
}

/**
 * Verifica se há alterações pendentes de backup.
 */
export function hasUnsavedBackupChanges(): boolean {
  try {
    return localStorage.getItem(BACKUP_CHANGES_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Retorna a data/hora do último backup realizado (ou null se nunca foi feito).
 */
export function getLastBackupTime(): Date | null {
  try {
    const time = localStorage.getItem(LAST_BACKUP_TIME_KEY);
    return time ? new Date(parseInt(time, 10)) : null;
  } catch {
    return null;
  }
}

/**
 * Executa o backup mestre exportando todas as carteiras e bancos de dados em um arquivo .json.
 */
export async function executeBackup(wallets: Wallet[], activeWalletId: string): Promise<boolean> {
  try {
    const masterBackup = {
      type: "financas_master_backup",
      version: 1,
      wallets: wallets,
      activeWalletId: activeWalletId,
      databases: {} as Record<string, any>
    };

    for (const wallet of wallets) {
      const tempDb = new AppDatabase(wallet.dbName);
      const blob = await exportDB(tempDb, { prettyJson: false });
      const text = await blob.text();
      masterBackup.databases[wallet.dbName] = JSON.parse(text);
      tempDb.close();
    }

    const masterBlob = new Blob([JSON.stringify(masterBackup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(masterBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `financas_backup_completo_${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    markBackupDone();
    return true;
  } catch (error) {
    console.error("Erro ao exportar banco de dados:", error);
    return false;
  }
}

/**
 * Hook React para observar o status do backup em tempo real.
 */
export function useBackupStatus() {
  const [hasPending, setHasPending] = useState<boolean>(() => hasUnsavedBackupChanges());
  const [lastBackup, setLastBackup] = useState<Date | null>(() => getLastBackupTime());

  const refresh = useCallback(() => {
    setHasPending(hasUnsavedBackupChanges());
    setLastBackup(getLastBackupTime());
  }, []);

  useEffect(() => {
    const handler = () => {
      refresh();
    };

    window.addEventListener('backupStatusChanged', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('backupStatusChanged', handler);
      window.removeEventListener('storage', handler);
    };
  }, [refresh]);

  return {
    hasPendingBackup: hasPending,
    lastBackupTime: lastBackup,
    refreshBackupStatus: refresh
  };
}
