import { useState, useMemo } from "react";
import { NumericFormat } from "react-number-format";
import { useLiveQuery } from "dexie-react-hooks";
import { useWallet } from "@/contexts/WalletContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { cn } from "@/lib/utils";

export default function Categories() {
  const { db } = useWallet();
  const accounts = useLiveQuery(() => db.accounts.orderBy('name').toArray(), [db]);
  const categories = useLiveQuery(() => db.categories.orderBy('name').toArray(), [db]);
  const subcategories = useLiveQuery(() => db.subcategories.orderBy('name').toArray(), [db]);

  const [deleteItem, setDeleteItem] = useState<{
    type: 'account' | 'category' | 'subcategory';
    id: string;
    name: string;
  } | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const sortedSubcategories = useMemo(() => {
    if (!subcategories || !categories) return [];
    
    return [...subcategories].sort((a, b) => {
      const catA = categories.find(c => c.id === a.categoryId)?.name || '';
      const catB = categories.find(c => c.id === b.categoryId)?.name || '';
      
      const catCompare = catA.localeCompare(catB);
      if (catCompare !== 0) return catCompare;
      
      return a.name.localeCompare(b.name);
    });
  }, [subcategories, categories]);

  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingSubcategoryId, setEditingSubcategoryId] = useState<string | null>(null);

  // Account Form State
  const [accName, setAccName] = useState("");
  const [accBalance, setAccBalance] = useState("");
  const [accIsCreditCard, setAccIsCreditCard] = useState(false);
  const [accClosingDay, setAccClosingDay] = useState("");
  const [accDueDay, setAccDueDay] = useState("");

  // Category Form State
  const [catName, setCatName] = useState("");

  // Subcategory Form State
  const [subCatName, setSubCatName] = useState("");
  const [subCatParentId, setSubCatParentId] = useState("");
  const [subCatType, setSubCatType] = useState<"Receita" | "Despesa" | "Transferência" | "">("");
  const [subCatFreq, setSubCatFreq] = useState<"Fixo" | "Variável" | "N/A" | "">("");
  const [subCatNature, setSubCatNature] = useState<"Essencial" | "Qualidade de Vida" | "N/A" | "">("");

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accName || !accBalance) return;
    
    if (editingAccountId) {
      await db.accounts.update(editingAccountId, {
        name: accName,
        initialBalance: parseFloat(String(accBalance).replace(",", ".")) || 0,
        isCreditCard: accIsCreditCard,
        closingDay: accIsCreditCard && accClosingDay ? parseInt(accClosingDay, 10) : undefined,
        dueDay: accIsCreditCard && accDueDay ? parseInt(accDueDay, 10) : undefined,
      });
      setEditingAccountId(null);
    } else {
      await db.accounts.add({
        id: crypto.randomUUID(),
        name: accName,
        initialBalance: parseFloat(String(accBalance).replace(",", ".")) || 0,
        isCreditCard: accIsCreditCard,
        closingDay: accIsCreditCard && accClosingDay ? parseInt(accClosingDay, 10) : undefined,
        dueDay: accIsCreditCard && accDueDay ? parseInt(accDueDay, 10) : undefined,
      });
    }
    
    setAccName("");
    setAccBalance("");
    setAccIsCreditCard(false);
    setAccClosingDay("");
    setAccDueDay("");
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName) return;
    
    if (editingCategoryId) {
      await db.categories.update(editingCategoryId, {
        name: catName,
      });
      setEditingCategoryId(null);
    } else {
      await db.categories.add({
        id: crypto.randomUUID(),
        name: catName,
      });
    }

    setCatName("");
  };

  const openDeleteAccount = (acc: any) => {
    setDeleteItem({ type: 'account', id: acc.id, name: acc.name });
    setIsDeleteOpen(true);
  };

  const openDeleteCategory = (cat: any) => {
    setDeleteItem({ type: 'category', id: cat.id, name: cat.name });
    setIsDeleteOpen(true);
  };

  const openDeleteSubcategory = (subcat: any) => {
    setDeleteItem({ type: 'subcategory', id: subcat.id, name: subcat.name });
    setIsDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteItem) return;
    if (deleteItem.type === 'account') {
      await db.accounts.delete(deleteItem.id);
    } else if (deleteItem.type === 'category') {
      await db.categories.delete(deleteItem.id);
    } else if (deleteItem.type === 'subcategory') {
      await db.subcategories.delete(deleteItem.id);
    }
    setDeleteItem(null);
  };

  const handleAddSubcategory = async (e: React.FormEvent) => {
    e.preventDefault();
    let finalFreq = subCatFreq;
    let finalNature = subCatNature;
    
    if (subCatType === 'Transferência') {
      finalFreq = 'N/A';
      finalNature = 'N/A';
    } else if (!subCatFreq || !subCatNature) {
      return; // Obriga a preencher se não for transferência
    }

    if (editingSubcategoryId) {
      const oldSubcat = await db.subcategories.get(editingSubcategoryId);
      await db.subcategories.update(editingSubcategoryId, {
        name: subCatName,
        categoryId: subCatParentId,
        type: subCatType as "Receita" | "Despesa" | "Transferência",
        frequency: finalFreq as "Fixo" | "Variável" | "N/A",
        nature: finalNature as "Essencial" | "Qualidade de Vida" | "N/A",
      });
      
      if (oldSubcat && oldSubcat.categoryId !== subCatParentId) {
        await db.transactions.where('subcategoryId').equals(editingSubcategoryId).modify({
          categoryId: subCatParentId
        });
      }
      
      setEditingSubcategoryId(null);
    } else {
      await db.subcategories.add({
        id: crypto.randomUUID(),
        name: subCatName,
        categoryId: subCatParentId,
        type: subCatType as "Receita" | "Despesa" | "Transferência",
        frequency: finalFreq as "Fixo" | "Variável" | "N/A",
        nature: finalNature as "Essencial" | "Qualidade de Vida" | "N/A",
      });
    }

    setSubCatName("");
    setSubCatParentId("");
    setSubCatType("");
    setSubCatFreq("");
    setSubCatNature("");
  };

  const handleEditAccount = (acc: any) => {
    setEditingAccountId(acc.id);
    setAccName(acc.name);
    setAccBalance(acc.initialBalance.toString());
    setAccIsCreditCard(acc.isCreditCard || false);
    setAccClosingDay(acc.closingDay ? acc.closingDay.toString() : "");
    setAccDueDay(acc.dueDay ? acc.dueDay.toString() : "");
  };

  const handleEditCategory = (cat: any) => {
    setEditingCategoryId(cat.id);
    setCatName(cat.name);
  };

  const cancelEditAccount = () => {
    setEditingAccountId(null);
    setAccName("");
    setAccBalance("");
    setAccIsCreditCard(false);
    setAccClosingDay("");
    setAccDueDay("");
  };

  const handleEditSubcategory = (subcat: any) => {
    setEditingSubcategoryId(subcat.id);
    setSubCatName(subcat.name);
    setSubCatParentId(subcat.categoryId);
    setSubCatType(subcat.type);
    setSubCatFreq(subcat.frequency);
    setSubCatNature(subcat.nature);
  };

  const cancelEditCategory = () => {
    setEditingCategoryId(null);
    setCatName("");
  };

  const cancelEditSubcategory = () => {
    setEditingSubcategoryId(null);
    setSubCatName("");
    setSubCatParentId("");
    setSubCatType("");
    setSubCatFreq("");
    setSubCatNature("");
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Cadastros</h1>
      
      <Tabs defaultValue="contas" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6 sm:mb-8 h-10 sm:h-11">
          <TabsTrigger value="contas" className="text-xs sm:text-sm">Contas</TabsTrigger>
          <TabsTrigger value="categorias" className="text-xs sm:text-sm">Categorias</TabsTrigger>
          <TabsTrigger value="subcategorias" className="text-xs sm:text-sm">Subcategorias</TabsTrigger>
        </TabsList>
        
        {/* TAB DE CONTAS */}
        <TabsContent value="contas">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            <div className="lg:col-span-1 bg-card p-4 sm:p-6 rounded-lg border shadow-sm h-fit">
              <h2 className="text-lg sm:text-xl font-semibold mb-4">
                {editingAccountId ? "Editar Conta" : "Nova Conta"}
              </h2>
              <form onSubmit={handleAddAccount} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="accName">Nome da Conta</Label>
                  <Input 
                    id="accName" 
                    value={accName} 
                    onChange={(e) => setAccName(e.target.value)} 
                    placeholder="Ex: Itaú, Nubank" 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accBalance">Saldo Inicial (R$)</Label>
                  <NumericFormat 
                    id="accBalance"
                    customInput={Input}
                    value={accBalance}
                    onValueChange={(values) => setAccBalance(values.value)}
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
                    id="accIsCreditCard" 
                    checked={accIsCreditCard} 
                    onChange={(e) => setAccIsCreditCard(e.target.checked)} 
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer" 
                  />
                  <Label htmlFor="accIsCreditCard" className="cursor-pointer">Cartão de crédito?</Label>
                </div>
                {accIsCreditCard && (
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="accClosingDay" className="text-xs sm:text-sm">Dia Fechamento</Label>
                      <Input 
                        id="accClosingDay" 
                        type="number" 
                        min="1" max="31"
                        value={accClosingDay} 
                        onChange={(e) => setAccClosingDay(e.target.value)} 
                        placeholder="Ex: 15" 
                        required={accIsCreditCard} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="accDueDay" className="text-xs sm:text-sm">Dia Vencimento</Label>
                      <Input 
                        id="accDueDay" 
                        type="number" 
                        min="1" max="31"
                        value={accDueDay} 
                        onChange={(e) => setAccDueDay(e.target.value)} 
                        placeholder="Ex: 25" 
                        required={accIsCreditCard} 
                      />
                    </div>
                  </div>
                )}
                <div className="flex gap-2 pt-1">
                  <Button type="submit" className="flex-1">
                    {editingAccountId ? "Atualizar Conta" : "Salvar Conta"}
                  </Button>
                  {editingAccountId && (
                    <Button type="button" variant="outline" onClick={cancelEditAccount}>
                      Cancelar
                    </Button>
                  )}
                </div>
              </form>
            </div>
            
            <div className="lg:col-span-2">
              {/* Desktop Table View */}
              <div className="hidden sm:block border rounded-md bg-card overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead className="text-right">Saldo Inicial</TableHead>
                      <TableHead className="w-[180px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accounts?.map((acc) => (
                      <TableRow key={acc.id}>
                        <TableCell className="font-medium">
                          {acc.name}
                          {acc.isCreditCard && (
                            <span className="ml-2 text-xs px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                              Cartão (Fecha: {acc.closingDay}, Vence: {acc.dueDay})
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(acc.initialBalance)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleEditAccount(acc)}>
                              Editar
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => openDeleteAccount(acc)}>
                              Excluir
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!accounts?.length && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                          Nenhuma conta cadastrada.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card List View */}
              <div className="block sm:hidden space-y-2.5">
                {accounts?.map((acc) => (
                  <div key={acc.id} className="p-3.5 rounded-lg border bg-card shadow-sm flex items-center justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="font-semibold text-sm text-foreground truncate">{acc.name}</div>
                      {acc.isCreditCard && (
                        <div className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                          Cartão (Fecha dia {acc.closingDay}, Vence dia {acc.dueDay})
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        Saldo Inicial: <strong className="text-foreground">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(acc.initialBalance)}</strong>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button variant="outline" size="sm" className="h-7 text-xs px-2.5" onClick={() => handleEditAccount(acc)}>
                        Editar
                      </Button>
                      <Button variant="destructive" size="sm" className="h-7 text-xs px-2.5" onClick={() => openDeleteAccount(acc)}>
                        Excluir
                      </Button>
                    </div>
                  </div>
                ))}
                {!accounts?.length && (
                  <div className="text-center py-6 text-sm text-muted-foreground bg-muted/20 border border-dashed rounded-lg">
                    Nenhuma conta cadastrada.
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* TAB DE CATEGORIAS */}
        <TabsContent value="categorias">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            <div className="lg:col-span-1 bg-card p-4 sm:p-6 rounded-lg border shadow-sm h-fit">
              <h2 className="text-lg sm:text-xl font-semibold mb-4">
                {editingCategoryId ? "Editar Categoria" : "Nova Categoria"}
              </h2>
              <form onSubmit={handleAddCategory} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="catName">Nome</Label>
                  <Input 
                    id="catName" 
                    value={catName} 
                    onChange={(e) => setCatName(e.target.value)} 
                    placeholder="Ex: Supermercado" 
                    required 
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <Button type="submit" className="flex-1">
                    {editingCategoryId ? "Atualizar Categoria" : "Salvar Categoria"}
                  </Button>
                  {editingCategoryId && (
                    <Button type="button" variant="outline" onClick={cancelEditCategory}>
                      Cancelar
                    </Button>
                  )}
                </div>
              </form>
            </div>
            
            <div className="lg:col-span-2">
              {/* Desktop Table View */}
              <div className="hidden sm:block border rounded-md bg-card overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead className="w-[180px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories?.map((cat) => (
                      <TableRow key={cat.id}>
                        <TableCell className="font-medium">{cat.name}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleEditCategory(cat)}>
                              Editar
                            </Button>
                            <Button 
                              variant="destructive" 
                              size="sm" 
                              onClick={() => openDeleteCategory(cat)}
                              disabled={cat.name.toLowerCase().includes("transferência")}
                            >
                              Excluir
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!categories?.length && (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-muted-foreground py-8">
                          Nenhuma categoria cadastrada.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card List View */}
              <div className="block sm:hidden space-y-2">
                {categories?.map((cat) => (
                  <div key={cat.id} className="p-3 rounded-lg border bg-card shadow-sm flex items-center justify-between gap-3">
                    <span className="font-medium text-sm text-foreground truncate">{cat.name}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button variant="outline" size="sm" className="h-7 text-xs px-2.5" onClick={() => handleEditCategory(cat)}>
                        Editar
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        className="h-7 text-xs px-2.5" 
                        onClick={() => openDeleteCategory(cat)}
                        disabled={cat.name.toLowerCase().includes("transferência")}
                      >
                        Excluir
                      </Button>
                    </div>
                  </div>
                ))}
                {!categories?.length && (
                  <div className="text-center py-6 text-sm text-muted-foreground bg-muted/20 border border-dashed rounded-lg">
                    Nenhuma categoria cadastrada.
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* TAB DE SUBCATEGORIAS */}
        <TabsContent value="subcategorias">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            <div className="lg:col-span-1 bg-card p-4 sm:p-6 rounded-lg border shadow-sm h-fit">
              <h2 className="text-lg sm:text-xl font-semibold mb-4">
                {editingSubcategoryId ? "Editar Subcategoria" : "Nova Subcategoria"}
              </h2>
              <form onSubmit={handleAddSubcategory} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="subCatName">Nome</Label>
                  <Input 
                    id="subCatName" 
                    value={subCatName} 
                    onChange={(e) => setSubCatName(e.target.value)} 
                    placeholder="Ex: Combustível, Energia" 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subCatParentId">Categoria Pai</Label>
                  <Select value={subCatParentId} onValueChange={setSubCatParentId} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a Categoria Pai..." />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subCatType">Tipo</Label>
                  <Select value={subCatType} onValueChange={(val: any) => setSubCatType(val)} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Receita">Receita</SelectItem>
                      <SelectItem value="Despesa">Despesa</SelectItem>
                      <SelectItem value="Transferência">Transferência</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {subCatType !== 'Transferência' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="subCatFreq">Frequência</Label>
                      <Select value={subCatFreq} onValueChange={(val: any) => setSubCatFreq(val)} required>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Fixo">Fixo</SelectItem>
                          <SelectItem value="Variável">Variável</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="subCatNature">Natureza</Label>
                      <Select value={subCatNature} onValueChange={(val: any) => setSubCatNature(val)} required>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Essencial">Essencial</SelectItem>
                          <SelectItem value="Qualidade de Vida">Qualidade de Vida</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
                <div className="flex gap-2 pt-1">
                  <Button type="submit" className="flex-1">
                    {editingSubcategoryId ? "Atualizar Subcategoria" : "Salvar Subcategoria"}
                  </Button>
                  {editingSubcategoryId && (
                    <Button type="button" variant="outline" onClick={cancelEditSubcategory}>
                      Cancelar
                    </Button>
                  )}
                </div>
              </form>
            </div>
            
            <div className="lg:col-span-2">
              {/* Desktop Table View */}
              <div className="hidden sm:block border rounded-md bg-card overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Categoria Pai</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Frequência</TableHead>
                      <TableHead>Natureza</TableHead>
                      <TableHead className="w-[180px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedSubcategories?.map((subcat) => (
                      <TableRow key={subcat.id}>
                        <TableCell className="font-medium">{subcat.name}</TableCell>
                        <TableCell>{categories?.find(c => c.id === subcat.categoryId)?.name || 'Desconhecida'}</TableCell>
                        <TableCell>
                          <span className={subcat.type === 'Receita' ? 'text-blue-500 font-medium' : (subcat.type === 'Despesa' ? 'text-red-500 font-medium' : 'text-gray-500 font-medium')}>
                            {subcat.type}
                          </span>
                        </TableCell>
                        <TableCell>{subcat.frequency}</TableCell>
                        <TableCell>{subcat.nature}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleEditSubcategory(subcat)}>
                              Editar
                            </Button>
                            <Button 
                              variant="destructive" 
                              size="sm" 
                              onClick={() => openDeleteSubcategory(subcat)}
                              disabled={subcat.type === 'Transferência'}
                            >
                              Excluir
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!sortedSubcategories?.length && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          Nenhuma subcategoria cadastrada.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card List View */}
              <div className="block sm:hidden space-y-2.5">
                {sortedSubcategories?.map((subcat) => (
                  <div key={subcat.id} className="p-3.5 rounded-lg border bg-card shadow-sm space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold text-sm text-foreground">{subcat.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {categories?.find(c => c.id === subcat.categoryId)?.name || 'Desconhecida'}
                        </div>
                      </div>
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full font-medium shrink-0",
                        subcat.type === 'Receita' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' :
                        subcat.type === 'Despesa' ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' :
                        'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                      )}>
                        {subcat.type}
                      </span>
                    </div>

                    {subcat.type !== 'Transferência' && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1 border-t border-border/50">
                        <span className="bg-muted px-2 py-0.5 rounded text-[11px]">{subcat.frequency}</span>
                        <span className="bg-muted px-2 py-0.5 rounded text-[11px]">{subcat.nature}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-1.5 pt-1.5 border-t border-border/40">
                      <Button variant="outline" size="sm" className="h-7 text-xs px-2.5" onClick={() => handleEditSubcategory(subcat)}>
                        Editar
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        className="h-7 text-xs px-2.5" 
                        onClick={() => openDeleteSubcategory(subcat)}
                        disabled={subcat.type === 'Transferência'}
                      >
                        Excluir
                      </Button>
                    </div>
                  </div>
                ))}

                {!sortedSubcategories?.length && (
                  <div className="text-center py-6 text-sm text-muted-foreground bg-muted/20 border border-dashed rounded-lg">
                    Nenhuma subcategoria cadastrada.
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        title={
          deleteItem?.type === 'account'
            ? "Excluir Conta"
            : deleteItem?.type === 'category'
            ? "Excluir Categoria"
            : "Excluir Subcategoria"
        }
        description={
          deleteItem ? (
            <span>
              Tem certeza que deseja excluir{" "}
              {deleteItem.type === 'account' ? "a conta" : deleteItem.type === 'category' ? "a categoria" : "a subcategoria"}{" "}
              <strong className="text-foreground">{deleteItem.name}</strong>?
              {deleteItem.type === 'account' && (
                <span className="block mt-2 text-xs text-amber-600 dark:text-amber-400 font-medium">
                  ⚠️ Atenção: Os lançamentos cadastrados nesta conta permanecerão no histórico, mas ficarão sem o vínculo da conta.
                </span>
              )}
              {deleteItem.type === 'category' && (
                <span className="block mt-2 text-xs text-amber-600 dark:text-amber-400 font-medium">
                  ⚠️ Atenção: As subcategorias vinculadas a esta categoria perderão a referência de categoria pai.
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
