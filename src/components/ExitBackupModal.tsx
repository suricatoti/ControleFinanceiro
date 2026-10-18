import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, LogOut, X, AlertTriangle, ShieldCheck } from "lucide-react";

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
      <DialogContent className="w-[calc(100%-2rem)] sm:max-w-[620px] max-h-[92vh] overflow-y-auto p-5 sm:p-7 gap-5">
        <DialogHeader className="space-y-3 text-left">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <DialogTitle className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
                Backup dos Dados Financeiros
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Alterações recentes identificadas que ainda não foram salvas em arquivo
              </p>
            </div>
          </div>

          <DialogDescription asChild>
            <div className="text-sm text-foreground/80 space-y-3 pt-1 text-left">
              <p className="leading-relaxed">
                Foram identificadas <strong>novas inserções ou modificações nos seus lançamentos</strong> que ainda não foram salvas em um arquivo de backup.
              </p>

              <div className="bg-amber-500/10 dark:bg-amber-950/40 border border-amber-500/30 rounded-xl p-3.5 sm:p-4 text-xs sm:text-sm text-amber-900 dark:text-amber-200 space-y-1.5 leading-relaxed">
                <div className="flex items-center gap-2 font-semibold text-amber-800 dark:text-amber-300">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>Por que o backup é importante?</span>
                </div>
                <p className="text-xs text-amber-900/90 dark:text-amber-200/90">
                  Seus dados financeiros ficam salvos de forma privada e segura <strong>na memória local deste navegador</strong>. Fazer o download do arquivo de backup garante que você não perca seu histórico caso limpe o cache do navegador ou troque de computador.
                </p>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2.5 pt-4 border-t border-border/60">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="w-full sm:w-auto text-muted-foreground hover:text-foreground justify-center text-xs sm:text-sm"
          >
            <X className="w-4 h-4 mr-1.5" />
            Cancelar
          </Button>

          <div className="flex flex-col-reverse sm:flex-row items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={onExitWithoutBackup}
              disabled={isLoading}
              className="w-full sm:w-auto border-border/80 hover:bg-muted justify-center text-xs sm:text-sm"
            >
              <LogOut className="w-4 h-4 mr-1.5 text-muted-foreground" />
              Não, apenas sair
            </Button>

            <Button
              type="button"
              onClick={onConfirmBackup}
              disabled={isLoading}
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm justify-center gap-1.5 text-xs sm:text-sm"
            >
              <Download className="w-4 h-4 shrink-0" />
              <span>{isLoading ? "Gerando Backup..." : "Sim, fazer backup"}</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
