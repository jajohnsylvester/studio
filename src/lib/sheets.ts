
'use server';

import { google } from 'googleapis';
import type { Expense } from './types';
import { format } from 'date-fns';

const SHEET_ID = process.env.GOOGLE_SHEETS_SHEET_ID;

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
    await ensureSheetExists(sheets, range, ['id', 'date', 'description', 'category', 'amount']);
    
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
    
    if ([idIndex, dateIndex, descriptionIndex, categoryIndex, amountIndex].includes(-1)) {
        console.warn("One or more headers (id, date, description, category, amount) are missing in the Transactions Sheet. Assuming default order. Please add the header row for reliable data processing.");
    }


    return rows.slice(1).map((row, index): Expense | null => {
        if(row.every(cell => !cell)) return null; // Skip empty rows
        
        const amount = parseFloat(row[amountIndex > -1 ? amountIndex : 4]);
        if(isNaN(amount)) return null;

        return {
            id: row[idIndex > -1 ? idIndex : 0] || (index + 2).toString(),
            date: row[dateIndex > -1 ? dateIndex : 1] ? new Date(row[dateIndex > -1 ? dateIndex : 1]).toISOString() : new Date().toISOString(),
            description: row[descriptionIndex > -1 ? descriptionIndex : 2] || '',
            category: row[categoryIndex > -1 ? categoryIndex : 3] || 'Other',
            amount: amount,
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
  const newId = new Date().toISOString() + Math.random();
  const newExpense: Expense = { ...expense, id: newId };
  const newRow = [newExpense.id, format(new Date(newExpense.date), 'yyyy-MM-dd'), newExpense.description, newExpense.category, newExpense.amount];

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
  const updatedRow = [expense.id, format(new Date(expense.date), 'yyyy-MM-dd'), expense.description, expense.category, expense.amount];

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${range}!A${rowIndex}:E${rowIndex}`,
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
