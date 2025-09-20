
'use server';

import { google } from 'googleapis';
import type { Expense } from './types';
import { format } from 'date-fns';

const SHEET_ID = process.env.GOOGLE_SHEETS_SHEET_ID;

const getAuth = () => {
  if (!process.env.GOOGLE_SHEETS_CLIENT_EMAIL || !process.env.GOOGLE_SHEETS_PRIVATE_KEY) {
    throw new Error('Google Sheets API credentials are not set in .env file.');
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

async function getFirstSheetName(sheets: any): Promise<string> {
    const response = await sheets.spreadsheets.get({
        spreadsheetId: SHEET_ID,
    });
    const firstSheet = response.data.sheets?.[0];
    const sheetName = firstSheet?.properties?.title;

    if (!sheetName) {
        throw new Error('No sheets found in the spreadsheet.');
    }
    return sheetName;
}

export async function getExpenses(): Promise<Expense[]> {
  try {
    const sheets = getSheets();
    const range = await getFirstSheetName(sheets);
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: range,
    });

    const rows = response.data.values;
    if (!rows || rows.length <= 1) {
      // If there are no rows or only a header, create the header row.
      if (!rows || rows.length === 0) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: SHEET_ID,
          range: `${range}!A1`,
          valueInputOption: 'RAW',
          requestBody: {
            values: [['id', 'date', 'description', 'category', 'amount']],
          },
        });
      }
      return [];
    }

    const headers = rows[0];
    const idIndex = headers.indexOf('id');
    const dateIndex = headers.indexOf('date');
    const descriptionIndex = headers.indexOf('description');
    const categoryIndex = headers.indexOf('category');
    const amountIndex = headers.indexOf('amount');
    
    // If headers are missing, assume default order, but log a warning.
    if ([idIndex, dateIndex, descriptionIndex, categoryIndex, amountIndex].includes(-1)) {
        console.warn("One or more headers (id, date, description, category, amount) are missing in the Google Sheet. Assuming default order. Please add the header row for reliable data processing.");
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
    // Return empty array on error to prevent app crash, error is logged for debugging.
    return [];
  }
}

export async function addExpense(expense: Omit<Expense, 'id'>): Promise<Expense> {
  const sheets = getSheets();
  const range = await getFirstSheetName(sheets);
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

async function findRowById(sheets: any, id: string): Promise<{rowIndex: number, range: string} | null> {
    const range = await getFirstSheetName(sheets);
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${range}!A:A`, // Assuming 'id' is in column A
    });
    const ids = response.data.values;
    if (!ids) return null;
    const rowIndex = ids.findIndex(row => row[0] === id);
    return rowIndex !== -1 ? { rowIndex: rowIndex + 1, range } : null;
}


export async function updateExpense(expense: Expense): Promise<Expense> {
  const sheets = getSheets();
  const found = await findRowById(sheets, expense.id);

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
  const found = await findRowById(sheets, id);

  if (found === null) {
    throw new Error('Expense not found to delete');
  }
  
  const { rowIndex } = found;

  await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: {
          requests: [
              {
                  deleteDimension: {
                      range: {
                          sheetId: 0, // Assuming first sheet
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
