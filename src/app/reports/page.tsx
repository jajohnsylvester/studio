
"use client";

import { useState, useMemo, useEffect } from 'react';
import type { Budget, Expense } from '@/lib/types';
import { initialBudgets } from '@/lib/data';
import { getExpenses } from '@/lib/sheets';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import { Pie, PieChart, Cell } from 'recharts';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, TooltipProps } from 'recharts';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';


const CustomTooltipContent = (props: TooltipProps<ValueType, NameType>) => {
  const { active, payload, label } = props;
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col space-y-1">
            <span className="text-[0.7rem] uppercase text-muted-foreground">{label}</span>
            {payload.map((p, i) => (
                <span key={i} className="font-bold" style={{ color: p.color }}>
                  {p.name}: ₹{p.value?.toLocaleString()}
                </span>
            ))}
          </div>
        </div>
      </div>
    );
  }
  return null;
}

export default function ReportsPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [budgets] = useState<Budget[]>(initialBudgets);
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


  const spendingByCategory = useMemo(() => {
    return expenses.reduce((acc, expense) => {
      const category = expense.category || "Other";
      if (!acc[category]) {
        acc[category] = 0;
      }
      acc[category] += expense.amount;
      return acc;
    }, {} as { [key: string]: number });
  }, [expenses]);
  
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

  const barChartData = useMemo(() => {
    return budgets.map(budget => ({
      name: budget.category,
      budget: budget.limit,
      spent: spendingByCategory[budget.category] || 0,
    })).filter(d => d.budget > 0 || d.spent > 0);
  }, [budgets, spendingByCategory]);
  
  const barChartConfig: ChartConfig = {
    budget: { label: "Budget", color: "hsl(var(--chart-1))" },
    spent: { label: "Spent", color: "hsl(var(--chart-2))" },
  };

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
  
  if (isLoading) {
      return (
          <div className="flex justify-center items-center h-screen">
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
          </div>
      );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight font-headline">Reports</h1>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Spending by Category</CardTitle>
            <CardDescription>A breakdown of your expenses for all time.</CardDescription>
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
            <CardTitle>Budget vs. Spent</CardTitle>
            <CardDescription>How your spending compares to your budget limits.</CardDescription>
          </Header>
          <CardContent>
             {barChartData.length > 0 ? (
                <ChartContainer config={barChartConfig} className="h-[350px] w-full">
                    <BarChart data={barChartData} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} angle={-45} textAnchor="end" height={60} interval={0} tick={{fontSize: 12}} />
                        <YAxis tickFormatter={(value) => `₹${value}`} />
                        <ChartTooltip content={<CustomTooltipContent />} />
                        <ChartLegend />
                        <Bar dataKey="budget" fill="var(--color-budget)" radius={4} />
                        <Bar dataKey="spent" fill="var(--color-spent)" radius={4} />
                    </BarChart>
                </ChartContainer>
             ) : (
                <div className="flex h-[350px] items-center justify-center text-muted-foreground">No budget data available.</div>
             )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
