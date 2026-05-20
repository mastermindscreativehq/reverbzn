// ============================================================
// REVERBZN OS — Typed Query Layer
// All DB interactions go through here. Never query db directly in routes.
// ============================================================
import { db } from "./client";
import * as schema from "./schema";
import { eq, desc, asc, and, gte, lte, isNull, isNotNull, sql, sum, avg, count, inArray } from "drizzle-orm";
import { subDays, format } from "date-fns";

function dStr(n: number) { return format(subDays(new Date(), n), "yyyy-MM-dd"); }

// ── Artist ────────────────────────────────────────────────────────────────────

export async function getArtistBySlug(slug: string) {
  return db.query.artists.findFirst({
    where: eq(schema.artists.slug, slug),
  });
}

// ── Overview / Dashboard ──────────────────────────────────────────────────────

export async function getOverviewMetrics(artistId: string) {
  // Total streams all-time from platform track metrics
  const streamsResult = await db
    .select({ total: sum(schema.platformTrackMetricsDaily.streams) })
    .from(schema.platformTrackMetricsDaily)
    .innerJoin(schema.tracks, eq(schema.platformTrackMetricsDaily.trackId, schema.tracks.id))
    .where(eq(schema.tracks.artistId, artistId));

  // Streams last 7 days
  const streamsThisWeek = await db
    .select({ total: sum(schema.platformTrackMetricsDaily.streams) })
    .from(schema.platformTrackMetricsDaily)
    .innerJoin(schema.tracks, eq(schema.platformTrackMetricsDaily.trackId, schema.tracks.id))
    .where(and(
      eq(schema.tracks.artistId, artistId),
      gte(schema.platformTrackMetricsDaily.date, dStr(7)),
    ));

  // Streams previous 7 days (for growth calc)
  const streamsPrevWeek = await db
    .select({ total: sum(schema.platformTrackMetricsDaily.streams) })
    .from(schema.platformTrackMetricsDaily)
    .innerJoin(schema.tracks, eq(schema.platformTrackMetricsDaily.trackId, schema.tracks.id))
    .where(and(
      eq(schema.tracks.artistId, artistId),
      gte(schema.platformTrackMetricsDaily.date, dStr(14)),
      lte(schema.platformTrackMetricsDaily.date, dStr(8)),
    ));

  // Total estimated revenue
  const revenueResult = await db
    .select({ total: sum(schema.platformTrackMetricsDaily.revenueEstimateUsd) })
    .from(schema.platformTrackMetricsDaily)
    .innerJoin(schema.tracks, eq(schema.platformTrackMetricsDaily.trackId, schema.tracks.id))
    .where(eq(schema.tracks.artistId, artistId));

  // Revenue this week vs prev week
  const revenueThisWeek = await db
    .select({ total: sum(schema.platformTrackMetricsDaily.revenueEstimateUsd) })
    .from(schema.platformTrackMetricsDaily)
    .innerJoin(schema.tracks, eq(schema.platformTrackMetricsDaily.trackId, schema.tracks.id))
    .where(and(eq(schema.tracks.artistId, artistId), gte(schema.platformTrackMetricsDaily.date, dStr(7))));

  const revenuePrevWeek = await db
    .select({ total: sum(schema.platformTrackMetricsDaily.revenueEstimateUsd) })
    .from(schema.platformTrackMetricsDaily)
    .innerJoin(schema.tracks, eq(schema.platformTrackMetricsDaily.trackId, schema.tracks.id))
    .where(and(eq(schema.tracks.artistId, artistId), gte(schema.platformTrackMetricsDaily.date, dStr(14)), lte(schema.platformTrackMetricsDaily.date, dStr(8))));

  // Owned audience count
  const audienceCount = await db
    .select({ count: count() })
    .from(schema.fans)
    .where(eq(schema.fans.artistId, artistId));

  // Fans joined this week
  const fansThisWeek = await db
    .select({ count: count() })
    .from(schema.fans)
    .where(and(eq(schema.fans.artistId, artistId), gte(schema.fans.joinedAt, subDays(new Date(), 7))));

  // Fans joined prev week
  const fansPrevWeek = await db
    .select({ count: count() })
    .from(schema.fans)
    .where(and(
      eq(schema.fans.artistId, artistId),
      gte(schema.fans.joinedAt, subDays(new Date(), 14)),
      lte(schema.fans.joinedAt, subDays(new Date(), 8)),
    ));

  // Top platform by streams
  const platformStreams = await db
    .select({
      platformSlug: schema.platformTrackMetricsDaily.platformSlug,
      total:        sum(schema.platformTrackMetricsDaily.streams),
    })
    .from(schema.platformTrackMetricsDaily)
    .innerJoin(schema.tracks, eq(schema.platformTrackMetricsDaily.trackId, schema.tracks.id))
    .where(eq(schema.tracks.artistId, artistId))
    .groupBy(schema.platformTrackMetricsDaily.platformSlug)
    .orderBy(desc(sql`sum(${schema.platformTrackMetricsDaily.streams})`))
    .limit(1);

  // Top track by total plays
  const topTrack = await db.query.tracks.findFirst({
    where: eq(schema.tracks.artistId, artistId),
    orderBy: desc(schema.tracks.totalPlays),
  });

  // Top region
  const topRegion = await db
    .select({
      country:     schema.platformRegionMetricsDaily.country,
      totalPlays:  sum(schema.platformRegionMetricsDaily.plays),
    })
    .from(schema.platformRegionMetricsDaily)
    .where(eq(schema.platformRegionMetricsDaily.artistId, artistId))
    .groupBy(schema.platformRegionMetricsDaily.country)
    .orderBy(desc(sql`sum(${schema.platformRegionMetricsDaily.plays})`))
    .limit(1);

  // Momentum score — avg of top 3 tracks
  const momentumResult = await db
    .select({ avg: avg(schema.tracks.momentumScore) })
    .from(schema.tracks)
    .where(eq(schema.tracks.artistId, artistId));

  // Compute growth %
  const totalStreams = Number(streamsResult[0]?.total ?? 0);
  const thisW       = Number(streamsThisWeek[0]?.total ?? 0);
  const prevW       = Number(streamsPrevWeek[0]?.total ?? 1);
  const streamsGrowth = prevW > 0 ? Math.round(((thisW - prevW) / prevW) * 100 * 10) / 10 : 0;

  const totalRevenue = Number(revenueResult[0]?.total ?? 0);
  const revThisW     = Number(revenueThisWeek[0]?.total ?? 0);
  const revPrevW     = Number(revenuePrevWeek[0]?.total ?? 1);
  const revenueGrowth = revPrevW > 0 ? Math.round(((revThisW - revPrevW) / revPrevW) * 100 * 10) / 10 : 0;

  const ownedCount   = Number(audienceCount[0]?.count ?? 0);
  const fansThisW    = Number(fansThisWeek[0]?.count ?? 0);
  const fansPrevW    = Number(fansPrevWeek[0]?.count ?? 1);
  const audienceGrowth = fansPrevW > 0 ? Math.round(((fansThisW - fansPrevW) / fansPrevW) * 100) : 0;

  // Community conversion rate = fans / (total smart link clicks) * 100
  const slClicks = await db
    .select({ total: sum(schema.smartLinks.totalClicks) })
    .from(schema.smartLinks)
    .where(eq(schema.smartLinks.artistId, artistId));
  const totalClicks = Number(slClicks[0]?.total ?? 1);
  const communityConversionRate = totalClicks > 0
    ? Math.round((ownedCount / totalClicks) * 100 * 100) / 100
    : 0;

  return {
    totalStreams,
    totalStreamsGrowthPct: streamsGrowth,
    estimatedEarningsUsd: Math.round(totalRevenue * 100) / 100,
    earningsGrowthPct: revenueGrowth,
    ownedAudienceCount: ownedCount,
    audienceGrowthPct: audienceGrowth,
    fanGrowthThisWeek: fansThisW,
    topPlatform: platformStreams[0]?.platformSlug ?? "spotify",
    topTrack: topTrack?.title ?? "—",
    topRegion: topRegion[0]?.country ?? "—",
    communityConversionRate,
    momentumScore: Math.round(Number(momentumResult[0]?.avg ?? 0)),
  };
}

