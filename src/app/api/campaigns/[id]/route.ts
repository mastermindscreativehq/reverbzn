import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { campaigns } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { verifyWebhookToken } from "@/lib/api/verify-token";

interface Params { params: Promise<{ id: string }> }

interface PatchBody {
  status?:         "active" | "completed" | "failed";
  recipientCount?: number;
  deliveredCount?: number;
  openCount?:      number;
  clickCount?:     number;
  conversionCount?: number;
  errorMessage?:   string;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const denied = verifyWebhookToken(req);
  if (denied) return denied;

  const { id } = await params;
  const body = await req.json() as PatchBody;

  const updates: Partial<typeof campaigns.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (body.status          !== undefined) updates.status          = body.status;
  if (body.recipientCount  !== undefined) updates.recipientCount  = body.recipientCount;
  if (body.deliveredCount  !== undefined) updates.deliveredCount  = body.deliveredCount;
  if (body.openCount       !== undefined) updates.openCount       = body.openCount;
  if (body.clickCount      !== undefined) updates.clickCount      = body.clickCount;
  if (body.conversionCount !== undefined) updates.conversionCount = body.conversionCount;
  if (body.errorMessage    !== undefined) updates.errorMessage    = body.errorMessage;

  // Recompute rates when we have both numerator and denominator
  const recipients = body.recipientCount ?? 0;
  if (recipients > 0) {
    if (body.openCount       !== undefined) updates.openRate       = String(Math.round((body.openCount       / recipients) * 10000) / 100);
    if (body.clickCount      !== undefined) updates.clickRate      = String(Math.round((body.clickCount      / recipients) * 10000) / 100);
    if (body.conversionCount !== undefined) updates.conversionRate = String(Math.round((body.conversionCount / recipients) * 10000) / 100);
  }

  // Lifecycle timestamps
  if (body.status === "active")    updates.sentAt      = new Date();
  if (body.status === "completed") updates.completedAt = new Date();

  if (Object.keys(updates).length === 1) { // only updatedAt
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const [updated] = await db
    .update(campaigns)
    .set(updates)
    .where(eq(campaigns.id, id))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}
