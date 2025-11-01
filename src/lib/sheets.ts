
'use server';

import { google } from 'googleapis';
import type { Expense, Budget } from './types';
import { format, getYear } from 'date-fns';
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
    const sheet = response.data.sheets?.find((s: any) => s.properties?.title === sheetName);
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
        console.error(`Error ensuring sheet "${sheetName}" exists. This may be due to an invalid SHEET_ID.`, error);
        throw error;
    }
}

export async function getExpenses(year: number): Promise<Expense[]> {
  try {
    const sheets = getSheets();
    const range = `Transactions-${year}`;
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

    return rows.slice(1).map((row, index): Expense | null => {
        if(row.every(cell => !cell)) return null; // Skip empty rows
        
        const amount = parseFloat(row[amountIndex]);
        if(isNaN(amount)) return null;
        
        const category = row[categoryIndex] || 'Other';
        
        const dateStr = row[dateIndex];
        let date;
        try {
            date = toZonedTime(dateStr, TIME_ZONE).toISOString();
        } catch (e) {
            console.error(`Could not parse date "${dateStr}" at row ${index + 2}. Skipping row.`, e);
            return null; // Skip rows with invalid dates
        }

        return {
            id: row[idIndex] || (new Date().getTime() + index).toString(),
            date: date,
            description: row[descriptionIndex] || '',
            category: category,
            amount: amount,
            paid: category === 'Credit Card' ? (paidIndex > -1 ? row[paidIndex] === 'Paid' : false) : undefined,
        }
    }).filter((e): e is Expense => e !== null)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (error: any) {
    if (error.message && error.message.includes('Unable to parse range')) {
        console.log(`Sheet for year ${year} likely doesn't exist. Returning empty array.`);
        return [];
    }
    console.error('Error fetching expenses from Google Sheets:', error);
    return [];
  }
}

export async function addExpense(expense: Omit<Expense, 'id'>): Promise<Expense> {
  const sheets = getSheets();
  const expenseYear = getYear(toZonedTime(new Date(expense.date), TIME_ZONE));
  const range = `Transactions-${expenseYear}`;
  
  await ensureSheetExists(sheets, range, ['id', 'date', 'description', 'category', 'amount', 'paid']);

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${range}!A:A`,
  });

  const existingIds = response.data.values ? response.data.values.flat().map(id => parseInt(id, 10)).filter(id => !isNaN(id)) : [];
  const maxId = existingIds.length > 0 ? Math.max(0, ...existingIds) : 0;
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
    newExpense.category === 'Credit Card' ? (newExpense.paid ? 'Paid' : 'Not Paid') : ''
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
      range: `${rangeName}!A:A`,
    });
    const ids = response.data.values;
    if (!ids) return null;
    const rowIndex = ids.findIndex(row => row[0] === id);
    return rowIndex !== -1 ? { rowIndex: rowIndex + 1, range: rangeName } : null;
}


export async function updateExpense(expense: Expense): Promise<Expense> {
  const sheets = getSheets();
  
  const originalYear = getYear(toZonedTime(new Date(expense.date), TIME_ZONE));
  const originalRange = `Transactions-${originalYear}`;
  
  const updatedDate = toZonedTime(new Date(expense.date), TIME_ZONE);
  const updatedYear = getYear(updatedDate);
  const updatedRange = `Transactions-${updatedYear}`;

  if (originalYear !== updatedYear) {
    // If year has changed, delete from old sheet and add to new sheet
    await deleteExpense(expense, originalYear);
    const { id, ...newExpenseData } = expense;
    await addExpense(newExpenseData);
  } else {
    // If year is the same, just update the row
    const found = await findRowById(sheets, originalRange, expense.id);

    if (found === null) {
      throw new Error('Expense not found to update');
    }
    
    const { rowIndex, range } = found;
    
    const formattedDate = format(updatedDate, 'yyyy-MM-dd');
    const paidValue = expense.category === 'Credit Card' ? (expense.paid ? 'Paid' : 'Not Paid') : '';
    const updatedRow = [expense.id, formattedDate, expense.description, expense.category, expense.amount, paidValue];

    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${range}!A${rowIndex}:F${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [updatedRow],
      },
    });
  }

  return expense;
}

export async function deleteExpense(expense: Expense, year?: number): Promise<void> {
  const sheets = getSheets();
  const expenseYear = year || getYear(toZonedTime(new Date(expense.date), TIME_ZONE));
  const range = `Transactions-${expenseYear}`;
  
  const found = await findRowById(sheets, range, expense.id);

  if (found === null) {
    throw new Error('Expense not found to delete');
  }
  
  const { rowIndex } = found;

  const sheetId = await getSheetIdByName(sheets, range);
  
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

        return rows.flat().filter(Boolean);
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
    
    await sheets.spreadsheets.values.clear({
        spreadsheetId: SHEET_ID,
        range: `${range}!A2:B`,
    });
    
    if(budgets.length === 0) return;
    
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
        await sheets.spreadsheets.values.update({
            spreadsheetId: SHEET_ID,
            range: `${range}!B${rowIndex + 1}`,
            valueInputOption: 'RAW',
            requestBody: {
                values: [[password]],
            },
        });
    } else {
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

export async function getYearsWithExpenses(): Promise<number[]> {
    try {
        const sheets = getSheets();
        const response = await sheets.spreadsheets.get({
            spreadsheetId: SHEET_ID,
        });

        const sheetTitles = response.data.sheets?.map(s => s.properties?.title || '') || [];
        const transactionYears = sheetTitles
            .filter(title => title.startsWith('Transactions-'))
            .map(title => parseInt(title.split('-')[1]))
            .filter(year => !isNaN(year))
            .sort((a, b) => b - a);
            
        return transactionYears;
    } catch (error) {
        console.error('Error fetching sheet years:', error);
        return [new Date().getFullYear()];
    }
}

export async function searchAllExpenses(query: string): Promise<Omit<Expense, 'id' | 'paid'>[]> {
  try {
    const sheets = getSheets();
    const spreadsheetInfo = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
    const allSheetNames = spreadsheetInfo.data.sheets?.map(s => s.properties?.title || '') || [];
    
    const transactionSheetNames = allSheetNames.filter(name => name.startsWith('Transactions-'));

    if (transactionSheetNames.length === 0) {
      return [];
    }

    const searchPromises = transactionSheetNames.map(sheetName => 
      sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: sheetName,
      })
    );

    const responses = await Promise.all(searchPromises);
    const allResults: Omit<Expense, 'id' | 'paid'>[] = [];
    const lowerCaseQuery = query.toLowerCase();

    responses.forEach(response => {
      const rows = response.data.values;
      if (!rows || rows.length <= 1) return;

      const headers = rows[0];
      const descriptionIndex = headers.indexOf('description');
      const dateIndex = headers.indexOf('date');
      const categoryIndex = headers.indexOf('category');
      const amountIndex = headers.indexOf('amount');

      if ([descriptionIndex, dateIndex, categoryIndex, amountIndex].includes(-1)) {
        return;
      }
      
      rows.slice(1).forEach(row => {
        const description = row[descriptionIndex] || '';
        if (description.toLowerCase().includes(lowerCaseQuery)) {
           try {
                const amount = parseFloat(row[amountIndex]);
                if(isNaN(amount)) return;

                allResults.push({
                    description: description,
                    amount: amount,
                    category: row[categoryIndex] || 'Other',
                    date: toZonedTime(new Date(row[dateIndex]), TIME_ZONE).toISOString(),
                });
            } catch (e) {
                // Ignore rows with invalid data during search
            }
        }
      });
    });
    
    // Sort by date descending
    allResults.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return allResults;
  } catch (error) {
    console.error('Error searching all expenses:', error);
    throw new Error('Failed to search expenses across all sheets.');
  }
}