export async function getStreamTrends(artistId: string, weeks = 12) {
  const rows = await db
    .select({
      date:  sql<string>`date_trunc('week', ${schema.platformTrackMetricsDaily.date}::date)::date`,
      total: sum(schema.platformTrackMetricsDaily.streams),
    })
    .from(schema.platformTrackMetricsDaily)
    .innerJoin(schema.tracks, eq(schema.platformTrackMetricsDaily.trackId, schema.tracks.id))
    .where(and(
      eq(schema.tracks.artistId, artistId),
      gte(schema.platformTrackMetricsDaily.date, dStr(weeks * 7)),
    ))
    .groupBy(sql`date_trunc('week', ${schema.platformTrackMetricsDaily.date}::date)::date`)
    .orderBy(asc(sql`date_trunc('week', ${schema.platformTrackMetricsDaily.date}::date)::date`));

  return rows.map(r => ({
    date: format(new Date(r.date), "MMM d"),
    value: Number(r.total ?? 0),
  }));
}

export async function getFanTrends(artistId: string, weeks = 12) {
  const rows = await db
    .select({
      date:  sql<string>`date_trunc('week', ${schema.fans.joinedAt})::date`,
      total: count(),
    })
    .from(schema.fans)
    .where(and(
      eq(schema.fans.artistId, artistId),
      gte(schema.fans.joinedAt, subDays(new Date(), weeks * 7)),
    ))
    .groupBy(sql`date_trunc('week', ${schema.fans.joinedAt})::date`)
    .orderBy(asc(sql`date_trunc('week', ${schema.fans.joinedAt})::date`));

  return rows.map(r => ({
    date: format(new Date(r.date), "MMM d"),
    value: Number(r.total ?? 0),
  }));
}

// ── Tracks ────────────────────────────────────────────────────────────────────

export async function getTracks(artistId: string) {
  return db.query.tracks.findMany({
    where: eq(schema.tracks.artistId, artistId),
    orderBy: desc(schema.tracks.totalPlays),
  });
}

export async function getTrackBySlug(artistId: string, slug: string) {
  return db.query.tracks.findFirst({
    where: and(eq(schema.tracks.artistId, artistId), eq(schema.tracks.slug, slug)),
  });
}

export async function getTrackWeeklyTrends(trackId: string, weeks = 12) {
  const rows = await db
    .select({
      date:  sql<string>`date_trunc('week', ${schema.platformTrackMetricsDaily.date}::date)::date`,
      total: sum(schema.platformTrackMetricsDaily.streams),
    })
    .from(schema.platformTrackMetricsDaily)
    .where(and(
      eq(schema.platformTrackMetricsDaily.trackId, trackId),
      gte(schema.platformTrackMetricsDaily.date, dStr(weeks * 7)),
    ))
    .groupBy(sql`date_trunc('week', ${schema.platformTrackMetricsDaily.date}::date)::date`)
    .orderBy(asc(sql`date_trunc('week', ${schema.platformTrackMetricsDaily.date}::date)::date`));

  return rows.map(r => ({ date: format(new Date(r.date), "MMM d"), value: Number(r.total ?? 0) }));
}

export async function getTrackDailyTrends(trackId: string, days_ = 30) {
  const rows = await db
    .select({
      date:  schema.platformTrackMetricsDaily.date,
      total: sum(schema.platformTrackMetricsDaily.streams),
    })
    .from(schema.platformTrackMetricsDaily)
    .where(and(
      eq(schema.platformTrackMetricsDaily.trackId, trackId),
      gte(schema.platformTrackMetricsDaily.date, dStr(days_)),
    ))
    .groupBy(schema.platformTrackMetricsDaily.date)
    .orderBy(asc(schema.platformTrackMetricsDaily.date));

  return rows.map(r => ({ date: format(new Date(r.date), "MMM d"), value: Number(r.total ?? 0) }));
}

// ── Platform Analytics ────────────────────────────────────────────────────────

