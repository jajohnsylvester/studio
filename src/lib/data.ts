import type { Budget, Expense } from './types';

export const initialExpenses: Expense[] = [
  { id: '1', description: 'Monthly rent', amount: 1100.00, category: 'Housing', date: new Date().toISOString() },
  { id: '2', description: 'Groceries from Whole Foods', amount: 142.34, category: 'Food', date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
  { id: '3', description: 'Gas for the car', amount: 55.78, category: 'Transportation', date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() },
  { id: '4', description: 'Internet Bill', amount: 65.00, category: 'Utilities', date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() },
  { id: '5', description: 'Tickets to see "Dune Part Two"', amount: 35.50, category: 'Entertainment', date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() },
  { id: '6', description: 'New running shoes', amount: 129.99, category: 'Shopping', date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString() },
];

export const initialBudgets: Budget[] = [
  { category: 'Food', limit: 400 },
  { category: 'Transportation', limit: 150 },
  { category: 'Entertainment', limit: 120 },
  { category: 'Utilities', limit: 180 },
  { category: 'Housing', limit: 1100 },
  { category: 'Healthcare', limit: 100 },
  { category: 'Shopping', limit: 200 },
  { category: 'Travel', limit: 100 },
  { category: 'Education', limit: 0 },
  { category: 'Personal', limit: 150 },
  { category: 'Other', limit: 50 },
];
