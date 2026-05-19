import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const automations = db.getAutomations();
  return NextResponse.json({ success: true, data: automations });
}
