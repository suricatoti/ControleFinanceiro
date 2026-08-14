import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NumericFormat } from "react-number-format";
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
  const accounts = useLiveQuery(() => db.accounts.toArray());
  const categories = useLiveQuery(() => db.categories.toArray());
  const subcategories = useLiveQuery(() => db.subcategories.toArray());
  const recurrences = useLiveQuery(() => db.recurrences.toArray());

  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split("T")[0]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !accountId || !subcategoryId || !startDate) return;

    const subcat = subcategories?.find(s => s.id === subcategoryId);
    if (!subcat) return;
    
    const parsedAmount = parseFloat(amount);
    // Assinaturas geralmente são despesas
    const finalAmount = subcat.type === 'Despesa' ? -Math.abs(parsedAmount) : Math.abs(parsedAmount);

    if (editingId) {
      await db.recurrences.update(editingId, {
        description,
        amount: finalAmount,
        accountId,
        categoryId: subcat.categoryId,
        subcategoryId,
        startDate
      });
      
      // Update pending transactions in the future
      const pendingTxs = await db.transactions
        .where('recurringGroupId')
        .equals(editingId)
        .toArray();
        

      for (const tx of pendingTxs) {
        if (tx.status === 'Pendente') { // Could also check date >= now
          await db.transactions.update(tx.id, {
            amount: finalAmount,
            description,
            accountId,
            categoryId: subcat.categoryId,
            subcategoryId
          });
        }
      }
    } else {
      const newId = crypto.randomUUID();
      await db.recurrences.add({
        id: newId,
        description,
        amount: finalAmount,
        accountId,
        categoryId: subcat.categoryId,
        subcategoryId,
        startDate
      });

      // Generate next 12 months of pending transactions
      const startD = new Date(startDate + "T12:00:00Z");
      for (let i = 0; i < 12; i++) {
        const d = new Date(startD);
        d.setUTCMonth(d.getUTCMonth() + i);
        
        await db.transactions.add({
          id: crypto.randomUUID(),
          date: d.toISOString().split("T")[0],
          accountId,
          categoryId: subcat.categoryId,
          subcategoryId,
          description,
          amount: finalAmount,
          recurringGroupId: newId,
          status: 'Pendente'
        });
      }
    }

    setIsOpen(false);
    resetForm();
  };

  const handleEdit = (r: any) => {
    setEditingId(r.id);
    setDescription(r.description);
    setAmount(Math.abs(r.amount).toString());
    setAccountId(r.accountId);
    setSubcategoryId(r.subcategoryId);
    setStartDate(r.startDate);
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    await db.recurrences.delete(id);
    // Delete all pending future transactions
    const pendingTxs = await db.transactions
      .where('recurringGroupId')
      .equals(id)
      .toArray();
      
    for (const tx of pendingTxs) {
      if (tx.status === 'Pendente') {
        await db.transactions.delete(tx.id);
      }
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setDescription("");
    setAmount("");
    setAccountId("");
    setSubcategoryId("");
    setStartDate(new Date().toISOString().split("T")[0]);
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Contas Recorrentes</h1>
        <Button onClick={() => { resetForm(); setIsOpen(true); }} className="flex items-center gap-2">
          <Plus size={16} /> Nova Recorrência
        </Button>
      </div>

      <div className="border rounded-md bg-card">
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
            {recurrences?.map((r) => {
              const cat = categories?.find(c => c.id === r.categoryId);
              const sub = subcategories?.find(s => s.id === r.subcategoryId);
              return (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.description}</TableCell>
                  <TableCell>{cat?.name} {sub ? `> ${sub.name}` : ''}</TableCell>
                  <TableCell>{new Date(r.startDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</TableCell>
                  <TableCell className={`text-right font-bold ${r.amount > 0 ? 'text-blue-500' : 'text-red-500'}`}>
                    {formatCurrency(Math.abs(r.amount))}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(r)}>Editar</Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(r.id)}>Excluir</Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {recurrences?.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Nenhuma conta recorrente cadastrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
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
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
              <p className="text-xs text-muted-foreground">Esta data definirá o dia do mês para todas as contas futuras.</p>
            </div>

            <div className="space-y-2">
              <Label>Conta Pagadora</Label>
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
    </div>
  );
}
