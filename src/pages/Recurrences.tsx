import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useWallet } from "@/contexts/WalletContext";
import { ensureRecurrencesProjected } from "@/lib/recurrenceUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NumericFormat } from "react-number-format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Plus } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";

export default function Recurrences() {
  const { db } = useWallet();
  const accounts = useLiveQuery(() => db.accounts.toArray(), [db]);
  const categories = useLiveQuery(() => db.categories.toArray(), [db]);
  const subcategories = useLiveQuery(() => db.subcategories.toArray(), [db]);
  const recurrences = useLiveQuery(() => db.recurrences.toArray(), [db]);

  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [deleteRecurrence, setDeleteRecurrence] = useState<any | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState("");
  const [destinationAccountId, setDestinationAccountId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [period, setPeriod] = useState<"mensal" | "anual">("mensal");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !accountId || !subcategoryId || !startDate) return;

    const subcat = subcategories?.find(s => s.id === subcategoryId);
    if (!subcat) return;
    
    const isTransfer = subcat.type === 'Transferência';
    if (isTransfer && !destinationAccountId) return;
    
    const parsedAmount = parseFloat(amount);
    // Assinaturas geralmente são despesas
    const finalAmount = subcat.type === 'Despesa' ? -Math.abs(parsedAmount) : Math.abs(parsedAmount);

    if (editingId) {
      await db.recurrences.update(editingId, {
        description,
        amount: finalAmount,
        accountId,
        destinationAccountId: isTransfer ? destinationAccountId : undefined,
        categoryId: subcat.categoryId,
        subcategoryId,
        // startDate e period não são atualizados na edição
      });
      
      // Update pending transactions in the future
      const pendingTxs = await db.transactions
        .where('recurringGroupId')
        .equals(editingId)
        .toArray();
        

      for (const tx of pendingTxs) {
        if (tx.status === 'Pendente') { // Could also check date >= now
          await db.transactions.delete(tx.id);
        }
      }
      
      await ensureRecurrencesProjected(db);
    } else {
      const newId = crypto.randomUUID();
      await db.recurrences.add({
        id: newId,
        description,
        amount: finalAmount,
        accountId,
        destinationAccountId: isTransfer ? destinationAccountId : undefined,
        categoryId: subcat.categoryId,
        subcategoryId,
        startDate,
        period
      });

      // Roda o motor de projeção para garantir que essa nova recorrência seja estendida até a data alvo
      await ensureRecurrencesProjected(db);
    }

    setIsOpen(false);
    resetForm();
  };

  const handleEdit = (r: any) => {
    setEditingId(r.id);
    setDescription(r.description);
    setAmount(Math.abs(r.amount).toString());
    setAccountId(r.accountId);
    setDestinationAccountId(r.destinationAccountId || "");
    setSubcategoryId(r.subcategoryId);
    setStartDate(r.startDate);
    setPeriod(r.period || "mensal");
    setIsOpen(true);
  };

  const openDeleteConfirm = (r: any) => {
    setDeleteRecurrence(r);
    setIsDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteRecurrence) return;
    await db.recurrences.delete(deleteRecurrence.id);
    // Delete all pending future transactions
    const pendingTxs = await db.transactions
      .where('recurringGroupId')
      .equals(deleteRecurrence.id)
      .toArray();
      
    for (const tx of pendingTxs) {
      if (tx.status === 'Pendente') {
        await db.transactions.delete(tx.id);
      }
    }
    setDeleteRecurrence(null);
  };

  const resetForm = () => {
    setEditingId(null);
    setDescription("");
    setAmount("");
    setAccountId("");
    setDestinationAccountId("");
    setSubcategoryId("");
    setStartDate(new Date().toISOString().split("T")[0]);
    setPeriod("mensal");
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const monthlyRecurrences = recurrences?.filter(r => r.period !== 'anual') || [];
  const annualRecurrences = recurrences?.filter(r => r.period === 'anual') || [];

  const renderTable = (data: typeof recurrences) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Descrição</TableHead>
          <TableHead>Categoria</TableHead>
          <TableHead>Data Inicial</TableHead>
          <TableHead className="text-right">Valor</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data?.sort((a, b) => {
          const catA = categories?.find(c => c.id === a.categoryId)?.name || '';
          const catB = categories?.find(c => c.id === b.categoryId)?.name || '';
          if (catA !== catB) return catA.localeCompare(catB);
          
          const subA = subcategories?.find(s => s.id === a.subcategoryId)?.name || '';
          const subB = subcategories?.find(s => s.id === b.subcategoryId)?.name || '';
          return subA.localeCompare(subB);
        }).map((r) => {
          const cat = categories?.find(c => c.id === r.categoryId);
          const sub = subcategories?.find(s => s.id === r.subcategoryId);
          return (
            <TableRow key={r.id}>
              <TableCell className="font-medium">{r.description}</TableCell>
              <TableCell>{cat?.name} {sub ? `> ${sub.name}` : ''}</TableCell>
              <TableCell>
                {new Date(r.startDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
              </TableCell>
              <TableCell className={`text-right font-bold ${r.amount > 0 ? 'text-blue-500' : 'text-red-500'}`}>
                {formatCurrency(Math.abs(r.amount))}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(r)}>Editar</Button>
                  <Button variant="destructive" size="sm" onClick={() => openDeleteConfirm(r)}>Excluir</Button>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
        {(!data || data.length === 0) && (
          <TableRow>
            <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
              Nenhuma conta recorrente cadastrada.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );

  const selectedSubcat = subcategories?.find(s => s.id === subcategoryId);
  const isTransfer = selectedSubcat?.type === 'Transferência';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Contas Recorrentes</h1>
        <Button onClick={() => { resetForm(); setIsOpen(true); }} className="flex items-center gap-2">
          <Plus size={16} /> Nova Recorrência
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recorrências Mensais</CardTitle>
          </CardHeader>
          <CardContent>
            {renderTable(monthlyRecurrences)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recorrências Anuais</CardTitle>
          </CardHeader>
          <CardContent>
            {renderTable(annualRecurrences)}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) resetForm();
        setIsOpen(open);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Recorrência' : 'Nova Recorrência'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <NumericFormat 
                customInput={Input}
                value={amount}
                onValueChange={(values) => setAmount(values.value)}
                placeholder="R$ 0,00"
                thousandSeparator="."
                decimalSeparator=","
                prefix="R$ "
                decimalScale={2}
                fixedDecimalScale
                required
              />
            </div>

            <div className="space-y-2">
              <Label>A partir de (Data Inicial)</Label>
              <Input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)} 
                disabled={!!editingId}
                required 
              />
              <p className="text-xs text-muted-foreground">
                {editingId ? "A data inicial e a periodicidade não podem ser alteradas. Caso precise, recrie a conta." : "Esta data definirá o dia do mês (ou ano) para todas as contas futuras."}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Periodicidade</Label>
              <Select value={period} onValueChange={(v: "mensal" | "anual") => setPeriod(v)} disabled={!!editingId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a periodicidade..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensal">Mensal</SelectItem>
                  <SelectItem value="anual">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{isTransfer ? "Conta de Origem" : "Conta Pagadora"}</Label>
              <Select value={accountId} onValueChange={setAccountId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a conta..." />
                </SelectTrigger>
                <SelectContent>
                  {accounts?.map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isTransfer && (
              <div className="space-y-2">
                <Label>Conta de Destino</Label>
                <Select value={destinationAccountId} onValueChange={setDestinationAccountId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a conta de destino..." />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts?.filter(acc => acc.id !== accountId).map(acc => (
                      <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Categoria / Subcategoria</Label>
              <Select value={subcategoryId} onValueChange={setSubcategoryId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a subcategoria..." />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map(cat => {
                    const catSubcats = subcategories?.filter(s => s.categoryId === cat.id);
                    if (!catSubcats || catSubcats.length === 0) return null;
                    
                    return (
                      <SelectGroup key={cat.id}>
                        <SelectLabel className="font-bold text-foreground">{cat.name}</SelectLabel>
                        {catSubcats.map(subcat => (
                          <SelectItem key={subcat.id} value={subcat.id} className="pl-6">
                            {subcat.name} ({subcat.type})
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Descrição (Opcional)</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: Detalhes ou nome da conta..." />
            </div>

            <Button type="submit" className="w-full">Salvar Recorrência</Button>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        title="Excluir Recorrência"
        description={
          deleteRecurrence ? (
            <span>
              Tem certeza que deseja excluir a recorrência{" "}
              <strong className="text-foreground">{deleteRecurrence.description || "sem descrição"}</strong>?
              <span className="block mt-2 text-xs text-amber-600 dark:text-amber-400 font-medium">
                ⚠️ Todos os lançamentos futuros pendentes gerados por esta recorrência também serão excluídos automaticamente.
              </span>
            </span>
          ) : ""
        }
        confirmText="Excluir"
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
