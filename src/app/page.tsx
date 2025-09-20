"use client";

import { useState } from 'react';
import { generateFinancialTips } from '@/ai/flows/generate-financial-tips';
import { AddExpenseDialog } from '@/components/add-expense-dialog';
import { DashboardSummary } from '@/components/dashboard-summary';
import { ExpenseList } from '@/components/expense-list';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { initialBudgets, initialExpenses } from '@/lib/data';
import type { Budget, Expense } from '@/lib/types';
import { Loader2, Lightbulb } from 'lucide-react';

export default function DashboardPage() {
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [budgets] = useState<Budget[]>(initialBudgets);
  const [financialTips, setFinancialTips] = useState<string>('');
  const [isGeneratingTips, setIsGeneratingTips] = useState(false);
  const { toast } = useToast();

  const handleAddExpense = (newExpense: Expense) => {
    setExpenses((prevExpenses) => [newExpense, ...prevExpenses]);
  };

  const handleGetFinancialTips = async () => {
    setIsGeneratingTips(true);
    setFinancialTips('');
    try {
      const spendingData = expenses
        .map((e) => `${e.category}: ₹${e.amount.toFixed(2)} - ${e.description}`)
        .join('\n');

      if (!spendingData) {
        toast({
            variant: "destructive",
            title: "No spending data",
            description: "Add some expenses before generating tips.",
        });
        setIsGeneratingTips(false);
        return;
      }

      const result = await generateFinancialTips({ spendingData });
      setFinancialTips(result.financialTips);
    } catch (error) {
      console.error('Error generating financial tips:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to generate financial tips. Please try again.',
      });
    } finally {
      setIsGeneratingTips(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight font-headline">
          Dashboard
        </h1>
        <AddExpenseDialog onAddExpense={handleAddExpense} />
      </div>

      <DashboardSummary expenses={expenses} budgets={budgets} />
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>A list of your most recent expenses.</CardDescription>
          </CardHeader>
          <CardContent>
            <ExpenseList expenses={expenses.slice(0, 5)} />
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-400" />
              AI Financial Tips
            </CardTitle>
            <CardDescription>Get personalized advice based on your spending.</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow">
            {isGeneratingTips ? (
              <div className="flex items-center justify-center h-full min-h-[100px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : financialTips ? (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{financialTips}</p>
            ) : (
                <p className="text-sm text-muted-foreground">Click the button to get your personalized financial tips.</p>
            )}
          </CardContent>
          <CardFooter>
            <Button onClick={handleGetFinancialTips} disabled={isGeneratingTips} className="w-full">
              {isGeneratingTips ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lightbulb className="mr-2 h-4 w-4" />}
              {isGeneratingTips ? 'Generating...' : 'Get My Tips'}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
