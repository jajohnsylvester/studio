
'use server';

import { google } from 'googleapis';
import type { Expense, Budget } from './types';
import { format, parseISO } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const SHEET_ID = process.env.GOOGLE_SHEETS_SHEET_ID;
const TIME_ZONE = 'Asia/Kolkata';

const getAuth = () => {
  if (!process.env.GOOGLE_SHEETS_CLIENT_EMAIL || !process.env.GOOGLE_SHEETS_PRIVATE_KEY || !process.env.GOOGLE_SHEETS_SHEET_ID) {
    throw new Error('Google Sheets API credentials or Sheet ID are not set in .env file.');
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return auth;
};

const getSheets = () => {
  const auth = getAuth();
  return google.sheets({ version: 'v4', auth });
}

async function getSheetIdByName(sheets: any, sheetName: string): Promise<number | undefined> {
    const response = await sheets.spreadsheets.get({
        spreadsheetId: SHEET_ID,
    });
    const sheet = response.data.sheets?.find(s => s.properties?.title === sheetName);
    return sheet?.properties?.sheetId;
}

async function ensureSheetExists(sheets: any, sheetName: string, headers: string[]) {
    try {
        const sheetInfo = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
        const sheetExists = sheetInfo.data.sheets.some((s: any) => s.properties.title === sheetName);

        if (!sheetExists) {
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId: SHEET_ID,
                requestBody: {
                    requests: [{ addSheet: { properties: { title: sheetName } } }],
                },
            });
            await sheets.spreadsheets.values.update({
                spreadsheetId: SHEET_ID,
                range: `${sheetName}!A1`,
                valueInputOption: 'RAW',
                requestBody: {
                    values: [headers],
                },
            });
        }
    } catch (error) {
        // If the sheet ID is invalid, this will fail. We can't do much here.
        // The user will see a toast notification on the frontend.
        console.error(`Error ensuring sheet "${sheetName}" exists. This may be due to an invalid SHEET_ID.`, error);
        throw error;
    }
}

export async function getExpenses(): Promise<Expense[]> {
  try {
    const sheets = getSheets();
    const range = 'Transactions';
    await ensureSheetExists(sheets, range, ['id', 'date', 'description', 'category', 'amount', 'paid']);
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: range,
    });

    const rows = response.data.values;
    if (!rows || rows.length <= 1) {
      return [];
    }

    const headers = rows[0];
    const idIndex = headers.indexOf('id');
    const dateIndex = headers.indexOf('date');
    const descriptionIndex = headers.indexOf('description');
    const categoryIndex = headers.indexOf('category');
    const amountIndex = headers.indexOf('amount');
    const paidIndex = headers.indexOf('paid');
    
    if ([idIndex, dateIndex, descriptionIndex, categoryIndex, amountIndex].includes(-1)) {
        console.warn("One or more headers (id, date, description, category, amount) are missing in the Transactions Sheet. Assuming default order. Please add the header row for reliable data processing.");
    }
    if (paidIndex === -1) {
        console.warn("The 'paid' header is missing in the Transactions Sheet. Paid status for credit card transactions will not be loaded. Please add the 'paid' header.");
    }

    return rows.slice(1).map((row, index): Expense | null => {
        if(row.every(cell => !cell)) return null; // Skip empty rows
        
        const amount = parseFloat(row[amountIndex > -1 ? amountIndex : 4]);
        if(isNaN(amount)) return null;
        
        const category = row[categoryIndex > -1 ? categoryIndex : 3] || 'Other';
        
        const dateStr = row[dateIndex > -1 ? dateIndex : 1];
        let date;
        try {
            // Dates from sheets are 'YYYY-MM-DD'. Parse them and treat as IST.
            date = toZonedTime(`${dateStr}T00:00:00`, TIME_ZONE).toISOString();
        } catch (e) {
            console.error(`Could not parse date "${dateStr}". Skipping row.`, e);
            return null; // Skip rows with invalid dates
        }

        return {
            id: row[idIndex > -1 ? idIndex : 0] || (new Date().getTime() + index).toString(),
            date: date,
            description: row[descriptionIndex > -1 ? descriptionIndex : 2] || '',
            category: category,
            amount: amount,
            paid: category === 'Credit Card' ? (paidIndex > -1 ? row[paidIndex] === 'TRUE' : false) : undefined,
        }
    }).filter((e): e is Expense => e !== null)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (error) {
    console.error('Error fetching expenses from Google Sheets:', error);
    // Return empty array to prevent app crash if sheet is not accessible
    return [];
  }
}

