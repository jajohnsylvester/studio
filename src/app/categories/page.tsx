
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getCategories, addCategory as addCategoryToSheet, deleteCategory as deleteCategoryFromSheet } from '@/lib/sheets';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, PlusCircle, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { getCategoryIcon } from '@/lib/utils';
import { CATEGORIES as staticCategories } from '@/lib/types';


const categoryFormSchema = z.object({
  name: z.string().min(2, {
    message: 'Category name must be at least 2 characters.',
  }),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

export default function CategoriesPage() {
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: '',
    },
  });

  useEffect(() => {
    async function loadCategories() {
      setIsLoading(true);
      try {
        const sheetCategories = await getCategories();
        setCategories(sheetCategories);
      } catch (error) {
        console.error("Failed to load categories", error);
        toast({
          variant: "destructive",
          title: "Failed to load categories",
          description: "Could not fetch categories from Google Sheets.",
        });
      } finally {
        setIsLoading(false);
      }
    }
    loadCategories();
  }, [toast]);
  
  const allCategories = useMemo(() => {
    const combined = [...staticCategories, ...categories];
    return [...new Set(combined)].sort();
  }, [categories]);

  async function onSubmit(data: CategoryFormValues) {
    setIsSubmitting(true);
    if (allCategories.some(c => c.toLowerCase() === data.name.toLowerCase())) {
        toast({
            variant: 'destructive',
            title: 'Category exists',
            description: `The category "${data.name}" already exists.`,
        });
        setIsSubmitting(false);
        return;
    }
    try {
      await addCategoryToSheet(data.name);
      setCategories(prev => [...prev, data.name].sort());
      toast({
        title: 'Category Added',
        description: `"${data.name}" was successfully added.`,
      });
      form.reset();
    } catch (error) {
      console.error('Failed to add category:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to add category to Google Sheet.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteCategory() {
    if (!deletingCategory) return;
    
    if (staticCategories.includes(deletingCategory)) {
        toast({
            variant: 'destructive',
            title: 'Cannot Delete',
            description: `"${deletingCategory}" is a default category and cannot be deleted.`,
        });
        setDeletingCategory(null);
        return;
    }

    try {
      await deleteCategoryFromSheet(deletingCategory);
      setCategories(prev => prev.filter(c => c !== deletingCategory));
      toast({
        title: 'Category Deleted',
        description: `"${deletingCategory}" was deleted.`,
      });
      setDeletingCategory(null);
    } catch (error) {
      console.error('Failed to delete category:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete category from Google Sheet.',
      });
    }
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
      <h1 className="text-3xl font-bold tracking-tight font-headline">
        Manage Categories
      </h1>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Add New Category</CardTitle>
            <CardDescription>Create a new category for your expenses.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
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
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <PlusCircle className="mr-2 h-4 w-4" />
                  )}
                  {isSubmitting ? 'Adding...' : 'Add Category'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Your Categories</CardTitle>
            <CardDescription>Here is a list of all your expense categories.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allCategories.map((category) => (
                  <TableRow key={category}>
                    <TableCell className="font-medium flex items-center gap-2">
                      {getCategoryIcon(category)}
                      {category}
                    </TableCell>
                    <TableCell className="text-right">
                       {!staticCategories.includes(category) && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeletingCategory(category)}
                            className="text-destructive hover:text-destructive"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                       )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!deletingCategory} onOpenChange={() => setDeletingCategory(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the category "{deletingCategory}". Expenses with this category will not be affected but you won't be able to assign it to new ones.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCategory}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
