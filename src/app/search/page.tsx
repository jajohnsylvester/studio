
"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, SearchIcon, FileQuestion } from "lucide-react";
import { searchAllExpenses } from '@/lib/sheets';
import { useToast } from '@/hooks/use-toast';
import { getCategoryIcon } from '@/lib/utils';
import { Expense } from '@/lib/types';

const searchFormSchema = z.object({
  query: z.string().min(1, { message: 'Please enter a search term.' }),
});

type SearchFormValues = z.infer<typeof searchFormSchema>;

type SearchResult = Omit<Expense, 'id' | 'paid'>;

const TIME_ZONE = 'Asia/Kolkata';

export default function SearchPage() {
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const { toast } = useToast();

  const form = useForm<SearchFormValues>({
    resolver: zodResolver(searchFormSchema),
    defaultValues: { query: '' },
  });

  async function onSubmit(data: SearchFormValues) {
    setIsSearching(true);
    setHasSearched(true);
    try {
      const results = await searchAllExpenses(data.query);
      setSearchResults(results);
    } catch (error) {
      console.error("Search failed:", error);
      toast({
        variant: 'destructive',
        title: 'Search Failed',
        description: 'Could not fetch search results from Google Sheets.',
      });
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight font-headline">
        Global Expense Search
      </h1>

      <Card>
        <CardHeader>
            <CardTitle>Search Transactions</CardTitle>
            <CardDescription>Search for expenses across all years by description.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex items-end gap-4">
              <FormField
                control={form.control}
                name="query"
                render={({ field }) => (
                  <FormItem className="flex-grow">
                    <FormLabel>Search Term</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="e.g., Coffee, Movie tickets..." className="pl-10" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isSearching}>
                {isSearching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <SearchIcon className="mr-2 h-4 w-4" />}
                {isSearching ? 'Searching...' : 'Search'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle>Search Results</CardTitle>
        </CardHeader>
        <CardContent>
            {isSearching ? (
                 <div className="flex justify-center items-center h-60">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                 </div>
            ) : !hasSearched ? (
                <div className="flex flex-col items-center justify-center text-center h-60 text-muted-foreground">
                    <FileQuestion className="h-12 w-12 mb-4" />
                    <p>Enter a term above to search for your expenses.</p>
                </div>
            ) : searchResults.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center h-60 text-muted-foreground">
                    <p>No results found for your query.</p>
                </div>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Date</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {searchResults.map((expense, index) => (
                        <TableRow key={index}>
                            <TableCell className="font-medium">{expense.description}</TableCell>
                            <TableCell className="flex items-center gap-2">
                                {getCategoryIcon(expense.category)}
                                {expense.category}
                            </TableCell>
                            <TableCell className="text-right">{Number(expense.amount).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</TableCell>
                            <TableCell className="text-right">{format(toZonedTime(new Date(expense.date), TIME_ZONE), 'PP')}</TableCell>
                        </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
