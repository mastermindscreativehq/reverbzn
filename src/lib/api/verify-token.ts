import { NextRequest, NextResponse } from "next/server";

/**
 * Verifies the incoming webhook bearer token against ACTION_WEBHOOK_TOKEN.
 * If the env var is not set, all requests are allowed (useful in dev).
 * Returns a 401 NextResponse if invalid, or null if the request is authorised.
 */
export function verifyWebhookToken(req: NextRequest): NextResponse | null {
  const token = process.env.ACTION_WEBHOOK_TOKEN;
  if (!token) return null; // no token configured → allow

  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${token}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

/**
 * Returns headers to include when making outbound webhook calls to n8n.
 * Adds Authorization if ACTION_WEBHOOK_TOKEN is set.
 */
export function outboundWebhookHeaders(): Record<string, string> {
  const token = process.env.ACTION_WEBHOOK_TOKEN;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}
