import type { Budget, Expense } from './types';

export const initialExpenses: Expense[] = [
    { "id": "1", "description": "Pooja Items", "amount": 106, "category": "Grocery", "date": "2024-09-18" },
    { "id": "2", "description": "Fruits Kels", "amount": 340, "category": "Fruits", "date": "2024-09-18" },
    { "id": "3", "description": "Mutton", "amount": 1150, "category": "NonVeg", "date": "2024-09-18" },
    { "id": "4", "description": "Cherry Tale", "amount": 170, "category": "Snacks", "date": "2024-09-18" },
    { "id": "5", "description": "2W pondy", "amount": 200, "category": "Petrol", "date": "2024-09-18" },
    { "id": "6", "description": "krishn", "amount": 219, "category": "Extra", "date": "2024-09-19" }
];

export const initialBudgets: Budget[] = [
    { "category": "Grocery", "limit": 500 },
    { "category": "Fruits", "limit": 400 },
    { "category": "Veggi", "limit": 300 },
    { "category": "NonVeg", "limit": 1200 },
    { "category": "Snacks", "limit": 200 },
    { "category": "Extra", "limit": 300 },
    { "category": "Petrol", "limit": 1000 },
    { "category": "Other", "limit": 100 }
];
