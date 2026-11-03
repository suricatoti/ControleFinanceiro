// Integração segura com Google Drive API v3 + Google Identity Services (GIS)
// SEGURANÇA: O access_token NUNCA é salvo em localStorage, sessionStorage ou IndexedDB.
// Ele permanece exclusivamente em variáveis privadas na memória RAM da sessão atual.

export interface GoogleDriveConfig {
  enabled: boolean;
  userEmail?: string;
  userName?: string;
  folderId?: string;
  folderName?: string;
  autoBackup: boolean;
}

export interface DriveFolder {
  id: string;
  name: string;
  createdTime?: string;
}

export interface DriveBackupFile {
  id: string;
  name: string;
  modifiedTime: string;
  size?: string;
}

const DRIVE_CONFIG_KEY = "googleDriveBackupConfig";
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file email profile";

// Token mantido exclusivamente em memória RAM
let inMemoryAccessToken: string | null = null;
let inMemoryTokenExpiry = 0;
let gsiScriptPromise: Promise<void> | null = null;

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            hint?: string;
            prompt?: string;
            callback: (response: {
              access_token?: string;
              expires_in?: number;
              error?: string;
              error_description?: string;
            }) => void;
            error_callback?: (error: { type: string; message?: string }) => void;
          }) => {
            requestAccessToken: (overrideConfig?: { prompt?: string; hint?: string }) => void;
          };
          revoke: (token: string, done?: () => void) => void;
        };
      };
    };
  }
}

function notifyDriveStatusChanged() {
  window.dispatchEvent(new CustomEvent("googleDriveConfigChanged"));
}

const DEFAULT_GOOGLE_CLIENT_ID =
  "195749221225-ih1abqn9t21f5nc33pstt9bfmn3s579a.apps.googleusercontent.com";

/**
 * Obtém o Client ID configurado via variável de ambiente (.env) ou padrão do app.
 */
export function getGoogleClientId(): string {
  const envClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (envClientId && typeof envClientId === "string" && envClientId.trim() !== "") {
    return envClientId.trim();
  }
  return DEFAULT_GOOGLE_CLIENT_ID;
}

/**
 * Lê as preferências não-sensíveis do Google Drive (sem tokens).
 */
export function getGoogleDriveConfig(): GoogleDriveConfig {
  try {
    const raw = localStorage.getItem(DRIVE_CONFIG_KEY);
    if (!raw) {
      return { enabled: false, autoBackup: true };
    }
    const parsed = JSON.parse(raw);
    return {
      enabled: Boolean(parsed.enabled),
      userEmail: parsed.userEmail,
      userName: parsed.userName,
      folderId: parsed.folderId,
      folderName: parsed.folderName,
      autoBackup: parsed.autoBackup !== undefined ? Boolean(parsed.autoBackup) : true,
    };
  } catch {
    return { enabled: false, autoBackup: true };
  }
}

/**
 * Salva apenas metadados não-sensíveis (ID/nome da pasta e preferências) no localStorage.
 */
export function saveGoogleDriveConfig(partial: Partial<GoogleDriveConfig>): GoogleDriveConfig {
  const current = getGoogleDriveConfig();
  const updated: GoogleDriveConfig = { ...current, ...partial };
  try {
    localStorage.setItem(DRIVE_CONFIG_KEY, JSON.stringify(updated));
    notifyDriveStatusChanged();
  } catch (err) {
    console.error("Erro ao salvar configuração do Google Drive:", err);
  }
  return updated;
}

/**
 * Verifica se há um token válido ativo em memória RAM neste momento.
 */
export function hasActiveDriveSession(): boolean {
  return Boolean(inMemoryAccessToken && Date.now() < inMemoryTokenExpiry - 30_000);
}

/**
 * Carrega o script oficial do Google Identity Services sob demanda.
 */
function loadGsiScript(): Promise<void> {
  if (window.google?.accounts?.oauth2) {
    return Promise.resolve();
  }
  if (gsiScriptPromise) {
    return gsiScriptPromise;
  }

  gsiScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Falha ao carregar Google Identity Services.")));
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      gsiScriptPromise = null;
      reject(new Error("Não foi possível carregar o serviço de login do Google. Verifique sua conexão."));
    };
    document.head.appendChild(script);
  });

  return gsiScriptPromise;
}

/**
 * Solicita um Access Token em memória ao Google Identity Services.
 */
