import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FolderPlus,
  FolderCheck,
  Folder,
  RefreshCw,
  Check,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import {
  listDriveAppFolders,
  createDriveFolder,
  saveGoogleDriveConfig,
  type DriveFolder,
} from "@/lib/googleDrive";

interface GoogleDriveFolderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentFolderId?: string;
  onFolderSelected?: (folder: DriveFolder) => void;
}

export function GoogleDriveFolderModal({
  open,
  onOpenChange,
  currentFolderId,
  onFolderSelected,
}: GoogleDriveFolderModalProps) {
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [isLoadingFolders, setIsLoadingFolders] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState("Controle Financeiro - Backups");
  const [selectedFolderId, setSelectedFolderId] = useState<string>(currentFolderId || "");
  const [error, setError] = useState<string | null>(null);

  const fetchFolders = useCallback(async () => {
    setIsLoadingFolders(true);
    setError(null);
    try {
      const list = await listDriveAppFolders();
      setFolders(list);
      if (currentFolderId && list.some((f) => f.id === currentFolderId)) {
        setSelectedFolderId(currentFolderId);
      } else if (list.length > 0) {
        setSelectedFolderId((prev) => prev || list[0].id);
      }
    } catch (err: any) {
      setError(err?.message || "Erro ao carregar pastas do Google Drive.");
    } finally {
      setIsLoadingFolders(false);
    }
  }, [currentFolderId]);

  useEffect(() => {
    if (open) {
      fetchFolders();
    }
  }, [open, fetchFolders]);

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    setIsCreating(true);
    setError(null);
    try {
      const created = await createDriveFolder(newFolderName.trim());
      saveGoogleDriveConfig({
        enabled: true,
        folderId: created.id,
        folderName: created.name,
      });
      onFolderSelected?.(created);
      onOpenChange(false);
    } catch (err: any) {
      setError(err?.message || "Erro ao criar pasta no Google Drive.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleConfirmExisting = () => {
    const chosen = folders.find((f) => f.id === selectedFolderId);
    if (!chosen) return;
    saveGoogleDriveConfig({
      enabled: true,
      folderId: chosen.id,
      folderName: chosen.name,
    });
    onFolderSelected?.(chosen);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] sm:max-w-[520px] max-h-[90vh] overflow-y-auto p-5 sm:p-6 gap-5">
        <DialogHeader className="space-y-2 text-left">
          <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
            <FolderCheck className="w-5 h-5 text-primary shrink-0" />
            <span>Pasta de Backup no Google Drive</span>
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
            Escolha uma pasta existente criada pelo aplicativo ou crie uma nova pasta no seu Google Drive para salvar seus backups automaticamente.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-start gap-2.5 text-red-800 dark:text-red-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-5">
          {/* Seção 1: Selecionar pasta já existente (se houver) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs sm:text-sm font-semibold">
                Pastas disponíveis no seu Drive
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={fetchFolders}
                disabled={isLoadingFolders}
                className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingFolders ? "animate-spin" : ""}`} />
                <span>Atualizar</span>
              </Button>
            </div>

            {isLoadingFolders ? (
              <div className="border rounded-lg p-6 text-center text-xs text-muted-foreground">
                Buscando pastas no Google Drive...
              </div>
            ) : folders.length === 0 ? (
              <div className="border border-dashed rounded-lg p-4 text-center text-xs text-muted-foreground">
                Nenhuma pasta de backup encontrada ainda. Crie sua primeira pasta abaixo!
              </div>
            ) : (
              <div className="space-y-2">
                <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                  {folders.map((folder) => {
                    const isSelected = selectedFolderId === folder.id;
                    return (
                      <button
                        key={folder.id}
                        type="button"
                        onClick={() => setSelectedFolderId(folder.id)}
                        className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-left text-xs sm:text-sm transition-all ${
                          isSelected
                            ? "border-primary bg-primary/10 text-foreground font-medium"
                            : "border-border hover:bg-muted/60 text-muted-foreground"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Folder
                            className={`w-4 h-4 shrink-0 ${
                              isSelected ? "text-primary" : "text-muted-foreground"
                            }`}
                          />
                          <span className="truncate">{folder.name}</span>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                <Button
                  type="button"
                  onClick={handleConfirmExisting}
                  disabled={!selectedFolderId}
                  className="w-full gap-2 text-xs sm:text-sm"
                >
                  <FolderCheck className="w-4 h-4" />
                  <span>Usar Pasta Selecionada</span>
                </Button>
              </div>
            )}
          </div>

          <div className="relative flex items-center py-1">
            <div className="flex-grow border-t border-border" />
            <span className="flex-shrink mx-3 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
              ou criar nova pasta
            </span>
            <div className="flex-grow border-t border-border" />
          </div>

          {/* Seção 2: Criar nova pasta */}
          <form onSubmit={handleCreateFolder} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="new-drive-folder" className="text-xs sm:text-sm font-semibold">
                Nome da Nova Pasta
              </Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  id="new-drive-folder"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Ex: Controle Financeiro - Backups"
                  required
                  className="flex-1 text-xs sm:text-sm"
                />
                <Button
                  type="submit"
                  variant={folders.length === 0 ? "default" : "secondary"}
                  disabled={isCreating || !newFolderName.trim()}
                  className="gap-1.5 shrink-0 text-xs sm:text-sm"
                >
                  <FolderPlus className="w-4 h-4" />
                  <span>{isCreating ? "Criando..." : "Criar e Usar Pasta"}</span>
                </Button>
              </div>
            </div>
          </form>

          {/* Nota de privacidade */}
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 flex items-start gap-2.5 text-[11px] sm:text-xs text-emerald-800 dark:text-emerald-300">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
            <span>
              <strong>Privacidade Garantida:</strong> O aplicativo tem permissão apenas para salvar os backups dentro da pasta escolhida por você, sem acesso a nenhum outro arquivo ou foto do seu Google Drive.
            </span>
          </div>
        </div>

        <DialogFooter className="pt-2 border-t border-border/60">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto text-xs"
          >
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
