import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { executions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { verifyWebhookToken } from "@/lib/api/verify-token";

interface Params { params: Promise<{ id: string }> }

interface PatchBody {
  status?:   "success" | "failed";
  response?: Record<string, unknown>;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const denied = verifyWebhookToken(req);
  if (denied) return denied;

  const { id } = await params;
  const body = await req.json() as PatchBody;

  if (!body.status) {
    return NextResponse.json({ error: "status is required" }, { status: 400 });
  }

  const [updated] = await db
    .update(executions)
    .set({
      status:   body.status,
      response: body.response ?? null,
    })
    .where(eq(executions.id, id))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Execution not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}