export async function addExpense(expense: Omit<Expense, 'id'>): Promise<Expense> {
  const sheets = getSheets();
  const range = 'Transactions';
  
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${range}!A:A`,
  });

  const existingIds = response.data.values ? response.data.values.flat().map(id => parseInt(id, 10)).filter(id => !isNaN(id)) : [];
  const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 0;
  const newId = maxId + 1;

  const newExpense: Expense = { 
    ...expense, 
    id: newId.toString(),
    paid: expense.category === 'Credit Card' ? !!expense.paid : undefined
  };
  
  const formattedDate = format(toZonedTime(new Date(newExpense.date), TIME_ZONE), 'yyyy-MM-dd');

  const newRow = [
    newExpense.id, 
    formattedDate, 
    newExpense.description, 
    newExpense.category, 
    newExpense.amount,
    newExpense.category === 'Credit Card' ? (newExpense.paid ? 'TRUE' : 'FALSE') : ''
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: range,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [newRow],
    },
  });

  return newExpense;
}

async function findRowById(sheets: any, rangeName: string, id: string): Promise<{rowIndex: number, range: string} | null> {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${rangeName}!A:A`, // Assuming 'id' is in column A
    });
    const ids = response.data.values;
    if (!ids) return null;
    const rowIndex = ids.findIndex(row => row[0] === id);
    return rowIndex !== -1 ? { rowIndex: rowIndex + 1, range: rangeName } : null;
}


export async function updateExpense(expense: Expense): Promise<Expense> {
  const sheets = getSheets();
  const found = await findRowById(sheets, 'Transactions', expense.id);

  if (found === null) {
    throw new Error('Expense not found to update');
  }
  
  const { rowIndex, range } = found;
  
  const formattedDate = format(toZonedTime(new Date(expense.date), TIME_ZONE), 'yyyy-MM-dd');
  const paidValue = expense.category === 'Credit Card' ? (expense.paid ? 'TRUE' : 'FALSE') : '';
  const updatedRow = [expense.id, formattedDate, expense.description, expense.category, expense.amount, paidValue];

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${range}!A${rowIndex}:F${rowIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [updatedRow],
    },
  });

  return expense;
}

export async function deleteExpense(id: string): Promise<void> {
  const sheets = getSheets();
  const found = await findRowById(sheets, 'Transactions', id);

  if (found === null) {
    throw new Error('Expense not found to delete');
  }
  
  const { rowIndex } = found;

  const sheetId = await getSheetIdByName(sheets, 'Transactions');
  
  if (sheetId === undefined) {
    throw new Error("Could not find sheet ID to delete row.");
  }


  await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: {
          requests: [
              {
                  deleteDimension: {
                      range: {
                          sheetId: sheetId, 
                          dimension: 'ROWS',
                          startIndex: rowIndex - 1,
                          endIndex: rowIndex,
                      }
                  }
              }
          ]
      }
  })
}

// --- CATEGORIES ---

export async function getCategories(): Promise<string[]> {
    try {
        const sheets = getSheets();
        const range = 'Categories';
        await ensureSheetExists(sheets, range, ['name']);
        
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: `${range}!A2:A`,
        });

        const rows = response.data.values;
        if (!rows) return [];

        return rows.flat().filter(Boolean); // [['Cat1'], ['Cat2']] -> ['Cat1', 'Cat2']
    } catch (error) {
        console.error('Error fetching categories:', error);
        return [];
    }
}

