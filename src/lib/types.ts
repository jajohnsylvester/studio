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
  'Food',
  'Transportation',
  'Entertainment',
  'Utilities',
  'Housing',
  'Healthcare',
  'Shopping',
  'Travel',
  'Education',
  'Personal',
  'Other',
] as const;

export type Category = (typeof CATEGORIES)[number];