export async function getPlatformSummaries(artistId: string) {
  const rows = await db
    .select({
      platformSlug:       schema.platformTrackMetricsDaily.platformSlug,
      totalStreams:       sum(schema.platformTrackMetricsDaily.streams),
      totalListeners:     sum(schema.platformTrackMetricsDaily.listeners),
      totalRevenue:       sum(schema.platformTrackMetricsDaily.revenueEstimateUsd),
    })
    .from(schema.platformTrackMetricsDaily)
    .innerJoin(schema.tracks, eq(schema.platformTrackMetricsDaily.trackId, schema.tracks.id))
    .where(eq(schema.tracks.artistId, artistId))
    .groupBy(schema.platformTrackMetricsDaily.platformSlug);

  // Weekly growth per platform
  const thisWeek = await db
    .select({
      platformSlug: schema.platformTrackMetricsDaily.platformSlug,
      total:        sum(schema.platformTrackMetricsDaily.streams),
    })
    .from(schema.platformTrackMetricsDaily)
    .innerJoin(schema.tracks, eq(schema.platformTrackMetricsDaily.trackId, schema.tracks.id))
    .where(and(eq(schema.tracks.artistId, artistId), gte(schema.platformTrackMetricsDaily.date, dStr(7))))
    .groupBy(schema.platformTrackMetricsDaily.platformSlug);

  const prevWeek = await db
    .select({
      platformSlug: schema.platformTrackMetricsDaily.platformSlug,
      total:        sum(schema.platformTrackMetricsDaily.streams),
    })
    .from(schema.platformTrackMetricsDaily)
    .innerJoin(schema.tracks, eq(schema.platformTrackMetricsDaily.trackId, schema.tracks.id))
    .where(and(
      eq(schema.tracks.artistId, artistId),
      gte(schema.platformTrackMetricsDaily.date, dStr(14)),
      lte(schema.platformTrackMetricsDaily.date, dStr(8)),
    ))
    .groupBy(schema.platformTrackMetricsDaily.platformSlug);

  const thisWeekMap = new Map(thisWeek.map(r => [r.platformSlug, Number(r.total ?? 0)]));
  const prevWeekMap = new Map(prevWeek.map(r => [r.platformSlug, Number(r.total ?? 1)]));

  // Top track per platform
  const topTracks = await db
    .select({
      platformSlug: schema.platformTrackMetricsDaily.platformSlug,
      trackTitle:   schema.tracks.title,
      total:        sum(schema.platformTrackMetricsDaily.streams),
    })
    .from(schema.platformTrackMetricsDaily)
    .innerJoin(schema.tracks, eq(schema.platformTrackMetricsDaily.trackId, schema.tracks.id))
    .where(eq(schema.tracks.artistId, artistId))
    .groupBy(schema.platformTrackMetricsDaily.platformSlug, schema.tracks.title)
    .orderBy(desc(sql`sum(${schema.platformTrackMetricsDaily.streams})`));

  const topTrackMap = new Map<string, string>();
  for (const r of topTracks) {
    if (!topTrackMap.has(r.platformSlug)) topTrackMap.set(r.platformSlug, r.trackTitle);
  }

  const platformColors: Record<string, string> = {
    spotify: "#1DB954", apple_music: "#FA243C", audiomack: "#FFA500",
    boomplay: "#E2392E", youtube: "#FF0000", soundcloud: "#FF5500",
  };
  const platformNames: Record<string, string> = {
    spotify: "Spotify", apple_music: "Apple Music", audiomack: "Audiomack",
    boomplay: "Boomplay", youtube: "YouTube", soundcloud: "SoundCloud",
  };

  return rows.map(r => {
    const thisW = thisWeekMap.get(r.platformSlug) ?? 0;
    const prevW = prevWeekMap.get(r.platformSlug) ?? 1;
    const growth = Math.round(((thisW - prevW) / prevW) * 1000) / 10;
    return {
      platformSlug:        r.platformSlug,
      platformName:        platformNames[r.platformSlug] ?? r.platformSlug,
      color:               platformColors[r.platformSlug] ?? "#888",
      totalStreams:        Number(r.totalStreams ?? 0),
      totalListeners:      Number(r.totalListeners ?? 0),
      revenueEstimateUsd:  Math.round(Number(r.totalRevenue ?? 0) * 100) / 100,
      weeklyGrowthPct:     growth,
      promoEfficiencyScore: Math.min(100, Math.max(0, Math.round(50 + growth * 2))),
      topTrack:            topTrackMap.get(r.platformSlug) ?? "—",
    };
  });
}

export async function getPlatformTrends(artistId: string, platformSlug: string, weeks = 12) {
  const rows = await db
    .select({
      date:  sql<string>`date_trunc('week', ${schema.platformTrackMetricsDaily.date}::date)::date`,
      total: sum(schema.platformTrackMetricsDaily.streams),
    })
    .from(schema.platformTrackMetricsDaily)
    .innerJoin(schema.tracks, eq(schema.platformTrackMetricsDaily.trackId, schema.tracks.id))
    .where(and(
      eq(schema.tracks.artistId, artistId),
      eq(schema.platformTrackMetricsDaily.platformSlug, platformSlug as schema.Platform["slug"]),
      gte(schema.platformTrackMetricsDaily.date, dStr(weeks * 7)),
    ))
    .groupBy(sql`date_trunc('week', ${schema.platformTrackMetricsDaily.date}::date)::date`)
    .orderBy(asc(sql`date_trunc('week', ${schema.platformTrackMetricsDaily.date}::date)::date`));

  return rows.map(r => ({ date: format(new Date(r.date), "MMM d"), value: Number(r.total ?? 0) }));
}

// ── Region Analytics ──────────────────────────────────────────────────────────

