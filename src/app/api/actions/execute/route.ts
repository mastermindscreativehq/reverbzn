import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { executions, insights, campaigns } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { outboundWebhookHeaders } from "@/lib/api/verify-token";

// Insight types that generate a campaign record when executed
const CAMPAIGN_INSIGHT_TYPES = new Set(["fan", "opportunity", "money", "content"]);

// Map insight type → campaign template
const TEMPLATE_MAP: Record<string, typeof campaigns.$inferInsert["template"]> = {
  fan:         "breakout_push",
  opportunity: "breakout_push",
  money:       "new_release",
  content:     "exclusive_drop",
};

// Map insight type → delivery channel (overridden by insight metadata if present)
const CHANNEL_MAP: Record<string, typeof campaigns.$inferInsert["channel"]> = {
  fan:         "email",
  opportunity: "email",
  money:       "telegram",
  content:     "email",
};

// Derive action type from channel so n8n can branch cleanly
function actionTypeForChannel(channel: string, base: string): string {
  const channelSuffix: Record<string, string> = {
    telegram: "telegram_message",
    email:    "email_campaign",
    whatsapp: "whatsapp_message",
    push:     "push_notification",
    sms:      "sms_message",
  };
  return channelSuffix[channel] ?? base;
}

export async function POST(req: NextRequest) {
  const { insightId, actionType: rawActionType } = await req.json() as {
    insightId:   string;
    actionType:  string;
  };

  if (!insightId || !rawActionType) {
    return NextResponse.json({ error: "insightId and actionType are required" }, { status: 400 });
  }

  // 1. Fetch the insight for context
  const [insight] = await db
    .select()
    .from(insights)
    .where(eq(insights.id, insightId))
    .limit(1);

  if (!insight) {
    return NextResponse.json({ error: "Insight not found" }, { status: 404 });
  }

  // 2. Resolve channel — prefer insight metadata hint, fall back to type map
  const metaChannel = (insight.metadata as Record<string, string> | null)?.channel;
  const validChannels = new Set(["email", "telegram", "whatsapp", "push", "sms"]);
  const channel: typeof campaigns.$inferInsert["channel"] =
    metaChannel && validChannels.has(metaChannel)
      ? (metaChannel as typeof campaigns.$inferInsert["channel"])
      : (CHANNEL_MAP[insight.type] ?? "email");

  // Derive final actionType from channel
  const actionType = actionTypeForChannel(channel, rawActionType);

  // 3. Insert execution row with pending status
  const [execution] = await db
    .insert(executions)
    .values({ insightId, actionType, status: "pending" })
    .returning();

  // 4. Create campaign draft (so campaignId is available for the webhook payload)
  let createdCampaign = null;
  if (CAMPAIGN_INSIGHT_TYPES.has(insight.type)) {
    const template = TEMPLATE_MAP[insight.type] ?? "breakout_push";

    const [camp] = await db
      .insert(campaigns)
      .values({
        artistId:    insight.artistId,
        insightId:   insight.id,
        executionId: execution.id,
        name:        insight.title,
        template,
        channel,
        status:      "draft",
        message:     insight.recommendedAction ?? insight.message,
      })
      .returning();

    createdCampaign = camp;
  }

  // 5. Fire webhook with full context
  const webhookUrl = process.env.ACTION_WEBHOOK_URL;
  const appBase    = process.env.APP_BASE_URL ?? "";

  let webhookResponse: unknown = null;
  let finalStatus: "success" | "failed" = "success";

  if (webhookUrl) {
    try {
      const payload = {
        // IDs for n8n to use in callback
        campaignId:        createdCampaign?.id ?? null,
        executionId:       execution.id,
        insightId:         insight.id,
        // Insight fields
        type:              insight.type,
        title:             insight.title,
        message:           insight.message,
        recommendedAction: insight.recommendedAction ?? null,
        actionUrl:         insight.actionUrl ?? null,
        metadata:          insight.metadata ?? null,
        // Delivery routing
        channel,
        actionType,
        // Callback URLs so n8n knows where to report back
        callbackUrl: createdCampaign
          ? `${appBase}/api/campaigns/${createdCampaign.id}`
          : null,
        executionCallbackUrl: `${appBase}/api/executions/${execution.id}`,
      };

      const res = await fetch(webhookUrl, {
        method:  "POST",
        headers: outboundWebhookHeaders(),
        body:    JSON.stringify(payload),
      });

      webhookResponse = {
        status:  res.status,
        ok:      res.ok,
        channel,
        actionType,
      };
      if (!res.ok) finalStatus = "failed";
    } catch (err) {
      webhookResponse = { error: String(err), channel, actionType };
      finalStatus = "failed";
    }
  }

  // 6. Update execution with final status and enriched response
  const [updatedExecution] = await db
    .update(executions)
    .set({ status: finalStatus, response: webhookResponse })
    .where(eq(executions.id, execution.id))
    .returning();

  return NextResponse.json(
    { execution: updatedExecution, campaign: createdCampaign },
    { status: finalStatus === "success" ? 200 : 502 },
  );
}
