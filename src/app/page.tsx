
"use client";

import { useState, useMemo, useEffect } from 'react';
import { AddExpenseDialog } from '@/components/add-expense-dialog';
import { DashboardSummary } from '@/components/dashboard-summary';
import { ExpenseList } from '@/components/expense-list';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import { Pie, PieChart, Cell, TooltipProps } from 'recharts';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';
import { useToast } from '@/hooks/use-toast';
import { initialBudgets } from '@/lib/data';
import { getExpenses, addExpense, updateExpense, deleteExpense, getBudgets } from '@/lib/sheets';
import type { Budget, Expense } from '@/lib/types';
import { Loader2, Download } from 'lucide-react';
import { getMonth, getYear, format } from 'date-fns';
import { EditExpenseDialog } from '@/components/edit-expense-dialog';
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

const months = [
  "January", "February", "March", "April", "May", "June", 
  "July", "August", "September", "October", "November", "December"
];

const monthColors = [
  'hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))',
  'hsl(var(--chart-5))', 'hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))',
  'hsl(var(--chart-4))', 'hsl(var(--chart-5))', 'hsl(var(--chart-1))', 'hsl(var(--chart-2))'
];

const years = Array.from({ length: 2035 - 2024 + 1 }, (_, i) => 2024 + i);

const CustomPieTooltip = (props: TooltipProps<ValueType, NameType>) => {
    const { active, payload } = props;
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="rounded-lg border bg-background p-2 shadow-sm">
          <div className="grid grid-cols-1 gap-2">
             <span className="font-bold" style={{ color: data.payload.fill }}>
                  {data.name}: ₹{data.value?.toLocaleString()}
             </span>
          </div>
        </div>
      );
    }
    return null;
}

export default function DashboardPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>(initialBudgets);
  const { toast } = useToast();
  const [selectedMonth, setSelectedMonth] = useState(months[new Date().getMonth()]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  
  useEffect(() => {
    async function loadData() {
      try {
        const [sheetExpenses, sheetBudgets] = await Promise.all([getExpenses(), getBudgets()]);
        setExpenses(sheetExpenses);
        setBudgets(sheetBudgets.length > 0 ? sheetBudgets : initialBudgets);
      } catch (error) {
        console.error("Failed to load data", error);
        toast({
            variant: "destructive",
            title: "Failed to load data",
            description: "Could not fetch data from Google Sheets. Make sure your environment variables are set correctly.",
        })
      }
    }
    loadData();
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
      setExpenses((prevExpenses) => [newExpense, ...prevExpenses]);
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
  
  const handleExport = () => {
    if (filteredExpenses.length === 0) {
      toast({
        variant: "destructive",
        title: "No data to export",
        description: "There are no expenses for the selected period.",
      });
      return;
    }

    const headers = ["ID", "Date", "Description", "Category", "Amount"];
    const csvContent = [
      headers.join(","),
      ...filteredExpenses.map(e => 
        [
          e.id, 
          format(new Date(e.date), "yyyy-MM-dd"), 
          `"${e.description.replace(/"/g, '""')}"`, // Handle quotes
          e.category, 
          e.amount
        ].join(",")
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `expenses-${selectedYear}-${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
        title: "Export Successful",
        description: "Your expenses have been downloaded as a CSV file.",
    });
  };

  const spendingByCategory = useMemo(() => {
    return filteredExpenses.reduce((acc, expense) => {
      const category = expense.category || "Other";
      if (!acc[category]) {
        acc[category] = 0;
      }
      acc[category] += expense.amount;
      return acc;
    }, {} as { [key: string]: number });
  }, [filteredExpenses]);
  
  const pieChartData = useMemo(() => {
    return Object.entries(spendingByCategory)
      .map(([name, value]) => ({ name, value }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [spendingByCategory]);

  const chartConfig: ChartConfig = useMemo(() => {
    const config: ChartConfig = {};
    pieChartData.forEach((item, index) => {
      config[item.name] = {
        label: item.name,
        color: `hsl(var(--chart-${(index % 5) + 1}))`,
      };
    });
    return config;
  }, [pieChartData]);
  
  const totalSpent = useMemo(() => {
    return filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  }, [filteredExpenses]);

  const totalBudget = useMemo(() => {
    return budgets.filter(b => b.category !== 'Credit Card').reduce((sum, budget) => sum + budget.limit, 0);
  }, [budgets]);

  const budgetChartData = useMemo(() => {
    const remaining = totalBudget > totalSpent ? totalBudget - totalSpent : 0;
    const spent = totalSpent;
    
    if (totalBudget <= 0) return [];

    return [
      { name: 'Spent', value: spent, fill: 'hsl(var(--chart-2))' },
      { name: 'Remaining', value: remaining, fill: 'hsl(var(--chart-1))' },
    ].filter(d => d.value > 0);
  }, [totalBudget, totalSpent]);

  const budgetChartConfig: ChartConfig = {
    Spent: { label: 'Spent', color: 'hsl(var(--chart-2))' },
    Remaining: { label: 'Remaining', color: 'hsl(var(--chart-1))' },
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <h1 className="text-3xl font-bold tracking-tight font-headline">
            Dashboard
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
        <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" />
                Export to CSV
            </Button>
            <AddExpenseDialog onAddExpense={handleAddExpense} />
        </div>
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
        {months.map(month => (
          <TabsContent key={month} value={month} className="mt-6">
            <DashboardSummary expenses={filteredExpenses} budgets={budgets} />
            
            <div className="grid gap-6 mt-6 md:grid-cols-2 lg:grid-cols-3">
              <Card className="lg:col-span-3">
                <CardHeader>
                  <CardTitle>Recent Transactions</CardTitle>
                  <CardDescription>A list of your most recent expenses for {month} {selectedYear}.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ExpenseList 
                    expenses={filteredExpenses.slice(0, 5)} 
                    onEdit={(expense) => setEditingExpense(expense)}
                    onDelete={(expense) => setDeletingExpense(expense)}
                  />
                </CardContent>
              </Card>

            </div>
            <div className="grid gap-6 mt-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Spending by Category</CardTitle>
                        <CardDescription>A breakdown of your expenses for {month} {selectedYear}.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {pieChartData.length > 0 ? (
                        <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[350px]">
                            <PieChart>
                            <ChartTooltip content={<CustomPieTooltip />} />
                            <Pie data={pieChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={120} >
                                {pieChartData.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={chartConfig[pieChartData[index].name]?.color} />
                                ))}
                            </Pie>
                            <ChartLegend content={<ChartLegendContent />} className="-mt-4" />
                            </PieChart>
                        </ChartContainer>
                        ) : (
                            <div className="flex h-[350px] items-center justify-center text-muted-foreground">No spending data available.</div>
                        )}
                    </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Budget Overview</CardTitle>
                    <CardDescription>Your total spending relative to your total budget for {month} {selectedYear}.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {budgetChartData.length > 0 ? (
                      <ChartContainer config={budgetChartConfig} className="mx-auto aspect-square max-h-[350px]">
                        <PieChart>
                          <ChartTooltip content={<CustomPieTooltip />} />
                          <Pie data={budgetChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={120}>
                            {budgetChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Pie>
                          <ChartLegend content={<ChartLegendContent />} className="-mt-4" />
                        </PieChart>
                      </ChartContainer>
                    ) : (
                      <div className="flex h-[350px] items-center justify-center text-muted-foreground">No budget data available.</div>
                    )}
                  </CardContent>
                </Card>
            </div>
          </TabsContent>
        ))}
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

    