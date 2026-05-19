import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { fans, fanEvents, fanSegmentMembers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { outboundWebhookHeaders } from "@/lib/api/verify-token";

interface Params { params: Promise<{ id: string }> }

type FanAction =
  | "invite_telegram"
  | "send_reengagement"
  | "send_release_alert"
  | "move_to_segment";

interface ActionBody {
  action:      FanAction;
  segmentId?:  string;   // required for move_to_segment
  trackId?:    string;   // optional context for release_alert
  note?:       string;
}

// Map action → fan event type for the log
const ACTION_EVENT_MAP: Record<FanAction, string> = {
  invite_telegram:    "telegram_joined",
  send_reengagement:  "campaign_clicked",
  send_release_alert: "campaign_clicked",
  move_to_segment:    "campaign_clicked",
};

// Map action → delivery channel
const ACTION_CHANNEL_MAP: Record<FanAction, string> = {
  invite_telegram:    "telegram",
  send_reengagement:  "email",
  send_release_alert: "email",
  move_to_segment:    "email",
};

export async function POST(req: NextRequest, { params }: Params) {
  const { id: fanId } = await params;
  const body = await req.json() as ActionBody;

  if (!body.action) {
    return NextResponse.json({ error: "action is required" }, { status: 400 });
  }

  // Fetch fan
  const [fan] = await db.select().from(fans).where(eq(fans.id, fanId)).limit(1);
  if (!fan) {
    return NextResponse.json({ error: "Fan not found" }, { status: 404 });
  }

  // If move_to_segment: write directly to DB, no webhook needed
  if (body.action === "move_to_segment") {
    if (!body.segmentId) {
      return NextResponse.json({ error: "segmentId is required for move_to_segment" }, { status: 400 });
    }
    await db
      .insert(fanSegmentMembers)
      .values({ fanId, segmentId: body.segmentId })
      .onConflictDoNothing();
    return NextResponse.json({ ok: true, action: body.action, fanId });
  }

  // Channel routing guard: don't invite to Telegram if telegramId already set
  if (body.action === "invite_telegram" && fan.telegramId) {
    return NextResponse.json({ error: "Fan already has a Telegram ID" }, { status: 409 });
  }

  // Fire to n8n webhook
  const webhookUrl = process.env.ACTION_WEBHOOK_URL;
  let webhookResponse: unknown = null;
  let ok = true;

  if (webhookUrl) {
    try {
      const payload = {
        type:      "fan_action",
        action:    body.action,
        channel:   ACTION_CHANNEL_MAP[body.action],
        fanId:     fan.id,
        artistId:  fan.artistId,
        fan: {
          displayName:  fan.displayName,
          email:        fan.email,
          telegramId:   fan.telegramId,
          whatsappPhone: fan.whatsappPhone,
          country:      fan.country,
          engagementScore: fan.engagementScore,
        },
        trackId:  body.trackId  ?? null,
        note:     body.note     ?? null,
        callbackUrl: `${process.env.APP_BASE_URL ?? ""}/api/fans/${fan.id}`,
      };

      const res = await fetch(webhookUrl, {
        method:  "POST",
        headers: outboundWebhookHeaders(),
        body:    JSON.stringify(payload),
      });

      webhookResponse = { status: res.status, ok: res.ok };
      if (!res.ok) ok = false;
    } catch (err) {
      webhookResponse = { error: String(err) };
      ok = false;
    }
  }

  // Log a fan event regardless of webhook outcome
  await db.insert(fanEvents).values({
    artistId:  fan.artistId,
    fanId:     fan.id,
    eventType: ACTION_EVENT_MAP[body.action] as typeof fanEvents.$inferInsert["eventType"],
    metadata:  { action: body.action, webhookResponse } as Record<string, unknown>,
  });

  return NextResponse.json(
    { ok, action: body.action, fanId, webhookResponse },
    { status: ok ? 200 : 502 },
  );
}
