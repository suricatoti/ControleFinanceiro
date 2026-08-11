import { useState, useMemo } from "react";
import { NumericFormat } from "react-number-format";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";

export default function Transactions() {
  const accounts = useLiveQuery(() => db.accounts.orderBy('name').toArray());
  const categories = useLiveQuery(() => db.categories.orderBy('name').toArray());
  const subcategories = useLiveQuery(() => db.subcategories.orderBy('name').toArray());
  const transactions = useLiveQuery(() => db.transactions.toArray());

  const [isOpen, setIsOpen] = useState(false);
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [accountId, setAccountId] = useState("");
  const [destinationAccountId, setDestinationAccountId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [installments, setInstallments] = useState(1);

  const [periodFilter, setPeriodFilter] = useState("Mês Atual");
  const [customStartDate, setCustomStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split("T")[0];
  });
  const [customEndDate, setCustomEndDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    d.setDate(0);
    return d.toISOString().split("T")[0];
  });

  const selectedSubcat = subcategories?.find(s => s.id === subcategoryId);
  const isTransfer = selectedSubcat?.type === 'Transferência';

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !accountId || !subcategoryId || !amount) return;
    if (isTransfer && !destinationAccountId) return;
    
    const subcat = subcategories?.find(s => s.id === subcategoryId);
    if (!subcat) return;

    const categoryId = subcat.categoryId;
    const parsedInstallments = Math.max(1, parseInt(String(installments)) || 1);
    const totalAmount = parseFloat(amount);
    
    // Calcula o valor base da parcela e o resto para a primeira parcela (Opção 2)
    // Usando Number.EPSILON para evitar erros de precisão do JS
    const installmentBaseValue = Math.floor((totalAmount / parsedInstallments) * 100 + Number.EPSILON) / 100;
    const remainder = parseFloat((totalAmount - (installmentBaseValue * parsedInstallments)).toFixed(2));

    for (let i = 1; i <= parsedInstallments; i++) {
      const currentAmount = i === 1 ? installmentBaseValue + remainder : installmentBaseValue;
      
      const currentDesc = parsedInstallments > 1 ? `${description} - Parcela ${i} de ${parsedInstallments}` : description;
      
      // Ajusta a data para a parcela atual (mantendo o dia ou indo para o fim do mês se o dia não existir no mês futuro)
      const d = new Date(date + "T12:00:00Z"); // Fixa ao meio-dia para evitar problemas de fuso horário
      d.setUTCMonth(d.getUTCMonth() + (i - 1));
      const currentDate = d.toISOString().split("T")[0];
      
      if (isTransfer) {
        if (editingTransactionId) return; // Edição de transferência não permitida
        
        const id1 = crypto.randomUUID();
        const id2 = crypto.randomUUID();
        
        // Saída (Origem)
        await db.transactions.add({
          id: id1,
          date: currentDate,
          accountId,
          categoryId,
          subcategoryId,
          description: currentDesc,
          amount: -Math.abs(currentAmount),
          linkedTransactionId: id2,
        });

        // Entrada (Destino)
        await db.transactions.add({
          id: id2,
          date: currentDate,
          accountId: destinationAccountId,
          categoryId,
          subcategoryId,
          description: currentDesc,
          amount: Math.abs(currentAmount),
          linkedTransactionId: id1,
        });
      } else {
        let finalAmount = currentAmount;
        if (subcat.type === 'Despesa') {
          finalAmount = -Math.abs(finalAmount);
        } else {
          finalAmount = Math.abs(finalAmount);
        }

        if (editingTransactionId && parsedInstallments === 1) {
          await db.transactions.update(editingTransactionId, {
            date: currentDate,
            accountId,
            categoryId,
            subcategoryId,
            description: currentDesc,
            amount: finalAmount,
          });
          setEditingTransactionId(null);
        } else {
          await db.transactions.add({
            id: crypto.randomUUID(),
            date: currentDate,
            accountId,
            categoryId,
            subcategoryId,
            description: currentDesc,
            amount: finalAmount,
          });
        }
      }
    }

    setIsOpen(false);
    setDate(new Date().toISOString().split("T")[0]);
    setAccountId("");
    setDestinationAccountId("");
    setSubcategoryId("");
    setDescription("");
    setAmount("");
    setInstallments(1);
  };

  const handleEdit = (t: any) => {
    setEditingTransactionId(t.id);
    setDate(t.date);
    setAccountId(t.accountId);
    setSubcategoryId(t.subcategoryId);
    setDescription(t.description);
    setAmount(Math.abs(t.amount).toString());
    setInstallments(1);
    setIsOpen(true);
  };

  const handleDelete = async (t: any) => {
    if (t.linkedTransactionId) {
      await db.transactions.delete(t.linkedTransactionId);
    }
    await db.transactions.delete(t.id);
  };

  // Calcula o running balance e aplica filtro de período
  const { filteredTransactions, openingBalances } = useMemo(() => {
    if (!transactions || !accounts || !categories || !subcategories) {
       return { filteredTransactions: [], openingBalances: {} };
    }

    // Definir as datas de início e fim baseadas no filtro
    let startD = new Date();
    let endD = new Date();
    startD.setHours(0,0,0,0);
    endD.setHours(23,59,59,999);

    if (periodFilter === 'Mês Atual') {
      startD.setDate(1);
      endD.setMonth(endD.getMonth() + 1);
      endD.setDate(0);
    } else if (periodFilter === 'Últimos 30 dias') {
      startD.setDate(startD.getDate() - 30);
    } else if (periodFilter === 'Últimos 60 dias') {
      startD.setDate(startD.getDate() - 60);
    } else if (periodFilter === 'Últimos 90 dias') {
      startD.setDate(startD.getDate() - 90);
    } else if (periodFilter === 'Personalizado') {
      startD = new Date(customStartDate + "T00:00:00");
      endD = new Date(customEndDate + "T23:59:59");
    }

    const startTimestamp = startD.getTime();
    const endTimestamp = endD.getTime();

    // Ordena as transações cronologicamente (da mais antiga pra mais nova)
    const sorted = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // 1. Calcula o saldo ANTERIOR (acumulando apenas as transações antes da data de início)
    const openingBalances: Record<string, number> = {};
    accounts.forEach(acc => {
      openingBalances[acc.id] = acc.initialBalance;
    });

    for (const t of sorted) {
      const tTime = new Date(t.date).getTime();
      if (tTime < startTimestamp) {
         openingBalances[t.accountId] += t.amount;
      }
    }

    // 2. Calcula as transações do PERÍODO usando o saldo anterior como base
    const runningBalances = { ...openingBalances };
    const periodTxs = [];

    for (const t of sorted) {
      const tTime = new Date(t.date).getTime();
      if (tTime >= startTimestamp && tTime <= endTimestamp) {
        runningBalances[t.accountId] += t.amount;
        
        const cat = categories.find(c => c.id === t.categoryId);
        const subcat = t.subcategoryId ? subcategories.find(s => s.id === t.subcategoryId) : null;
        
        let fullCategoryName = cat?.name || 'Desconhecida';
        if (subcat) {
          fullCategoryName += ` > ${subcat.name}`;
        }

        periodTxs.push({
          ...t,
          accountName: accounts.find(a => a.id === t.accountId)?.name || 'Desconhecida',
          categoryName: fullCategoryName,
          currentBalance: runningBalances[t.accountId],
        });
      }
    }

    return {
      filteredTransactions: periodTxs,
      openingBalances
    };
  }, [transactions, accounts, categories, subcategories, periodFilter, customStartDate, customEndDate]);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Transações</h1>
        
        <div className="flex flex-col sm:flex-row items-center gap-4">
          {periodFilter === "Personalizado" && (
            <div className="flex items-center gap-2">
              <Input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} className="w-[140px]" />
              <span className="text-sm text-muted-foreground">até</span>
              <Input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} className="w-[140px]" />
            </div>
          )}
          
          <Select value={periodFilter} onValueChange={setPeriodFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Mês Atual">Mês Atual</SelectItem>
              <SelectItem value="Últimos 30 dias">Últimos 30 dias</SelectItem>
              <SelectItem value="Últimos 60 dias">Últimos 60 dias</SelectItem>
              <SelectItem value="Últimos 90 dias">Últimos 90 dias</SelectItem>
              <SelectItem value="Personalizado">Personalizado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        
        <Dialog open={isOpen} onOpenChange={(open) => {
          if (!open) {
            setEditingTransactionId(null);
            setDate(new Date().toISOString().split("T")[0]);
            setAccountId("");
            setDestinationAccountId("");
            setSubcategoryId("");
            setDescription("");
            setAmount("");
            setInstallments(1);
          }
          setIsOpen(open);
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingTransactionId ? 'Editar Transação' : 'Registrar Transação'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddTransaction} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Data</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>{isTransfer ? "Conta de Origem" : "Conta"}</Label>
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
                <Label>Descrição</Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: Mercado mensal" />
              </div>
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

              {!editingTransactionId && (
                <div className="space-y-2">
                  <Label>Parcelas</Label>
                  <Input 
                    type="number" 
                    min={1} 
                    max={360} 
                    value={installments} 
                    onChange={(e) => setInstallments(Number(e.target.value))} 
                    required 
                  />
                  {installments > 1 && (
                    <p className="text-sm text-red-500 font-medium">O valor total será dividido entre as {installments} parcelas.</p>
                  )}
                </div>
              )}

              <Button type="submit" className="w-full">Salvar</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {accounts?.map(acc => {
        const accTransactions = filteredTransactions.filter(t => t.accountId === acc.id);
        const periodOpeningBalance = openingBalances[acc.id] || 0;
        
        return (
          <div key={acc.id} className="mb-8 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center gap-2">
                {acc.name}
              </h2>
              <Button size="sm" className="flex items-center gap-2" onClick={() => {
                setEditingTransactionId(null);
                setDate(new Date().toISOString().split("T")[0]);
                setAccountId(acc.id);
                setDestinationAccountId("");
                setSubcategoryId("");
                setDescription("");
                setAmount("");
                setInstallments(1);
                setIsOpen(true);
              }}>
                <Plus size={16} /> Nova Transação
              </Button>
            </div>
            <div className="border rounded-md bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right text-blue-500 font-bold">Receita</TableHead>
                    <TableHead className="text-right text-red-500 font-bold">Despesa</TableHead>
                    <TableHead className="text-right">Saldo Atual</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="bg-muted/30">
                    <TableCell colSpan={5} className="font-medium text-muted-foreground">Saldo Anterior</TableCell>
                    <TableCell className={`text-right font-bold ${periodOpeningBalance >= 0 ? 'text-blue-500' : 'text-red-500'}`}>
                      {formatCurrency(periodOpeningBalance)}
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                  {accTransactions.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>{new Date(t.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</TableCell>
                      <TableCell>{t.categoryName}</TableCell>
                      <TableCell>{t.description}</TableCell>
                      <TableCell className="text-right text-blue-500">
                        {t.amount > 0 ? formatCurrency(t.amount) : '-'}
                      </TableCell>
                      <TableCell className="text-right text-red-500">
                        {t.amount < 0 ? formatCurrency(Math.abs(t.amount)) : '-'}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${t.currentBalance >= 0 ? 'text-blue-500' : 'text-red-500'}`}>
                        {formatCurrency(t.currentBalance)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {!t.linkedTransactionId && (
                            <Button variant="outline" size="sm" onClick={() => handleEdit(t)}>Editar</Button>
                          )}
                          <Button variant="destructive" size="sm" onClick={() => handleDelete(t)}>Excluir</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {accTransactions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        Nenhuma transação encontrada nesta conta neste período.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
