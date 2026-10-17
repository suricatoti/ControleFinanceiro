import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, LogOut, X, AlertTriangle } from "lucide-react";

interface ExitBackupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmBackup: () => Promise<void>;
  onExitWithoutBackup: () => void;
  isLoading?: boolean;
}

export function ExitBackupModal({
  open,
  onOpenChange,
  onConfirmBackup,
  onExitWithoutBackup,
  isLoading = false,
}: ExitBackupModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader className="flex flex-col items-center sm:items-start gap-2">
          <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-1">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <DialogTitle className="text-xl tracking-tight">
            Deseja fazer o backup antes de sair?
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground pt-1 space-y-2 text-left">
            <p>
              Foram identificadas <strong>inserções ou alterações nos seus dados</strong> que ainda não foram salvas em um arquivo de backup.
            </p>
            <p className="text-xs bg-amber-50 dark:bg-amber-950/30 p-2.5 rounded border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200">
              💡 <em>Lembre-se:</em> seus dados financeiros ficam salvos exclusivamente na memória deste navegador/dispositivo. Fazer o backup garante que você não perca seu histórico caso limpe o navegador.
            </p>
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="w-full sm:w-auto order-3 sm:order-1 text-muted-foreground"
          >
            <X className="w-4 h-4 mr-1.5" />
            Cancelar
          </Button>
          
          <Button
            type="button"
            variant="outline"
            onClick={onExitWithoutBackup}
            disabled={isLoading}
            className="w-full sm:w-auto order-2 sm:order-2 border-muted-foreground/30 hover:bg-muted"
          >
            <LogOut className="w-4 h-4 mr-1.5 text-muted-foreground" />
            Não, apenas sair
          </Button>

          <Button
            type="button"
            onClick={onConfirmBackup}
            disabled={isLoading}
            className="w-full sm:w-auto order-1 sm:order-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm"
          >
            <Download className="w-4 h-4 mr-1.5" />
            {isLoading ? "Gerando Backup..." : "Sim, fazer backup"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
