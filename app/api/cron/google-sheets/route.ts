import { NextResponse } from "next/server";
import { syncAdminMetricsToGoogleSheets } from "@/lib/google-sheets-sync";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json({ ok: true, ...(await syncAdminMetricsToGoogleSheets()) });
  } catch (error) {
    console.error("Google Sheets metrics sync failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Google Sheets sync failed." }, { status: 500 });
  }
}
