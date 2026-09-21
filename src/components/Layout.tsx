import { Link, Outlet, useLocation } from "react-router-dom";
import { LayoutDashboard, Receipt, Tags, User, Repeat, Moon, Sun, Pencil, Trash2, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { useWallet } from "@/contexts/WalletContext";
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
            
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-1.5 sm:p-2 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors active:scale-95"
              aria-label="Alternar tema claro/escuro"
            >
              {theme === "light" ? <Moon className="w-4 h-4 sm:w-5 sm:h-5" /> : <Sun className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 container mx-auto px-3 sm:px-6 py-4 sm:py-8 pb-24 md:pb-8 animate-in fade-in duration-500">
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
    </div>
  );
}
