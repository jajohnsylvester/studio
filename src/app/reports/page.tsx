
"use client";

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { getExpenses, getYearsWithExpenses } from '@/lib/sheets';
import type { Expense } from '@/lib/types';
import { Loader2 } from 'lucide-react';
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
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import { Pie, PieChart, Cell, TooltipProps } from 'recharts';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';

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

export default function ReportsPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  
  const [years, setYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  
  useEffect(() => {
    async function loadYears() {
      try {
        const availableYears = await getYearsWithExpenses();
        if (availableYears.length > 0) {
            setYears(availableYears);
            setSelectedYear(availableYears[0]);
        } else {
            const currentYear = new Date().getFullYear();
            setYears([currentYear]);
            setSelectedYear(currentYear);
        }
      } catch (error) {
        console.error("Failed to load years", error);
        toast({
            variant: "destructive",
            title: "Failed to load years",
            description: "Could not fetch available years from Google Sheets.",
        })
      }
    }
    loadYears();
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


  if (isLoading && expenses.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }
  
  const totalSpentForYear = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  
  const spendingByCategory = expenses.reduce((acc, expense) => {
      const category = expense.category || "Other";
      if (!acc[category]) acc[category] = 0;
      acc[category] += expense.amount;
      return acc;
  }, {} as { [key: string]: number });
  
  const pieChartData = Object.entries(spendingByCategory)
      .map(([name, value]) => ({ name, value }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);

  const chartConfig: ChartConfig = {};
  pieChartData.forEach((item, index) => {
      chartConfig[item.name] = {
        label: item.name,
        color: `hsl(var(--chart-${(index % 5) + 1}))`,
      };
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
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
          <Card>
            <CardHeader>
              <CardTitle>Yearly Report: {selectedYear}</CardTitle>
              <CardDescription>Total Spent: {totalSpentForYear.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</CardDescription>
            </CardHeader>
            <CardContent>
              {pieChartData.length > 0 ? (
                <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[400px]">
                  <PieChart>
                    <ChartTooltip content={<CustomPieTooltip />} />
                    <Pie data={pieChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={150}>
                      {pieChartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={chartConfig[pieChartData[index].name]?.color} />
                      ))}
                    </Pie>
                    <ChartLegend content={<ChartLegendContent />} className="mt-4" />
                  </PieChart>
                </ChartContainer>
              ) : (
                <div className="flex h-[400px] items-center justify-center text-muted-foreground">
                  No spending data for {selectedYear}.
                </div>
              )}
            </CardContent>
          </Card>
        )}
    </div>
  );
}
