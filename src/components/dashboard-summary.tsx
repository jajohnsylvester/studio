import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Budget, Expense } from '@/lib/types';
import { DollarSign, ArrowDownCircle, Banknote } from 'lucide-react';

type DashboardSummaryProps = {
  expenses: Expense[];
  budgets: Budget[];
};

export function DashboardSummary({ expenses, budgets }: DashboardSummaryProps) {
  const totalSpent = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const totalBudget = budgets.reduce((sum, budget) => sum + budget.limit, 0);
  const remainingBudget = totalBudget - totalSpent;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
          <Banknote className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ₹{totalBudget.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
          <ArrowDownCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ₹{totalSpent.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Remaining</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${remainingBudget < 0 ? 'text-destructive' : ''}`}>
            ₹{remainingBudget.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
