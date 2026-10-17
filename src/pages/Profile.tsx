import { useState, useRef, useEffect } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { AppDatabase } from "@/db/db";
import { importInto } from "dexie-export-import";
import { executeBackup, markBackupDone, useBackupStatus } from "@/lib/backupManager";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Upload, Smartphone, Share2, PlusSquare, CheckCircle, HelpCircle, AlertCircle, Clock } from "lucide-react";

export default function Profile() {
  const { db, wallets, activeWalletId } = useWallet();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if running as standalone PWA
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Listen for Android / Chrome install prompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  const { hasPendingBackup, lastBackupTime } = useBackupStatus();

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const success = await executeBackup(wallets, activeWalletId);
      if (!success) {
        alert("Erro ao exportar banco de dados.");
      }
    } catch (error) {
      console.error("Erro ao exportar:", error);
      alert("Erro ao exportar banco de dados.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm("Atenção: A importação irá sobrescrever todos os dados atuais. Deseja continuar?")) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    try {
      setIsImporting(true);
      
      const text = await file.text();
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch (e) {
        // Se falhar no parse, pode ser um JSON inválido, mas o importInto (abaixo) tenta lidar se for do tipo legado
      }

      if (parsed && parsed.type === "financas_master_backup") {
        // Restauração Global
        localStorage.setItem('wallets', JSON.stringify(parsed.wallets));
        localStorage.setItem('activeWalletId', parsed.activeWalletId);

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
        markBackupDone();
        alert("Backup global restaurado com sucesso!");
      } else {
        // Restauração Legada (Apenas para a carteira ativa)
        await db.delete();
        await db.open();
        await importInto(db, file, { clearTablesBeforeImport: true });
        markBackupDone();
        alert("Backup legado restaurado na carteira ativa com sucesso!");
      }

      window.location.reload(); 
    } catch (error) {
      console.error("Erro ao importar:", error);
      alert("Erro ao importar banco de dados.");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Perfil & Configurações</h1>
      
      {/* PWA Installation Card */}
      <Card>
        <CardHeader className="py-4 sm:py-6">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-primary" />
            <CardTitle className="text-base sm:text-lg">Instalar no Celular / Computador</CardTitle>
          </div>
          <CardDescription>
            Instale o Controle Financeiro como um aplicativo nativo no seu dispositivo para acesso rápido e offline.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isStandalone ? (
            <div className="bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-900 rounded-lg p-3.5 flex items-center gap-2.5 text-green-800 dark:text-green-300 text-sm">
              <CheckCircle className="w-5 h-5 shrink-0 text-green-600 dark:text-green-400" />
              <span>O aplicativo já está instalado e rodando em modo nativo no seu dispositivo!</span>
            </div>
          ) : (
            <div className="space-y-3">
              {installPrompt && (
                <Button onClick={handleInstallClick} className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white">
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
                    Abra este link no navegador <strong className="text-foreground">Safari</strong> (não em navegadores internos do WhatsApp/Instagram).
                  </li>
                  <li className="flex items-center gap-1.5 flex-wrap">
                    Toque no botão <strong className="text-foreground">Compartilhar</strong> <Share2 className="w-3.5 h-3.5 inline text-blue-500" /> (ícone de quadrado com a seta para cima na barra inferior).
                  </li>
                  <li className="flex items-center gap-1.5 flex-wrap">
                    Role para baixo e selecione <strong className="text-foreground">"Adicionar à Tela de Início"</strong> <PlusSquare className="w-3.5 h-3.5 inline text-primary" />.
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
                    Abra o menu do navegador (três pontos no canto superior direito) e selecione <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Backup Card */}
      <Card>
        <CardHeader className="py-4 sm:py-6">
          <CardTitle className="text-base sm:text-lg">Backup e Restauração</CardTitle>
          <CardDescription>
            Como os seus dados ficam salvos com segurança localmente neste navegador, é importante exportar backups regulares.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status do Backup */}
          {hasPendingBackup ? (
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg p-3.5 flex items-start gap-3 text-amber-900 dark:text-amber-200 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div>
                <div className="font-semibold text-amber-950 dark:text-amber-100">
                  Backup Pendente
                </div>
                <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                  Foram identificadas novas inserções ou alterações nos seus dados financeiros que ainda não estão salvas em backup. Faça o backup para garantir a segurança dos seus dados.
                </p>
                {lastBackupTime && (
                  <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Último backup: {lastBackupTime.toLocaleDateString('pt-BR')} às {lastBackupTime.toLocaleTimeString('pt-BR')}
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
                    <Clock className="w-3 h-3" /> Último backup: {lastBackupTime.toLocaleDateString('pt-BR')} às {lastBackupTime.toLocaleTimeString('pt-BR')}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <Button onClick={handleExport} disabled={isExporting} className="flex-1 flex items-center justify-center gap-2">
              <Download size={18} />
              {isExporting ? "Exportando..." : "Exportar Dados (Backup)"}
            </Button>
            
            <div className="flex-1">
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
                {isImporting ? "Importando..." : "Importar Dados (Restaurar)"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

