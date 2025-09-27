
"use client";

import { useState, useMemo, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { getExpenses } from '@/lib/sheets';
import type { Expense } from '@/lib/types';
import { getYear } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

export default function ReportsPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<number | undefined>();
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
  
  const expensesByYear = useMemo(() => {
    return expenses.reduce((acc, expense) => {
        const year = getYear(new Date(expense.date));
        if (!acc[year]) {
            acc[year] = [];
        }
        acc[year].push(expense);
        return acc;
    }, {} as { [key: number]: Expense[] });
  }, [expenses]);
  
  const availableYears = useMemo(() => {
      return Object.keys(expensesByYear).map(Number).sort((a,b) => b-a);
  }, [expensesByYear])

  useEffect(() => {
    if (availableYears.length > 0 && !selectedYear) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears, selectedYear]);

  const selectedReport = useMemo(() => {
    if (!selectedYear || !expensesByYear[selectedYear]) return null;
    
    const yearExpenses = expensesByYear[selectedYear];
    const totalSpent = yearExpenses.reduce((sum, expense) => sum + expense.amount, 0);

    const spendingByCategory = yearExpenses.reduce((acc, expense) => {
        const category = expense.category || "Other";
        if (!acc[category]) {
            acc[category] = 0;
        }
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

    return {
        year: selectedYear,
        totalSpent,
        pieChartData,
        chartConfig
    };
  }, [selectedYear, expensesByYear]);


  if (isLoading) {
      return (
          <div className="flex justify-center items-center h-screen">
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
          </div>
      );
  }

  if (expenses.length === 0) {
      return (
        <div className="flex flex-col gap-6">
            <h1 className="text-3xl font-bold tracking-tight font-headline">Reports</h1>
            <Card>
                <CardHeader>
                    <CardTitle>No Data Available</CardTitle>
                    <CardDescription>
                        There are no expenses recorded to generate reports.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p>Start by adding some expenses on the Dashboard or Transactions page.</p>
                </CardContent>
            </Card>
        </div>
      );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Reports</h1>
        {availableYears.length > 0 && (
          <Select 
            value={selectedYear?.toString()} 
            onValueChange={(value) => setSelectedYear(parseInt(value))}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select a year" />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map(year => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      
      {selectedReport ? (
          <Card>
            <CardHeader>
              <CardTitle>Yearly Report: {selectedReport.year}</CardTitle>
              <CardDescription>
                Total spent in {selectedReport.year}: 
                <span className="font-bold text-foreground"> ₹{selectedReport.totalSpent.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
                {selectedReport.pieChartData.length > 0 ? (
                    <ChartContainer config={selectedReport.chartConfig} className="mx-auto aspect-square max-h-[350px]">
                        <PieChart>
                            <ChartTooltip content={<CustomPieTooltip />} />
                            <Pie data={selectedReport.pieChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={120}>
                                {selectedReport.pieChartData.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={selectedReport.chartConfig[selectedReport.pieChartData[index].name]?.color} />
                                ))}
                            </Pie>
                            <ChartLegend content={<ChartLegendContent />} className="-mt-4" />
                        </PieChart>
                    </ChartContainer>
                ) : (
                    <div className="flex h-[350px] items-center justify-center text-muted-foreground">No spending data for {selectedReport.year}.</div>
                )}
            </CardContent>
          </Card>
      ) : (
        <Card>
            <CardHeader>
                <CardTitle>No Report Available</CardTitle>
                <CardDescription>
                    Please select a year to view the report.
                </CardDescription>
            </CardHeader>
        </Card>
      )}

    </div>
  );
}
