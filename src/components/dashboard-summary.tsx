
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Expense } from '@/lib/types';
import { ArrowDownCircle } from 'lucide-react';

type DashboardSummaryProps = {
  expenses: Expense[];
};

export function DashboardSummary({ expenses }: DashboardSummaryProps) {
  const totalSpent = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Link href="/transactions">
        <Card className="hover:bg-muted/50 transition-colors col-span-3">
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
      </Link>
    </div>
  );
}
