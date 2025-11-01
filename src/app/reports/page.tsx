
"use client";

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { getExpenses, getYearsWithExpenses, getCategories } from '@/lib/sheets';
import type { Expense } from '@/lib/types';
import { CATEGORIES as staticCategories } from '@/lib/types';
import { Loader2, TrendingUp } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from '@/components/ui/chart';
import { Pie, PieChart, Cell, TooltipProps, BarChart, XAxis, YAxis, Bar, CartesianGrid } from 'recharts';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';
import { getMonth } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const CustomPieTooltip = (props: TooltipProps<ValueType, NameType>) => {
  const { active, payload } = props;
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <div className="grid grid-cols-1 gap-2">
           <span className="font-bold" style={{ color: data.payload.fill }}>
                {data.name}: {Number(data.value).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
           </span>
        </div>
      </div>
    );
  }
  return null;
}

const months = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", 
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

export default function ReportsPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  
  const [years, setYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  
  useEffect(() => {
    async function loadInitialData() {
      try {
        const [availableYears, sheetCategories] = await Promise.all([
            getYearsWithExpenses(),
            getCategories()
        ]);
        
        if (availableYears.length > 0) {
            setYears(availableYears);
            setSelectedYear(availableYears[0]);
        } else {
            const currentYear = new Date().getFullYear();
            setYears([currentYear]);
            setSelectedYear(currentYear);
        }

        const combined = [...staticCategories, ...sheetCategories];
        const uniqueCategories = [...new Set(combined)].sort();
        setAllCategories(uniqueCategories);
        if (uniqueCategories.length > 0) {
          setSelectedCategory(uniqueCategories[0]);
        }

      } catch (error) {
        console.error("Failed to load initial data", error);
        toast({
            variant: "destructive",
            title: "Failed to load initial data",
            description: "Could not fetch available years or categories.",
        })
      }
    }
    loadInitialData();
  }, [toast]);

  const loadExpenses = useCallback(async () => {
    if (!selectedYear) return;
    
    setIsLoading(true);
    try {
      const sheetExpenses = await getExpenses(selectedYear);
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
  }, [selectedYear, toast]);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);
  
  const totalSpentForYear = useMemo(() => expenses.reduce((sum, expense) => sum + expense.amount, 0), [expenses]);
  
  const spendingByCategory = useMemo(() => expenses.reduce((acc, expense) => {
      const category = expense.category || "Other";
      if (!acc[category]) acc[category] = 0;
      acc[category] += expense.amount;
      return acc;
  }, {} as { [key: string]: number }), [expenses]);
  
  const pieChartData = useMemo(() => Object.entries(spendingByCategory)
      .map(([name, value]) => ({ name, value }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value), [spendingByCategory]);

  const pieChartConfig: ChartConfig = useMemo(() => {
    const config: ChartConfig = {};
    pieChartData.forEach((item, index) => {
        config[item.name] = {
          label: item.name,
          color: `hsl(var(--chart-${(index % 5) + 1}))`,
        };
    });
    return config;
  }, [pieChartData]);
  
  const categoryMonthlySpending = useMemo(() => {
    if (!selectedCategory) return [];
    
    const monthlyTotals = Array(12).fill(0);
    
    expenses
      .filter(e => e.category === selectedCategory)
      .forEach(expense => {
        const monthIndex = getMonth(toZonedTime(new Date(expense.date), 'Asia/Kolkata'));
        monthlyTotals[monthIndex] += expense.amount;
      });
      
    return months.map((month, index) => ({
      month,
      total: monthlyTotals[index],
    }));
  }, [expenses, selectedCategory]);

  const barChartConfig: ChartConfig = {
    total: {
      label: "Total",
      color: "hsl(var(--chart-1))",
    },
  };

  if (isLoading && expenses.length === 0 && allCategories.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Reports</h1>
        {years.length > 0 && selectedYear && (
          <Select
            value={selectedYear.toString()}
            onValueChange={(value) => setSelectedYear(parseInt(value))}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select year" />
            </SelectTrigger>
            <SelectContent>
              {years.map(year => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      
      {isLoading ? (
         <div className="flex justify-center items-center h-[400px]">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
         </div>
      ) : expenses.length === 0 ? (
        <Card className="text-center p-8">
          <CardTitle>No Expense Data for {selectedYear}</CardTitle>
          <CardDescription className="mt-2">
            Once you start adding expenses, your yearly report will show up here.
          </CardDescription>
        </Card>
      ) : selectedYear && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Yearly Report: {selectedYear}</CardTitle>
              <CardDescription>Total Spent: {totalSpentForYear.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</CardDescription>
            </CardHeader>
            <CardContent>
              {pieChartData.length > 0 ? (
                <ChartContainer config={pieChartConfig} className="mx-auto aspect-square max-h-[400px]">
                  <PieChart>
                    <ChartTooltip content={<CustomPieTooltip />} />
                    <Pie data={pieChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={150}>
                      {pieChartData.map((item, index) => (
                        <Cell key={`cell-${index}`} fill={pieChartConfig[item.name]?.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>
              ) : (
                <div className="flex h-[400px] items-center justify-center text-muted-foreground">
                  No spending data for {selectedYear}.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <CardTitle>Category Expense Trend</CardTitle>
                        <CardDescription>Monthly spending for a category in {selectedYear}.</CardDescription>
                    </div>
                    {allCategories.length > 0 && (
                        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                            <SelectTrigger className="w-full sm:w-[200px]">
                                <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                            <SelectContent>
                                {allCategories.map(cat => (
                                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                {categoryMonthlySpending.some(d => d.total > 0) ? (
                    <ChartContainer config={barChartConfig} className="h-[400px] w-full">
                        <BarChart accessibilityLayer data={categoryMonthlySpending} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                           <CartesianGrid vertical={false} />
                            <XAxis
                                dataKey="month"
                                tickLine={false}
                                tickMargin={10}
                                axisLine={false}
                                tickFormatter={(value) => value}
                            />
                            <YAxis 
                              tickFormatter={(value) => `₹${Number(value) / 1000}k`}
                            />
                            <ChartTooltip 
                                content={<ChartTooltipContent 
                                    formatter={(value) => Number(value).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                                />} 
                            />
                            <Bar dataKey="total" fill="var(--color-total)" radius={4} />
                        </BarChart>
                    </ChartContainer>
                ) : (
                    <div className="flex h-[400px] flex-col items-center justify-center text-center">
                        <TrendingUp className="h-12 w-12 text-muted-foreground" />
                        <p className="mt-4 text-muted-foreground">No spending data for '{selectedCategory}' in {selectedYear}.</p>
                        <p className="text-sm text-muted-foreground">Select another category or add expenses.</p>
                    </div>
                )}
            </CardContent>
          </Card>
        </div>
        )}
    </div>
  );
}
