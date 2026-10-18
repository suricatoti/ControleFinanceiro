import { APP_VERSION } from "@/version";

const VERSION_STORAGE_KEY = "controle_financeiro_app_version";
const BUILD_TIME_STORAGE_KEY = "controle_financeiro_build_time";

export interface VersionStatus {
  version: string;
  isNewVersion: boolean;
  previousVersion: string | null;
}

/**
 * Consulta o arquivo version.json diretamente no servidor remoto/GitHub Pages (sem cache).
 * Se o servidor tiver uma versão ou compilação mais nova que a local:
 * - Limpa os caches estáticos da tela automaticamente.
 * - Atualiza os registros locais.
 * - Recarrega a página de forma transparente para aplicar as melhorias.
 */
export async function checkRemoteVersionAndAutoUpdate(): Promise<void> {
  if (typeof window === "undefined" || !navigator.onLine) return;

  try {
    const response = await fetch(`./version.json?t=${Date.now()}`, {
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
      },
    });

    if (!response.ok) return;

    const remote: { version: string; buildTime: number } = await response.json();
    if (!remote || !remote.version) return;

    const storedVersion = localStorage.getItem(VERSION_STORAGE_KEY);
    const storedBuildTime = localStorage.getItem(BUILD_TIME_STORAGE_KEY);

    const hasNewVersion = Boolean(
      (storedVersion && storedVersion !== remote.version) ||
      (storedBuildTime && Number(storedBuildTime) !== remote.buildTime)
    );

    if (hasNewVersion) {
      console.info(
        `[VersionManager] Nova versão detectada no servidor: v${remote.version} (${remote.buildTime}). Atualizando automaticamente...`
      );

      // Limpa os caches estáticos obsoletos (não afeta o banco de dados)
      await clearAppCaches();

      localStorage.setItem(VERSION_STORAGE_KEY, remote.version);
      localStorage.setItem(BUILD_TIME_STORAGE_KEY, String(remote.buildTime));
      sessionStorage.setItem("just_updated_version", `v${remote.version}`);

      // Atualiza service worker se existente
      if ("serviceWorker" in navigator) {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (const reg of registrations) {
            await reg.update();
          }
        } catch (e) {
          console.warn("[VersionManager] Falha ao atualizar service workers:", e);
        }
      }

      // Recarrega automaticamente a página para carregar a versão nova
      window.location.reload();
      return;
    }

    // Primeiro acesso: armazena a versão e o buildTime
    if (!storedVersion || !storedBuildTime) {
      localStorage.setItem(VERSION_STORAGE_KEY, remote.version);
      localStorage.setItem(BUILD_TIME_STORAGE_KEY, String(remote.buildTime));
    }
  } catch (_err) {
    // Se estiver offline ou a rede falhar, continua normalmente sem interromper o usuário
    console.debug("[VersionManager] Checagem remota indisponível no momento.");
  }
}

/**
 * Verifica se a versão atual do código difere da versão salva anteriormente no navegador.
 */
export async function checkAndCleanVersionCache(): Promise<VersionStatus> {
  if (typeof window === "undefined") {
    return { version: APP_VERSION, isNewVersion: false, previousVersion: null };
  }

  const storedVersion = localStorage.getItem(VERSION_STORAGE_KEY);
  const isNewVersion = storedVersion !== null && storedVersion !== APP_VERSION;

  if (isNewVersion) {
    console.info(`[VersionManager] Nova versão detectada: v${APP_VERSION} (anterior: v${storedVersion}). Limpando caches...`);
    await clearAppCaches();
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

  const cleanUrl = window.location.origin + window.location.pathname + (window.location.hash || "#/");
  window.location.replace(cleanUrl);
  window.location.reload();
}
