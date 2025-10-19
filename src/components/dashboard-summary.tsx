
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Expense, Budget } from '@/lib/types';
import { ArrowDownCircle, Banknote, Landmark, CreditCard } from 'lucide-react';
import Link from 'next/link';

type DashboardSummaryProps = {
  expenses: Expense[];
  budgets: Budget[];
};

export function DashboardSummary({ expenses, budgets }: DashboardSummaryProps) {
  const expensesWithoutCreditCard = expenses.filter(e => e.category !== 'Credit Card');
  
  const unpaidCreditCardExpenses = expenses.filter(e => e.category === 'Credit Card' && !e.paid);
  
  const totalSpent = expensesWithoutCreditCard.reduce((sum, expense) => sum + expense.amount, 0);
  const creditCardSpent = unpaidCreditCardExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  
  const totalBudget = budgets.reduce((sum, budget) => sum + budget.amount, 0);
  const remainingBudget = totalBudget - totalSpent;
  const isOverBudget = remainingBudget < 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:bg-muted/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalSpent.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
            </div>
             <p className="text-xs text-muted-foreground">Excluding Credit Card payments</p>
          </CardContent>
        </Card>
       <Link href="/categories">
        <Card className="hover:bg-muted/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
                <Landmark className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">
                {totalBudget.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                </div>
                 <p className="text-xs text-muted-foreground">&nbsp;</p>
            </CardContent>
        </Card>
      </Link>
        <Card className={isOverBudget ? "bg-destructive/10 border-destructive" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
                {isOverBudget ? "Over Budget By" : "Remaining Budget"}
            </CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${isOverBudget ? 'text-destructive' : ''}`}>
                 {Math.abs(remainingBudget).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
            </div>
            <p className="text-xs text-muted-foreground">&nbsp;</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unpaid Credit Card</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
                {creditCardSpent.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
            </div>
            <p className="text-xs text-muted-foreground">Total of unpaid CC expenses</p>
          </CardContent>
        </Card>
    </div>
  );
}
