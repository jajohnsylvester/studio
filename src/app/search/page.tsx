
"use client";

import React, { useState, useRef, useEffect } from 'react';
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
import { Loader2, SearchIcon, FileQuestion, Send, Trash2, Settings, MessageSquare, Zap, Check, AlertCircle } from "lucide-react";
import { searchAllExpenses } from '@/lib/sheets';
import { useToast } from '@/hooks/use-toast';
import { getCategoryIcon } from '@/lib/utils';
import { Expense } from '@/lib/types';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const searchFormSchema = z.object({
  query: z.string().min(1, { message: 'Please enter a search term.' }),
});

type SearchFormValues = z.infer<typeof searchFormSchema>;

type SearchResult = Omit<Expense, 'id' | 'paid'>;

const TIME_ZONE = 'Asia/Kolkata';

function ExpenseSearch() {
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


function PerplexityChat() {
  const [messages, setMessages] = useState<{role: 'user' | 'assistant', content: string, isError?: boolean}[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const { toast } = useToast();
  
  const [model, setModel] = useState('sonar'); // Default model
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1024);
  const [isApiKeyConfigured, setIsApiKeyConfigured] = useState<boolean | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // Load settings from local storage on mount
  useEffect(() => {
    const savedModel = localStorage.getItem('perplexityModel');
    if (savedModel) setModel(savedModel);

    // Check if API key is configured on the server
    fetch('/api/chat', { method: 'HEAD' }).then(response => {
        setIsApiKeyConfigured(response.ok);
        if (!response.ok) {
            toast({
                variant: 'destructive',
                title: 'Perplexity API Key Missing',
                description: 'Please set the PERPLEXITY_API_KEY in your .env file.',
            });
        }
    });

  }, [toast]);


  const clearChat = () => {
    setMessages([]);
  };

  const handleSubmit = async (e?: React.FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
    
    if (!input.trim() || isLoading) return;
    
    if (!isApiKeyConfigured) {
      toast({
        variant: 'destructive',
        title: 'API Key Not Configured',
        description: 'The Perplexity API key is not configured on the server.',
      });
      return;
    }

    const userMessage = { role: 'user' as const, content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          messages: newMessages.map(({isError, ...rest}) => rest), // Remove isError before sending
          temperature: temperature,
          max_tokens: maxTokens,
          stream: true,
        })
      });

      if (!response.ok || !response.body) {
          const errorText = await response.text();
          throw new Error(errorText || `API Error: ${response.status}`);
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = { role: 'assistant' as const, content: '' };
      setMessages(prev => [...prev, assistantMessage]);
      
      while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          // Perplexity streams data in the format: data: {...}\n\n
          const jsonStrings = chunk.split('data: ').filter(s => s.trim());

          for (const jsonStr of jsonStrings) {
              if (jsonStr.trim() === '[DONE]') {
                  setIsLoading(false);
                  return;
              }
              try {
                  const parsed = JSON.parse(jsonStr);
                  const delta = parsed.choices[0]?.delta?.content || '';
                  assistantMessage.content += delta;
                  setMessages(prev => prev.map(msg => msg === prev[prev.length -1] ? {...assistantMessage} : msg));
              } catch (parseError) {
                  console.warn("Could not parse stream chunk:", jsonStr);
              }
          }
      }
      
    } catch (error: any) {
      console.error('Error:', error);
      const errorMessage = {
        role: 'assistant' as const,
        content: `Error: ${error.message}. Please check server logs for details.`,
        isError: true
      };
      setMessages([...newMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };
  
  const handleSaveSettings = () => {
    localStorage.setItem('perplexityModel', model);
    toast({
        title: 'Settings Saved',
        description: 'Your Perplexity AI settings have been saved locally.',
    });
    setShowSettings(false);
  }

  return (
    <Card className="mt-6">
      <CardContent className="p-0">
        <div className="flex h-[80vh] bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg">
          {/* Sidebar */}
          <div className={`${showSettings ? 'block' : 'hidden'} lg:block w-full lg:w-80 bg-card shadow-lg border-r overflow-y-auto`}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <Settings size={24} />
                  Configuration
                </h2>
                <button
                  onClick={() => setShowSettings(false)}
                  className="lg:hidden text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                 <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                        API Key Status
                    </label>
                    {isApiKeyConfigured === null ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 size={14} className="animate-spin" />
                            <span>Checking...</span>
                        </div>
                    ) : isApiKeyConfigured ? (
                        <div className="flex items-center gap-2 text-sm text-green-600">
                            <Check size={14} />
                            <span>Server key is configured</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-sm text-destructive">
                            <AlertCircle size={14} />
                            <span>Server key is missing</span>
                        </div>
                    )}
                     <p className="mt-1 text-xs text-muted-foreground">
                        API key is managed on the server.
                    </p>
                </div>


                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Model
                  </label>
                   <Select
                    value={model}
                    onValueChange={setModel}
                  >
                    <SelectTrigger>
                        <SelectValue placeholder="Select a model" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="sonar">Sonar</SelectItem>
                        <SelectItem value="sonar-pro">Sonar Pro</SelectItem>
                        <SelectItem value="sonar-reasoning">Sonar Reasoning</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Choose the Perplexity model
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Temperature: {temperature}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Precise</span>
                    <span>Creative</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Max Tokens
                  </label>
                  <Input
                    type="number"
                    min="100"
                    max="4096"
                    step="100"
                    value={maxTokens}
                    onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Maximum response length (100-4096)
                  </p>
                </div>

                <Button
                  onClick={handleSaveSettings}
                  className="w-full"
                >
                  Save Settings
                </Button>

                <Button
                  onClick={clearChat}
                  variant="destructive"
                  className="w-full flex items-center justify-center gap-2"
                >
                  <Trash2 size={18} />
                  Clear Chat History
                </Button>
              </div>

              <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                <h3 className="font-semibold text-sm text-foreground mb-2">About Perplexity API</h3>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Real-time, web-grounded responses</li>
                  <li>• API key is managed on the server.</li>
                  <li>• Messages: {messages.length}</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col bg-background">
            {/* Header */}
            <div className="bg-card shadow-sm border-b p-4">
              <div className="flex items-center justify-between max-w-4xl mx-auto">
                <div className="flex items-center gap-3">
                  <Button
                    onClick={() => setShowSettings(!showSettings)}
                    variant="ghost"
                    size="icon"
                    className="lg:hidden"
                  >
                    <Settings size={20} />
                  </Button>
                  <Zap size={28} className="text-primary" />
                  <div>
                    <h1 className="text-xl font-bold text-foreground">
                      Perplexity AI Chat
                    </h1>
                    <p className="text-sm text-muted-foreground">
                      Web-grounded AI responses
                    </p>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  Model: <span className="font-medium text-foreground">{model}</span>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto p-4"
            >
              <div className="max-w-4xl mx-auto space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageSquare size={64} className="mx-auto text-muted-foreground/30 mb-4" />
                    <h2 className="text-2xl font-semibold text-muted-foreground mb-2">
                      Start a Conversation
                    </h2>
                    <p className="text-muted-foreground">
                      Ask me anything and get real-time, web-grounded responses
                    </p>
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
                      {[
                        'What are the latest developments in AI?',
                        'Explain quantum computing simply',
                        'What is happening in tech news today?',
                        'Compare different programming languages'
                      ].map((suggestion, idx) => (
                        <button
                          key={idx}
                          onClick={() => setInput(suggestion)}
                          className="p-3 text-left text-sm bg-card border rounded-lg hover:border-primary hover:bg-muted transition"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  messages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-3xl rounded-lg p-4 ${
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : message.isError
                            ? 'bg-destructive/10 text-destructive-foreground border border-destructive/20'
                            : 'bg-card text-foreground shadow-sm border'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {message.role === 'assistant' && !message.isError && (
                            <Zap size={18} className="text-primary flex-shrink-0 mt-1" />
                          )}
                          {message.isError && (
                            <AlertCircle size={18} className="text-destructive flex-shrink-0 mt-1" />
                          )}
                          <div className="flex-1">
                            <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                
                {isLoading && messages[messages.length -1]?.role !== 'assistant' && (
                  <div className="flex justify-start">
                    <div className="bg-card text-foreground shadow-sm border rounded-lg p-4 max-w-3xl">
                      <div className="flex items-center gap-2">
                        <Zap size={18} className="text-primary animate-pulse" />
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                          <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                          <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input */}
            <div className="bg-card border-t p-4">
              <div className="max-w-4xl mx-auto">
                <form onSubmit={handleSubmit} className="flex gap-2">
                  <Input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask me anything..."
                    disabled={isLoading || !isApiKeyConfigured}
                    className="flex-1 px-4 py-3 rounded-lg disabled:bg-muted"
                  />
                  <Button
                    type="submit"
                    disabled={isLoading || !input.trim() || !isApiKeyConfigured}
                    className="px-6 py-3 rounded-lg flex items-center gap-2"
                  >
                    <Send size={20} />
                    <span className="hidden sm:inline">Send</span>
                  </Button>
                </form>
                {isApiKeyConfigured === false && (
                  <p className="mt-2 text-sm text-orange-600 flex items-center gap-1">
                    <AlertCircle size={14} />
                    Perplexity API Key is not configured on the server.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


export default function SearchPage() {
    return (
        <div className="flex flex-col gap-6">
            <ExpenseSearch />
            <Separator className="my-6" />
            <PerplexityChat />
        </div>
    );
}

    