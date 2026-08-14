import { useState, useMemo } from "react";
import { NumericFormat } from "react-number-format";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/db";
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

export default function Categories() {
  const accounts = useLiveQuery(() => db.accounts.orderBy('name').toArray());
  const categories = useLiveQuery(() => db.categories.orderBy('name').toArray());
  const subcategories = useLiveQuery(() => db.subcategories.orderBy('name').toArray());

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

  const handleDeleteAccount = async (id: string) => {
    await db.accounts.delete(id);
  };

  const handleDeleteCategory = async (id: string) => {
    await db.categories.delete(id);
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
      await db.subcategories.update(editingSubcategoryId, {
        name: subCatName,
        categoryId: subCatParentId,
        type: subCatType as "Receita" | "Despesa" | "Transferência",
        frequency: finalFreq as "Fixo" | "Variável" | "N/A",
        nature: finalNature as "Essencial" | "Qualidade de Vida" | "N/A",
      });
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

  const handleDeleteSubcategory = async (id: string) => {
    await db.subcategories.delete(id);
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
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold tracking-tight mb-6">Cadastros</h1>
      
      <Tabs defaultValue="contas" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="contas">Contas</TabsTrigger>
          <TabsTrigger value="categorias">Categorias</TabsTrigger>
          <TabsTrigger value="subcategorias">Subcategorias</TabsTrigger>
        </TabsList>
        
        {/* TAB DE CONTAS */}
        <TabsContent value="contas">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-1 bg-card p-6 rounded-lg border shadow-sm h-fit">
              <h2 className="text-xl font-semibold mb-4">Nova Conta</h2>
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
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="accClosingDay">Dia de Fechamento</Label>
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
                      <Label htmlFor="accDueDay">Dia de Vencimento</Label>
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
                <div className="flex gap-2">
                  <Button type="submit" className="w-full">
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
            
            <div className="md:col-span-2">
              <div className="border rounded-md bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead className="text-right">Saldo Inicial</TableHead>
                      <TableHead className="w-[100px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accounts?.map((acc) => (
                      <TableRow key={acc.id}>
                        <TableCell className="font-medium">{acc.name}</TableCell>
                        <TableCell className="text-right">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(acc.initialBalance)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleEditAccount(acc)}>
                              Editar
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => handleDeleteAccount(acc.id)}>
                              Excluir
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!accounts?.length && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          Nenhuma conta cadastrada.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* TAB DE CATEGORIAS */}
        <TabsContent value="categorias">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-1 bg-card p-6 rounded-lg border shadow-sm h-fit">
              <h2 className="text-xl font-semibold mb-4">Nova Categoria</h2>
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
                <div className="flex gap-2">
                  <Button type="submit" className="w-full">
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
            
            <div className="md:col-span-2">
              <div className="border rounded-md bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead className="w-[100px]"></TableHead>
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
                              onClick={() => handleDeleteCategory(cat.id)}
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
            </div>
          </div>
        </TabsContent>

        {/* TAB DE SUBCATEGORIAS */}
        <TabsContent value="subcategorias">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-1 bg-card p-6 rounded-lg border shadow-sm h-fit">
              <h2 className="text-xl font-semibold mb-4">Nova Subcategoria</h2>
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
                <div className="flex gap-2">
                  <Button type="submit" className="w-full">
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
            
            <div className="md:col-span-2">
              <div className="border rounded-md bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Categoria Pai</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Frequência</TableHead>
                      <TableHead>Natureza</TableHead>
                      <TableHead className="w-[100px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedSubcategories?.map((subcat) => (
                      <TableRow key={subcat.id}>
                        <TableCell className="font-medium">{subcat.name}</TableCell>
                        <TableCell>{categories?.find(c => c.id === subcat.categoryId)?.name || 'Desconhecida'}</TableCell>
                        <TableCell>
                          <span className={subcat.type === 'Receita' ? 'text-blue-500' : (subcat.type === 'Despesa' ? 'text-red-500' : 'text-gray-500 font-medium')}>
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
                              onClick={() => handleDeleteSubcategory(subcat.id)}
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
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
