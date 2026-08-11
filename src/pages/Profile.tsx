import { useState, useRef } from "react";
import { db } from "@/db/db";
import { exportDB, importInto } from "dexie-export-import";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Upload } from "lucide-react";

export default function Profile() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const blob = await exportDB(db, { prettyJson: true });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `financas_backup_${new Date().toISOString().split("T")[0]}.json`;
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
      await db.delete(); // Limpa o banco atual
      await db.open();   // Reabre
      await importInto(db, file, { clearTablesBeforeImport: true });
      alert("Banco de dados importado com sucesso!");
      window.location.reload(); // Recarrega para aplicar os dados aos componentes
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
