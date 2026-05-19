import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const campaigns = db.getCampaigns();
  return NextResponse.json({ success: true, data: campaigns });
}
