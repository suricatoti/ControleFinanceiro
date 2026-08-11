import { useState, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell 
} from "recharts";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  
  const [showSubcategoriesExpense, setShowSubcategoriesExpense] = useState(false);

  const { filteredTransactions, startTimestamp, endTimestamp } = useMemo(() => {
    if (!transactions) return { filteredTransactions: [], startTimestamp: 0, endTimestamp: 0 };

    let startD = new Date();
    let endD = new Date();
    startD.setHours(0,0,0,0);
    endD.setHours(23,59,59,999);

    if (periodFilter === 'Mês Atual') {
      startD.setDate(1);
      endD.setMonth(endD.getMonth() + 1);
      endD.setDate(0);
    } else if (periodFilter === 'Ano atual') {
      startD = new Date(startD.getFullYear(), 0, 1);
      endD = new Date(startD.getFullYear(), 11, 31, 23, 59, 59, 999);
    } else if (periodFilter === 'Últimos 5 anos') {
      startD.setFullYear(startD.getFullYear() - 5);
    } else if (periodFilter === 'Últimos 10 anos') {
      startD.setFullYear(startD.getFullYear() - 10);
    } else if (periodFilter === 'Todo Período') {
      startD = new Date(0);
    } else if (periodFilter === 'Personalizado') {
      startD = new Date(customStartDate + "T00:00:00");
      endD = new Date(customEndDate + "T23:59:59");
    }

    const st = startD.getTime();
    const et = endD.getTime();

    const filtered = transactions?.filter(t => {
      const tTime = new Date(t.date).getTime();
      return tTime >= st && tTime <= et && t.status !== 'Pendente';
    }) || [];

    return { filteredTransactions: filtered, startTimestamp: st, endTimestamp: et };
  }, [transactions, periodFilter, customStartDate, customEndDate]);

  // 1. Prepara dados do Gráfico de Barras (Receitas vs Despesas por mês)
  const barChartData = useMemo(() => {
    const dataObj: Record<string, { label: string, Receitas: number, Despesas: number }> = {};
    const isYearly = periodFilter === 'Últimos 5 anos' || periodFilter === 'Últimos 10 anos' || periodFilter === 'Todo Período';
    const currentYear = new Date().getFullYear();

    if (periodFilter === 'Mês Atual') {
      const key = `${currentYear}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
      dataObj[key] = { label: key, Receitas: 0, Despesas: 0 };
    } else if (periodFilter === 'Ano atual') {
      for (let i = 0; i < 12; i++) {
        const key = `${currentYear}-${String(i + 1).padStart(2, '0')}`;
        dataObj[key] = { label: key, Receitas: 0, Despesas: 0 };
      }
    } else if (periodFilter === 'Últimos 5 anos') {
      for (let i = 4; i >= 0; i--) {
        const y = (currentYear - i).toString();
        dataObj[y] = { label: y, Receitas: 0, Despesas: 0 };
      }
    } else if (periodFilter === 'Últimos 10 anos') {
      for (let i = 9; i >= 0; i--) {
        const y = (currentYear - i).toString();
        dataObj[y] = { label: y, Receitas: 0, Despesas: 0 };
      }
    } else if (periodFilter === 'Personalizado') {
      const startD = new Date(startTimestamp);
      const endD = new Date(endTimestamp);
      let currentD = new Date(startD.getFullYear(), startD.getMonth(), 1);
      while (currentD <= endD) {
        const key = `${currentD.getFullYear()}-${String(currentD.getMonth() + 1).padStart(2, '0')}`;
        dataObj[key] = { label: key, Receitas: 0, Despesas: 0 };
        currentD.setMonth(currentD.getMonth() + 1);
      }
    }

    filteredTransactions.forEach(t => {
      const subcat = t.subcategoryId ? subcategories?.find(s => s.id === t.subcategoryId) : null;
      if (subcat?.type === 'Transferência') return;

      const d = new Date(t.date);
      const key = isYearly ? d.getFullYear().toString() : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      
      if (!dataObj[key]) {
        dataObj[key] = { label: key, Receitas: 0, Despesas: 0 };
      }
      
      if (t.amount > 0) {
        dataObj[key].Receitas += t.amount;
      } else {
        dataObj[key].Despesas += Math.abs(t.amount);
      }
    });

    return Object.values(dataObj).sort((a, b) => a.label.localeCompare(b.label));
  }, [filteredTransactions, periodFilter, subcategories]);

  // 2. Prepara dados dos Gráficos de Rosca (Receitas e Despesas por Categoria/Subcategoria)
  const { pieIncome, pieExpense } = useMemo(() => {
    if (!categories || !subcategories) return { pieIncome: [], pieExpense: [] };

    const incomeMap: Record<string, number> = {};
    const expenseMap: Record<string, number> = {};

    filteredTransactions.forEach(t => {
      const cat = categories.find(c => c.id === t.categoryId);
      if (!cat) return;
      
      const subcat = t.subcategoryId ? subcategories.find(s => s.id === t.subcategoryId) : null;
      if (subcat?.type === 'Transferência') return;

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

  // 3. Prepara os saldos atuais das contas (soma de todas as transações até hoje)
  const accountBalances = useMemo(() => {
    if (!accounts || !transactions) return [];

    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const todayTimestamp = today.getTime();

    return accounts.map(acc => {
      let balance = acc.initialBalance || 0;
      
      transactions.forEach(t => {
        if (t.accountId === acc.id) {
          const tTime = new Date(t.date).getTime();
          // Soma apenas transações passadas e de hoje, e que não estejam pendentes
          if (tTime <= todayTimestamp && t.status !== 'Pendente') {
            balance += t.amount;
          }
        }
      });

      return { ...acc, currentBalance: balance };
    });
  }, [accounts, transactions]);

  const pendingTransactions = useMemo(() => {
    if (!transactions) return [];
    
    return transactions.filter(t => {
      const tTime = new Date(t.date).getTime();
      return tTime >= startTimestamp && tTime <= endTimestamp && t.status === 'Pendente';
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(t => {
         const cat = categories?.find(c => c.id === t.categoryId);
         const subcat = subcategories?.find(s => s.id === t.subcategoryId);
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
              <SelectItem value="Ano atual">Ano atual</SelectItem>
              <SelectItem value="Últimos 5 anos">Últimos 5 anos</SelectItem>
              <SelectItem value="Últimos 10 anos">Últimos 10 anos</SelectItem>
              <SelectItem value="Todo Período">Todo Período</SelectItem>
              <SelectItem value="Personalizado">Personalizado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Saldos Atuais</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Conta</TableHead>
                <TableHead className="text-right">Saldo Atual</TableHead>
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
        <CardHeader>
          <CardTitle>Receitas vs Despesas (No Período)</CardTitle>
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
          <CardHeader>
            <CardTitle>Entradas por Categoria</CardTitle>
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
                    <Legend />
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
            <div className="flex items-center gap-2">
              <input type="checkbox" id="subcat-expense" checked={showSubcategoriesExpense} onChange={(e) => setShowSubcategoriesExpense(e.target.checked)} className="h-4 w-4 cursor-pointer" />
              <label htmlFor="subcat-expense" className="text-sm font-medium leading-none cursor-pointer select-none">Ver Subcategorias</label>
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
                    <Legend />
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
