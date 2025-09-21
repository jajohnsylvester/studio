
"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Budget, Expense } from '@/lib/types';
import { initialBudgets } from '@/lib/data';
import { getExpenses } from '@/lib/sheets';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { getCategoryIcon } from '@/lib/utils.tsx';
import { Input } from '@/components/ui/input';
import { Banknote, Loader2, PlusCircle, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { addCategory as addGlobalCategory } from '@/lib/types';

const addCategoryFormSchema = z.object({
    name: z.string().min(2, {
        message: "Category name must be at least 2 characters.",
    }),
    limit: z.coerce.number().min(0, {
        message: "Limit must be a positive number.",
    }),
});

const editTotalBudgetFormSchema = z.object({
  totalBudget: z.coerce.number().min(0, {
    message: "Total budget must be a positive number.",
  }),
});

type AddCategoryFormValues = z.infer<typeof addCategoryFormSchema>;
type EditTotalBudgetFormValues = z.infer<typeof editTotalBudgetFormSchema>;

export default function BudgetsPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [budgets, setBudgets] = useState<Budget[]>(initialBudgets);
  const [categories, setCategories] = useState<string[]>(initialBudgets.map(b => b.category));
  const { toast } = useToast();
  const [isAddCategoryOpen, setAddCategoryOpen] = useState(false);
  const [isEditTotalBudgetOpen, setEditTotalBudgetOpen] = useState(false);

  const totalBudget = budgets.reduce((sum, budget) => sum + budget.limit, 0);

  const addCategoryForm = useForm<AddCategoryFormValues>({
    resolver: zodResolver(addCategoryFormSchema),
    defaultValues: {
      name: '',
      limit: '' as any,
    },
  });

  const editTotalBudgetForm = useForm<EditTotalBudgetFormValues>({
    resolver: zodResolver(editTotalBudgetFormSchema),
    defaultValues: {
      totalBudget: totalBudget,
    },
  });

  useEffect(() => {
    editTotalBudgetForm.reset({ totalBudget });
  }, [totalBudget, editTotalBudgetForm]);


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

  const handleTotalBudgetChange = (newTotal: number) => {
    const newTotalBudget = newTotal >= 0 ? newTotal : 0;
    const currentTotalBudget = totalBudget;

    if (currentTotalBudget === 0) {
      const equalShare = budgets.length > 0 ? newTotalBudget / budgets.length : 0;
      const updatedBudgets = budgets.map(budget => ({
        ...budget,
        limit: equalShare,
      }));
      setBudgets(updatedBudgets);
      return;
    }

    const updatedBudgets = budgets.map(budget => {
      const proportion = budget.limit / currentTotalBudget;
      return {
        ...budget,
        limit: newTotalBudget * proportion,
      };
    });
    setBudgets(updatedBudgets);
  };

  const onEditTotalBudgetSubmit = (data: EditTotalBudgetFormValues) => {
    handleTotalBudgetChange(data.totalBudget);
    setEditTotalBudgetOpen(false);
    toast({
      title: "Total Budget Updated",
      description: `Your total budget has been set to ₹${data.totalBudget.toFixed(2)}.`,
    })
  };


  const handleBudgetChange = (category: string, newLimit: number) => {
    const updatedBudgets = [...budgets];
    const budgetIndex = updatedBudgets.findIndex(b => b.category === category);
    const value = newLimit >= 0 ? newLimit : 0;

    if (budgetIndex > -1) {
      updatedBudgets[budgetIndex].limit = value;
    } else {
      updatedBudgets.push({ category, limit: value });
    }
    setBudgets(updatedBudgets);
  };
  
  const handleAddCategory = (data: AddCategoryFormValues) => {
    const { name, limit } = data;
    if (categories.some(c => c.toLowerCase() === name.toLowerCase())) {
        addCategoryForm.setError("name", {
            type: "manual",
            message: "Category already exists.",
        });
        return;
    }

    addGlobalCategory(name);
    setCategories(prev => [...prev, name]);
    setBudgets(prev => [...prev, { category: name, limit }]);
    setAddCategoryOpen(false);
    addCategoryForm.reset();
    toast({
        title: "Category Added",
        description: `The category "${name}" with a budget of ₹${limit} has been added.`,
    })
  };

  const spentPerCategory = expenses.reduce((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
    return acc;
  }, {} as { [key: string]: number });


  if (isLoading) {
      return (
          <div className="flex justify-center items-center h-screen">
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
          </div>
      );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight font-headline">
          Budgets
        </h1>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className="flex items-center gap-4">
              <div className="text-2xl font-bold">
                ₹{totalBudget.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <Dialog open={isEditTotalBudgetOpen} onOpenChange={setEditTotalBudgetOpen}>
                <DialogTrigger asChild>
                   <Button variant="outline" size="sm">
                    <Pencil className="mr-2 h-4 w-4" /> Edit
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Total Budget</DialogTitle>
                    <DialogDescription>
                      Set a new total budget. Category budgets will be adjusted proportionally.
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...editTotalBudgetForm}>
                    <form onSubmit={editTotalBudgetForm.handleSubmit(onEditTotalBudgetSubmit)} className="space-y-4">
                      <FormField
                        control={editTotalBudgetForm.control}
                        name="totalBudget"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>New Total Budget</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-muted-foreground">₹</span>
                                <Input type="number" step="0.01" placeholder="0.00" className="pl-7" {...field} />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <DialogFooter>
                        <Button type="submit">Save Changes</Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
            <p className="text-xs text-muted-foreground">The total amount you've budgeted for the month.</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Category Budgets</CardTitle>
              <CardDescription>Manage your monthly spending limits for each category.</CardDescription>
            </div>
            <Dialog open={isAddCategoryOpen} onOpenChange={setAddCategoryOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  New Category
                </Button>
              </DialogTrigger>
              <DialogContent>
                 <DialogHeader>
                    <DialogTitle>Add New Category</DialogTitle>
                    <DialogDescription>
                        Enter a name and budget for your new category.
                    </DialogDescription>
                </DialogHeader>
                <Form {...addCategoryForm}>
                    <form onSubmit={addCategoryForm.handleSubmit(handleAddCategory)} className="space-y-4">
                        <FormField
                            control={addCategoryForm.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Category Name</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g., Subscriptions" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={addCategoryForm.control}
                            name="limit"
                             render={({ field }) => (
                                <FormItem>
                                <FormLabel>Budget Limit</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-muted-foreground">₹</span>
                                    <Input type="number" step="0.01" placeholder="0.00" className="pl-7" {...field} />
                                    </div>
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <DialogFooter>
                            <Button type="submit">Add Category</Button>
                        </DialogFooter>
                    </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map(category => {
            const budget = budgets.find(b => b.category === category);
            const limit = budget?.limit ?? 0;
            const spent = spentPerCategory[category] ?? 0;
            const percentage = limit > 0 ? Math.min((spent / limit) * 100, 100) : spent > 0 ? 100 : 0;
            const remaining = limit - spent;

            return (
              <div key={category} className="space-y-2 rounded-lg border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3 font-medium">
                    {getCategoryIcon(category, { className: 'h-6 w-6' })}
                    <span>{category}</span>
                  </div>
                  <div className="relative w-28">
                       <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-muted-foreground">₹</span>
                       <Input
                          type="number"
                          value={limit.toFixed(2)}
                          onChange={(e) => handleBudgetChange(category, parseFloat(e.target.value) || 0)}
                          className="h-8 pl-7 text-right"
                          aria-label={`Budget for ${category}`}
                       />
                  </div>
                </div>
                <Progress value={percentage} className={percentage > 90 ? '[&>div]:bg-destructive' : ''} />
                <div className="flex justify-between text-xs text-muted-foreground">
                    <span>₹{spent.toFixed(2)} spent</span>
                    <span className={`${remaining < 0 ? 'font-bold text-destructive' : ''}`}>
                    {remaining >= 0
                        ? `₹${remaining.toFixed(2)} left`
                        : `₹${Math.abs(remaining).toFixed(2)} over`}
                    </span>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
