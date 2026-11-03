import { AppDatabase } from "@/db/db";
import { exportDB } from "dexie-export-import";
import { useState, useEffect, useCallback } from "react";
import type { Wallet } from "@/contexts/WalletContext";
import {
  getGoogleDriveConfig,
  hasActiveDriveSession,
  uploadBackupToGoogleDrive,
  type GoogleDriveConfig,
} from "@/lib/googleDrive";

const BACKUP_CHANGES_KEY = 'hasUnsavedBackupChanges';
const LAST_BACKUP_TIME_KEY = 'lastBackupTime';
const LAST_BACKUP_DEST_KEY = 'lastBackupDestination';
const LAST_CHANGE_TIME_KEY = 'lastDataChangeTime';

export type BackupDestination = 'drive' | 'local';

export interface ExecuteBackupResult {
  success: boolean;
  destination?: BackupDestination;
  folderName?: string;
  error?: string;
}

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
export function markBackupDone(destination: BackupDestination = 'local') {
  try {
    localStorage.setItem(BACKUP_CHANGES_KEY, 'false');
    localStorage.setItem(LAST_BACKUP_TIME_KEY, Date.now().toString());
    localStorage.setItem(LAST_BACKUP_DEST_KEY, destination);
    window.dispatchEvent(new CustomEvent('backupStatusChanged', { detail: { hasPending: false, destination } }));
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

export function getLastBackupDestination(): BackupDestination | null {
  try {
    const dest = localStorage.getItem(LAST_BACKUP_DEST_KEY);
    return dest === 'drive' || dest === 'local' ? dest : null;
  } catch {
    return null;
  }
}

/**
 * Gera o JSON completo contendo todas as carteiras e seus respectivos bancos IndexedDB.
 */
export async function generateMasterBackupJson(wallets: Wallet[], activeWalletId: string): Promise<{
  jsonContent: string;
  fileName: string;
}> {
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

  const jsonContent = JSON.stringify(masterBackup, null, 2);
  const fileName = `financas_backup_completo_${new Date().toISOString().split("T")[0]}.json`;
  return { jsonContent, fileName };
}

/**
 * Faz o download local do arquivo JSON na pasta Downloads do navegador.
 */
export function triggerLocalDownload(jsonContent: string, fileName: string) {
  const masterBlob = new Blob([jsonContent], { type: "application/json" });
  const url = URL.createObjectURL(masterBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Executa o backup mestre detalhado:
 * - Se o usuário estiver com Google Drive conectado (mode = 'auto' ou 'drive'), salva na pasta escolhida do Drive.
 * - Se não estiver logado no Drive (ou mode = 'local'), salva na pasta Downloads do dispositivo.
 */
export async function executeBackupWithDetails(
  wallets: Wallet[],
  activeWalletId: string,
  options?: {
    mode?: 'auto' | 'drive' | 'local';
    interactive?: boolean;
    fallbackToLocalOnError?: boolean;
  }
): Promise<ExecuteBackupResult> {
  const mode = options?.mode ?? 'auto';
  const interactive = options?.interactive ?? true;
  const fallbackToLocal = options?.fallbackToLocalOnError ?? false;

  try {
    if (!wallets || wallets.length === 0) {
      return { success: false, error: "Nenhuma carteira disponível para backup." };
    }

    const { jsonContent, fileName } = await generateMasterBackupJson(wallets, activeWalletId);
    const driveConfig = getGoogleDriveConfig();
    const shouldUseDrive = mode === 'drive' || (mode === 'auto' && driveConfig.enabled);

    if (shouldUseDrive) {
      try {
        const uploaded = await uploadBackupToGoogleDrive(jsonContent, fileName, { interactive });
        markBackupDone('drive');
        return {
          success: true,
          destination: 'drive',
          folderName: uploaded.folderName,
        };
      } catch (driveError: any) {
        console.error("Erro ao salvar backup no Google Drive:", driveError);
        if (fallbackToLocal) {
          triggerLocalDownload(jsonContent, fileName);
          markBackupDone('local');
          return {
            success: true,
            destination: 'local',
            error: driveError?.message,
          };
        }
        return {
          success: false,
          destination: 'drive',
          error: driveError?.message || "Erro ao enviar backup para o Google Drive.",
        };
      }
    }

    // Comportamento padrão sem login no Google Drive: baixar na pasta Downloads
    triggerLocalDownload(jsonContent, fileName);
    markBackupDone('local');
    return {
      success: true,
      destination: 'local',
    };
  } catch (error: any) {
    console.error("Erro ao exportar banco de dados:", error);
    return {
      success: false,
      error: error?.message || "Erro ao exportar banco de dados.",
    };
  }
}

/**
 * Compatibilidade direta: retorna boolean indicando sucesso do backup.
 */
export async function executeBackup(
  wallets: Wallet[],
  activeWalletId: string,
  mode: 'auto' | 'drive' | 'local' = 'auto'
): Promise<boolean> {
  const res = await executeBackupWithDetails(wallets, activeWalletId, { mode, interactive: true });
  return res.success;
}

/**
 * Hook React para observar o status do backup e da configuração do Google Drive em tempo real.
 */
export function useBackupStatus() {
  const [hasPending, setHasPending] = useState<boolean>(() => hasUnsavedBackupChanges());
  const [lastBackup, setLastBackup] = useState<Date | null>(() => getLastBackupTime());
  const [lastDestination, setLastDestination] = useState<BackupDestination | null>(() => getLastBackupDestination());
  const [driveConfig, setDriveConfig] = useState<GoogleDriveConfig>(() => getGoogleDriveConfig());
  const [driveSessionActive, setDriveSessionActive] = useState<boolean>(() => hasActiveDriveSession());

  const refresh = useCallback(() => {
    setHasPending(hasUnsavedBackupChanges());
    setLastBackup(getLastBackupTime());
    setLastDestination(getLastBackupDestination());
    setDriveConfig(getGoogleDriveConfig());
    setDriveSessionActive(hasActiveDriveSession());
  }, []);

  useEffect(() => {
    const handler = () => {
      refresh();
    };

    window.addEventListener('backupStatusChanged', handler);
    window.addEventListener('googleDriveConfigChanged', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('backupStatusChanged', handler);
      window.removeEventListener('googleDriveConfigChanged', handler);
      window.removeEventListener('storage', handler);
    };
  }, [refresh]);

  return {
    hasPendingBackup: hasPending,
    lastBackupTime: lastBackup,
    lastBackupDestination: lastDestination,
    driveConfig,
    driveSessionActive,
    refreshBackupStatus: refresh
  };
}
