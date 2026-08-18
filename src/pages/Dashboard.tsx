import { useState, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/db";
import { getNaturalBillMonth } from "@/lib/creditCardUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell 
} from "recharts";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#a855f7', '#ec4899', '#f43f5e'];

export default function Dashboard() {
  const transactions = useLiveQuery(() => db.transactions.toArray());
  const categories = useLiveQuery(() => db.categories.toArray());
  const subcategories = useLiveQuery(() => db.subcategories.toArray());
  const accounts = useLiveQuery(() => db.accounts.toArray());

  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
  
  const navigateMonth = (direction: number) => {
    setCurrentMonth(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + direction);
      return d;
    });
  };
  
  const [showSubcategoriesExpense, setShowSubcategoriesExpense] = useState(false);
  const [includeCreditCards, setIncludeCreditCards] = useState(false);
  const [includePending, setIncludePending] = useState(false);
  const [showIncomeValues, setShowIncomeValues] = useState(false);
  const [showExpenseValues, setShowExpenseValues] = useState(false);

  const { filteredTransactions, startTimestamp, endTimestamp } = useMemo(() => {
    if (!transactions) return { filteredTransactions: [], startTimestamp: 0, endTimestamp: 0 };

    let startD = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1, 0, 0, 0, 0);
    let endD = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0, 23, 59, 59, 999);

    const st = startD.getTime();
    const et = endD.getTime();

    const filtered = transactions?.reduce((accList, t) => {
      if (t.status === 'Pendente' && !includePending) return accList;
      
      const acc = accounts?.find(a => a.id === t.accountId);
      let effectiveTime = new Date(t.date + "T12:00:00").getTime();
      let effectiveDateStr = t.date;
      
      if (acc?.isCreditCard && acc.closingDay && acc.dueDay) {
          const billMonth = t.creditCardBillDate || getNaturalBillMonth(t.date, acc.closingDay, acc.dueDay);
          const [y, m] = billMonth.split('-').map(Number);
          
          // O mês efetivo da despesa será o mês da fatura (mês de fechamento).
          // Usamos o dia 1 para garantir que caia no mês/ano correto no filtro global.
          effectiveTime = new Date(y, m - 1, 1, 12, 0, 0).getTime();
          effectiveDateStr = new Date(effectiveTime).toISOString().split('T')[0];
      }
      
      if (effectiveTime >= st && effectiveTime <= et) {
         if (acc?.isCreditCard && !includeCreditCards) {
            // Se for cartão e o filtro de incluir cartões estiver desligado, ignora.
         } else {
            accList.push({ ...t, effectiveDate: effectiveDateStr });
         }
      }
      return accList;
    }, [] as any[]) || [];

    return { filteredTransactions: filtered, startTimestamp: st, endTimestamp: et };
  }, [transactions, currentMonth, accounts, includeCreditCards, includePending]);

  // 1. Prepara dados do Gráfico de Barras (Receitas vs Despesas por mês)
  const barChartData = useMemo(() => {
    if (!transactions) return [];

    const dataObj: Record<string, { label: string, Receitas: number, Despesas: number }> = {};
    for (let i = 0; i < 12; i++) {
      const key = `${currentYear}-${String(i + 1).padStart(2, '0')}`;
      dataObj[key] = { label: key, Receitas: 0, Despesas: 0 };
    }

    transactions.forEach(t => {
      if (t.status === 'Pendente' && !includePending) return;
      
      const acc = accounts?.find(a => a.id === t.accountId);
      let effectiveTime = new Date(t.date + "T12:00:00").getTime();
      
      if (acc?.isCreditCard && acc.closingDay && acc.dueDay) {
          const billMonth = t.creditCardBillDate || getNaturalBillMonth(t.date, acc.closingDay, acc.dueDay);
          const [y, m] = billMonth.split('-').map(Number);
          effectiveTime = new Date(y, m - 1, 1, 12, 0, 0).getTime();
      }
      
      if (acc?.isCreditCard && !includeCreditCards) return;

      const d = new Date(effectiveTime);
      if (d.getFullYear() !== currentYear) return;

      const subcat = t.subcategoryId ? subcategories?.find(s => s.id === t.subcategoryId) : null;
      if (subcat?.type === 'Transferência') return;

      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      
      if (t.amount > 0) {
        dataObj[key].Receitas += t.amount;
      } else {
        dataObj[key].Despesas += Math.abs(t.amount);
      }
    });

    return Object.values(dataObj).sort((a, b) => a.label.localeCompare(b.label));
  }, [transactions, currentYear, subcategories, accounts, includeCreditCards, includePending]);

  // 2. Prepara dados dos Gráficos de Rosca (Receitas e Despesas por Categoria/Subcategoria)
  const { pieIncome, pieExpense } = useMemo(() => {
    if (!categories || !subcategories || !accounts) return { pieIncome: [], pieExpense: [] };

    const incomeMap: Record<string, number> = {};
    const expenseMap: Record<string, number> = {};

    filteredTransactions.forEach(t => {
      const subcat = t.subcategoryId ? subcategories.find(s => s.id === t.subcategoryId) : null;
      if (subcat?.type === 'Transferência') return;
      
      const cat = categories.find(c => c.id === (subcat ? subcat.categoryId : t.categoryId));
      if (!cat) return;

      const incomeLabel = subcat ? `${cat.name} > ${subcat.name}` : cat.name;
      const expenseLabel = (showSubcategoriesExpense && subcat) ? `${cat.name} > ${subcat.name}` : cat.name;
      
      if (t.amount > 0) {
        incomeMap[incomeLabel] = (incomeMap[incomeLabel] || 0) + t.amount;
      } else {
        expenseMap[expenseLabel] = (expenseMap[expenseLabel] || 0) + Math.abs(t.amount);
      }
    });

    const totalIncome = Object.values(incomeMap).reduce((acc, curr) => acc + curr, 0);
    const totalExpense = Object.values(expenseMap).reduce((acc, curr) => acc + curr, 0);

    return {
      pieIncome: Object.keys(incomeMap).map(name => ({ 
        name, 
        value: incomeMap[name],
        percentage: ((incomeMap[name] / totalIncome) * 100).toFixed(1) + '%'
      })),
      pieExpense: Object.keys(expenseMap).map(name => ({ 
        name, 
        value: expenseMap[name],
        percentage: ((expenseMap[name] / totalExpense) * 100).toFixed(1) + '%'
      }))
    };
  }, [filteredTransactions, categories, subcategories, showSubcategoriesExpense]);

  // 3. Prepara os saldos das contas (soma de todas as transações até o mês selecionado)
  const accountBalances = useMemo(() => {
    if (!accounts || !transactions) return [];

    const targetMonthStr = `${currentMonth.getFullYear()}-${(currentMonth.getMonth() + 1).toString().padStart(2, '0')}`;

    return accounts.map(acc => {
      let balance = acc.isCreditCard ? 0 : (acc.initialBalance || 0);
      
      transactions.forEach(t => {
        if (t.accountId === acc.id && (t.status !== 'Pendente' || includePending)) {
          if (acc.isCreditCard && acc.closingDay && acc.dueDay) {
            // Cartão de crédito: saldo é apenas a soma da fatura atual (assumindo que anteriores foram pagas)
            const billMonth = t.creditCardBillDate || getNaturalBillMonth(t.date, acc.closingDay, acc.dueDay);
            if (billMonth === targetMonthStr) {
              balance += t.amount;
            }
          } else {
            // Conta normal: soma cumulativa até o fim do mês selecionado
            const tTime = new Date(t.date + "T12:00:00").getTime();
            if (tTime <= endTimestamp) {
              balance += t.amount;
            }
          }
        }
      });

      return { ...acc, currentBalance: balance };
    });
  }, [accounts, transactions, endTimestamp, currentMonth, includePending]);

  const pendingTransactions = useMemo(() => {
    if (!transactions) return [];
    
    return transactions.filter(t => {
      const tTime = new Date(t.date + "T12:00:00").getTime();
      return tTime >= startTimestamp && tTime <= endTimestamp && t.status === 'Pendente';
    }).sort((a, b) => {
      const timeDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (timeDiff !== 0) return timeDiff;
      return b.amount - a.amount;
    })
      .map(t => {
         const subcat = subcategories?.find(s => s.id === t.subcategoryId);
         const cat = categories?.find(c => c.id === (subcat ? subcat.categoryId : t.categoryId));
         return {
           ...t,
           categoryName: subcat ? `${cat?.name} > ${subcat.name}` : cat?.name || 'Desconhecida'
         };
      });
  }, [transactions, startTimestamp, endTimestamp, categories, subcategories]);

  const totalBalance = accountBalances.reduce((acc, curr) => acc + curr.currentBalance, 0);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Visão Geral</h1>
        
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex items-center gap-2 bg-muted/30 px-3 py-2 rounded-md border">
            <input type="checkbox" id="global-include-pending" checked={includePending} onChange={(e) => setIncludePending(e.target.checked)} className="h-4 w-4 cursor-pointer" />
            <label htmlFor="global-include-pending" className="text-sm font-medium leading-none cursor-pointer select-none">Incluir Previstas</label>
          </div>
          
          <div className="flex items-center gap-2 bg-muted/30 px-3 py-2 rounded-md border">
            <input type="checkbox" id="global-include-credit-card" checked={includeCreditCards} onChange={(e) => setIncludeCreditCards(e.target.checked)} className="h-4 w-4 cursor-pointer" />
            <label htmlFor="global-include-credit-card" className="text-sm font-medium leading-none cursor-pointer select-none">Incluir Cartões</label>
          </div>

          <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-md border">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigateMonth(-1)}>
              <ChevronLeft size={16} />
            </Button>
            <span className="font-bold min-w-[150px] text-center text-sm capitalize">
              {currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigateMonth(1)}>
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="capitalize">
            Saldo em {currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Conta</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accountBalances.map((acc) => (
                <TableRow key={acc.id}>
                  <TableCell className="font-medium">{acc.name}</TableCell>
                  <TableCell className={`text-right font-bold ${acc.currentBalance >= 0 ? 'text-blue-500' : 'text-red-500'}`}>
                    {formatCurrency(acc.currentBalance)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/50">
                <TableCell className="font-bold">Total Geral</TableCell>
                <TableCell className={`text-right font-bold text-lg ${totalBalance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  {formatCurrency(totalBalance)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {pendingTransactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Contas Pendentes (No Período)</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingTransactions.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium text-orange-600">
                      {new Date(t.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                    </TableCell>
                    <TableCell>{t.categoryName}</TableCell>
                    <TableCell>{t.description || '-'}</TableCell>
                    <TableCell className={`text-right font-bold ${t.amount >= 0 ? 'text-blue-500' : 'text-red-500'}`}>
                      {formatCurrency(Math.abs(t.amount))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row justify-between items-center pb-2">
          <CardTitle>Receitas vs Despesas (Visão Anual)</CardTitle>
          <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-md border">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setCurrentYear(y => y - 1)}>
              <ChevronLeft size={14} />
            </Button>
            <span className="font-bold min-w-[80px] text-center text-sm">
              {currentYear}
            </span>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setCurrentYear(y => y + 1)}>
              <ChevronRight size={14} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="label" />
                <YAxis tickFormatter={(val) => `R$ ${val}`} />
                <Tooltip formatter={(val: any) => formatCurrency(val)} />
                <Legend />
                <Bar dataKey="Receitas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>Entradas por Categoria</CardTitle>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <input type="checkbox" id="val-income" checked={showIncomeValues} onChange={(e) => setShowIncomeValues(e.target.checked)} className="h-4 w-4 cursor-pointer" />
                <label htmlFor="val-income" className="text-sm font-medium leading-none cursor-pointer select-none">Valor R$</label>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              {pieIncome.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieIncome} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {pieIncome.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: any, name: any, props: any) => [
                        `${formatCurrency(value)} (${props.payload.percentage})`, 
                        name
                      ]} 
                    />
                    <Legend formatter={(value, entry: any) => showIncomeValues ? `${value}: ${formatCurrency(entry.payload.value)}` : value} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  Nenhuma receita registrada
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>Saídas por Categoria</CardTitle>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <input type="checkbox" id="val-expense" checked={showExpenseValues} onChange={(e) => setShowExpenseValues(e.target.checked)} className="h-4 w-4 cursor-pointer" />
                <label htmlFor="val-expense" className="text-sm font-medium leading-none cursor-pointer select-none">Valor R$</label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="subcat-expense" checked={showSubcategoriesExpense} onChange={(e) => setShowSubcategoriesExpense(e.target.checked)} className="h-4 w-4 cursor-pointer" />
                <label htmlFor="subcat-expense" className="text-sm font-medium leading-none cursor-pointer select-none">Ver Subcategorias</label>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              {pieExpense.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieExpense} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {pieExpense.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: any, name: any, props: any) => [
                        `${formatCurrency(value)} (${props.payload.percentage})`, 
                        name
                      ]} 
                    />
                    <Legend formatter={(value, entry: any) => showExpenseValues ? `${value}: ${formatCurrency(entry.payload.value)}` : value} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  Nenhuma despesa registrada
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
