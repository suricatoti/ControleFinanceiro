import { Link, Outlet, useLocation } from "react-router-dom";
import { LayoutDashboard, Receipt, Tags, User, Repeat, Moon, Sun, Pencil, Trash2, Wallet, Download, LogOut, Save, RotateCcw, CheckCircle2, Sparkles, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { APP_VERSION } from "@/version";
import { forceCleanCacheAndReload } from "@/lib/versionManager";
import { useWallet } from "@/contexts/WalletContext";
import { useBackupStatus, executeBackup, hasUnsavedBackupChanges } from "@/lib/backupManager";
import { ExitBackupModal } from "@/components/ExitBackupModal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function Layout() {
  const location = useLocation();
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    return (localStorage.getItem("theme") as "light" | "dark") || "light";
  });
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  useEffect(() => {
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

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  const { wallets, activeWalletId, switchWallet, addWallet, renameWallet, activeWallet, deleteWallet } = useWallet();
  const [isNewWalletOpen, setIsNewWalletOpen] = useState(false);
  const [newWalletName, setNewWalletName] = useState("");
  const [isRenameWalletOpen, setIsRenameWalletOpen] = useState(false);
  const [renameWalletName, setRenameWalletName] = useState("");
  const [isDeleteWalletOpen, setIsDeleteWalletOpen] = useState(false);

  const handleCreateWallet = (e: React.FormEvent) => {
    e.preventDefault();
    if (newWalletName.trim()) {
      addWallet(newWalletName.trim());
      setIsNewWalletOpen(false);
      setNewWalletName("");
    }
  };

  const handleRenameWallet = (e: React.FormEvent) => {
    e.preventDefault();
    if (renameWalletName.trim()) {
      renameWallet(activeWalletId, renameWalletName.trim());
      setIsRenameWalletOpen(false);
    }
  };

  const handleDeleteWallet = () => {
    if (activeWalletId === 'default') return;
    deleteWallet(activeWalletId);
  };

  const { hasPendingBackup } = useBackupStatus();
  const [isExitBackupOpen, setIsExitBackupOpen] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [exitNotification, setExitNotification] = useState<string | null>(null);

  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [isClearingCache, setIsClearingCache] = useState(false);
  const [updateNotification, setUpdateNotification] = useState<string | null>(() => {
    const notice = sessionStorage.getItem("just_updated_version");
    if (notice) {
      sessionStorage.removeItem("just_updated_version");
      return `Sistema atualizado com sucesso (${notice})! Caches anteriores renovados.`;
    }
    return null;
  });

  const handleForceClearCache = async () => {
    setIsClearingCache(true);
    try {
      await forceCleanCacheAndReload();
    } catch (e) {
      console.error(e);
      setIsClearingCache(false);
    }
  };

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedBackupChanges()) {
        e.preventDefault();
        e.returnValue = '';
        setTimeout(() => {
          setIsExitBackupOpen(true);
        }, 150);
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const handleExitRequest = () => {
    if (hasUnsavedBackupChanges()) {
      setIsExitBackupOpen(true);
    } else {
      if (window.confirm("Deseja sair do aplicativo?")) {
        window.close();
        setExitNotification("Você já pode fechar esta aba ou janela.");
      }
    }
  };

  const handleBackupAndExit = async () => {
    setIsBackingUp(true);
    try {
      const success = await executeBackup(wallets, activeWalletId);
      if (success) {
        setIsExitBackupOpen(false);
        window.close();
        setExitNotification("Backup baixado com sucesso! Você já pode fechar esta aba com segurança.");
      } else {
        alert("Ocorreu um erro ao gerar o arquivo de backup.");
      }
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleExitWithoutBackup = () => {
    setIsExitBackupOpen(false);
    window.close();
    setExitNotification("Sessão finalizada. Você já pode fechar esta aba.");
  };

  const links = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Transações", href: "/transacoes", icon: Receipt },
    { name: "Cadastros", href: "/cadastros", icon: Tags },
    { name: "Recorrências", href: "/recorrencias", icon: Repeat },
    { name: "Perfil", href: "/perfil", icon: User },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans transition-colors duration-300">
      {/* Top Header */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/70 shadow-sm">
        <div className="container mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
          
          {/* Logo & Wallet Selector (Desktop & Mobile) */}
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <Link to="/" className="font-bold text-lg sm:text-xl tracking-tight text-primary flex items-center gap-1.5 shrink-0">
              <span className="text-xl sm:text-2xl drop-shadow-sm">💰</span>
              <span className="hidden xs:inline sm:inline">Finanças</span>
            </Link>

            {/* Version Badge */}
            <button
              onClick={() => setIsVersionModalOpen(true)}
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 active:scale-95 transition-all select-none shrink-0"
              title="Versão do sistema - Clique para detalhes ou limpar cache"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>v{APP_VERSION}</span>
            </button>
            
            {/* Desktop Wallet Selector */}
            <div className="hidden md:flex items-center gap-2 border-l pl-4 lg:pl-6 h-8">
              <Select value={activeWalletId} onValueChange={(val) => {
                if (val === 'create_new') {
                  setIsNewWalletOpen(true);
                } else {
                  switchWallet(val);
                }
              }}>
                <SelectTrigger className="w-[160px] lg:w-[180px] h-8 bg-muted/60 border-none font-medium text-xs sm:text-sm">
                  <SelectValue placeholder="Selecione a carteira" />
                </SelectTrigger>
                <SelectContent>
                  {wallets.map(w => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                  ))}
                  <SelectItem value="create_new" className="text-primary font-bold border-t mt-1">
                    + Nova Carteira...
                  </SelectItem>
                </SelectContent>
              </Select>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setRenameWalletName(activeWallet?.name || "");
                  setIsRenameWalletOpen(true);
                }}
                title="Renomear Carteira"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              {activeWalletId !== 'default' && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-red-400 hover:text-red-500 hover:bg-red-500/10"
                  onClick={() => setIsDeleteWalletOpen(true)}
                  title="Excluir Carteira"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Mobile Wallet Selector */}
            <div className="flex md:hidden items-center gap-1 min-w-0">
              <Select value={activeWalletId} onValueChange={(val) => {
                if (val === 'create_new') {
                  setIsNewWalletOpen(true);
                } else {
                  switchWallet(val);
                }
              }}>
                <SelectTrigger className="h-7 sm:h-8 px-2 max-w-[110px] xs:max-w-[140px] bg-muted/60 border-none text-xs font-medium truncate">
                  <Wallet className="w-3.5 h-3.5 mr-1 shrink-0 text-primary" />
                  <SelectValue placeholder="Carteira" />
                </SelectTrigger>
                <SelectContent>
                  {wallets.map(w => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                  ))}
                  <SelectItem value="create_new" className="text-primary font-bold border-t mt-1">
                    + Nova Carteira...
                  </SelectItem>
                </SelectContent>
              </Select>
              
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0"
                onClick={() => {
                  setRenameWalletName(activeWallet?.name || "");
                  setIsRenameWalletOpen(true);
                }}
                title="Renomear Carteira"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>

              {activeWalletId !== 'default' && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 text-red-400 hover:text-red-500 shrink-0"
                  onClick={() => setIsDeleteWalletOpen(true)}
                  title="Excluir Carteira"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>

          {/* Right Header Navigation (Desktop) & Theme Toggle */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex space-x-1">
              {links.map((link) => {
                const Icon = link.icon;
                const isActive = location.pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    to={link.href}
                    className={cn(
                      "flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground active:scale-95"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{link.name}</span>
                  </Link>
                );
              })}
            </nav>
            
            <div className="hidden md:block h-6 w-px bg-border mx-1"></div>
            
            {/* Pending Backup Badge / Button */}
            {hasPendingBackup && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsExitBackupOpen(true)}
                className="h-7 sm:h-8 px-2 sm:px-2.5 gap-1.5 text-xs font-semibold border-amber-500/60 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 active:scale-95 transition-all"
                title="Existem dados novos ou modificados que ainda não foram salvos em backup"
              >
                <Save className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                <span className="hidden sm:inline">Backup Pendente</span>
              </Button>
            )}

            {/* Install App Button (Desktop / Android Chrome) */}
            {installPrompt && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleInstallClick}
                className="h-7 sm:h-8 px-2 sm:px-3 gap-1.5 text-xs font-semibold border-primary/50 text-primary hover:bg-primary/10 transition-all active:scale-95"
                title="Instalar aplicativo no computador ou celular"
              >
                <Download className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">Instalar App</span>
              </Button>
            )}

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-1.5 sm:p-2 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors active:scale-95"
              aria-label="Alternar tema claro/escuro"
              title="Alternar tema claro/escuro"
            >
              {theme === "light" ? <Moon className="w-4 h-4 sm:w-5 sm:h-5" /> : <Sun className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>

            {/* Exit App Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExitRequest}
              className="h-7 sm:h-8 px-2 sm:px-2.5 gap-1.5 text-xs font-semibold border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10 hover:border-red-500/50 transition-all active:scale-95"
              title="Sair do aplicativo com segurança"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sair</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 container mx-auto px-3 sm:px-6 py-4 sm:py-8 pb-24 md:pb-8 animate-in fade-in duration-500">
        {updateNotification && (
          <div className="bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 px-4 py-3 rounded-lg mb-4 flex items-center justify-between text-sm shadow-sm animate-in fade-in">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{updateNotification}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setUpdateNotification(null)} className="h-7 text-xs">OK</Button>
          </div>
        )}
        {exitNotification && (
          <div className="bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 px-4 py-3 rounded-lg mb-4 flex items-center justify-between text-sm shadow-sm animate-in fade-in">
            <span>{exitNotification}</span>
            <Button variant="ghost" size="sm" onClick={() => setExitNotification(null)} className="h-7 text-xs">OK</Button>
          </div>
        )}
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-t border-border shadow-lg pb-safe">
        <div className="grid grid-cols-5 h-16 max-w-lg mx-auto">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.href;
            return (
              <Link
                key={link.href}
                to={link.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 transition-all duration-150 select-none py-1",
                  isActive
                    ? "text-primary font-semibold"
                    : "text-muted-foreground hover:text-foreground active:scale-90"
                )}
              >
                <div className={cn(
                  "p-1 rounded-xl transition-all",
                  isActive ? "bg-primary/15 text-primary scale-110" : ""
                )}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] tracking-tight">{link.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Dialog: Nova Carteira */}
      <Dialog open={isNewWalletOpen} onOpenChange={setIsNewWalletOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Nova Carteira</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateWallet} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Nome da Carteira</Label>
              <Input 
                value={newWalletName} 
                onChange={(e) => setNewWalletName(e.target.value)} 
                placeholder="Ex: Trabalho, Viagem..."
                required 
                autoFocus
              />
            </div>
            <Button type="submit" className="w-full">Criar Carteira</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Renomear Carteira */}
      <Dialog open={isRenameWalletOpen} onOpenChange={setIsRenameWalletOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renomear Carteira</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRenameWallet} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Novo Nome da Carteira</Label>
              <Input 
                value={renameWalletName} 
                onChange={(e) => setRenameWalletName(e.target.value)} 
                placeholder="Ex: Pessoal, Família..."
                required 
                autoFocus
              />
            </div>
            <Button type="submit" className="w-full">Salvar Alteração</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* ConfirmDialog: Excluir Carteira */}
      <ConfirmDialog
        open={isDeleteWalletOpen}
        onOpenChange={setIsDeleteWalletOpen}
        title="Excluir Carteira"
        description={
          <span>
            Tem certeza que deseja excluir permanentemente a carteira{" "}
            <strong className="text-foreground">{activeWallet?.name}</strong>?
            <span className="block mt-2 text-xs text-amber-600 dark:text-amber-400 font-medium">
              ⚠️ Todos os lançamentos, contas e configurações associadas a esta carteira serão apagados permanentemente.
            </span>
          </span>
        }
        confirmText="Excluir Carteira"
        onConfirm={handleDeleteWallet}
      />

      {/* Modal: Backup antes de Sair */}
      <ExitBackupModal
        open={isExitBackupOpen}
        onOpenChange={setIsExitBackupOpen}
        onConfirmBackup={handleBackupAndExit}
        onExitWithoutBackup={handleExitWithoutBackup}
        isLoading={isBackingUp}
      />

      {/* Dialog: Versão do Sistema e Limpeza de Cache */}
      <Dialog open={isVersionModalOpen} onOpenChange={setIsVersionModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <span className="text-xl">🚀</span>
              <span>Versão do Sistema</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/60 border">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Versão Instalada</p>
                <p className="text-lg font-bold text-foreground">v{APP_VERSION}</p>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Atualizado</span>
              </div>
            </div>

            <div className="text-xs text-muted-foreground space-y-2 leading-relaxed">
              <p>
                O sistema é atualizado automaticamente. Toda vez que uma nova versão é lançada, os caches estáticos anteriores são apagados ao entrar para carregar as melhorias imediatamente.
              </p>
              <div className="p-2.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  <strong>Seus dados estão protegidos:</strong> A limpeza de cache afeta apenas arquivos visuais (código e estilo). Seus lançamentos, contas e carteiras continuam 100% seguros no banco de dados local.
                </span>
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <Button 
                variant="outline" 
                onClick={handleForceClearCache}
                disabled={isClearingCache}
                className="w-full gap-2 font-medium border-primary/40 hover:bg-primary/10"
              >
                <RotateCcw className={cn("w-4 h-4", isClearingCache && "animate-spin")} />
                <span>{isClearingCache ? "Limpando e recarregando..." : "Forçar Limpeza de Cache e Recarregar"}</span>
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => setIsVersionModalOpen(false)}
                className="w-full text-xs text-muted-foreground"
              >
                Fechar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
