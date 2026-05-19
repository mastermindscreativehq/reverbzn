// ============================================================
// REVERBZN OS — Typed Query Layer
// All DB interactions go through here. Never query db directly in routes.
// ============================================================
import { db } from "./client";
import * as schema from "./schema";
import { eq, desc, asc, and, gte, lte, isNull, isNotNull, sql, sum, avg, count } from "drizzle-orm";
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
