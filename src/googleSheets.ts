/* eslint-disable no-console */

import { google } from 'googleapis';
// require('../env.js') // Make sure this file exist in your root repo

export async function uploadToGoogleSheetsIfCredentialsPresent(uploadData: any, sheetName: 'data' | 'packageinfo-meta') {
  const sheets = await getAuthenticatedGoogleSheetObj();

  if (!!sheets) {
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: sheetName,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: uploadData
      }
    });
  }
}

/**
 * Clear google sheet and adds header if provided
 * @param sheetName 
 * @param header Optional header params
 */
export async function clearGoogleSheet(sheetName: 'data' | 'packageinfo-meta', header?: string[]) {
  let sheets = await getAuthenticatedGoogleSheetObj();

  if (!!sheets) {
    const request = {
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: sheetName
    }

    try {
      await sheets.spreadsheets.values.clear(request);
    } catch (err) {
      console.error(err);
    }
  }
}

async function getAuthenticatedGoogleSheetObj() {
  if (!process.env.GCLOUD_PROJECT || !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.warn(`Error uploading data to Google Sheet: Missing App credential or GCloud_project.
     Add Google Project and Sheet information to either gitlab job or
     update env.js and uncomment first line in googlesheets.ts `);
    return;
  }
  // This method looks for the GCLOUD_PROJECT and GOOGLE_APPLICATION_CREDENTIALS environment variables.
  const auth = new google.auth.GoogleAuth({
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets'
    ]
  });
  const authClient = await auth.getClient();

  // Connect to the sheets api
  const sheets = google.sheets({
    version: 'v4',
    auth: authClient
  });
  return sheets;
}

/**
 * How to create env.js file
 * process.env.GCLOUD_PROJECT = "ADDTHISDATA"
 * process.env.GOOGLE_APPLICATION_CREDENTIALS = "ADDTHISDATA"
 * process.env.SPREADSHEET_ID = "ADDTHISDATA"
 * 
 * and uncomment require('../env.js')
 */