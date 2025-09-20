"use client";

import { useState } from 'react';
import type { Budget, Expense } from '@/lib/types';
import { initialBudgets, initialExpenses } from '@/lib/data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { getCategoryIcon } from '@/lib/utils.tsx';
import { CATEGORIES } from '@/lib/types';
import { Input } from '@/components/ui/input';

export default function BudgetsPage() {
  const [expenses] = useState<Expense[]>(initialExpenses);
  const [budgets, setBudgets] = useState<Budget[]>(initialBudgets);

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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight font-headline">
          Budgets
        </h1>
      </div>
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
                  <div className="w-28">
                       <Input
                          type="number"
                          value={limit}
                          onChange={(e) => handleBudgetChange(category, parseFloat(e.target.value) || 0)}
                          className="h-8 text-right"
                          aria-label={`Budget for ${category}`}
                       />
                  </div>
                </div>
                <Progress value={percentage} className={percentage > 90 ? '[&>div]:bg-destructive' : ''} />
                <div className="flex justify-between text-xs text-muted-foreground">
                    <span>${spent.toFixed(2)} spent</span>
                    <span className={`${remaining < 0 ? 'font-bold text-destructive' : ''}`}>
                    {remaining >= 0
                        ? `$${remaining.toFixed(2)} left`
                        : `$${Math.abs(remaining).toFixed(2)} over`}
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
