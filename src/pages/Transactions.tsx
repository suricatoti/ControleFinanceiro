import { useState, useMemo, useRef } from "react";
import { NumericFormat } from "react-number-format";
import { useLiveQuery } from "dexie-react-hooks";
import { useWallet } from "@/contexts/WalletContext";
import { getCreditCardBillPeriod, getNaturalBillMonth } from "@/lib/creditCardUtils";
import { getInstallmentInfo, findFuturePendingInstallments, calculateFutureInstallmentDate, type InstallmentInfo } from "@/lib/installmentUtils";
import { cn } from "@/lib/utils";
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
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Plus, ChevronLeft, ChevronRight, CheckCircle2, Circle, CalendarDays } from "lucide-react";

export default function Transactions() {
  const { db } = useWallet();
  const accounts = useLiveQuery(() => db.accounts.orderBy('name').toArray(), [db]);
  const categories = useLiveQuery(() => db.categories.orderBy('name').toArray(), [db]);
  const subcategories = useLiveQuery(() => db.subcategories.orderBy('name').toArray(), [db]);
  const transactions = useLiveQuery(() => db.transactions.toArray(), [db]);
  const cardBillPeriods = useLiveQuery(() => db.cardBillPeriods?.toArray() || [], [db]);

  const [isOpen, setIsOpen] = useState(false);
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [editingInstallmentInfo, setEditingInstallmentInfo] = useState<InstallmentInfo | null>(null);
  
  const [deleteTransaction, setDeleteTransaction] = useState<any | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  
  const [lastAddedTransactionIds, setLastAddedTransactionIds] = useState<string[]>([]);
  const [showUndo, setShowUndo] = useState(false);
  const undoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
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

  const [isBillPeriodModalOpen, setIsBillPeriodModalOpen] = useState(false);
  const [editingPeriodAccount, setEditingPeriodAccount] = useState<any | null>(null);
  const [periodStartDate, setPeriodStartDate] = useState("");
  const [periodEndDate, setPeriodEndDate] = useState("");
  const [periodDueDate, setPeriodDueDate] = useState("");
  const [isPeriodCustom, setIsPeriodCustom] = useState(false);

  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const navigateMonth = (direction: number) => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + direction, 1));
  };

  const selectedSubcat = subcategories?.find(s => s.id === subcategoryId);
  const isTransfer = selectedSubcat?.type === 'Transferência';

  // Atualiza automaticamente o checkbox se a data for futura quando o usuário mudar
  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    const todayString = new Date().toISOString().split("T")[0];
    const isFuture = new Date(newDate + "T12:00:00Z").getTime() > new Date(todayString + "T12:00:00Z").getTime();
    setIsPending(isFuture);
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !accountId || !subcategoryId || !amount) return;
    if (isTransfer && !destinationAccountId) return;
    
    const subcat = subcategories?.find(s => s.id === subcategoryId);
    if (!subcat) return;

    const categoryId = subcat.categoryId;
    const parsedInstallments = Math.max(1, parseInt(String(installments)) || 1);
    const parsedAmount = parseFloat(amount);

    // MODO EDIÇÃO: Atualiza a transação selecionada (e suas parcelas futuras se for compra parcelada)
    if (editingTransactionId) {
      const currentTx = await db.transactions.get(editingTransactionId);
      if (!currentTx) return;

      const info = editingInstallmentInfo || getInstallmentInfo(currentTx);
      const rawDesc = description.replace(/\s*-\s*Parcela\s+\d+\s+de\s+\d+$/i, '').trim();
      const currentDesc = info.isInstallment ? `${rawDesc} - Parcela ${info.currentNumber} de ${info.totalNumber}` : description;

      let finalAmount = parsedAmount;
      if (subcat.type === 'Despesa') {
        finalAmount = -Math.abs(finalAmount);
      } else {
        finalAmount = Math.abs(finalAmount);
      }

      const txStatus: 'Pendente' | 'Paga' = isPending ? 'Pendente' : 'Paga';
      const sharedGroupId = currentTx.installmentGroupId || (info.isInstallment ? (info.groupId || currentTx.id) : undefined);

      if (isTransfer) {
        if (currentTx.linkedTransactionId) {
          const pair = await db.transactions.where('id').anyOf([currentTx.id, currentTx.linkedTransactionId]).toArray();
          const originTx = pair.find(p => p.amount < 0) || currentTx;
          const destTx = pair.find(p => p.amount > 0) || pair.find(p => p.id === currentTx.linkedTransactionId);

          if (originTx) {
            await db.transactions.update(originTx.id, {
              date,
              accountId,
              categoryId,
              subcategoryId,
              description: currentDesc,
              amount: -Math.abs(parsedAmount),
              status: txStatus,
              ...(info.isInstallment ? {
                installmentGroupId: sharedGroupId,
                installmentNumber: info.currentNumber,
                installmentTotal: info.totalNumber
              } : {})
            });
          }

          if (destTx) {
            await db.transactions.update(destTx.id, {
              date,
              accountId: destinationAccountId,
              categoryId,
              subcategoryId,
              description: currentDesc,
              amount: Math.abs(parsedAmount),
              status: txStatus,
              ...(info.isInstallment ? {
                installmentGroupId: sharedGroupId,
                installmentNumber: info.currentNumber,
                installmentTotal: info.totalNumber
              } : {})
            });
          }
        }
      } else {
        await db.transactions.update(currentTx.id, {
          date,
          accountId,
          categoryId,
          subcategoryId,
          description: currentDesc,
          amount: finalAmount,
          status: txStatus,
          ...(info.isInstallment ? {
            installmentGroupId: sharedGroupId,
            installmentNumber: info.currentNumber,
            installmentTotal: info.totalNumber
          } : {})
        });
      }

      // Se for compra parcelada, atualizar também as parcelas futuras que ainda não foram baixadas (status !== 'Paga')
      if (info.isInstallment) {
        const allTxs = await db.transactions.toArray();
        const futurePending = findFuturePendingInstallments(currentTx, allTxs);

        for (const fTx of futurePending) {
          const fInfo = getInstallmentInfo(fTx);
          const fDesc = `${rawDesc} - Parcela ${fInfo.currentNumber} de ${fInfo.totalNumber}`;
          const fDateStr = calculateFutureInstallmentDate(date, info.currentNumber, fInfo.currentNumber);

          if (isTransfer || fTx.linkedTransactionId) {
            const pair = await db.transactions.where('id').anyOf([fTx.id, fTx.linkedTransactionId || '']).toArray();
            const originTx = pair.find(p => p.amount < 0) || fTx;
            const destTx = pair.find(p => p.amount > 0);

            if (originTx) {
              await db.transactions.update(originTx.id, {
                date: fDateStr,
                accountId,
                categoryId,
                subcategoryId,
                description: fDesc,
                amount: -Math.abs(parsedAmount),
                installmentGroupId: sharedGroupId,
                installmentNumber: fInfo.currentNumber,
                installmentTotal: fInfo.totalNumber
              });
            }

            if (destTx) {
              await db.transactions.update(destTx.id, {
                date: fDateStr,
                accountId: destinationAccountId,
                categoryId,
                subcategoryId,
                description: fDesc,
                amount: Math.abs(parsedAmount),
                installmentGroupId: sharedGroupId,
                installmentNumber: fInfo.currentNumber,
                installmentTotal: fInfo.totalNumber
              });
            }
          } else {
            await db.transactions.update(fTx.id, {
              date: fDateStr,
              accountId,
              categoryId,
              subcategoryId,
              description: fDesc,
              amount: finalAmount,
              installmentGroupId: sharedGroupId,
              installmentNumber: fInfo.currentNumber,
              installmentTotal: fInfo.totalNumber
            });
          }
        }
      }

      setEditingTransactionId(null);
      setEditingInstallmentInfo(null);
      setIsOpen(false);
      setDate(new Date().toISOString().split("T")[0]);
      setAccountId("");
      setDestinationAccountId("");
      setSubcategoryId("");
      setDescription("");
      setAmount("");
      setInstallments(1);
      return;
    }

    // MODO CRIAÇÃO (Nova transação com suporte a parcelas e geração de installmentGroupId)
    const totalAmount = parsedAmount;
    const installmentBaseValue = Math.floor((totalAmount / parsedInstallments) * 100 + Number.EPSILON) / 100;
    const remainder = parseFloat((totalAmount - (installmentBaseValue * parsedInstallments)).toFixed(2));

    const newlyAddedIds: string[] = [];
    const [origYear, origMonth, origDay] = date.split('-').map(Number);
    const installmentGroupId = parsedInstallments > 1 ? crypto.randomUUID() : undefined;

    for (let i = 1; i <= parsedInstallments; i++) {
      const currentAmount = i === 1 ? installmentBaseValue + remainder : installmentBaseValue;
      const currentDesc = parsedInstallments > 1 ? `${description} - Parcela ${i} de ${parsedInstallments}` : description;
      
      const targetMonthIndex = (origMonth - 1) + (i - 1);
      const targetYear = origYear + Math.floor(targetMonthIndex / 12);
      const targetMonth = ((targetMonthIndex % 12) + 12) % 12; // 0-11
      const maxDaysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
      const actualDay = Math.min(origDay, maxDaysInTargetMonth);
      const installmentDateStr = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(actualDay).padStart(2, '0')}`;
      
      let txStatus: 'Pendente' | 'Paga' = isPending ? 'Pendente' : 'Paga';
      if (i > 1 && !isPending) {
         const todayString = new Date().toISOString().split("T")[0];
         const isFuture = new Date(installmentDateStr + "T12:00:00Z").getTime() > new Date(todayString + "T12:00:00Z").getTime();
         if (isFuture) txStatus = 'Pendente';
      }

      if (isTransfer) {
        const id1 = crypto.randomUUID();
        const id2 = crypto.randomUUID();
        newlyAddedIds.push(id1, id2);

        // Saída (Origem)
        await db.transactions.add({
          id: id1,
          date: installmentDateStr,
          accountId,
          categoryId,
          subcategoryId,
          description: currentDesc,
          amount: -Math.abs(currentAmount),
          linkedTransactionId: id2,
          status: txStatus,
          installmentGroupId,
          installmentNumber: parsedInstallments > 1 ? i : undefined,
          installmentTotal: parsedInstallments > 1 ? parsedInstallments : undefined,
        });

        // Entrada (Destino)
        await db.transactions.add({
          id: id2,
          date: installmentDateStr,
          accountId: destinationAccountId,
          categoryId,
          subcategoryId,
          description: currentDesc,
          amount: Math.abs(currentAmount),
          linkedTransactionId: id1,
          status: txStatus,
          installmentGroupId,
          installmentNumber: parsedInstallments > 1 ? i : undefined,
          installmentTotal: parsedInstallments > 1 ? parsedInstallments : undefined,
        });
      } else {
        let finalAmount = currentAmount;
        if (subcat.type === 'Despesa') {
          finalAmount = -Math.abs(finalAmount);
        } else {
          finalAmount = Math.abs(finalAmount);
        }

        const newId = crypto.randomUUID();
        newlyAddedIds.push(newId);
        await db.transactions.add({
          id: newId,
          date: installmentDateStr,
          accountId,
          categoryId,
          subcategoryId,
          description: currentDesc,
          amount: finalAmount,
          status: txStatus,
          installmentGroupId,
          installmentNumber: parsedInstallments > 1 ? i : undefined,
          installmentTotal: parsedInstallments > 1 ? parsedInstallments : undefined,
        });
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

    if (newlyAddedIds.length > 0) {
      setLastAddedTransactionIds(newlyAddedIds);
      setShowUndo(true);
      if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
      undoTimeoutRef.current = setTimeout(() => {
        setShowUndo(false);
        setLastAddedTransactionIds([]);
      }, 10000); // 10 segundos
    }
  };

  const handleUndo = async () => {
    for (const id of lastAddedTransactionIds) {
      await db.transactions.delete(id);
    }
    setShowUndo(false);
    setLastAddedTransactionIds([]);
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
  };

  const handleEdit = async (t: any) => {
    const info = getInstallmentInfo(t);
    setEditingInstallmentInfo(info);
    setEditingTransactionId(t.id);
    setDate(t.date);
    setSubcategoryId(t.subcategoryId);
    setDescription(info.isInstallment ? info.baseDescription : t.description);
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

  const openDeleteConfirm = (t: any) => {
    setDeleteTransaction(t);
    setIsDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTransaction) return;
    if (deleteTransaction.linkedTransactionId) {
      await db.transactions.delete(deleteTransaction.linkedTransactionId);
    }
    await db.transactions.delete(deleteTransaction.id);
    setDeleteTransaction(null);
  };

  const toggleReconciled = async (t: any) => {
    await db.transactions.update(t.id, {
      reconciled: !t.reconciled
    });
  };

  const openMover = (t: any) => {
     setMoverTransaction(t);
     const acc = accounts?.find(a => a.id === t.accountId);
     if (acc && acc.isCreditCard && acc.closingDay && acc.dueDay) {
        setMoverMonthStr(t.creditCardBillDate || getNaturalBillMonth(t.date, acc.closingDay, acc.dueDay, cardBillPeriods, acc.id));
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

  const openBillPeriodModal = (acc: any) => {
    const period = getCreditCardBillPeriod(targetMonthStr, acc.closingDay, acc.dueDay, cardBillPeriods, acc.id);
    setEditingPeriodAccount(acc);
    setPeriodStartDate(period.startDateStr);
    setPeriodEndDate(period.endDateStr);
    setPeriodDueDate(period.dueDateStr);
    setIsPeriodCustom(period.isCustom);
    setIsBillPeriodModalOpen(true);
  };

  const handleSaveBillPeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPeriodAccount || !periodStartDate || !periodEndDate || !periodDueDate) return;
    
    const periodId = `${editingPeriodAccount.id}_${targetMonthStr}`;
    await db.cardBillPeriods.put({
      id: periodId,
      accountId: editingPeriodAccount.id,
      monthStr: targetMonthStr,
      startDate: periodStartDate,
      endDate: periodEndDate,
      dueDate: periodDueDate
    });
    
    setIsBillPeriodModalOpen(false);
    setEditingPeriodAccount(null);
  };

  const handleResetBillPeriod = async () => {
    if (!editingPeriodAccount) return;
    const periodId = `${editingPeriodAccount.id}_${targetMonthStr}`;
    await db.cardBillPeriods.delete(periodId);
    setIsBillPeriodModalOpen(false);
    setEditingPeriodAccount(null);
  };

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

    // Ordena as transações cronologicamente (se mesmo dia, entradas primeiro)
    const sorted = [...transactions].sort((a, b) => {
      const timeDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (timeDiff !== 0) return timeDiff;
      return b.amount - a.amount;
    });

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
            const billMonth = t.creditCardBillDate || getNaturalBillMonth(t.date, acc.closingDay, acc.dueDay, cardBillPeriods, acc.id);
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
        
        const subcat = t.subcategoryId ? subcategories.find(s => s.id === t.subcategoryId) : null;
        const cat = categories.find(c => c.id === (subcat ? subcat.categoryId : t.categoryId));
        
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
  }, [transactions, accounts, categories, subcategories, cardBillPeriods, currentDate, targetMonthStr]);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Transações</h1>
        
        <div className="flex items-center justify-between sm:justify-end gap-2">
          <div className="flex items-center gap-1 sm:gap-2 bg-muted/40 p-1 rounded-md border w-full sm:w-auto justify-between">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigateMonth(-1)}>
              <ChevronLeft size={16} />
            </Button>
            <span className="font-bold min-w-[130px] sm:min-w-[150px] text-center text-xs sm:text-sm capitalize">
              {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigateMonth(1)}>
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      </div>

      {showUndo && (
        <div className="w-full bg-green-50 dark:bg-green-950/40 text-green-800 dark:text-green-300 p-3 rounded-md text-xs sm:text-sm border border-green-200 dark:border-green-900 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-green-600 shrink-0" />
            <span>Transação(ões) registrada(s) com sucesso.</span>
          </div>
          <Button variant="outline" size="sm" onClick={handleUndo} className="h-7 text-xs bg-white dark:bg-gray-800 text-green-700 dark:text-green-300 hover:bg-green-50 border-green-300">
            Desfazer Adição
          </Button>
        </div>
      )}
        
        <Dialog open={isOpen} onOpenChange={(open) => {
          if (!open) {
            setEditingTransactionId(null);
            setEditingInstallmentInfo(null);
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

            {editingInstallmentInfo?.isInstallment && (
              <div className="bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200 border border-amber-200 dark:border-amber-800 p-3 rounded-md text-xs space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <span>📦</span> Compra Parcelada (Parcela {editingInstallmentInfo.currentNumber} de {editingInstallmentInfo.totalNumber})
                </div>
                <p>
                  As alterações salvas serão aplicadas a esta parcela e a todas as parcelas futuras pendentes ({editingInstallmentInfo.currentNumber} a {editingInstallmentInfo.totalNumber}). Parcelas já baixadas (Pagas) não serão modificadas.
                </p>
              </div>
            )}

            <form onSubmit={handleAddTransaction} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Data</Label>
                <Input type="date" value={date} onChange={(e) => handleDateChange(e.target.value)} required />
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

      {/* Modal para Ajustar Vigência da Fatura do Cartão */}
      <Dialog open={isBillPeriodModalOpen} onOpenChange={setIsBillPeriodModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays size={20} className="text-blue-500" />
              Vigência da Fatura ({targetMonthStr.split('-').reverse().join('/')})
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            <strong>{editingPeriodAccount?.name}</strong>: Ajuste as datas de início, fechamento e vencimento para a fatura deste mês. Os demais meses mantêm o cálculo automático padrão.
          </p>
          <form onSubmit={handleSaveBillPeriod} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="period-start">Início do Período de Compras</Label>
              <Input 
                id="period-start"
                type="date"
                value={periodStartDate}
                onChange={(e) => setPeriodStartDate(e.target.value)}
                required
              />
              <p className="text-[11px] text-muted-foreground">Data da primeira compra que entra nesta fatura.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="period-end">Data de Fechamento (Fim do Período)</Label>
              <Input 
                id="period-end"
                type="date"
                value={periodEndDate}
                onChange={(e) => setPeriodEndDate(e.target.value)}
                required
              />
              <p className="text-[11px] text-muted-foreground">Último dia de compras incluídas nesta fatura.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="period-due">Data de Vencimento</Label>
              <Input 
                id="period-due"
                type="date"
                value={periodDueDate}
                onChange={(e) => setPeriodDueDate(e.target.value)}
                required
              />
              <p className="text-[11px] text-muted-foreground">Dia do pagamento da fatura.</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              {isPeriodCustom && (
                <Button 
                  type="button" 
                  variant="outline" 
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                  onClick={handleResetBillPeriod}
                >
                  Restaurar Padrão Automático
                </Button>
              )}
              <Button type="submit" className="flex-1">
                Salvar Vigência
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {accounts?.map(acc => {
        const accTransactions = filteredTransactions.filter(t => t.accountId === acc.id);
        const periodOpeningBalance = openingBalances[acc.id] || 0;
        
        return (
          <div key={acc.id} className="mb-8 space-y-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                {acc.name}
                {acc.isCreditCard && (
                  <span className="text-xs font-normal px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                    Cartão de Crédito
                  </span>
                )}
              </h2>
              <Button size="sm" className="flex items-center justify-center gap-2 w-full sm:w-auto" onClick={() => {
                setEditingTransactionId(null);
                setEditingInstallmentInfo(null);
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
            
            {acc.isCreditCard && acc.closingDay && acc.dueDay && isMonthFilter && (() => {
              const period = getCreditCardBillPeriod(targetMonthStr, acc.closingDay, acc.dueDay, cardBillPeriods, acc.id);
              return (
                <div className="bg-blue-50/60 dark:bg-blue-950/30 text-blue-900 dark:text-blue-200 p-3.5 sm:p-4 rounded-lg text-sm border border-blue-200 dark:border-blue-900/50 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-3">
                    <span className="text-2xl flex-shrink-0">💳</span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <strong className="text-sm sm:text-base font-semibold">Fatura de {targetMonthStr.split('-').reverse().join('/')}</strong>
                        {period.isCustom ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                            ⚡ Vigência Personalizada
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                            Fecha dia {acc.closingDay}, Vence dia {acc.dueDay}
                          </span>
                        )}
                      </div>
                      <div className="text-xs sm:text-sm opacity-90 space-y-0.5">
                        <div>
                          <span className="font-medium">Período:</span> {period.startDate.toLocaleDateString('pt-BR')} a {period.endDate.toLocaleDateString('pt-BR')}
                        </div>
                        <div>
                          <span className="font-medium">Vencimento:</span> {period.dueDate.toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    className="self-stretch sm:self-auto flex items-center justify-center gap-2 bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-800 border-blue-300 dark:border-blue-700 font-medium"
                    onClick={() => openBillPeriodModal(acc)}
                  >
                    <CalendarDays size={16} />
                    Alterar Vigência
                  </Button>
                </div>
              );
            })()}
            
            {/* Desktop Table View (hidden on mobile) */}
            <div className="hidden md:block border rounded-md bg-card overflow-hidden">
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
                        {isPending && <span className="ml-2 text-xs font-bold text-orange-500 bg-orange-100 dark:bg-orange-950 dark:text-orange-300 px-1 py-0.5 rounded no-underline">Pendente</span>}
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
                          <Button variant="outline" size="sm" onClick={() => handleEdit(t)}>Editar</Button>
                          {isPending && (
                            <Button variant="default" size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => openBaixa(t)}>Baixa</Button>
                          )}
                          {acc.isCreditCard && (
                            <Button variant="secondary" size="sm" onClick={() => openMover(t)}>Mover</Button>
                          )}
                          <Button variant="destructive" size="sm" onClick={() => openDeleteConfirm(t)}>Excluir</Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className={`h-8 w-8 ${t.reconciled ? 'text-green-500 hover:text-green-600 hover:bg-green-50' : 'text-gray-400 hover:text-gray-600'}`}
                            onClick={() => toggleReconciled(t)}
                            title={t.reconciled ? "Marcar como não conferido" : "Marcar como conferido"}
                          >
                            {t.reconciled ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                          </Button>
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

            {/* Mobile Card List View (hidden on desktop) */}
            <div className="block md:hidden space-y-3">
              {/* Opening balance card */}
              <div className="bg-muted/40 p-3 rounded-lg flex items-center justify-between text-sm border">
                <span className="text-muted-foreground font-medium text-xs">Saldo Anterior</span>
                <span className={`font-bold text-sm ${periodOpeningBalance >= 0 ? 'text-blue-500' : 'text-red-500'}`}>
                  {formatCurrency(periodOpeningBalance)}
                </span>
              </div>

              {/* Transactions Cards */}
              {accTransactions.map((t) => {
                const isPending = t.status === 'Pendente';
                return (
                  <div 
                    key={t.id} 
                    className={cn(
                      "p-3.5 rounded-lg border bg-card shadow-sm space-y-2.5 transition-all",
                      isPending && "opacity-80 bg-muted/20 border-dashed"
                    )}
                  >
                    {/* Top Row: Date, Pending Badge, and Reconciled Checkbox */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-foreground">
                          {new Date(t.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                        </span>
                        {isPending && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300">
                            Pendente
                          </span>
                        )}
                      </div>
                      <button 
                        type="button"
                        onClick={() => toggleReconciled(t)} 
                        className={cn(
                          "flex items-center gap-1 p-1 rounded-md transition-colors text-xs",
                          t.reconciled ? "text-green-600 bg-green-50 dark:bg-green-950/50 font-medium" : "text-muted-foreground hover:text-foreground"
                        )}
                        title={t.reconciled ? "Marcar como não conferido" : "Marcar como conferido"}
                      >
                        {t.reconciled ? (
                          <>
                            <CheckCircle2 size={16} />
                            <span className="text-[11px]">Conferido</span>
                          </>
                        ) : (
                          <>
                            <Circle size={16} />
                            <span className="text-[11px]">Conferir</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Middle Row: Description & Category Badge */}
                    <div className="space-y-1">
                      <div className="font-semibold text-sm text-foreground break-words">
                        {t.description || "Sem descrição"}
                      </div>
                      <div className="inline-block px-2 py-0.5 rounded-md text-[11px] font-medium bg-muted text-muted-foreground">
                        {t.categoryName}
                      </div>
                    </div>

                    {/* Bottom Row: Running balance & Amount */}
                    <div className="flex items-end justify-between pt-1.5 border-t border-border/50">
                      <div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Saldo após</div>
                        <div className={cn("text-xs font-semibold", t.currentBalance >= 0 ? "text-blue-500" : "text-red-500")}>
                          {formatCurrency(t.currentBalance)}
                        </div>
                      </div>
                      <div className={cn("text-base font-bold tracking-tight", t.amount >= 0 ? "text-blue-500" : "text-red-500")}>
                        {t.amount > 0 ? `+${formatCurrency(t.amount)}` : formatCurrency(t.amount)}
                      </div>
                    </div>

                    {/* Quick Action Buttons */}
                    <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-border/40 flex-wrap">
                      <Button variant="outline" size="sm" className="h-7 text-xs px-2.5" onClick={() => handleEdit(t)}>
                        Editar
                      </Button>
                      {isPending && (
                        <Button variant="default" size="sm" className="h-7 text-xs px-2.5 bg-green-600 hover:bg-green-700 text-white" onClick={() => openBaixa(t)}>
                          Baixa
                        </Button>
                      )}
                      {acc.isCreditCard && (
                        <Button variant="secondary" size="sm" className="h-7 text-xs px-2.5" onClick={() => openMover(t)}>
                          Mover
                        </Button>
                      )}
                      <Button variant="destructive" size="sm" className="h-7 text-xs px-2.5" onClick={() => openDeleteConfirm(t)}>
                        Excluir
                      </Button>
                    </div>
                  </div>
                );
              })}

              {accTransactions.length === 0 && (
                <div className="text-center py-6 text-sm text-muted-foreground bg-muted/20 border border-dashed rounded-lg">
                  Nenhuma transação encontrada nesta conta neste período.
                </div>
              )}
            </div>
          </div>
        );
      })}

      <ConfirmDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        title="Excluir Lançamento"
        description={
          deleteTransaction ? (
            <span>
              Tem certeza que deseja excluir o lançamento{" "}
              <strong className="text-foreground">{deleteTransaction.description || "sem descrição"}</strong> no valor de{" "}
              <strong className="text-foreground">
                {formatCurrency(Math.abs(deleteTransaction.amount))}
              </strong>?
              {deleteTransaction.linkedTransactionId && (
                <span className="block mt-2 text-xs text-amber-600 dark:text-amber-400 font-medium">
                  ⚠️ Atenção: Por se tratar de uma transferência, o lançamento vinculado na conta de destino também será excluído.
                </span>
              )}
            </span>
          ) : ""
        }
        confirmText="Excluir"
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
