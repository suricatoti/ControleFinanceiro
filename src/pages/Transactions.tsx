import { useState, useMemo, useEffect } from "react";
import { NumericFormat } from "react-number-format";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/db";
import { getCreditCardBillPeriod, getNaturalBillMonth } from "@/lib/creditCardUtils";
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

} from "@/components/ui/dialog";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";

export default function Transactions() {
  const accounts = useLiveQuery(() => db.accounts.orderBy('name').toArray());
  const categories = useLiveQuery(() => db.categories.orderBy('name').toArray());
  const subcategories = useLiveQuery(() => db.subcategories.orderBy('name').toArray());
  const transactions = useLiveQuery(() => db.transactions.toArray());

  const [isOpen, setIsOpen] = useState(false);
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  
  const [isPending, setIsPending] = useState(false);
  
  const [isBaixaOpen, setIsBaixaOpen] = useState(false);
  const [baixaTransaction, setBaixaTransaction] = useState<any | null>(null);
  const [baixaAmount, setBaixaAmount] = useState("");

  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [accountId, setAccountId] = useState("");
  const [destinationAccountId, setDestinationAccountId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [installments, setInstallments] = useState(1);

  const [isMoverOpen, setIsMoverOpen] = useState(false);
  const [moverTransaction, setMoverTransaction] = useState<any | null>(null);
  const [moverMonthStr, setMoverMonthStr] = useState("");

  const [currentDate, setCurrentDate] = useState(() => new Date());

  const navigateMonth = (direction: number) => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + direction);
      return d;
    });
  };

  const selectedSubcat = subcategories?.find(s => s.id === subcategoryId);
  const isTransfer = selectedSubcat?.type === 'Transferência';

  // Atualiza automaticamente o checkbox se a data for futura
  useEffect(() => {
    const todayString = new Date().toISOString().split("T")[0];
    const isFuture = new Date(date + "T12:00:00Z").getTime() > new Date(todayString + "T12:00:00Z").getTime();
    setIsPending(isFuture);
  }, [date]);

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
      
      let txStatus: 'Pendente' | 'Paga' = isPending ? 'Pendente' : 'Paga';
      if (i > 1 && !isPending) {
         const todayString = new Date().toISOString().split("T")[0];
         const isFuture = new Date(currentDate).getTime() > new Date(todayString).getTime();
         if (isFuture) txStatus = 'Pendente';
      }
      
      if (isTransfer) {
        if (editingTransactionId) {
          const oldTx = await db.transactions.get(editingTransactionId);
          if (oldTx && oldTx.linkedTransactionId) {
            const pair = await db.transactions.where('id').anyOf([oldTx.id, oldTx.linkedTransactionId]).toArray();
            const originTx = pair.find(p => p.amount < 0);
            const destTx = pair.find(p => p.amount > 0);
            
            if (originTx && destTx) {
              await db.transactions.update(originTx.id, {
                date: currentDate,
                accountId: accountId,
                categoryId,
                subcategoryId,
                description: currentDesc,
                amount: -Math.abs(currentAmount)
              });
              
              await db.transactions.update(destTx.id, {
                date: currentDate,
                accountId: destinationAccountId,
                categoryId,
                subcategoryId,
                description: currentDesc,
                amount: Math.abs(currentAmount)
              });
            }
          }
          if (i === parsedInstallments) setEditingTransactionId(null);
        } else {
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
          status: txStatus,
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
          status: txStatus,
        });
        }
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
            status: txStatus,
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

  const handleEdit = async (t: any) => {
    setEditingTransactionId(t.id);
    setDate(t.date);
    setSubcategoryId(t.subcategoryId);
    setDescription(t.description);
    setAmount(Math.abs(t.amount).toString());
    setInstallments(1);
    setIsPending(t.status === 'Pendente');
    
    if (t.linkedTransactionId) {
      const linkedT = await db.transactions.get(t.linkedTransactionId);
      if (linkedT) {
        if (t.amount < 0) {
          setAccountId(t.accountId);
          setDestinationAccountId(linkedT.accountId);
        } else {
          setAccountId(linkedT.accountId);
          setDestinationAccountId(t.accountId);
        }
      }
    } else {
      setAccountId(t.accountId);
      setDestinationAccountId("");
    }
    
    setIsOpen(true);
  };

  const openBaixa = (t: any) => {
    setBaixaTransaction(t);
    setBaixaAmount(Math.abs(t.amount).toString());
    setIsBaixaOpen(true);
  };

  const handleConfirmBaixa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!baixaTransaction || !baixaAmount) return;

    let finalAmount = parseFloat(baixaAmount);
    if (baixaTransaction.amount < 0) {
      finalAmount = -Math.abs(finalAmount);
    } else {
      finalAmount = Math.abs(finalAmount);
    }

    await db.transactions.update(baixaTransaction.id, {
      amount: finalAmount,
      status: 'Paga'
    });

    setIsBaixaOpen(false);
    setBaixaTransaction(null);
  };

  const handleDelete = async (t: any) => {
    if (t.linkedTransactionId) {
      await db.transactions.delete(t.linkedTransactionId);
    }
    await db.transactions.delete(t.id);
  };

  const openMover = (t: any) => {
     setMoverTransaction(t);
     const acc = accounts?.find(a => a.id === t.accountId);
     if (acc && acc.isCreditCard && acc.closingDay && acc.dueDay) {
        setMoverMonthStr(t.creditCardBillDate || getNaturalBillMonth(t.date, acc.closingDay, acc.dueDay));
     } else {
        setMoverMonthStr(t.creditCardBillDate || t.date.substring(0, 7));
     }
     setIsMoverOpen(true);
  };

  const handleConfirmMover = async (e: React.FormEvent) => {
     e.preventDefault();
     if (!moverTransaction || !moverMonthStr) return;
     
     // Atualiza a transação com a data da fatura forçada
     await db.transactions.update(moverTransaction.id, {
         creditCardBillDate: moverMonthStr
     });
     
     // Se houver transação vinculada (transferência), também precisamos atualizar
     if (moverTransaction.linkedTransactionId) {
       await db.transactions.update(moverTransaction.linkedTransactionId, {
         creditCardBillDate: moverMonthStr
       });
     }
     
     setIsMoverOpen(false);
     setMoverTransaction(null);
  };

  // Define o targetMonthStr no escopo do componente para o banner
  const isMonthFilter = true;
  const targetMonthStr = useMemo(() => {
    return `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`;
  }, [currentDate]);

  // Calcula o running balance e aplica filtro de período
  const { filteredTransactions, openingBalances } = useMemo(() => {
    if (!transactions || !accounts || !categories || !subcategories) {
       return { filteredTransactions: [], openingBalances: {} };
    }

    // Definir as datas de início e fim baseadas no filtro de mês
    let startD = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1, 0, 0, 0, 0);
    let endD = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59, 999);

    const startTimestamp = startD.getTime();
    const endTimestamp = endD.getTime();

    // Ordena as transações cronologicamente
    const sorted = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // 1. Calcula o saldo ANTERIOR (acumulando apenas as transações antes da data de início)
    const openingBalances: Record<string, number> = {};
    accounts.forEach(acc => {
      openingBalances[acc.id] = acc.initialBalance;
    });

    for (const t of sorted) {
      const acc = accounts.find(a => a.id === t.accountId);
      if (!acc) continue;
      
      const tTime = new Date(t.date + "T12:00:00").getTime();
      let isBeforeTarget = false;

      if (acc.isCreditCard) {
         // Não acumula saldo de faturas anteriores para cartão, assumimos que foram pagas
         isBeforeTarget = false;
      } else {
         if (tTime < startTimestamp) isBeforeTarget = true;
      }

      if (isBeforeTarget) {
         openingBalances[t.accountId] += t.amount;
      }
    }

    // 2. Calcula as transações do PERÍODO usando o saldo anterior como base
    const runningBalances = { ...openingBalances };
    const periodTxs = [];

    for (const t of sorted) {
      const acc = accounts.find(a => a.id === t.accountId);
      if (!acc) continue;
      
      let include = false;
      const tTime = new Date(t.date + "T12:00:00").getTime();

      if (acc.isCreditCard && acc.closingDay && acc.dueDay) {
         if (isMonthFilter) {
            const billMonth = t.creditCardBillDate || getNaturalBillMonth(t.date, acc.closingDay, acc.dueDay);
            if (billMonth === targetMonthStr) {
               include = true;
            }
         } else {
            if (tTime >= startTimestamp && tTime <= endTimestamp) {
               include = true;
            }
         }
      } else {
         if (tTime >= startTimestamp && tTime <= endTimestamp) {
            include = true;
         }
      }

      if (include) {
        runningBalances[t.accountId] += t.amount;
        
        const cat = categories.find(c => c.id === t.categoryId);
        const subcat = t.subcategoryId ? subcategories.find(s => s.id === t.subcategoryId) : null;
        
        let fullCategoryName = cat?.name || 'Desconhecida';
        if (subcat) {
          fullCategoryName += ` > ${subcat.name}`;
        }

        periodTxs.push({
          ...t,
          accountName: acc.name,
          categoryName: fullCategoryName,
          currentBalance: runningBalances[t.accountId],
        });
      }
    }

    return {
      filteredTransactions: periodTxs,
      openingBalances
    };
  }, [transactions, accounts, categories, subcategories, currentDate]);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Transações</h1>
        
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-md border">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigateMonth(-1)}>
              <ChevronLeft size={16} />
            </Button>
            <span className="font-bold min-w-[150px] text-center text-sm capitalize">
              {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigateMonth(1)}>
              <ChevronRight size={16} />
            </Button>
          </div>
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
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="isPending" 
                    checked={isPending} 
                    onChange={(e) => setIsPending(e.target.checked)} 
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" 
                  />
                  <Label htmlFor="isPending" className="cursor-pointer">É uma previsão de pagamento? (Pendente)</Label>
                </div>
              )}

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

        <Dialog open={isBaixaOpen} onOpenChange={setIsBaixaOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Dar Baixa na Conta</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleConfirmBaixa} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Valor Efetivamente Pago/Recebido (R$)</Label>
                <NumericFormat 
                  customInput={Input}
                  value={baixaAmount}
                  onValueChange={(values) => setBaixaAmount(values.value)}
                  placeholder="R$ 0,00"
                  thousandSeparator="."
                  decimalSeparator=","
                  prefix="R$ "
                  decimalScale={2}
                  fixedDecimalScale
                  required
                />
                <p className="text-xs text-muted-foreground">O valor original era de {formatCurrency(Math.abs(baixaTransaction?.amount || 0))}. Altere se o valor real foi diferente.</p>
              </div>
              <Button type="submit" className="w-full bg-green-600 hover:bg-green-700">Confirmar Pagamento</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={isMoverOpen} onOpenChange={setIsMoverOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mover Fatura</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleConfirmMover} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Mês da Fatura (YYYY-MM)</Label>
              <Input 
                type="month"
                value={moverMonthStr}
                onChange={(e) => setMoverMonthStr(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">Para qual fatura (mês/ano) você deseja mover esta transação?</p>
            </div>
            <Button type="submit" className="w-full">Confirmar</Button>
          </form>
        </DialogContent>
      </Dialog>

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
            
            {acc.isCreditCard && acc.closingDay && acc.dueDay && isMonthFilter && (
              <div className="bg-blue-50/50 text-blue-800 p-3 rounded-md text-sm border border-blue-200 shadow-sm flex items-center">
                <span className="text-xl mr-3">💳</span>
                <div>
                  <strong className="block mb-1 text-base">Fatura de {targetMonthStr.split('-').reverse().join('/')}</strong>
                  <span className="opacity-90">
                    Período de compras: {getCreditCardBillPeriod(targetMonthStr, acc.closingDay, acc.dueDay).startDate.toLocaleDateString('pt-BR')} a {getCreditCardBillPeriod(targetMonthStr, acc.closingDay, acc.dueDay).endDate.toLocaleDateString('pt-BR')} <br/>
                    Vencimento: {getCreditCardBillPeriod(targetMonthStr, acc.closingDay, acc.dueDay).dueDate.toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>
            )}
            
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
                  {accTransactions.map((t) => {
                    const isPending = t.status === 'Pendente';
                    return (
                    <TableRow key={t.id} className={isPending ? "opacity-60 bg-muted/20" : ""}>
                      <TableCell>{new Date(t.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</TableCell>
                      <TableCell>{t.categoryName}</TableCell>
                      <TableCell>
                        {t.description}
                        {isPending && <span className="ml-2 text-xs font-bold text-orange-500 bg-orange-100 px-1 py-0.5 rounded">Pendente</span>}
                      </TableCell>
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
                          {isPending ? (
                            <Button variant="default" size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => openBaixa(t)}>Baixa</Button>
                          ) : (
                            <Button variant="outline" size="sm" onClick={() => handleEdit(t)}>Editar</Button>
                          )}
                          {acc.isCreditCard && (
                            <Button variant="secondary" size="sm" onClick={() => openMover(t)}>Mover</Button>
                          )}
                          <Button variant="destructive" size="sm" onClick={() => handleDelete(t)}>Excluir</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )})}
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
