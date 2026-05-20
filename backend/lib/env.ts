import "dotenv/config";

function require(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

export const env = {
  DATABASE_URL:          require("DATABASE_URL_DIRECT"),
  ARTIST_SLUG:           process.env.ARTIST_SLUG ?? "reverbzn",
  TELEGRAM_BOT_TOKEN:    process.env.TELEGRAM_BOT_TOKEN ?? "",
  TELEGRAM_CHANNEL_ID:   process.env.TELEGRAM_CHANNEL_ID ?? "@reverbzn",
  SPOTIFY_CLIENT_ID:     process.env.SPOTIFY_CLIENT_ID ?? "",
  SPOTIFY_CLIENT_SECRET: process.env.SPOTIFY_CLIENT_SECRET ?? "",
  RAILWAY_WEBHOOK_SECRET: process.env.RAILWAY_WEBHOOK_SECRET ?? "",
};
