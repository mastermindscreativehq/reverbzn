import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const events = db.getFanEvents();
  return NextResponse.json({ success: true, data: events });
}

export async function POST(req: Request) {
  const body = await req.json();
  // In production: validate with Zod, persist to DB, run automation triggers
  console.log("[Event Ingested]", body);
  return NextResponse.json({ success: true, data: { received: true } });
}
