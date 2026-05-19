import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { insights } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

interface Params { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json() as Record<string, unknown>;

  const allowed: (keyof typeof insights.$inferInsert)[] = ["isRead", "isDismissed"];
  const updates: Partial<typeof insights.$inferInsert> = {};

  for (const key of allowed) {
    if (key in body) {
      (updates as Record<string, unknown>)[key] = body[key];
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const [updated] = await db
    .update(insights)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(insights.id, id))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Insight not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}
