import { useState, useRef } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { AppDatabase } from "@/db/db";
import { exportDB, importInto } from "dexie-export-import";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Upload } from "lucide-react";

export default function Profile() {
  const { db, wallets, activeWalletId } = useWallet();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      
      const masterBackup = {
        type: "financas_master_backup",
        version: 1,
        wallets: wallets,
        activeWalletId: activeWalletId,
        databases: {} as Record<string, any>
      };

      for (const wallet of wallets) {
        const tempDb = new AppDatabase(wallet.dbName);
        const blob = await exportDB(tempDb, { prettyJson: false });
        const text = await blob.text();
        masterBackup.databases[wallet.dbName] = JSON.parse(text);
        tempDb.close();
      }

      const masterBlob = new Blob([JSON.stringify(masterBackup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(masterBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `financas_backup_completo_${new Date().toISOString().split("T")[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
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
        alert("Backup global restaurado com sucesso!");
      } else {
        // Restauração Legada (Apenas para a carteira ativa)
        await db.delete();
        await db.open();
        await importInto(db, file, { clearTablesBeforeImport: true });
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
      <h1 className="text-3xl font-bold tracking-tight mb-6">Perfil & Configurações</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Backup e Restauração</CardTitle>
          <CardDescription>
            Como os seus dados ficam salvos apenas neste navegador, é importante fazer backups regulares.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <Button onClick={handleExport} disabled={isExporting} className="flex-1 flex items-center gap-2">
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
                className="w-full flex items-center gap-2" 
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
