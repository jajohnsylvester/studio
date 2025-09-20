import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Expense } from '@/lib/types';
import { getCategoryIcon } from '@/lib/utils.tsx';
import { format } from 'date-fns';

export function ExpenseList({ expenses }: { expenses: Expense[] }) {
  if (expenses.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No expenses recorded yet.</p>;
  }

  return (
    <div className="w-full overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Category</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="hidden md:table-cell text-right">Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {expenses.map((expense) => (
            <TableRow key={expense.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  {getCategoryIcon(expense.category, {})}
                  <span className="hidden sm:inline">{expense.category}</span>
                </div>
              </TableCell>
              <TableCell className="font-medium">{expense.description}</TableCell>
              <TableCell className="text-right">
                -${expense.amount.toFixed(2)}
              </TableCell>
              <TableCell className="hidden md:table-cell text-right">
                {format(new Date(expense.date), 'PP')}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
