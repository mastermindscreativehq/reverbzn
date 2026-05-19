import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const notifications = db.getNotifications();
  return NextResponse.json({ success: true, data: notifications });
}
