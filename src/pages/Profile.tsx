import { useState, useRef, useEffect } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { AppDatabase } from "@/db/db";
import { importInto } from "dexie-export-import";
import {
  executeBackupWithDetails,
  markBackupDone,
  useBackupStatus,
} from "@/lib/backupManager";
import {
  authenticateGoogleDrive,
  disconnectGoogleDrive,
  saveGoogleDriveConfig,
  listDriveBackups,
  downloadDriveBackupContent,
  type DriveBackupFile,
  type DriveFolder,
} from "@/lib/googleDrive";
import { GoogleDriveFolderModal } from "@/components/GoogleDriveFolderModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Download,
  Upload,
  Smartphone,
  Share2,
  PlusSquare,
  CheckCircle,
  HelpCircle,
  AlertCircle,
  Clock,
  Cloud,
  CloudUpload,
  CloudDownload,
  FolderOpen,
  LogOut,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";

export default function Profile() {
  const { db, wallets, activeWalletId } = useWallet();
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingLocal, setIsExportingLocal] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Google Drive states
  const {
    hasPendingBackup,
    lastBackupTime,
    lastBackupDestination,
    driveConfig,
    refreshBackupStatus,
  } = useBackupStatus();

  const [isConnectingDrive, setIsConnectingDrive] = useState(false);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);

  // Restaurar direto do Google Drive
  const [isRestoreDriveModalOpen, setIsRestoreDriveModalOpen] = useState(false);
  const [driveBackupFiles, setDriveBackupFiles] = useState<DriveBackupFile[]>([]);
  const [isLoadingDriveFiles, setIsLoadingDriveFiles] = useState(false);

  // PWA states
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") {
      setInstallPrompt(null);
    }
  };

  const handleConnectGoogleDrive = async () => {
    setStatusFeedback(null);
    try {
      setIsConnectingDrive(true);
      await authenticateGoogleDrive({ prompt: "select_account" });
      refreshBackupStatus();
      // Abre o seletor/criador de pastas logo após o login
      setIsFolderModalOpen(true);
    } catch (error: any) {
      console.error("Erro ao conectar Google Drive:", error);
      setStatusFeedback({
        type: "error",
        message: error?.message || "Não foi possível conectar ao Google Drive.",
      });
    } finally {
      setIsConnectingDrive(false);
    }
  };

  const handleDisconnectDrive = () => {
    if (
      !window.confirm(
        "Deseja desconectar sua conta do Google Drive? Os próximos backups voltarão a ser salvos na pasta Downloads do seu dispositivo."
      )
    ) {
      return;
    }
    disconnectGoogleDrive();
    refreshBackupStatus();
    setStatusFeedback({
      type: "success",
      message: "Conta desconectada. Seus backups agora serão baixados na pasta Downloads.",
    });
  };

  const handleFolderSelected = async (folder: DriveFolder) => {
    refreshBackupStatus();
    setStatusFeedback({
      type: "success",
      message: `Pasta "${folder.name}" configurada! Salvando backup no Google Drive...`,
    });

    setIsExporting(true);
    try {
      const result = await executeBackupWithDetails(wallets, activeWalletId, {
        mode: "drive",
        interactive: false,
      });
      if (result.success) {
        setStatusFeedback({
          type: "success",
          message: `Backup salvo automaticamente na pasta "${folder.name}" do seu Google Drive!`,
        });
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPrimary = async () => {
    setStatusFeedback(null);
    try {
      setIsExporting(true);
      const result = await executeBackupWithDetails(wallets, activeWalletId, {
        mode: "auto",
        interactive: true,
      });
      if (result.success) {
        if (result.destination === "drive") {
          setStatusFeedback({
            type: "success",
            message: `Backup salvo com sucesso na pasta "${result.folderName}" no Google Drive!`,
          });
        } else {
          setStatusFeedback({
            type: "success",
            message: "Arquivo de backup salvo na pasta Downloads do seu dispositivo.",
          });
        }
      } else {
        setStatusFeedback({
          type: "error",
          message: result.error || "Erro ao exportar banco de dados.",
        });
      }
    } catch (error: any) {
      console.error("Erro ao exportar:", error);
      setStatusFeedback({
        type: "error",
        message: error?.message || "Erro ao exportar banco de dados.",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportLocalDownload = async () => {
    setStatusFeedback(null);
    try {
      setIsExportingLocal(true);
      const result = await executeBackupWithDetails(wallets, activeWalletId, {
        mode: "local",
        interactive: false,
      });
      if (result.success) {
        setStatusFeedback({
          type: "success",
          message: "Arquivo de backup baixado na pasta Downloads do seu dispositivo.",
        });
      } else {
        setStatusFeedback({
          type: "error",
          message: result.error || "Erro ao baixar arquivo local.",
        });
      }
    } finally {
      setIsExportingLocal(false);
    }
  };

  const restoreFromJsonText = async (text: string, fallbackBlob?: Blob) => {
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      // Caso seja formato legado
    }

    if (parsed && parsed.type === "financas_master_backup") {
      localStorage.setItem("wallets", JSON.stringify(parsed.wallets));
      localStorage.setItem("activeWalletId", parsed.activeWalletId);

      for (const wallet of parsed.wallets) {
        const dbData = parsed.databases[wallet.dbName];
        if (dbData) {
          const tempDb = new AppDatabase(wallet.dbName);
          await tempDb.delete();
          await tempDb.open();
          const dbBlob = new Blob([JSON.stringify(dbData)], { type: "application/json" });
          await importInto(tempDb, dbBlob, { clearTablesBeforeImport: true });
          tempDb.close();
        }
      }
      markBackupDone(driveConfig.enabled ? "drive" : "local");
      alert("Backup restaurado com sucesso!");
    } else if (fallbackBlob) {
      await db.delete();
      await db.open();
      await importInto(db, fallbackBlob, { clearTablesBeforeImport: true });
      markBackupDone("local");
      alert("Backup restaurado na carteira ativa com sucesso!");
    } else {
      throw new Error("Formato de arquivo de backup inválido.");
    }

    window.location.reload();
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (
      !window.confirm(
        "Atenção: A importação irá sobrescrever todos os dados atuais. Deseja continuar?"
      )
    ) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    try {
      setIsImporting(true);
      const text = await file.text();
      await restoreFromJsonText(text, file);
    } catch (error) {
      console.error("Erro ao importar:", error);
      alert("Erro ao importar banco de dados.");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleOpenRestoreFromDrive = async () => {
    if (!driveConfig.folderId) {
      setIsFolderModalOpen(true);
      return;
    }
    setIsRestoreDriveModalOpen(true);
    setIsLoadingDriveFiles(true);
    try {
      const files = await listDriveBackups(driveConfig.folderId);
      setDriveBackupFiles(files);
    } catch (err: any) {
      setStatusFeedback({
        type: "error",
        message: err?.message || "Erro ao listar backups do Google Drive.",
      });
      setIsRestoreDriveModalOpen(false);
    } finally {
      setIsLoadingDriveFiles(false);
    }
  };

  const handleRestoreDriveFile = async (file: DriveBackupFile) => {
    if (
      !window.confirm(
        `Atenção: Deseja restaurar o backup "${file.name}" do Google Drive? Isso irá substituir os dados atuais.`
      )
    ) {
      return;
    }

    try {
      setIsImporting(true);
      const text = await downloadDriveBackupContent(file.id);
      const blob = new Blob([text], { type: "application/json" });
      await restoreFromJsonText(text, blob);
    } catch (err: any) {
      alert(err?.message || "Erro ao restaurar backup do Google Drive.");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Perfil & Configurações</h1>

      {/* Backup & Google Drive Card */}
      <Card>
        <CardHeader className="py-4 sm:py-6">
          <div className="flex items-center gap-2">
            <Cloud className="w-5 h-5 text-primary" />
            <CardTitle className="text-base sm:text-lg">
              Backup & Sincronização
            </CardTitle>
          </div>
          <CardDescription>
            Faça login com sua conta Google para salvar seus backups automaticamente em uma pasta no seu Google Drive. Se preferir não conectar, seus backups continuam sendo salvos na pasta <strong>Downloads</strong>.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Status do Backup Atual */}
          {hasPendingBackup ? (
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg p-3.5 flex items-start gap-3 text-amber-900 dark:text-amber-200 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div>
                <div className="font-semibold text-amber-950 dark:text-amber-100">
                  Backup Pendente
                </div>
                <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                  Foram identificadas novas inserções ou alterações que ainda não foram salvas em backup.
                </p>
                {lastBackupTime && (
                  <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Último backup:{" "}
                    {lastBackupTime.toLocaleDateString("pt-BR")} às{" "}
                    {lastBackupTime.toLocaleTimeString("pt-BR")}{" "}
                    {lastBackupDestination === "drive" ? "(Google Drive)" : "(Pasta Downloads)"}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3.5 flex items-start gap-3 text-emerald-900 dark:text-emerald-200 text-sm">
              <CheckCircle className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
              <div>
                <div className="font-semibold text-emerald-950 dark:text-emerald-100">
                  Backup em dia
                </div>
                <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-0.5">
                  Não há novas alterações pendentes desde o último backup.
                </p>
                {lastBackupTime && (
                  <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Último backup:{" "}
                    {lastBackupTime.toLocaleDateString("pt-BR")} às{" "}
                    {lastBackupTime.toLocaleTimeString("pt-BR")}{" "}
                    {lastBackupDestination === "drive" ? "(Google Drive)" : "(Pasta Downloads)"}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Feedback de operação */}
          {statusFeedback && (
            <div
              className={`rounded-lg p-3 text-xs sm:text-sm border flex items-center justify-between gap-2 ${
                statusFeedback.type === "success"
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-200"
                  : "bg-red-500/10 border-red-500/30 text-red-800 dark:text-red-200"
              }`}
            >
              <span>{statusFeedback.message}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStatusFeedback(null)}
                className="h-6 px-2 text-xs shrink-0"
              >
                OK
              </Button>
            </div>
          )}

          {/* Painel de Conexão com Google Drive */}
          <div className="rounded-xl border bg-muted/30 p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-semibold text-sm">
                  <span>Google Drive</span>
                  {driveConfig.enabled ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                      Conectado
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted text-muted-foreground border">
                      Desconectado
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {driveConfig.enabled
                    ? `Conta: ${driveConfig.userEmail || driveConfig.userName || "Conectada"}`
                    : "Sem login ativo: os backups são salvos na pasta Downloads do dispositivo."}
                </p>
              </div>

              {driveConfig.enabled ? (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsFolderModalOpen(true)}
                    className="text-xs gap-1.5"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>Trocar Pasta</span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleDisconnectDrive}
                    className="text-xs text-red-600 dark:text-red-400 hover:bg-red-500/10 gap-1"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sair do Drive</span>
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  onClick={handleConnectGoogleDrive}
                  disabled={isConnectingDrive}
                  className="gap-2 text-xs sm:text-sm shrink-0"
                >
                  <CloudUpload className="w-4 h-4" />
                  <span>
                    {isConnectingDrive ? "Conectando..." : "Entrar com Google"}
                  </span>
                </Button>
              )}
            </div>

            {driveConfig.enabled && (
              <div className="pt-3 border-t border-border/60 space-y-3 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-background/80 p-3 rounded-lg border">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FolderOpen className="w-4 h-4 text-primary shrink-0" />
                    <div className="truncate">
                      <span className="text-muted-foreground">Pasta de backup no Drive: </span>
                      <strong className="text-foreground">
                        {driveConfig.folderName || "Controle Financeiro - Backups"}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Opção de sincronização automática */}
                <label className="flex items-center justify-between gap-3 cursor-pointer select-none p-2 rounded-lg hover:bg-muted/50">
                  <div>
                    <div className="font-medium text-foreground">
                      Salvar Automaticamente no Google Drive
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Atualiza seu backup automaticamente na pasta escolhida sempre que você adicionar ou editar lançamentos.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={driveConfig.autoBackup}
                    onChange={(e) =>
                      saveGoogleDriveConfig({ autoBackup: e.target.checked })
                    }
                    className="h-4 w-4 accent-primary rounded cursor-pointer"
                  />
                </label>
              </div>
            )}

            <div className="flex items-start gap-2 text-[11px] text-muted-foreground pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>Privacidade Protegida:</strong> O aplicativo só tem acesso à pasta de backup criada por você, sem visualizar nenhum outro arquivo pessoal do seu Google Drive.
              </span>
            </div>
          </div>

          {/* Botões de Ação de Backup e Restauração */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button
              onClick={handleExportPrimary}
              disabled={isExporting || isExportingLocal}
              className="w-full flex items-center justify-center gap-2"
            >
              {driveConfig.enabled ? (
                <>
                  <CloudUpload size={18} />
                  <span>
                    {isExporting ? "Salvando no Drive..." : "Salvar no Google Drive Agora"}
                  </span>
                </>
              ) : (
                <>
                  <Download size={18} />
                  <span>
                    {isExporting ? "Exportando..." : "Baixar Backup (Pasta Downloads)"}
                  </span>
                </>
              )}
            </Button>

            {driveConfig.enabled && (
              <Button
                variant="secondary"
                onClick={handleExportLocalDownload}
                disabled={isExporting || isExportingLocal}
                className="w-full flex items-center justify-center gap-2"
              >
                <Download size={18} />
                <span>
                  {isExportingLocal ? "Baixando..." : "Baixar Cópia em Downloads"}
                </span>
              </Button>
            )}

            {driveConfig.enabled && (
              <Button
                variant="outline"
                onClick={handleOpenRestoreFromDrive}
                disabled={isImporting}
                className="w-full flex items-center justify-center gap-2"
              >
                <CloudDownload size={18} />
                <span>Restaurar do Google Drive</span>
              </Button>
            )}

            <div className="w-full">
              <input
                type="file"
                accept=".json"
                ref={fileInputRef}
                onChange={handleImport}
                className="hidden"
                id="import-file"
              />
              <Button
                variant="outline"
                className="w-full flex items-center justify-center gap-2"
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
              >
                <Upload size={18} />
                <span>
                  {isImporting ? "Importando..." : "Importar Arquivo do Dispositivo"}
                </span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PWA Installation Card */}
      <Card>
        <CardHeader className="py-4 sm:py-6">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-primary" />
            <CardTitle className="text-base sm:text-lg">
              Instalar no Celular / Computador
            </CardTitle>
          </div>
          <CardDescription>
            Instale o Controle Financeiro como um aplicativo nativo no seu dispositivo para acesso rápido e offline.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isStandalone ? (
            <div className="bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-900 rounded-lg p-3.5 flex items-center gap-2.5 text-green-800 dark:text-green-300 text-sm">
              <CheckCircle className="w-5 h-5 shrink-0 text-green-600 dark:text-green-400" />
              <span>
                O aplicativo já está instalado e rodando em modo nativo no seu dispositivo!
              </span>
            </div>
          ) : (
            <div className="space-y-3">
              {installPrompt && (
                <Button
                  onClick={handleInstallClick}
                  className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white"
                >
                  <Smartphone className="w-4 h-4" />
                  Instalar Aplicativo Agora
                </Button>
              )}

              {/* Guia para iPhone / iOS */}
              <div className="bg-muted/40 border rounded-lg p-4 space-y-2.5 text-xs sm:text-sm">
                <div className="font-semibold text-foreground flex items-center gap-1.5 text-sm">
                  <span>🍎</span> Como instalar no iPhone / iPad (iOS):
                </div>
                <p className="text-muted-foreground text-xs">
                  A Apple não permite botões de instalação automática direta. Para instalar no iOS:
                </p>
                <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground font-medium text-xs">
                  <li>
                    Abra este link no navegador{" "}
                    <strong className="text-foreground">Safari</strong> (não em navegadores internos do WhatsApp/Instagram).
                  </li>
                  <li className="flex items-center gap-1.5 flex-wrap">
                    Toque no botão <strong className="text-foreground">Compartilhar</strong>{" "}
                    <Share2 className="w-3.5 h-3.5 inline text-blue-500" /> (ícone de quadrado com a seta para cima na barra inferior).
                  </li>
                  <li className="flex items-center gap-1.5 flex-wrap">
                    Role para baixo e selecione{" "}
                    <strong className="text-foreground">"Adicionar à Tela de Início"</strong>{" "}
                    <PlusSquare className="w-3.5 h-3.5 inline text-primary" />.
                  </li>
                  <li>
                    Toque em <strong className="text-foreground">Adicionar</strong> no canto superior direito.
                  </li>
                </ol>
              </div>

              {/* Guia para Android / Computador */}
              {!isIOS && !installPrompt && (
                <div className="bg-muted/30 border rounded-lg p-3 space-y-1.5 text-xs text-muted-foreground">
                  <div className="font-semibold text-foreground flex items-center gap-1.5 text-xs">
                    <HelpCircle className="w-3.5 h-3.5 text-primary" /> No Android ou Computador (Chrome/Edge):
                  </div>
                  <p>
                    Abra o menu do navegador (três pontos no canto superior direito) e selecione{" "}
                    <strong>"Instalar aplicativo"</strong> ou{" "}
                    <strong>"Adicionar à tela inicial"</strong>.
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal: Escolher ou Criar Pasta no Google Drive */}
      <GoogleDriveFolderModal
        open={isFolderModalOpen}
        onOpenChange={setIsFolderModalOpen}
        currentFolderId={driveConfig.folderId}
        onFolderSelected={handleFolderSelected}
      />

      {/* Modal: Restaurar Backup Direto do Google Drive */}
      <Dialog open={isRestoreDriveModalOpen} onOpenChange={setIsRestoreDriveModalOpen}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <CloudDownload className="w-5 h-5 text-primary" />
              <span>Restaurar do Google Drive</span>
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Arquivos encontrados na pasta{" "}
              <strong>"{driveConfig.folderName || "Controle Financeiro - Backups"}"</strong>:
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {isLoadingDriveFiles ? (
              <div className="p-6 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Buscando backups no Google Drive...</span>
              </div>
            ) : driveBackupFiles.length === 0 ? (
              <div className="p-6 border border-dashed rounded-lg text-center text-xs text-muted-foreground">
                Nenhum arquivo de backup encontrado nesta pasta do Google Drive.
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {driveBackupFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted/60 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-medium truncate">
                        {file.name}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Salvo em:{" "}
                        {new Date(file.modifiedTime).toLocaleDateString("pt-BR")} às{" "}
                        {new Date(file.modifiedTime).toLocaleTimeString("pt-BR")}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleRestoreDriveFile(file)}
                      disabled={isImporting}
                      className="shrink-0 text-xs"
                    >
                      Restaurar
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
