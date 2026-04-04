import { verifyToken, COOKIE } from "../../../lib/auth";
import { google } from "googleapis";

const SHEET_ID = process.env.GOOGLE_SHEET_ID;

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

async function ensureTab(sheets, tabName) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const exists = meta.data.sheets?.some(s => s.properties.title === tabName);
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: {
        requests: [{ addSheet: { properties: { title: tabName } } }],
      },
    });
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const token = req.cookies[COOKIE];
  const payload = await verifyToken(token);
  if (!payload) return res.status(401).json({ error: "Unauthorised" });

  const { agency, sessionId, publications, results, platforms, runDate, promptVersion } = req.body;
  // results = { Claude: {counts, queryResults}, ChatGPT: {...}, ... }

  const tabName = `${agency} — Signal Noir`.slice(0, 50);

  try {
    const auth = getAuth();
    const sheets = google.sheets({ version: "v4", auth });
    await ensureTab(sheets, tabName);

    // Build header row
    const platformList = platforms || ["ChatGPT", "Claude", "Perplexity", "Gemini"];
    const citationCols = platformList.map(p => `${p} Citations (0-${Object.keys(results[p]?.counts || {}).length > 0 ? Object.values(results[platformList[0]]?.counts || {}).length : 30})`);
    const headers = ["Publication", ...citationCols, "TOTAL Citations", "Citation Rate %", "SEMrush AI Visibility - Worldwide"];

    // Build data rows
    const rows = publications.map(pub => {
      const platCounts = platformList.map(p => results[p]?.counts?.[pub] ?? 0);
      const total = platCounts.reduce((a, b) => a + b, 0);
      const maxTotal = platformList.length * 30;
      const rate = maxTotal > 0 ? `${Math.round(total / maxTotal * 100)}%` : "0%";
      return [pub, ...platCounts, total, rate, ""];
    });

    // Write to sheet
    const allRows = [
      [`Signal Noir™ Publication Authority Report — ${agency}`],
      [`Generated: ${runDate || new Date().toISOString()} · Tester: ${payload.name} · Session: ${sessionId} · Prompt: ${promptVersion || 'v2-organic'} · Publications in prompt: ${promptVersion === 'v1-guided' ? 'YES' : 'NO'}`],
      [],
      headers,
      ...rows,
      [],
      ["Query Testing Tracking"],
      ["Query #", "Query Text", ...platformList.map(p => `${p} Sources`)],
    ];

    // Add query-level detail from first platform that has results
    const firstPlatform = platformList.find(p => results[p]?.queryResults?.length);
    if (firstPlatform) {
      results[firstPlatform].queryResults.forEach((qr, i) => {
        const sourceCols = platformList.map(p => results[p]?.queryResults?.[i]?.sources || "");
        allRows.push([qr.queryNum || i + 1, qr.query || "", ...sourceCols]);
      });
    }

    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${tabName}!A1`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: allRows },
    });

    res.status(200).json({ ok: true, tabName });
  } catch (e) {
    console.error("Sheets mode2 error:", e.message);
    res.status(500).json({ error: e.message });
  }
}