export async function authenticateGoogleDrive(options?: {
  prompt?: "" | "consent" | "select_account";
}): Promise<{ accessToken: string; email?: string; name?: string }> {
  const clientId = getGoogleClientId();
  if (!clientId) {
    throw new Error("O login com Google Drive ainda não foi habilitado neste ambiente (VITE_GOOGLE_CLIENT_ID ausente).");
  }

  await loadGsiScript();

  const currentConfig = getGoogleDriveConfig();

  const tokenData = await new Promise<{ accessToken: string; expiresIn: number }>((resolve, reject) => {
    const oauth2 = window.google?.accounts?.oauth2;
    if (!oauth2) {
      reject(new Error("Biblioteca OAuth2 do Google indisponível."));
      return;
    }

    const client = oauth2.initTokenClient({
      client_id: clientId,
      scope: DRIVE_SCOPE,
      hint: currentConfig.userEmail,
      prompt: options?.prompt ?? "",
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(new Error(response.error_description || response.error || "Autorização negada pelo usuário."));
          return;
        }
        resolve({
          accessToken: response.access_token,
          expiresIn: response.expires_in || 3599,
        });
      },
      error_callback: (err) => {
        if (err.type === "popup_closed") {
          reject(new Error("Janela de login do Google foi fechada antes de concluir."));
        } else if (err.type === "popup_failed_to_open") {
          reject(new Error("O navegador bloqueou a janela de login do Google. Permita pop-ups para este site."));
        } else {
          reject(new Error(err.message || "Erro ao abrir autenticação do Google."));
        }
      },
    });

    client.requestAccessToken({
      prompt: options?.prompt ?? "",
      hint: currentConfig.userEmail,
    });
  });

  // Guarda exclusivamente em memória RAM
  inMemoryAccessToken = tokenData.accessToken;
  inMemoryTokenExpiry = Date.now() + tokenData.expiresIn * 1000;

  // Busca informações básicas do perfil (email/nome) para exibição amigável
  let userEmail = currentConfig.userEmail;
  let userName = currentConfig.userName;
  try {
    const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${inMemoryAccessToken}` },
    });
    if (res.ok) {
      const info = await res.json();
      userEmail = info.email || userEmail;
      userName = info.name || userName;
    }
  } catch {
    // Ignora falha não-crítica de perfil
  }

  saveGoogleDriveConfig({
    enabled: true,
    userEmail,
    userName,
  });

  notifyDriveStatusChanged();
  return { accessToken: inMemoryAccessToken, email: userEmail, name: userName };
}

/**
 * Garante um token válido em memória. Se expirado e interactive=true, solicita renovação.
 */
export async function ensureDriveAccessToken(interactive = true): Promise<string | null> {
  if (hasActiveDriveSession() && inMemoryAccessToken) {
    return inMemoryAccessToken;
  }
  if (!interactive) {
    return null;
  }
  const result = await authenticateGoogleDrive({ prompt: "" });
  return result.accessToken;
}

/**
 * Desconecta a conta do Google Drive, revoga o token em memória e limpa configurações.
 */
export function disconnectGoogleDrive() {
  const tokenToRevoke = inMemoryAccessToken;
  inMemoryAccessToken = null;
  inMemoryTokenExpiry = 0;

  if (tokenToRevoke && window.google?.accounts?.oauth2?.revoke) {
    try {
      window.google.accounts.oauth2.revoke(tokenToRevoke, () => {});
    } catch {
      // Ignora erro de revogação
    }
  }

  try {
    localStorage.removeItem(DRIVE_CONFIG_KEY);
  } catch {
    // Ignora
  }
  notifyDriveStatusChanged();
}

/**
 * Lista as pastas do Google Drive criadas pelo aplicativo (escopo drive.file).
 */
export async function listDriveAppFolders(): Promise<DriveFolder[]> {
  const token = await ensureDriveAccessToken(true);
  if (!token) throw new Error("Sessão do Google Drive não autenticada.");

  const q = encodeURIComponent(
    "mimeType = 'application/vnd.google-apps.folder' and trashed = false"
  );
  const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,createdTime)&orderBy=createdTime desc&pageSize=50`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    let errorDetails = "";
    try {
      const errJson = await response.json();
      errorDetails = errJson?.error?.message || "";
    } catch {
      // Ignora erro de parse
    }

    if (response.status === 401) {
      inMemoryAccessToken = null;
      inMemoryTokenExpiry = 0;
      notifyDriveStatusChanged();
    }
    throw new Error(errorDetails ? `Erro no Drive: ${errorDetails}` : "Erro ao listar pastas do Google Drive.");
  }

  const data = await response.json();
  return (data.files || []) as DriveFolder[];
}

/**
 * Cria uma nova pasta no Google Drive do usuário e retorna seus metadados.
 */