export async function addCategory(categoryName: string): Promise<void> {
    const sheets = getSheets();
    const range = 'Categories';
    
    await sheets.spreadsheets.values.append({
        spreadsheetId: SHEET_ID,
        range: range,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
            values: [[categoryName]],
        },
    });
}

export async function deleteCategory(categoryName: string): Promise<void> {
    const sheets = getSheets();
    const range = 'Categories';

    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `${range}!A:A`,
    });

    const categories = response.data.values;
    if (!categories) {
        throw new Error("Category sheet is empty.");
    }
    
    const rowIndex = categories.findIndex(row => row[0] === categoryName);

    if (rowIndex === -1) {
        throw new Error('Category not found to delete.');
    }
    
    const sheetId = await getSheetIdByName(sheets, range);
    if (sheetId === undefined) {
        throw new Error(`Could not find sheet ID for "${range}" to delete row.`);
    }

    await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SHEET_ID,
        requestBody: {
            requests: [
                {
                    deleteDimension: {
                        range: {
                            sheetId: sheetId,
                            dimension: 'ROWS',
                            startIndex: rowIndex,
                            endIndex: rowIndex + 1,
                        }
                    }
                }
            ]
        }
    });
}


// --- BUDGETS ---
export async function getBudgets(): Promise<Budget[]> {
    try {
        const sheets = getSheets();
        const range = 'Budgets';
        await ensureSheetExists(sheets, range, ['category', 'amount']);

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: `${range}!A2:B`,
        });

        const rows = response.data.values;
        if (!rows) return [];
        
        return rows.map(row => ({
            category: row[0],
            amount: parseFloat(row[1]) || 0,
        })).filter(b => b.category);
    } catch (error) {
        console.error('Error fetching budgets:', error);
        return [];
    }
}

export async function updateBudgets(budgets: Budget[]): Promise<void> {
    const sheets = getSheets();
    const range = 'Budgets';
    
    // Clear existing budgets (A2:B)
    await sheets.spreadsheets.values.clear({
        spreadsheetId: SHEET_ID,
        range: `${range}!A2:B`,
    });
    
    if(budgets.length === 0) return;
    
    // Write new budgets
    await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: `${range}!A2`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
            values: budgets.map(b => [b.category, b.amount]),
        },
    });
}

// --- MASTER PASSWORD ---

const MASTER_PASSWORD_KEY = "masterPassword";

export async function getMasterPassword(): Promise<string | null> {
    try {
        const sheets = getSheets();
        const range = 'Settings';
        await ensureSheetExists(sheets, range, ['key', 'value']);

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: `${range}!A:B`,
        });

        const rows = response.data.values;
        if (!rows || rows.length <= 1) {
            return null;
        }
        
        const passwordRow = rows.find(row => row[0] === MASTER_PASSWORD_KEY);
        return passwordRow ? passwordRow[1] : null;
    } catch (error) {
        console.error('Error getting master password:', error);
        return null;
    }
}

export async function setMasterPassword(password: string): Promise<void> {
    const sheets = getSheets();
    const range = 'Settings';

    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `${range}!A:A`,
    });
    
    const rows = response.data.values;
    let rowIndex = rows ? rows.findIndex(row => row[0] === MASTER_PASSWORD_KEY) : -1;
    
    if (rowIndex !== -1) {
        // Update existing password
        await sheets.spreadsheets.values.update({
            spreadsheetId: SHEET_ID,
            range: `${range}!B${rowIndex + 1}`,
            valueInputOption: 'RAW',
            requestBody: {
                values: [[password]],
            },
        });
    } else {
        // Add new password
        await sheets.spreadsheets.values.append({
            spreadsheetId: SHEET_ID,
            range: range,
            valueInputOption: 'RAW',
            requestBody: {
                values: [[MASTER_PASSWORD_KEY, password]],
            },
        });
    }
}
