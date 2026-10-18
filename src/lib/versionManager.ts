import { APP_VERSION } from "@/version";

const VERSION_STORAGE_KEY = "controle_financeiro_app_version";

export interface VersionStatus {
  version: string;
  isNewVersion: boolean;
  previousVersion: string | null;
}

/**
 * Verifica se a versão atual difere da versão salva anteriormente no navegador.
 * Se houver uma nova versão, limpa caches estáticos (CacheStorage) de forma segura,
 * preservando intactos o IndexedDB (dados financeiros) e as preferências do usuário.
 */
export async function checkAndCleanVersionCache(): Promise<VersionStatus> {
  if (typeof window === "undefined") {
    return { version: APP_VERSION, isNewVersion: false, previousVersion: null };
  }

  const storedVersion = localStorage.getItem(VERSION_STORAGE_KEY);
  const isNewVersion = storedVersion !== null && storedVersion !== APP_VERSION;

  if (isNewVersion) {
    console.info(`[VersionManager] Nova versão detectada: v${APP_VERSION} (anterior: v${storedVersion}). Limpando caches estáticos...`);
    await clearAppCaches();
    // Armazena flag temporária para notificar o usuário na interface
    sessionStorage.setItem("just_updated_version", `De v${storedVersion} para v${APP_VERSION}`);
  }

  localStorage.setItem(VERSION_STORAGE_KEY, APP_VERSION);

  return {
    version: APP_VERSION,
    isNewVersion,
    previousVersion: storedVersion,
  };
}

/**
 * Limpa todos os caches estáticos (CacheStorage) do navegador.
 * Seguro: não toca no Dexie / IndexedDB.
 */
export async function clearAppCaches(): Promise<void> {
  if ("caches" in window) {
    try {
      const cacheKeys = await window.caches.keys();
      await Promise.all(cacheKeys.map((key) => window.caches.delete(key)));
      console.info(`[VersionManager] Caches estáticos apagados com sucesso.`);
    } catch (err) {
      console.warn(`[VersionManager] Erro ao limpar caches estáticos:`, err);
    }
  }
}

/**
 * Força a limpeza manual completa do cache e recarrega a aplicação diretamente do servidor.
 */
export async function forceCleanCacheAndReload(): Promise<void> {
  await clearAppCaches();

  // Solicita atualização de eventuais Service Workers registrados
  if ("serviceWorker" in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.update();
      }
    } catch (err) {
      console.warn(`[VersionManager] Erro ao atualizar service workers:`, err);
    }
  }

  // Recarrega forçando busca no servidor
  const cleanUrl = window.location.origin + window.location.pathname + (window.location.hash || "#/");
  window.location.replace(cleanUrl);
  window.location.reload();
}
