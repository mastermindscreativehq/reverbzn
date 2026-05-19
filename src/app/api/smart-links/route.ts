import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const smartLinks = db.getSmartLinks();
  return NextResponse.json({ success: true, data: smartLinks });
}
