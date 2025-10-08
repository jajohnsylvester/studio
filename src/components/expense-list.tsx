
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Expense } from '@/lib/types';
import { getCategoryIcon } from '@/lib/utils.tsx';
import { format } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Button } from './ui/button';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { type GroupedExpenses } from '@/app/transactions/page';

type ExpenseListProps = {
    expenses: GroupedExpenses;
    onEdit: (expense: Expense) => void;
    onDelete: (expense: Expense) => void;
};

export function ExpenseList({ expenses, onEdit, onDelete }: ExpenseListProps) {
  if (Object.keys(expenses).length === 0) {
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
            <TableHead className="w-12 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        {Object.entries(expenses).map(([date, { expenses: dailyExpenses, total }]) => (
            <React.Fragment key={date}>
                <TableBody>
                    <TableRow className="bg-muted/50 hover:bg-muted">
                        <TableCell colSpan={2} className="font-bold text-primary">
                            {format(new Date(date), 'EEEE, MMMM d, yyyy')}
                        </TableCell>
                        <TableCell colSpan={3} className="text-right font-bold text-primary">
                            Daily Total: {total.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                        </TableCell>
                    </TableRow>
                </TableBody>
                <TableBody>
                    {dailyExpenses.map((expense) => (
                        <TableRow key={expense.id}>
                        <TableCell>
                            <div className="flex items-center gap-2">
                            {getCategoryIcon(expense.category, {})}
                            <span className="hidden sm:inline">{expense.category}</span>
                            </div>
                        </TableCell>
                        <TableCell className="font-medium">{expense.description}</TableCell>
                        <TableCell className="text-right">
                            {expense.category === 'Credit Card' ? (
                                <span className="text-destructive">-{expense.amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</span>
                            ) : (
                                <span>{expense.amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</span>
                            )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-right">
                            {format(new Date(expense.date), 'PP')}
                        </TableCell>
                        <TableCell className="text-right">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => onEdit(expense)}>
                                        <Pencil className="mr-2 h-4 w-4" /> Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onDelete(expense)} className="text-destructive">
                                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </React.Fragment>
        ))}
      </Table>
    </div>
  );
}