export async function getRegionSummaries(artistId: string) {
  const rows = await db
    .select({
      country:      schema.platformRegionMetricsDaily.country,
      countryCode:  schema.platformRegionMetricsDaily.countryCode,
      totalPlays:   sum(schema.platformRegionMetricsDaily.plays),
      totalListeners: sum(schema.platformRegionMetricsDaily.listeners),
    })
    .from(schema.platformRegionMetricsDaily)
    .where(eq(schema.platformRegionMetricsDaily.artistId, artistId))
    .groupBy(schema.platformRegionMetricsDaily.country, schema.platformRegionMetricsDaily.countryCode)
    .orderBy(desc(sql`sum(${schema.platformRegionMetricsDaily.plays})`));

  const thisWeek = await db
    .select({
      countryCode: schema.platformRegionMetricsDaily.countryCode,
      total:       sum(schema.platformRegionMetricsDaily.plays),
    })
    .from(schema.platformRegionMetricsDaily)
    .where(and(eq(schema.platformRegionMetricsDaily.artistId, artistId), gte(schema.platformRegionMetricsDaily.date, dStr(7))))
    .groupBy(schema.platformRegionMetricsDaily.countryCode);

  const prevWeek = await db
    .select({
      countryCode: schema.platformRegionMetricsDaily.countryCode,
      total:       sum(schema.platformRegionMetricsDaily.plays),
    })
    .from(schema.platformRegionMetricsDaily)
    .where(and(
      eq(schema.platformRegionMetricsDaily.artistId, artistId),
      gte(schema.platformRegionMetricsDaily.date, dStr(14)),
      lte(schema.platformRegionMetricsDaily.date, dStr(8)),
    ))
    .groupBy(schema.platformRegionMetricsDaily.countryCode);

  const thisWeekMap = new Map(thisWeek.map(r => [r.countryCode, Number(r.total ?? 0)]));
  const prevWeekMap = new Map(prevWeek.map(r => [r.countryCode, Number(r.total ?? 1)]));

  // Top cities per country
  const cities = await db
    .select({
      countryCode: schema.platformRegionMetricsDaily.countryCode,
      city:        schema.platformRegionMetricsDaily.city,
      total:       sum(schema.platformRegionMetricsDaily.plays),
    })
    .from(schema.platformRegionMetricsDaily)
    .where(and(eq(schema.platformRegionMetricsDaily.artistId, artistId), sql`${schema.platformRegionMetricsDaily.city} IS NOT NULL`))
    .groupBy(schema.platformRegionMetricsDaily.countryCode, schema.platformRegionMetricsDaily.city)
    .orderBy(desc(sql`sum(${schema.platformRegionMetricsDaily.plays})`));

  const citiesMap = new Map<string, string[]>();
  for (const c of cities) {
    if (!c.city) continue;
    const arr = citiesMap.get(c.countryCode) ?? [];
    if (arr.length < 3 && !arr.includes(c.city)) arr.push(c.city);
    citiesMap.set(c.countryCode, arr);
  }

  const flagMap: Record<string, string> = {
    NG: "🇳🇬", GH: "🇬🇭", GB: "🇬🇧", US: "🇺🇸",
    KE: "🇰🇪", ZA: "🇿🇦", CA: "🇨🇦", DE: "🇩🇪",
  };

  return rows.map(r => {
    const thisW = thisWeekMap.get(r.countryCode) ?? 0;
    const prevW = prevWeekMap.get(r.countryCode) ?? 1;
    const growth = Math.round(((thisW - prevW) / prevW) * 1000) / 10;
    return {
      country:         r.country,
      countryCode:     r.countryCode,
      flag:            flagMap[r.countryCode] ?? "🌍",
      totalPlays:      Number(r.totalPlays ?? 0),
      totalListeners:  Number(r.totalListeners ?? 0),
      weeklyGrowthPct: growth,
      breakoutScore:   Math.min(100, Math.max(0, Math.round(40 + growth * 1.5))),
      topCities:       citiesMap.get(r.countryCode) ?? [],
    };
  });
}

// ── Fans ──────────────────────────────────────────────────────────────────────

export async function getFans(artistId: string) {
  return db.query.fans.findMany({
    where: eq(schema.fans.artistId, artistId),
    with: { favoriteTrack: true },
    orderBy: desc(schema.fans.superfanScore),
  });
}

export async function getFanById(id: string) {
  return db.query.fans.findFirst({
    where: eq(schema.fans.id, id),
    with: { favoriteTrack: true },
  });
}

export async function getFanEvents(artistId: string, fanId?: string) {
  return db.query.fanEvents.findMany({
    where: fanId
      ? and(eq(schema.fanEvents.artistId, artistId), eq(schema.fanEvents.fanId, fanId))
      : eq(schema.fanEvents.artistId, artistId),
    with: { track: true },
    orderBy: desc(schema.fanEvents.occurredAt),
    limit: fanId ? 50 : 100,
  });
}

export async function getFanSegments(artistId: string) {
  return db.query.fanSegments.findMany({
    where: eq(schema.fanSegments.artistId, artistId),
    orderBy: asc(schema.fanSegments.name),
  });
}

export type SmartSegmentKey =
  | "high_engagement"
  | "dormant"
  | "telegram_missing"
  | "email_missing"
  | "top_supporters";

/** Returns fans matching a computed (non-DB-backed) segment. */
export async function getFansBySmartSegment(artistId: string, segment: SmartSegmentKey) {
  const thirtyDaysAgo = subDays(new Date(), 30);
  const baseWith = { favoriteTrack: true } as const;

  switch (segment) {
    case "high_engagement":
      return db.query.fans.findMany({
        where: and(eq(schema.fans.artistId, artistId), gte(schema.fans.engagementScore, 70)),
        with: baseWith,
        orderBy: desc(schema.fans.engagementScore),
      });
    case "dormant":
      return db.query.fans.findMany({
        where: and(eq(schema.fans.artistId, artistId), lte(schema.fans.lastActiveAt, thirtyDaysAgo)),
        with: baseWith,
        orderBy: asc(schema.fans.lastActiveAt),
      });
    case "telegram_missing":
      return db.query.fans.findMany({
        where: and(eq(schema.fans.artistId, artistId), isNull(schema.fans.telegramId)),
        with: baseWith,
        orderBy: desc(schema.fans.engagementScore),
      });
    case "email_missing":
      return db.query.fans.findMany({
        where: and(eq(schema.fans.artistId, artistId), isNull(schema.fans.email)),
        with: baseWith,
        orderBy: desc(schema.fans.engagementScore),
      });
    case "top_supporters":
      return db.query.fans.findMany({
        where: and(eq(schema.fans.artistId, artistId), gte(schema.fans.superfanScore, 80)),
        with: baseWith,
        orderBy: desc(schema.fans.superfanScore),
      });
  }
}

/** Returns counts for all smart segments — used in sidebar. */
export async function getSmartSegmentCounts(artistId: string) {
  const thirtyDaysAgo = subDays(new Date(), 30);

  const [highEngagement, dormant, telegramMissing, emailMissing, topSupporters] =
    await Promise.all([
      db.select({ c: count() }).from(schema.fans).where(and(eq(schema.fans.artistId, artistId), gte(schema.fans.engagementScore, 70))),
      db.select({ c: count() }).from(schema.fans).where(and(eq(schema.fans.artistId, artistId), lte(schema.fans.lastActiveAt, thirtyDaysAgo))),
      db.select({ c: count() }).from(schema.fans).where(and(eq(schema.fans.artistId, artistId), isNull(schema.fans.telegramId))),
      db.select({ c: count() }).from(schema.fans).where(and(eq(schema.fans.artistId, artistId), isNull(schema.fans.email))),
      db.select({ c: count() }).from(schema.fans).where(and(eq(schema.fans.artistId, artistId), gte(schema.fans.superfanScore, 80))),
    ]);

  return {
    high_engagement:  Number(highEngagement[0]?.c  ?? 0),
    dormant:          Number(dormant[0]?.c          ?? 0),
    telegram_missing: Number(telegramMissing[0]?.c  ?? 0),
    email_missing:    Number(emailMissing[0]?.c     ?? 0),
    top_supporters:   Number(topSupporters[0]?.c    ?? 0),
  };
}

