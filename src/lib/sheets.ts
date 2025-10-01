
'use server';

import { google } from 'googleapis';
import type { Expense, Budget } from './types';
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

export async function getBudgets(year: number, month: string): Promise<Budget[]> {
  try {
    const sheets = getSheets();
    const range = 'Budgets';
    await ensureSheetExists(sheets, range, ['year', 'month', 'category', 'limit']);

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: range,
    });

    const rows = response.data.values;
    if (!rows || rows.length <= 1) {
      return [];
    }
    
    const headers = rows[0];
    const yearIndex = headers.indexOf('year');
    const monthIndex = headers.indexOf('month');
    const categoryIndex = headers.indexOf('category');
    const limitIndex = headers.indexOf('limit');

    return rows.slice(1).map((row): Budget | null => {
        if (row.every(cell => !cell)) return null;
        if (parseInt(row[yearIndex]) !== year || row[monthIndex] !== month) return null;

        const limit = parseFloat(row[limitIndex]);
        if (isNaN(limit)) return null;
        return {
            category: row[categoryIndex] || 'Other',
            limit,
        };
    }).filter((b): b is Budget => b !== null);
  } catch (error) {
    console.error('Error fetching budgets from Google Sheets:', error);
    return [];
  }
}

export async function updateBudgets(year: number, month: string, budgets: Budget[]): Promise<void> {
    const sheets = getSheets();
    const range = 'Budgets';
    await ensureSheetExists(sheets, range, ['year', 'month', 'category', 'limit']);

    // 1. Read all data
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: range,
    });
    const allRows = response.data.values || [];
    const headers = allRows[0] || ['year', 'month', 'category', 'limit'];
    const dataRows = allRows.length > 1 ? allRows.slice(1) : [];

    // 2. Filter out the rows for the month being updated
    const otherMonthRows = dataRows.filter(row => row[0] !== year.toString() || row[1] !== month);

    // 3. Create new rows for the current month's budgets
    const newMonthRows = budgets.map(b => [year.toString(), month, b.category, b.limit]);

    // 4. Combine and sort
    const finalRows = [...otherMonthRows, ...newMonthRows];
    finalRows.sort((a,b) => {
        if (a[0] !== b[0]) return parseInt(a[0]) - parseInt(b[0]); // year
        const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        if (a[1] !== b[1]) return months.indexOf(a[1]) - months.indexOf(b[1]); // month
        return a[2].localeCompare(b[2]); // category
    });

    // 5. Clear the sheet (below headers)
    await sheets.spreadsheets.values.clear({
        spreadsheetId: SHEET_ID,
        range: `${range}!A2:D${dataRows.length + 1}`,
    });

    // 6. Write the sorted data back
    if (finalRows.length > 0) {
        await sheets.spreadsheets.values.update({
            spreadsheetId: SHEET_ID,
            range: `${range}!A2`,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: finalRows,
            },
        });
    }
}
