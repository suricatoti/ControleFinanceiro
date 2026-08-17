import { Link, Outlet, useLocation } from "react-router-dom";
import { LayoutDashboard, Receipt, Tags, User, Repeat, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

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
          <div className="font-bold text-xl tracking-tight text-primary flex items-center gap-2">
            <span className="text-2xl drop-shadow-sm">💰</span> Finanças
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
    </div>
  );
}