/** Adds a fan to a named fanSegment (by segment ID). */
export async function addFanToSegment(fanId: string, segmentId: string) {
  await db
    .insert(schema.fanSegmentMembers)
    .values({ fanId, segmentId })
    .onConflictDoNothing();
}

// ── Smart Links ───────────────────────────────────────────────────────────────

export async function getSmartLinks(artistId: string) {
  return db.query.smartLinks.findMany({
    where: eq(schema.smartLinks.artistId, artistId),
    with: { track: true },
    orderBy: desc(schema.smartLinks.totalClicks),
  });
}

// ── Campaigns ─────────────────────────────────────────────────────────────────

export async function getCampaigns(artistId: string) {
  return db.query.campaigns.findMany({
    where: eq(schema.campaigns.artistId, artistId),
    with: { segment: true, insight: true, execution: true },
    orderBy: desc(schema.campaigns.createdAt),
  });
}

export async function getCampaignById(id: string) {
  return db.query.campaigns.findFirst({
    where: eq(schema.campaigns.id, id),
    with: { segment: true, insight: true, execution: true },
  });
}

// ── Automations ───────────────────────────────────────────────────────────────

export async function getAutomations(artistId: string) {
  return db.query.automations.findMany({
    where: eq(schema.automations.artistId, artistId),
    with: { runs: { orderBy: desc(schema.automationRuns.runAt), limit: 5 } },
    orderBy: asc(schema.automations.name),
  });
}

// ── Insights ──────────────────────────────────────────────────────────────────

export async function getInsights(artistId: string) {
  return db.query.insights.findMany({
    where: and(eq(schema.insights.artistId, artistId), eq(schema.insights.isDismissed, false)),
    orderBy: [asc(schema.insights.priority), desc(schema.insights.createdAt)],
  });
}

// ── Notifications ─────────────────────────────────────────────────────────────

export async function getNotifications(artistId: string) {
  return db.query.notifications.findMany({
    where: eq(schema.notifications.artistId, artistId),
    orderBy: desc(schema.notifications.createdAt),
    limit: 50,
  });
}

// ============================================================
// INTELLIGENCE MODULES — Royalties · Catalog · Fan Intel
//                        Releases · Sync
// ============================================================

const PLATFORM_NAMES: Record<string, string> = {
  spotify: "Spotify", apple_music: "Apple Music", audiomack: "Audiomack",
  boomplay: "Boomplay", youtube: "YouTube", soundcloud: "SoundCloud",
};
const PLATFORM_COLORS: Record<string, string> = {
  spotify: "#1DB954", apple_music: "#FA243C", audiomack: "#FFA500",
  boomplay: "#E2392E", youtube: "#FF0000", soundcloud: "#FF5500",
};
const COUNTRY_NAMES: Record<string, string> = {
  NG: "Nigeria", GB: "United Kingdom", US: "United States", GH: "Ghana",
  KE: "Kenya", ZA: "South Africa", CA: "Canada", AE: "UAE", DE: "Germany", FR: "France",
};
const FLAGS: Record<string, string> = {
  NG: "🇳🇬", GB: "🇬🇧", GH: "🇬🇭", KE: "🇰🇪", US: "🇺🇸",
  ZA: "🇿🇦", CA: "🇨🇦", DE: "🇩🇪", AE: "🇦🇪", FR: "🇫🇷",
};

// ── Royalties ─────────────────────────────────────────────────────────────────

export async function getRoyaltyReportHistory(artistId: string) {
  return db.select()
    .from(schema.royaltyReports)
    .where(eq(schema.royaltyReports.artistId, artistId))
    .orderBy(asc(schema.royaltyReports.periodStart));
}

export async function getRoyaltySources(artistId: string) {
  return db.select()
    .from(schema.royaltySources)
    .where(and(eq(schema.royaltySources.artistId, artistId), eq(schema.royaltySources.isActive, true)))
    .orderBy(desc(schema.royaltySources.rpm));
}

export async function getRoyaltySourcesGrouped(artistId: string) {
  const [sources, totals, territories] = await Promise.all([
    getRoyaltySources(artistId),
    db.select({
      platformSlug: schema.royaltyEntries.platformSlug,
      totalUsd:     sum(schema.royaltyEntries.royaltyUsd),
      totalStreams:  sum(schema.royaltyEntries.streams),
    })
    .from(schema.royaltyEntries)
    .where(eq(schema.royaltyEntries.artistId, artistId))
    .groupBy(schema.royaltyEntries.platformSlug),

    db.select({
      platformSlug: schema.royaltyEntries.platformSlug,
      territory:    schema.royaltyEntries.territory,
      usd:          sum(schema.royaltyEntries.royaltyUsd),
      streams:      sum(schema.royaltyEntries.streams),
    })
    .from(schema.royaltyEntries)
    .where(and(eq(schema.royaltyEntries.artistId, artistId), isNotNull(schema.royaltyEntries.territory)))
    .groupBy(schema.royaltyEntries.platformSlug, schema.royaltyEntries.territory)
    .orderBy(desc(sum(schema.royaltyEntries.royaltyUsd))),
  ]);

  const totalsMap = new Map(totals.map(t => [t.platformSlug, {
    usd: Number(t.totalUsd ?? 0), streams: Number(t.totalStreams ?? 0),
  }]));

  const territoryMap = new Map<string, { territory: string; streams: number; rpm: number; usd: number }[]>();
  for (const t of territories) {
    const arr = territoryMap.get(t.platformSlug) ?? [];
    const s = Number(t.streams ?? 0);
    const u = Number(t.usd ?? 0);
    arr.push({ territory: t.territory ?? "Other", streams: s, usd: Math.round(u * 100) / 100, rpm: s > 0 ? Math.round((u / s) * 1000 * 100) / 100 : 0 });
    territoryMap.set(t.platformSlug, arr);
  }

  const seen = new Set<string>();
  return sources
    .filter(s => { const first = !seen.has(s.platformSlug); seen.add(s.platformSlug); return first; })
    .map(s => {
      const total = totalsMap.get(s.platformSlug) ?? { usd: 0, streams: 0 };
      return {
        platform:    PLATFORM_NAMES[s.platformSlug] ?? s.platformSlug,
        color:       PLATFORM_COLORS[s.platformSlug] ?? "#888",
        slug:        s.platformSlug,
        rpm:         Number(s.rpm ?? 0),
        streams:     total.streams,
        totalUsd:    Math.round(total.usd * 100) / 100,
        territory:   s.territory ?? "Global",
        payoutModel: s.payoutModel ?? "Per-stream",
        status:      s.isActive ? "active" : "inactive",
        breakdown:   (territoryMap.get(s.platformSlug) ?? []).slice(0, 6),
      };
    });
}

