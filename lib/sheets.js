import { google } from "googleapis";

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const SHEET_TAB = process.env.GOOGLE_SHEET_TAB || "Signal Noir Results";

function getAuth() {
  const privateKey = (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: privateKey,
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

export async function ensureHeaders(sheets) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_TAB}!A1:K1`,
  });
  const firstRow = res.data.values?.[0];
  if (!firstRow || firstRow[0] !== "Timestamp") {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_TAB}!A1`,
      valueInputOption: "RAW",
      requestBody: {
        values: [[
          "Timestamp", "Tester", "Session ID", "Property", "Destination",
          "Persona", "Category", "Query", "Platform", "Cited", "Sources"
        ]],
      },
    });
  }
}

export async function appendRow(row) {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });
  await ensureHeaders(sheets);
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_TAB}!A:K`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [row] },
  });
}
