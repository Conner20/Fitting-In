import { createSign } from "node:crypto";
import type ExcelJS from "exceljs";
import { buildAdminMetricsWorkbook } from "@/lib/admin-metrics-workbook";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";
const GOOGLE_SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets";

const base64url = (value: string | Buffer) => Buffer.from(value).toString("base64url");
const quoteSheet = (title: string) => `'${title.replace(/'/g, "''")}'`;

function requiredEnvironment() {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID?.trim();
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();
  if (!spreadsheetId || !clientEmail || !privateKey) {
    throw new Error("Google Sheets sync is not configured. Set GOOGLE_SHEETS_SPREADSHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.");
  }
  return { spreadsheetId, clientEmail, privateKey };
}

async function accessToken(clientEmail: string, privateKey: string) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(JSON.stringify({ iss: clientEmail, scope: GOOGLE_SHEETS_SCOPE, aud: GOOGLE_TOKEN_URL, iat: now, exp: now + 3600 }));
  const unsigned = `${header}.${claims}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const assertion = `${unsigned}.${base64url(signer.sign(privateKey))}`;
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
    cache: "no-store",
  });
  const result = await response.json() as { access_token?: string; error_description?: string };
  if (!response.ok || !result.access_token) throw new Error(result.error_description || "Google service-account authentication failed.");
  return result.access_token;
}

async function googleRequest<T>(url: string, token: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Google Sheets API returned ${response.status}: ${detail.slice(0, 800)}`);
  }
  return response.status === 204 ? undefined as T : await response.json() as T;
}

type SheetValues = { title: string; values: (string | number | boolean)[][]; rows: number; columns: number };

function cellValue(cell: ExcelJS.Cell): string | number | boolean {
  const value = cell.value;
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (value instanceof Date) return value.toISOString();
  return cell.text || String(value);
}

function worksheetValues(workbook: ExcelJS.Workbook): SheetValues[] {
  return workbook.worksheets.map(sheet => {
    const columns = Math.max(1, sheet.columnCount);
    const values: (string | number | boolean)[][] = [];
    sheet.eachRow({ includeEmpty: true }, row => {
      values.push(Array.from({ length: columns }, (_, index) => cellValue(row.getCell(index + 1))));
    });
    if (!values.length) values.push([""]);
    return { title: sheet.name, values, rows: values.length, columns };
  });
}

type SpreadsheetMetadata = { sheets?: { properties?: { sheetId?: number; title?: string; gridProperties?: { rowCount?: number; columnCount?: number } } }[] };

function valueChunks(sheet: SheetValues) {
  const chunks: { range: string; majorDimension: "ROWS"; values: SheetValues["values"] }[] = [];
  let start = 0;
  while (start < sheet.values.length) {
    let end = start;
    let bytes = 0;
    while (end < sheet.values.length && end - start < 5_000) {
      const rowBytes = Buffer.byteLength(JSON.stringify(sheet.values[end]), "utf8");
      if (end > start && bytes + rowBytes > 900_000) break;
      bytes += rowBytes;
      end += 1;
    }
    chunks.push({ range: `${quoteSheet(sheet.title)}!A${start + 1}`, majorDimension: "ROWS", values: sheet.values.slice(start, end) });
    start = end;
  }
  return chunks;
}

export function googleMetricsSheetUrl() {
  const id = process.env.GOOGLE_SHEETS_SPREADSHEET_ID?.trim();
  return id ? `https://docs.google.com/spreadsheets/d/${encodeURIComponent(id)}/edit` : null;
}

export async function syncAdminMetricsToGoogleSheets() {
  const { spreadsheetId, clientEmail, privateKey } = requiredEnvironment();
  const [token, workbook] = await Promise.all([accessToken(clientEmail, privateKey), buildAdminMetricsWorkbook()]);
  const sheets = worksheetValues(workbook);
  const baseUrl = `${GOOGLE_SHEETS_API}/${encodeURIComponent(spreadsheetId)}`;
  let metadata = await googleRequest<SpreadsheetMetadata>(`${baseUrl}?fields=sheets.properties`, token);
  const existingTitles = new Set((metadata.sheets ?? []).map(sheet => sheet.properties?.title).filter(Boolean));
  const missing = sheets.filter(sheet => !existingTitles.has(sheet.title));
  if (missing.length) {
    await googleRequest(`${baseUrl}:batchUpdate`, token, { method: "POST", body: JSON.stringify({ requests: missing.map(sheet => ({ addSheet: { properties: { title: sheet.title, gridProperties: { rowCount: Math.max(1_000, sheet.rows), columnCount: Math.max(26, sheet.columns) } } } })) }) });
    metadata = await googleRequest<SpreadsheetMetadata>(`${baseUrl}?fields=sheets.properties`, token);
  }

  const propertiesByTitle = new Map((metadata.sheets ?? []).flatMap(sheet => sheet.properties?.title && sheet.properties.sheetId !== undefined ? [[sheet.properties.title, sheet.properties] as const] : []));
  const formatRequests = sheets.flatMap(sheet => {
    const properties = propertiesByTitle.get(sheet.title);
    if (!properties || properties.sheetId === undefined) throw new Error(`Google Sheet tab was not created: ${sheet.title}`);
    const rowCount = Math.max(properties.gridProperties?.rowCount ?? 0, sheet.rows, 1_000);
    const columnCount = Math.max(properties.gridProperties?.columnCount ?? 0, sheet.columns, 26);
    return [
      { updateSheetProperties: { properties: { sheetId: properties.sheetId, gridProperties: { rowCount, columnCount, frozenRowCount: 1 } }, fields: "gridProperties(rowCount,columnCount,frozenRowCount)" } },
      { repeatCell: { range: { sheetId: properties.sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: sheet.columns }, cell: { userEnteredFormat: { backgroundColor: { red: 0.133, green: 0.773, blue: 0.369 }, textFormat: { bold: true, foregroundColor: { red: 0, green: 0, blue: 0 } } } }, fields: "userEnteredFormat(backgroundColor,textFormat)" } },
      { setBasicFilter: { filter: { range: { sheetId: properties.sheetId, startRowIndex: 0, endRowIndex: sheet.rows, startColumnIndex: 0, endColumnIndex: sheet.columns } } } },
    ];
  });

  for (let index = 0; index < formatRequests.length; index += 100) {
    await googleRequest(`${baseUrl}:batchUpdate`, token, { method: "POST", body: JSON.stringify({ requests: formatRequests.slice(index, index + 100) }) });
  }
  await googleRequest(`${baseUrl}/values:batchClear`, token, { method: "POST", body: JSON.stringify({ ranges: sheets.map(sheet => quoteSheet(sheet.title)) }) });
  const chunks = sheets.flatMap(valueChunks);
  for (let index = 0; index < chunks.length; index += 10) {
    await googleRequest(`${baseUrl}/values:batchUpdate`, token, { method: "POST", body: JSON.stringify({ valueInputOption: "RAW", data: chunks.slice(index, index + 10) }) });
  }
  return { spreadsheetId, tabs: sheets.length, rows: sheets.reduce((sum, sheet) => sum + sheet.rows, 0), syncedAt: new Date().toISOString() };
}
