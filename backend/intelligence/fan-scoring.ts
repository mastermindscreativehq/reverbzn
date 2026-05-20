import { db, schema } from "../lib/db.js";
import { eq, gte, sql } from "drizzle-orm";
import { subDays, format } from "date-fns";

type FanCluster = "superfan" | "core" | "casual" | "dormant" | "new";

interface ScoringInput {
  fanId:            string;
  streamCount30d:   number;
  playlistSaves:    number;
  telegramMember:   boolean;
  emailSubscribed:  boolean;
  purchaseCount:    number;
  commentsCount30d: number;
  sharesCount30d:   number;
}

function computeLtvScore(input: ScoringInput): number {
  let score = 0;
  score += Math.min(input.streamCount30d / 50, 25);
  score += Math.min(input.playlistSaves * 3, 15);
  score += input.telegramMember  ? 15 : 0;
  score += input.emailSubscribed ? 10 : 0;
  score += Math.min(input.purchaseCount * 8, 20);
  score += Math.min(input.commentsCount30d * 2, 8);
  score += Math.min(input.sharesCount30d * 3, 7);
  return Math.min(Math.round(score), 100);
}

function computeCluster(ltv: number, telegramMember: boolean, purchaseCount: number): FanCluster {
  if (ltv >= 80 || purchaseCount >= 3) return "superfan";
  if (ltv >= 60 || telegramMember)     return "core";
  if (ltv >= 35)                       return "casual";
  return "dormant";
}

export async function scoreFans(artistId: string): Promise<void> {
  const fans = await db.query.fans.findMany({
    where: eq(schema.fans.artistId, artistId),
    columns: { id: true, telegramId: true, email: true },
  });

  const thirtyDaysAgo = format(subDays(new Date(), 30), "yyyy-MM-dd");

  for (const fan of fans) {
    const telegramMember  = fan.telegramId !== null;
    const emailSubscribed = fan.email !== null;

    const input: ScoringInput = {
      fanId:            fan.id,
      streamCount30d:   0,
      playlistSaves:    0,
      telegramMember,
      emailSubscribed,
      purchaseCount:    0,
      commentsCount30d: 0,
      sharesCount30d:   0,
    };

    const ltv      = computeLtvScore(input);
    const cluster  = computeCluster(ltv, telegramMember, input.purchaseCount);
    const spendPot = Math.round(ltv * 0.8 + input.purchaseCount * 5);

    await db
      .insert(schema.fanScores)
      .values({
        fanId:             fan.id,
        artistId,
        ltvScore:          ltv,
        spendPotentialUsd: spendPot,
        cluster,
        telegramConverted: telegramMember,
        emailConverted:    emailSubscribed,
        engagement30d:     input.streamCount30d + input.commentsCount30d,
        lastScoredAt:      new Date(),
      })
      .onConflictDoUpdate({
        target: [schema.fanScores.fanId],
        set: {
          ltvScore:          ltv,
          spendPotentialUsd: spendPot,
          cluster,
          engagement30d:     input.streamCount30d,
          lastScoredAt:      new Date(),
        },
      });
  }
}
