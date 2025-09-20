"use client";

import { useState, useEffect } from 'react';
import type { Budget, Expense } from '@/lib/types';
import { initialBudgets } from '@/lib/data';
import { getExpenses } from '@/lib/sheets';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { getCategoryIcon } from '@/lib/utils.tsx';
import { CATEGORIES } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Banknote, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function BudgetsPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [budgets, setBudgets] = useState<Budget[]>(initialBudgets);
  const { toast } = useToast();

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

  const handleBudgetChange = (category: string, newLimit: number) => {
    const updatedBudgets = [...budgets];
    const budgetIndex = updatedBudgets.findIndex(b => b.category === category);
    const value = newLimit >= 0 ? newLimit : 0;

    if (budgetIndex > -1) {
      updatedBudgets[budgetIndex].limit = value;
    } else {
      updatedBudgets.push({ category, limit: value });
    }
    setBudgets(updatedBudgets);
  };

  const spentPerCategory = expenses.reduce((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
    return acc;
  }, {} as { [key: string]: number });

  const totalBudget = budgets.reduce((sum, budget) => sum + budget.limit, 0);

  if (isLoading) {
      return (
          <div className="flex justify-center items-center h-screen">
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
          </div>
      );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight font-headline">
          Budgets
        </h1>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">
            ₹{totalBudget.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">The total amount you've budgeted for the month.</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Category Budgets</CardTitle>
          <CardDescription>Manage your monthly spending limits for each category.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map(category => {
            const budget = budgets.find(b => b.category === category);
            const limit = budget?.limit ?? 0;
            const spent = spentPerCategory[category] ?? 0;
            const percentage = limit > 0 ? Math.min((spent / limit) * 100, 100) : spent > 0 ? 100 : 0;
            const remaining = limit - spent;

            return (
              <div key={category} className="space-y-2 rounded-lg border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3 font-medium">
                    {getCategoryIcon(category, { className: 'h-6 w-6' })}
                    <span>{category}</span>
                  </div>
                  <div className="relative w-28">
                       <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-muted-foreground">₹</span>
                       <Input
                          type="number"
                          value={limit}
                          onChange={(e) => handleBudgetChange(category, parseFloat(e.target.value) || 0)}
                          className="h-8 pl-7 text-right"
                          aria-label={`Budget for ${category}`}
                       />
                  </div>
                </div>
                <Progress value={percentage} className={percentage > 90 ? '[&>div]:bg-destructive' : ''} />
                <div className="flex justify-between text-xs text-muted-foreground">
                    <span>₹{spent.toFixed(2)} spent</span>
                    <span className={`${remaining < 0 ? 'font-bold text-destructive' : ''}`}>
                    {remaining >= 0
                        ? `₹${remaining.toFixed(2)} left`
                        : `₹${Math.abs(remaining).toFixed(2)} over`}
                    </span>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
