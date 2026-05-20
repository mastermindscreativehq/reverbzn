import { env } from "../lib/env.js";

const BASE = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}`;

interface TgChat {
  id: number;
  type: string;
  title?: string;
  username?: string;
  description?: string;
  member_count?: number;
}

interface TgMessage {
  message_id: number;
  date: number;
  text?: string;
  views?: number;
  forwards?: number;
}

interface TgResult<T> { ok: boolean; result: T }

async function tgGet<T>(method: string, params: Record<string, string> = {}): Promise<T> {
  const qs  = new URLSearchParams(params).toString();
  const url = `${BASE}/${method}${qs ? `?${qs}` : ""}`;
  const res = await fetch(url);
  const data = await res.json() as TgResult<T>;
  if (!data.ok) throw new Error(`Telegram API error: ${method}`);
  return data.result;
}

export async function getChannelInfo(channelId = env.TELEGRAM_CHANNEL_ID): Promise<TgChat> {
  return tgGet<TgChat>("getChat", { chat_id: channelId });
}

export async function getMemberCount(channelId = env.TELEGRAM_CHANNEL_ID): Promise<number> {
  return tgGet<number>("getChatMemberCount", { chat_id: channelId });
}

export async function getRecentMessages(channelId = env.TELEGRAM_CHANNEL_ID, limit = 10): Promise<TgMessage[]> {
  const updates = await tgGet<{ message?: TgMessage }[]>("getUpdates", {
    allowed_updates: "channel_post",
    limit: String(limit),
  });
  return updates.map(u => u.message).filter((m): m is TgMessage => !!m);
}

export interface TelegramSnapshot {
  channelId: string;
  memberCount: number;
  fetchedAt: Date;
}

export async function snapshotChannel(channelId = env.TELEGRAM_CHANNEL_ID): Promise<TelegramSnapshot> {
  const memberCount = await getMemberCount(channelId);
  return { channelId, memberCount, fetchedAt: new Date() };
}
