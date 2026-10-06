import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { hasAdminAccessByEmail } from "@/lib/admin";
import { googleMetricsSheetUrl } from "@/lib/google-sheets-sync";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !(await hasAdminAccessByEmail(session.user.email))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = googleMetricsSheetUrl();
  if (!url) return NextResponse.json({ error: "Google Sheets sync is not configured." }, { status: 503 });
  return NextResponse.redirect(url);
}
