
'use server';

import { google } from 'googleapis';
import type { Expense } from './types';
import { format } from 'date-fns';

const SHEET_ID = process.env.GOOGLE_SHEETS_SHEET_ID;
const RANGE = 'Sheet1'; 

const getAuth = () => {
  if (!process.env.GOOGLE_SHEETS_CLIENT_EMAIL || !process.env.GOOGLE_SHEETS_PRIVATE_KEY) {
    throw new Error('Google Sheets API credentials are not set in .env file.');
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return auth;
};

const getSheets = () => {
  const auth = getAuth();
  return google.sheets({ version: 'v4', auth });
}

export async function getExpenses(): Promise<Expense[]> {
  try {
    const sheets = getSheets();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: RANGE,
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

    return rows.slice(1).map((row, index): Expense | null => {
        if(row.every(cell => !cell)) return null; // Skip empty rows
        
        const amount = parseFloat(row[amountIndex]);
        if(isNaN(amount)) return null;

        return {
            id: row[idIndex] || (index + 2).toString(),
            date: row[dateIndex] ? new Date(row[dateIndex]).toISOString() : new Date().toISOString(),
            description: row[descriptionIndex] || '',
            category: row[categoryIndex] || 'Other',
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
  const newId = new Date().toISOString() + Math.random();
  const newExpense: Expense = { ...expense, id: newId };
  const newRow = [newExpense.id, format(new Date(newExpense.date), 'yyyy-MM-dd'), newExpense.description, newExpense.category, newExpense.amount];

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: RANGE,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [newRow],
    },
  });

  return newExpense;
}

async function findRowById(sheets: any, id: string): Promise<number | null> {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${RANGE}!A:A`, // Assuming 'id' is in column A
    });
    const ids = response.data.values;
    if (!ids) return null;
    const rowIndex = ids.findIndex(row => row[0] === id);
    return rowIndex !== -1 ? rowIndex + 1 : null;
}


export async function updateExpense(expense: Expense): Promise<Expense> {
  const sheets = getSheets();
  const rowIndex = await findRowById(sheets, expense.id);

  if (rowIndex === null) {
    throw new Error('Expense not found to update');
  }
  
  const updatedRow = [expense.id, format(new Date(expense.date), 'yyyy-MM-dd'), expense.description, expense.category, expense.amount];

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${RANGE}!A${rowIndex}:E${rowIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [updatedRow],
    },
  });

  return expense;
}

export async function deleteExpense(id: string): Promise<void> {
  const sheets = getSheets();
  const rowIndex = await findRowById(sheets, id);

  if (rowIndex === null) {
    throw new Error('Expense not found to delete');
  }

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
