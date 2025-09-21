
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

// This list should be dynamically managed if categories can be added by the user.
// For now, it's a starting point and should be updated if new static categories are added.
export let CATEGORIES = [
  'Grocery',
  'Fruits',
  'Veggi',
  'NonVeg',
  'Snacks',
  'Extra',
  'Petrol',
  'Credit Card',
  'Other',
] as string[];

export function addCategory(newCategory: string) {
    if (!CATEGORIES.includes(newCategory)) {
        CATEGORIES.push(newCategory);
    }
}

export type Category = (typeof CATEGORIES)[number];
