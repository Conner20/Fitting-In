import { NextResponse } from "next/server";
import { z } from "zod";
import { sendContactMessage } from "@/lib/mail";

const contactSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(254),
  message: z.string().trim().min(1).max(5000),
  website: z.string().max(0).optional(),
});

const attempts = new Map<string, number[]>();

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  const recent = (attempts.get(ip) ?? []).filter(timestamp => now - timestamp < 10 * 60 * 1000);
  if (recent.length >= 5) return NextResponse.json({ error: "Too many messages. Please try again later." }, { status: 429 });
  attempts.set(ip, [...recent, now]);
  const parsed = contactSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Complete every field and enter a valid email address." }, { status: 400 });
  try {
    await sendContactMessage(parsed.data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[contact-form]", error);
    return NextResponse.json({ error: "Your message could not be sent. Please try again." }, { status: 500 });
  }
}
