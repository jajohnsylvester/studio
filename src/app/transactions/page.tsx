
"use client";

import { useState, useMemo, useEffect, useCallback } from 'react';
import { getMonth, getYear, format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { AddExpenseDialog } from '@/components/add-expense-dialog';
import { EditExpenseDialog } from '@/components/edit-expense-dialog';
import { ExpenseList } from '@/components/expense-list';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getExpenses, addExpense, updateExpense, deleteExpense, getCategories } from '@/lib/sheets';
import type { Expense } from '@/lib/types';
import { CATEGORIES as staticCategories } from '@/lib/types';
import { Loader2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useMasterPassword } from '@/hooks/use-master-password';
import { MasterPasswordDialog } from '@/components/master-password-dialog';


const months = [
  "January", "February", "March", "April", "May", "June", 
  "July", "August", "September", "October", "November", "December"
];

const monthColors = [
    'hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))',
    'hsl(var(--chart-5))', 'hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))',
    'hsl(var(--chart-4))', 'hsl(var(--chart-5))', 'hsl(var(--chart-1))', 'hsl(var(--chart-2))'
];

const years = Array.from({ length: 2050 - 2024 + 1 }, (_, i) => 2024 + i);

export type GroupedExpenses = {
  [date: string]: {
    expenses: Expense[];
    total: number;
  };
};