export async function getPayoutForecasts(artistId: string) {
  return db.select()
    .from(schema.payoutForecasts)
    .where(eq(schema.payoutForecasts.artistId, artistId))
    .orderBy(asc(schema.payoutForecasts.periodLabel))
    .limit(3);
}

export async function getRoyaltyByPlatform(artistId: string) {
  const rows = await db.select({
    platformSlug: schema.royaltyEntries.platformSlug,
    totalUsd:     sum(schema.royaltyEntries.royaltyUsd),
  })
  .from(schema.royaltyEntries)
  .where(eq(schema.royaltyEntries.artistId, artistId))
  .groupBy(schema.royaltyEntries.platformSlug)
  .orderBy(desc(sum(schema.royaltyEntries.royaltyUsd)));

  return rows.map(r => ({
    label: PLATFORM_NAMES[r.platformSlug] ?? r.platformSlug,
    value: Math.round(Number(r.totalUsd ?? 0) * 100) / 100,
    color: PLATFORM_COLORS[r.platformSlug] ?? "#888",
  }));
}

export async function getTopEarningTracks(artistId: string, limit = 5) {
  const [trackTotals, platformRows] = await Promise.all([
    db.select({
      trackId:      schema.royaltyEntries.trackId,
      trackTitle:   schema.tracks.title,
      totalStreams:  sum(schema.royaltyEntries.streams),
      totalRoyalty:  sum(schema.royaltyEntries.royaltyUsd),
    })
    .from(schema.royaltyEntries)
    .innerJoin(schema.tracks, eq(schema.royaltyEntries.trackId, schema.tracks.id))
    .where(eq(schema.royaltyEntries.artistId, artistId))
    .groupBy(schema.royaltyEntries.trackId, schema.tracks.id, schema.tracks.title)
    .orderBy(desc(sum(schema.royaltyEntries.royaltyUsd)))
    .limit(limit),

    db.select({
      trackId:     schema.royaltyEntries.trackId,
      platformSlug: schema.royaltyEntries.platformSlug,
      total:       sum(schema.royaltyEntries.royaltyUsd),
    })
    .from(schema.royaltyEntries)
    .where(eq(schema.royaltyEntries.artistId, artistId))
    .groupBy(schema.royaltyEntries.trackId, schema.royaltyEntries.platformSlug)
    .orderBy(desc(sum(schema.royaltyEntries.royaltyUsd))),
  ]);

  const topPlatformMap = new Map<string, string>();
  for (const row of platformRows) {
    if (row.trackId && !topPlatformMap.has(row.trackId)) {
      topPlatformMap.set(row.trackId, row.platformSlug);
    }
  }

  return trackTotals.map(t => {
    const streams = Number(t.totalStreams ?? 0);
    const royalty = Number(t.totalRoyalty ?? 0);
    return {
      title:    t.trackTitle,
      plays:    streams,
      rpm:      streams > 0 ? Math.round((royalty / streams) * 1000 * 100) / 100 : 0,
      earnings: Math.round(royalty * 100) / 100,
      platform: PLATFORM_NAMES[topPlatformMap.get(t.trackId ?? "") ?? ""] ?? "—",
    };
  });
}

export async function getRoyaltyByTerritory(artistId: string) {
  const COLORS = ["#22d3ee", "#a78bfa", "#34d399", "#fbbf24", "#f87171", "#60a5fa", "#f472b6"];
  const rows = await db.select({
    territory: schema.royaltyEntries.territory,
    total:     sum(schema.royaltyEntries.royaltyUsd),
  })
  .from(schema.royaltyEntries)
  .where(and(eq(schema.royaltyEntries.artistId, artistId), isNotNull(schema.royaltyEntries.territory)))
  .groupBy(schema.royaltyEntries.territory)
  .orderBy(desc(sum(schema.royaltyEntries.royaltyUsd)))
  .limit(7);

  return rows.map((r, i) => ({
    label: COUNTRY_NAMES[r.territory ?? ""] ?? r.territory ?? "Other",
    value: Math.round(Number(r.total ?? 0) * 100) / 100,
    color: COLORS[i % COLORS.length],
  }));
}

// ── Catalog ───────────────────────────────────────────────────────────────────

export async function getCatalogWithLifecycle(artistId: string) {
  const [rows, insightRows, metricsRows] = await Promise.all([
    db.select({
      trackId:              schema.catalogTracks.trackId,
      trackTitle:           schema.tracks.title,
      trackSlug:            schema.tracks.slug,
      genres:               schema.tracks.genres,
      lifecyclePhase:       schema.catalogTracks.lifecyclePhase,
      evergreenScore:       schema.catalogTracks.evergreenScore,
      decayRatePct:         schema.catalogTracks.decayRatePct,
      revivalPotential:     schema.catalogTracks.revivalPotential,
      peakStreams:          schema.catalogTracks.peakStreams,
      currentMonthlyStreams: schema.catalogTracks.currentMonthlyStreams,
      totalPlaylists:       schema.catalogTracks.totalPlaylists,
    })
    .from(schema.catalogTracks)
    .innerJoin(schema.tracks, eq(schema.catalogTracks.trackId, schema.tracks.id))
    .where(eq(schema.catalogTracks.artistId, artistId)),

    db.select({ trackId: schema.catalogInsights.trackId, body: schema.catalogInsights.body })
    .from(schema.catalogInsights)
    .where(and(eq(schema.catalogInsights.artistId, artistId), eq(schema.catalogInsights.isDismissed, false)))
    .orderBy(desc(schema.catalogInsights.createdAt)),

    db.select({
      trackId:   schema.trackLifecycleMetrics.trackId,
      weekStart: schema.trackLifecycleMetrics.weekStart,
      streams:   schema.trackLifecycleMetrics.streams,
    })
    .from(schema.trackLifecycleMetrics)
    .innerJoin(schema.catalogTracks, eq(schema.trackLifecycleMetrics.trackId, schema.catalogTracks.trackId))
    .where(eq(schema.catalogTracks.artistId, artistId))
    .orderBy(asc(schema.trackLifecycleMetrics.trackId), asc(schema.trackLifecycleMetrics.weekStart)),
  ]);

  const insightMap = new Map<string, string>();
  for (const r of insightRows) {
    if (r.trackId && !insightMap.has(r.trackId)) insightMap.set(r.trackId, r.body);
  }

  const metricsMap = new Map<string, { date: string; value: number }[]>();
  for (const r of metricsRows) {
    const arr = metricsMap.get(r.trackId) ?? [];
    arr.push({ date: `W${arr.length + 1}`, value: r.streams });
    metricsMap.set(r.trackId, arr);
  }

  return rows.map(r => ({
    trackId:        r.trackId,
    title:          r.trackTitle,
    slug:           r.trackSlug,
    genres:         r.genres,
    phase:          r.lifecyclePhase,
    evergreenScore: r.evergreenScore,
    decayRate:      Number(r.decayRatePct ?? 0),
    revivalPotential: r.revivalPotential,
    peakStreams:    r.peakStreams ?? 0,
    currentMonthly: r.currentMonthlyStreams,
    totalPlaylists: r.totalPlaylists,
    aiNote:         insightMap.get(r.trackId) ?? `${r.lifecyclePhase} phase track.`,
    weeklyTrend:    metricsMap.get(r.trackId) ?? [],
  }));
}