export async function createDriveFolder(folderName: string): Promise<DriveFolder> {
  const token = await ensureDriveAccessToken(true);
  if (!token) throw new Error("Sessão do Google Drive não autenticada.");

  const cleanName = folderName.trim() || "Controle Financeiro - Backups";

  const response = await fetch("https://www.googleapis.com/drive/v3/files?fields=id,name,createdTime", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: cleanName,
      mimeType: "application/vnd.google-apps.folder",
    }),
  });

  if (!response.ok) {
    let errorDetails = "";
    try {
      const errJson = await response.json();
      errorDetails = errJson?.error?.message || "";
    } catch {
      // Ignora erro de parse
    }
    throw new Error(errorDetails ? `Erro ao criar pasta: ${errorDetails}` : "Não foi possível criar a pasta no Google Drive.");
  }

  const folder = (await response.json()) as DriveFolder;
  return folder;
}

/**
 * Verifica se a pasta configurada ainda existe e não está na lixeira.
 */
async function verifyFolderExists(folderId: string, token: string): Promise<boolean> {
  try {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(folderId)}?fields=id,trashed`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) return false;
    const data = await res.json();
    return Boolean(data.id && !data.trashed);
  } catch {
    return false;
  }
}

/**
 * Envia (cria ou atualiza) o arquivo JSON de backup dentro da pasta escolhida no Google Drive.
 */
export async function uploadBackupToGoogleDrive(
  jsonContent: string,
  fileName: string,
  options?: { interactive?: boolean }
): Promise<{ fileId: string; folderId: string; folderName: string }> {
  const interactive = options?.interactive ?? true;
  const token = await ensureDriveAccessToken(interactive);
  if (!token) {
    throw new Error("Sessão do Google Drive expirada ou não autenticada.");
  }

  const config = getGoogleDriveConfig();
  let folderId = config.folderId;
  let folderName = config.folderName || "Controle Financeiro - Backups";

  // Verifica se a pasta existe; caso não tenha sido escolhida ou tenha sido excluída no Drive, cria/restaura
  if (!folderId || !(await verifyFolderExists(folderId, token))) {
    const created = await createDriveFolder(folderName);
    folderId = created.id;
    folderName = created.name;
    saveGoogleDriveConfig({ folderId, folderName });
  }

  // Procura se já existe um arquivo com o mesmo nome na pasta para atualizá-lo (evita duplicatas no mesmo dia)
  const escapedName = fileName.replace(/'/g, "\\'");
  const searchQuery = encodeURIComponent(
    `name = '${escapedName}' and '${folderId}' in parents and trashed = false`
  );
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${searchQuery}&fields=files(id,name)&pageSize=1`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  let existingFileId: string | null = null;
  if (searchRes.ok) {
    const searchData = await searchRes.json();
    if (searchData.files && searchData.files.length > 0) {
      existingFileId = searchData.files[0].id;
    }
  }

  const boundary = "-------controle_financeiro_backup_boundary_" + Date.now();
  const metadata = existingFileId
    ? { name: fileName, mimeType: "application/json" }
    : { name: fileName, mimeType: "application/json", parents: [folderId] };

  const multipartBody =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${jsonContent}\r\n` +
    `--${boundary}--`;

  const uploadUrl = existingFileId
    ? `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(existingFileId)}?uploadType=multipart&fields=id,name`
    : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name`;

  const uploadRes = await fetch(uploadUrl, {
    method: existingFileId ? "PATCH" : "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body: multipartBody,
  });

  if (!uploadRes.ok) {
    if (uploadRes.status === 401) {
      inMemoryAccessToken = null;
      inMemoryTokenExpiry = 0;
      notifyDriveStatusChanged();
    }
    throw new Error("Falha ao enviar o arquivo de backup para o Google Drive.");
  }

  const uploaded = await uploadRes.json();
  return {
    fileId: uploaded.id,
    folderId,
    folderName,
  };
}

/**
 * Lista os arquivos de backup (.json) salvos na pasta configurada do Google Drive.
 */
export async function listDriveBackups(folderId: string): Promise<DriveBackupFile[]> {
  const token = await ensureDriveAccessToken(true);
  if (!token) throw new Error("Sessão do Google Drive não autenticada.");

  const q = encodeURIComponent(
    `'${folderId}' in parents and mimeType = 'application/json' and trashed = false`
  );
  const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,modifiedTime,size)&orderBy=modifiedTime desc&pageSize=20`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error("Não foi possível listar os backups na pasta do Google Drive.");
  }

  const data = await res.json();
  return (data.files || []) as DriveBackupFile[];
}

/**
 * Baixa o conteúdo JSON de um arquivo de backup armazenado no Google Drive.
 */
export async function downloadDriveBackupContent(fileId: string): Promise<string> {
  const token = await ensureDriveAccessToken(true);
  if (!token) throw new Error("Sessão do Google Drive não autenticada.");

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!res.ok) {
    throw new Error("Erro ao baixar arquivo de backup do Google Drive.");
  }

  return await res.text();
}

