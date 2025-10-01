
"use client";

import { useState, useMemo, useEffect } from 'react';
import { getMonth, getYear } from 'date-fns';
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
import { getExpenses, addExpense, updateExpense, deleteExpense } from '@/lib/sheets';
import type { Expense } from '@/lib/types';
import { Loader2 } from 'lucide-react';

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

export default function TransactionsPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [selectedMonth, setSelectedMonth] = useState(months[new Date().getMonth()]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);

  useEffect(() => {
    async function loadExpenses() {
      setIsLoading(true);
      try {
        const sheetExpenses = await getExpenses();
        setExpenses(sheetExpenses);
      } catch (error) {
        console.error("Failed to load expenses", error);
        toast({
            variant: "destructive",
            title: "Failed to load data",
            description: "Could not fetch expenses from Google Sheets.",
        })
      } finally {
        setIsLoading(false);
      }
    }
    loadExpenses();
  }, [toast]);


  const filteredExpenses = useMemo(() => {
    const monthIndex = months.indexOf(selectedMonth);
    return expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return getMonth(expenseDate) === monthIndex && getYear(expenseDate) === selectedYear;
    });
  }, [expenses, selectedMonth, selectedYear]);

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
        setDeletingExpense(null);
    } catch(error) {
        console.error("Failed to delete expense", error);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Failed to delete expense from Google Sheet.',
        })
    }
  };
  
  if (isLoading) {
      return (
          <div className="flex justify-center items-center h-screen">
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
          </div>
      );
  }

  return (
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
                <CardTitle>All Transactions</CardTitle>
                <CardDescription>A complete list of your expenses for {selectedMonth} {selectedYear}.</CardDescription>
            </CardHeader>
            <CardContent>
                <ExpenseList 
                expenses={filteredExpenses} 
                onEdit={(expense) => setEditingExpense(expense)}
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
            <AlertDialogAction onClick={handleDeleteExpense}>Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

    