export default function TransactionsPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [selectedMonth, setSelectedMonth] = useState(months[new Date().getMonth()]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  
  const [categories, setCategories] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const { isPasswordSet, showPasswordDialog, passwordDialogProps } = useMasterPassword();


  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [sheetExpenses, sheetCategories] = await Promise.all([getExpenses(), getCategories()]);
      setExpenses(sheetExpenses);

      const combined = [...staticCategories, ...sheetCategories];
      const uniqueCategories = [...new Set(combined)].sort();
      setCategories(uniqueCategories);

    } catch (error) {
      console.error("Failed to load data", error);
      toast({
          variant: "destructive",
          title: "Failed to load data",
          description: "Could not fetch data from Google Sheets.",
      })
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);


  const filteredExpenses = useMemo(() => {
    const monthIndex = months.indexOf(selectedMonth);
    return expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      const isMonthMatch = getMonth(expenseDate) === monthIndex;
      const isYearMatch = getYear(expenseDate) === selectedYear;
      const isCategoryMatch = categoryFilter === 'all' || expense.category === categoryFilter;
      const isSearchMatch = !searchQuery || expense.description.toLowerCase().includes(searchQuery.toLowerCase());
      return isMonthMatch && isYearMatch && isCategoryMatch && isSearchMatch;
    });
  }, [expenses, selectedMonth, selectedYear, categoryFilter, searchQuery]);

  const groupedAndSortedExpenses = useMemo(() => {
    const grouped = filteredExpenses.reduce((acc, expense) => {
      const date = format(new Date(expense.date), 'yyyy-MM-dd');
      if (!acc[date]) {
        acc[date] = { expenses: [], total: 0 };
      }
      acc[date].expenses.push(expense);
      
      const expenseAmount = expense.category === 'Credit Card' ? 0 : expense.amount;
      acc[date].total += expenseAmount;
      
      return acc;
    }, {} as GroupedExpenses);

    // Sort dates
    const sortedDates = Object.keys(grouped).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    
    const sortedGroupedExpenses: GroupedExpenses = {};
    for (const date of sortedDates) {
        sortedGroupedExpenses[date] = grouped[date];
    }

    return sortedGroupedExpenses;
  }, [filteredExpenses]);
  
  const { foodCardTotal, creditCardTotal, otherTotal } = useMemo(() => {
    return filteredExpenses.reduce((acc, expense) => {
      if (expense.category === 'FoodCard') {
        acc.foodCardTotal += expense.amount;
      } else if (expense.category === 'Credit Card') {
        acc.creditCardTotal += expense.amount;
      } else {
        acc.otherTotal += expense.amount;
      }
      return acc;
    }, { foodCardTotal: 0, creditCardTotal: 0, otherTotal: 0 });
  }, [filteredExpenses]);


  const handleAddExpense = async (newExpenseData: Omit<Expense, 'id'>) => {
    try {
      const newExpense = await addExpense(newExpenseData);
      setExpenses((prevExpenses) => [newExpense, ...prevExpenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      toast({
        title: 'Expense Added',
        description: `"${newExpense.description}" was added.`,
      });
    } catch (error) {
        console.error("Failed to add expense", error);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Failed to add expense to Google Sheet.',
        })
    }
  };

  const handleUpdateExpense = async (updatedExpense: Expense) => {
     try {
        await updateExpense(updatedExpense);
        setExpenses(prevExpenses => prevExpenses.map(e => e.id === updatedExpense.id ? updatedExpense : e));
        setEditingExpense(null);
        toast({
            title: 'Expense Updated',
            description: `"${updatedExpense.description}" was updated.`,
        });
    } catch (error) {
        console.error("Failed to update expense", error);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Failed to update expense in Google Sheet.',
        })
    }
  };

  const handleDeleteExpense = async () => {
    if (!deletingExpense) return;
    try {
        await deleteExpense(deletingExpense.id);
        setExpenses(prevExpenses => prevExpenses.filter(e => e.id !== deletingExpense.id));
        toast({
            title: "Expense Deleted",
            description: `"${deletingExpense.description}" was deleted.`,
        });
    } catch(error) {
        console.error("Failed to delete expense", error);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Failed to delete expense from Google Sheet.',
        })
    } finally {
        setDeletingExpense(null);
    }
  };

  function handleEditClick(expense: Expense) {
    showPasswordDialog({
        title: isPasswordSet ? "Enter Master Password" : "Set Master Password",
        description: isPasswordSet 
            ? "Please enter your master password to edit this expense."
            : "Before editing, please set a master password for editing actions.",
        onSuccess: () => setEditingExpense(expense),
    });
  }

  function confirmDelete() {
      showPasswordDialog({
        title: isPasswordSet ? "Enter Master Password" : "Set Master Password",
        description: isPasswordSet
            ? `Please enter your master password to delete the expense "${deletingExpense?.description}".`
            : "Before deleting, please set a master password for editing actions.",
        onSuccess: handleDeleteExpense,
        onCancel: () => setDeletingExpense(null),
    });
  }
  
  if (isLoading) {
      return (
          <div className="flex justify-center items-center h-screen">
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
          </div>
      );
  }

  return (
    <>
      <MasterPasswordDialog {...passwordDialogProps} />
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <h1 className="text-3xl font-bold tracking-tight font-headline">
              Transactions
            </h1>
            <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {years.map(year => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <AddExpenseDialog onAddExpense={handleAddExpense} />
        </div>

        <Card>
          <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                          type="search"
                          placeholder="Search by description..."
                          className="pl-8"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                      />
                  </div>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="w-full">
                          <SelectValue placeholder="Filter by category" />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="all">All Categories</SelectItem>
                          {categories.map((category) => (
                          <SelectItem key={category} value={category}>
                              {category}
                          </SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
              </div>
          </CardContent>
        </Card>

        <Tabs value={selectedMonth} onValueChange={setSelectedMonth} className="w-full">
          <TabsList className="grid h-auto w-full grid-cols-2 flex-wrap sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {months.map((month, index) => (
              <TabsTrigger
                  key={month}
                  value={month}
                  style={selectedMonth === month ? { backgroundColor: monthColors[index], color: '#111' } : {}}
              >
                  {month}
              </TabsTrigger>
              ))}
          </TabsList>

          <Card className="mt-6">
              <CardHeader>
                  <div className="flex flex-wrap justify-between items-start gap-4">
                      <div>
                          <CardTitle>All Transactions</CardTitle>
                          <CardDescription>
                              Your expenses for {selectedMonth} {selectedYear}. 
                              Total: {filteredExpenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                          </CardDescription>
                      </div>
                      <div className="text-right space-y-2">
                          <div>
                              <p className="text-sm text-muted-foreground">FoodCard</p>
                              <p className="text-lg font-bold">{foodCardTotal.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</p>
                          </div>
                          <div>
                              <p className="text-sm text-muted-foreground">Credit Card</p>
                              <p className="text-lg font-bold text-destructive">{creditCardTotal.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</p>
                          </div>
                          <div>
                              <p className="text-sm text-muted-foreground">Other</p>
                              <p className="text-lg font-bold">{otherTotal.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</p>
                          </div>
                      </div>
                  </div>
              </CardHeader>
              <CardContent>
                  <ExpenseList 
                    expenses={groupedAndSortedExpenses} 
                    onEdit={handleEditClick}
                    onDelete={(expense) => setDeletingExpense(expense)}
                  />
              </CardContent>
          </Card>
        </Tabs>

        <EditExpenseDialog 
          expense={editingExpense} 
          isOpen={!!editingExpense} 
          onClose={() => setEditingExpense(null)}
          onUpdateExpense={handleUpdateExpense}
        />
        <AlertDialog open={!!deletingExpense} onOpenChange={() => setDeletingExpense(null)}>
          <AlertDialogContent>
              <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the expense
                  "{deletingExpense?.description}".
              </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
}
