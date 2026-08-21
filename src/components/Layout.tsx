import { Link, Outlet, useLocation } from "react-router-dom";
import { LayoutDashboard, Receipt, Tags, User, Repeat, Moon, Sun, Pencil } from "lucide-react";
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

  const { wallets, activeWalletId, switchWallet, addWallet, renameWallet, activeWallet } = useWallet();
  const [isNewWalletOpen, setIsNewWalletOpen] = useState(false);
  const [newWalletName, setNewWalletName] = useState("");
  const [isRenameWalletOpen, setIsRenameWalletOpen] = useState(false);
  const [renameWalletName, setRenameWalletName] = useState("");

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

  const links = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Transações", href: "/transacoes", icon: Receipt },
    { name: "Cadastros", href: "/cadastros", icon: Tags },
    { name: "Recorrências", href: "/recorrencias", icon: Repeat },
    { name: "Perfil", href: "/perfil", icon: User },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans transition-colors duration-300">
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="font-bold text-xl tracking-tight text-primary flex items-center gap-2">
              <span className="text-2xl drop-shadow-sm">💰</span> Finanças
            </div>
            
            <div className="hidden md:flex items-center gap-2 border-l pl-6 h-8">
              <Select value={activeWalletId} onValueChange={(val) => {
                if (val === 'create_new') {
                  setIsNewWalletOpen(true);
                } else {
                  switchWallet(val);
                }
              }}>
                <SelectTrigger className="w-[180px] h-8 bg-muted/50 border-none font-medium">
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
            </div>
          </div>

          <div className="flex items-center gap-4">
            <nav className="flex space-x-1">
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
                    <span className="hidden sm:inline-block">{link.name}</span>
                  </Link>
                );
              })}
            </nav>
            
            <div className="h-6 w-px bg-border mx-1"></div>
            
            <button
              onClick={toggleTheme}
              className="p-2 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="Toggle theme"
            >
              {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 container mx-auto px-4 py-8 animate-in fade-in duration-500">
        <Outlet />
      </main>

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
    </div>
  );
}
