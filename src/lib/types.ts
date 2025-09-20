export type Expense = {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string; // Using string for simplicity, can be parsed to Date
};

export type Budget = {
  category: string;
  limit: number;
};

export const CATEGORIES = [
  'Grocery',
  'Fruits',
  'Veggi',
  'NonVeg',
  'Snacks',
  'Extra',
  'Petrol',
  'Other',
] as const;

export type Category = (typeof CATEGORIES)[number];