export async function getCatalogInsights(artistId: string) {
  return db.select({
    id:          schema.catalogInsights.id,
    trackId:     schema.catalogInsights.trackId,
    insightType: schema.catalogInsights.insightType,
    title:       schema.catalogInsights.title,
    body:        schema.catalogInsights.body,
    action:      schema.catalogInsights.action,
    urgency:     schema.catalogInsights.urgency,
    isDismissed: schema.catalogInsights.isDismissed,
    trackTitle:  schema.tracks.title,
    trackSlug:   schema.tracks.slug,
    createdAt:   schema.catalogInsights.createdAt,
  })
  .from(schema.catalogInsights)
  .leftJoin(schema.tracks, eq(schema.catalogInsights.trackId, schema.tracks.id))
  .where(and(eq(schema.catalogInsights.artistId, artistId), eq(schema.catalogInsights.isDismissed, false)))
  .orderBy(asc(schema.catalogInsights.urgency), desc(schema.catalogInsights.createdAt));
}

// ── Fan Intel ─────────────────────────────────────────────────────────────────

export async function getFanScoreLeaderboard(artistId: string, limit = 10) {
  return db.select({
    fanId:             schema.fanScores.fanId,
    displayName:       schema.fans.displayName,
    city:              schema.fans.city,
    country:           schema.fans.country,
    ltvScore:          schema.fanScores.ltvScore,
    cluster:           schema.fanScores.cluster,
    engagement30d:     schema.fanScores.engagement30d,
    spendPotentialUsd: schema.fanScores.spendPotentialUsd,
    telegramConverted: schema.fanScores.telegramConverted,
    emailConverted:    schema.fanScores.emailConverted,
  })
  .from(schema.fanScores)
  .innerJoin(schema.fans, eq(schema.fanScores.fanId, schema.fans.id))
  .where(eq(schema.fanScores.artistId, artistId))
  .orderBy(desc(schema.fanScores.ltvScore))
  .limit(limit);
}

export async function getFanClusterSummary(artistId: string) {
  const BADGES: Record<string, string> = {
    superfan: "bg-emerald/10 text-emerald border-emerald/20",
    core:     "bg-cyan/10 text-cyan border-cyan/20",
    casual:   "bg-violet/10 text-violet border-violet/20",
    dormant:  "bg-white/5 text-muted-foreground border-white/10",
    new:      "bg-amber/10 text-amber border-amber/20",
  };
  const DESCS: Record<string, string> = {
    superfan: "Your highest-value fans. Active, loyal, and likely to buy merchandise and tickets.",
    core:     "Consistent listeners. High potential to convert to superfan tier with the right campaign.",
    casual:   "Occasional listeners. High spend potential but low current engagement.",
    dormant:  "Previously active but no engagement in 30+ days. Candidate for reactivation campaigns.",
    new:      "Recently joined. Haven't yet formed strong engagement patterns.",
  };

  const rows = await db.select({
    cluster:     schema.fanScores.cluster,
    cnt:         count(),
    avgLtv:      avg(schema.fanScores.ltvScore),
    avgSpend:    avg(schema.fanScores.spendPotentialUsd),
    telegramCnt: sum(sql<number>`CASE WHEN ${schema.fanScores.telegramConverted} = true THEN 1 ELSE 0 END`),
  })
  .from(schema.fanScores)
  .where(eq(schema.fanScores.artistId, artistId))
  .groupBy(schema.fanScores.cluster);

  return rows.map(r => ({
    cluster:     r.cluster,
    count:       Number(r.cnt),
    avgLtv:      Math.round(Number(r.avgLtv ?? 0)),
    avgSpend:    Math.round(Number(r.avgSpend ?? 0)),
    telegramPct: Number(r.cnt) > 0 ? Math.round((Number(r.telegramCnt ?? 0) / Number(r.cnt)) * 100) : 0,
    badge:       BADGES[r.cluster] ?? "",
    desc:        DESCS[r.cluster] ?? "",
  }));
}

export async function getFanLocationHeatmap(artistId: string, limit = 10) {
  const rows = await db.select()
    .from(schema.fanLocations)
    .where(eq(schema.fanLocations.artistId, artistId))
    .orderBy(desc(schema.fanLocations.fanCount))
    .limit(limit);

  return rows.map(r => ({
    city:       r.city ?? r.country,
    country:    r.country,
    cc:         r.countryCode,
    fans:       r.fanCount,
    superfans:  r.superfanCount,
    telegram:   r.telegramCount,
    engIndex:   r.engagementIndex,
    flag:       FLAGS[r.countryCode] ?? "🌍",
  }));
}

