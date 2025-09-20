import type { Budget, Expense } from './types';

export const initialExpenses: Expense[] = [
    { "id": "1", "description": "Groceries", "amount": 75.50, "category": "Food", "date": "2024-05-01" },
    { "id": "2", "description": "Monthly metro pass", "amount": 121.00, "category": "Transportation", "date": "2024-05-01" },
    { "id": "3", "description": "Movie night", "amount": 42.00, "category": "Entertainment", "date": "2024-05-03" },
    { "id": "4", "description": "Electricity bill", "amount": 95.20, "category": "Utilities", "date": "2024-05-05" },
    { "id": "5", "description": "Rent", "amount": 1500.00, "category": "Housing", "date": "2024-05-05" },
    { "id": "6", "description": "Pharmacy", "amount": 25.00, "category": "Healthcare", "date": "2024-05-07" },
    { "id": "7", "description": "New shoes", "amount": 89.99, "category": "Shopping", "date": "2024-05-10" },
    { "id": "8", "description": "Dinner with friends", "amount": 63.75, "category": "Food", "date": "2024-05-12" },
    { "id": "9", "description": "Gas", "amount": 55.40, "category": "Transportation", "date": "2024-05-15" },
    { "id": "10", "description": "Concert tickets", "amount": 150.00, "category": "Entertainment", "date": "2024-05-18" }
];

export const initialBudgets: Budget[] = [
    { "category": "Food", "limit": 400 },
    { "category": "Transportation", "limit": 200 },
    { "category": "Entertainment", "limit": 150 },
    { "category": "Utilities", "limit": 150 },
    { "category": "Housing", "limit": 1500 },
    { "category": "Healthcare", "limit": 100 },
    { "category": "Shopping", "limit": 250 },
    { "category": "Travel", "limit": 500 },
    { "category": "Education", "limit": 100 },
    { "category": "Personal", "limit": 100 },
    { "category": "Other", "limit": 50 }
];
