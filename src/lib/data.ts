import type { Budget, Expense } from './types';

export const initialExpenses: Expense[] = [
  
];

export const initialBudgets: Budget[] = [
    { "category": "Grocery", "limit": 500 },
    { "category": "Fruits", "limit": 400 },
    { "category": "Veggi", "limit": 300 },
    { "category": "NonVeg", "limit": 1200 },
    { "category": "Snacks", "limit": 200 },
    { "category": "Extra", "limit": 300 },
    { "category": "Petrol", "limit": 1000 },
    { "category": "Credit Card", "limit": 0 },
    { "category": "Other", "limit": 100 }
];