export async function getFanIntelMetrics(artistId: string) {
  const [totalFansRow, superfansRow, avgLtvRow, telegramTotalRow, listenerRow] = await Promise.all([
    db.select({ cnt: count() }).from(schema.fans).where(eq(schema.fans.artistId, artistId)),
    db.select({ cnt: count() }).from(schema.fanScores).where(and(eq(schema.fanScores.artistId, artistId), eq(schema.fanScores.cluster, "superfan"))),
    db.select({ val: avg(schema.fanScores.ltvScore) }).from(schema.fanScores).where(eq(schema.fanScores.artistId, artistId)),
    db.select({ total: sum(schema.fanLocations.telegramCount) }).from(schema.fanLocations).where(eq(schema.fanLocations.artistId, artistId)),
    db.select({ total: sum(schema.platformTrackMetricsDaily.listeners) })
      .from(schema.platformTrackMetricsDaily)
      .innerJoin(schema.tracks, eq(schema.platformTrackMetricsDaily.trackId, schema.tracks.id))
      .where(eq(schema.tracks.artistId, artistId)),
  ]);

  const totalFans    = Number(totalFansRow[0]?.cnt ?? 0);
  const superfans    = Number(superfansRow[0]?.cnt ?? 0);
  const avgLtv       = Math.round(Number(avgLtvRow[0]?.val ?? 0));
  const telegramTotal = Number(telegramTotalRow[0]?.total ?? 0);
  const listeners    = Number(listenerRow[0]?.total ?? 0);
  const overallCvr   = listeners > 0 ? Math.round((totalFans / listeners) * 100 * 10) / 10 : 0;

  return {
    totalFans,
    superfans,
    avgLtv,
    telegramTotal,
    listeners,
    overallCvr,
    funnel: [
      { stage: "Listeners",         count: listeners,     color: "#22d3ee" },
      { stage: "Owned Audience",    count: totalFans,     color: "#a78bfa" },
      { stage: "Telegram Community", count: telegramTotal, color: "#60a5fa" },
      { stage: "Superfans",         count: superfans,     color: "#34d399" },
    ],
  };
}

// ── Releases ──────────────────────────────────────────────────────────────────

export async function getReleasesWithDetails(artistId: string) {
  return db.query.releases.findMany({
    where: eq(schema.releases.artistId, artistId),
    with: { assets: true, checklists: true, campaigns: true },
    orderBy: [asc(schema.releases.releaseDate)],
  });
}

// ── Sync ──────────────────────────────────────────────────────────────────────

export async function getSyncOpportunities(artistId: string) {
  return db.query.syncOpportunities.findMany({
    where: eq(schema.syncOpportunities.artistId, artistId),
    with: { supervisor: true, pitches: true },
    orderBy: [asc(schema.syncOpportunities.deadline)],
  });
}

export async function getSyncPitches(artistId: string) {
  return db.query.syncPitches.findMany({
    where: eq(schema.syncPitches.artistId, artistId),
    with: {
      opportunity: { with: { supervisor: true } },
      track: true,
    },
    orderBy: [desc(schema.syncPitches.createdAt)],
  });
}

export async function getMusicSupervisorsWithOpps() {
  const [supervisors, openOpps] = await Promise.all([
    db.select().from(schema.musicSupervisors).orderBy(desc(schema.musicSupervisors.dealCount)),
    db.select({
      supervisorId: schema.syncOpportunities.supervisorId,
      cnt:          count(),
    })
    .from(schema.syncOpportunities)
    .where(eq(schema.syncOpportunities.status, "open"))
    .groupBy(schema.syncOpportunities.supervisorId),
  ]);

  const oppsMap = new Map(openOpps.filter(o => o.supervisorId).map(o => [o.supervisorId!, Number(o.cnt)]));
  return supervisors.map(s => ({ ...s, openOpps: oppsMap.get(s.id) ?? 0 }));
}

export async function getPlaylistHistory(artistId: string, limit = 20) {
  const PLATFORM_NAMES_: Record<string, string> = {
    spotify: "Spotify", apple_music: "Apple Music", audiomack: "Audiomack",
    boomplay: "Boomplay", youtube: "YouTube", soundcloud: "SoundCloud",
  };
  const rows = await db.select({
    id:            schema.playlistHistory.id,
    trackTitle:    schema.tracks.title,
    playlistName:  schema.playlistHistory.playlistName,
    platformSlug:  schema.playlistHistory.platformSlug,
    followerCount: schema.playlistHistory.followerCount,
    addedAt:       schema.playlistHistory.addedAt,
    removedAt:     schema.playlistHistory.removedAt,
    peakPosition:  schema.playlistHistory.peakPosition,
    impactStreams:  schema.playlistHistory.impactStreams,
  })
  .from(schema.playlistHistory)
  .innerJoin(schema.tracks, eq(schema.playlistHistory.trackId, schema.tracks.id))
  .where(eq(schema.playlistHistory.artistId, artistId))
  .orderBy(desc(schema.playlistHistory.addedAt))
  .limit(limit);

  return rows.map(r => ({
    ...r,
    platformName: PLATFORM_NAMES_[r.platformSlug] ?? r.platformSlug,
  }));
}

export async function getTrackSyncLibrary(artistId: string) {
  const [profiles, pitchCounts] = await Promise.all([
    db.select({
      trackId:          schema.trackSyncProfiles.trackId,
      trackTitle:       schema.tracks.title,
      trackSlug:        schema.tracks.slug,
      genres:           schema.tracks.genres,
      durationSec:      schema.tracks.durationSec,
      bpm:              schema.trackSyncProfiles.bpm,
      musicalKey:       schema.trackSyncProfiles.musicalKey,
      moods:            schema.trackSyncProfiles.moods,
      energyLevel:      schema.trackSyncProfiles.energyLevel,
      cinematicFitScore: schema.trackSyncProfiles.cinematicFitScore,
      sceneTypes:       schema.trackSyncProfiles.sceneTypes,
      hasCleanVersion:  schema.trackSyncProfiles.hasCleanVersion,
      lyricType:        schema.trackSyncProfiles.lyricType,
      syncScore:        schema.trackSyncProfiles.syncScore,
    })
    .from(schema.trackSyncProfiles)
    .innerJoin(schema.tracks, eq(schema.trackSyncProfiles.trackId, schema.tracks.id))
    .where(eq(schema.tracks.artistId, artistId))
    .orderBy(desc(schema.trackSyncProfiles.syncScore)),

    db.select({
      trackId:  schema.syncPitches.trackId,
      total:    count(),
      licensed: sum(sql<number>`CASE WHEN ${schema.syncPitches.status} = 'licensed' THEN 1 ELSE 0 END`),
    })
    .from(schema.syncPitches)
    .where(eq(schema.syncPitches.artistId, artistId))
    .groupBy(schema.syncPitches.trackId),
  ]);

  const pitchMap = new Map(pitchCounts.map(p => [p.trackId, {
    total: Number(p.total), licensed: Number(p.licensed ?? 0),
  }]));

  return profiles.map(p => ({
    ...p,
    pitchCount:    pitchMap.get(p.trackId)?.total ?? 0,
    licensedCount: pitchMap.get(p.trackId)?.licensed ?? 0,
  }));
}
