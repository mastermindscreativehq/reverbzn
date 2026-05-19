// ============================================================
// REVERBZN OS — Database / Data Access Layer
// Using seeded in-memory data for MVP (swap with Drizzle + Postgres)
// ============================================================

import {
  artist,
  tracks,
  platforms,
  platformSummaries,
  trackPlatformMetrics,
  regionSummaries,
  fans,
  fanEvents,
  fanSegments,
  smartLinks,
  campaigns,
  automations,
  insights,
  notifications,
  dashboardMetrics,
  streamTrends,
  fanTrends,
  earningsTrends,
  generateWeeklyTrends,
  generateDailyTrends,
} from "@/lib/data/seed";

export const db = {
  // ── Artist ──────────────────────────────────────────────────
  getArtist: () => artist,

  // ── Dashboard ───────────────────────────────────────────────
  getDashboardMetrics: () => dashboardMetrics,
  getStreamTrends: () => streamTrends,
  getFanTrends: () => fanTrends,
  getEarningsTrends: () => earningsTrends,

  // ── Tracks ──────────────────────────────────────────────────
  getTracks: () => tracks,
  getTrack: (idOrSlug: string) =>
    tracks.find(t => t.id === idOrSlug || t.slug === idOrSlug),
  getTrackTrends: (trackId: string, period: "daily" | "weekly" = "weekly") => {
    const track = tracks.find(t => t.id === trackId);
    if (!track) return [];
    const base = Math.floor(track.totalPlays / 90);
    return period === "daily"
      ? generateDailyTrends(base, 0.05)
      : generateWeeklyTrends(base * 7, 0.08);
  },
  getTrackPlatformMetrics: (trackId: string) =>
    trackPlatformMetrics.filter(m => m.trackId === trackId),

  // ── Platforms ───────────────────────────────────────────────
  getPlatforms: () => platforms,
  getPlatformSummaries: () => platformSummaries,
  getPlatformTrends: (platformSlug: string) => {
    const plat = platformSummaries.find(p => p.platformSlug === platformSlug);
    const base = plat ? Math.floor(plat.totalStreams / 12) : 50_000;
    return generateWeeklyTrends(base, 0.07);
  },

  // ── Regions ─────────────────────────────────────────────────
  getRegionSummaries: () => regionSummaries,
  getRegionTrends: (countryCode: string) => {
    const region = regionSummaries.find(r => r.countryCode === countryCode);
    const base = region ? Math.floor(region.totalPlays / 12) : 15_000;
    return generateWeeklyTrends(base, region?.weeklyGrowthPct ? region.weeklyGrowthPct / 52 : 0.1);
  },

  // ── Fans ────────────────────────────────────────────────────
  getFans: () => fans,
  getFan: (id: string) => fans.find(f => f.id === id),
  getFanEvents: (fanId?: string) =>
    fanId ? fanEvents.filter(e => e.fanId === fanId) : fanEvents,
  getFanSegments: () => fanSegments,

  // ── Smart Links ─────────────────────────────────────────────
  getSmartLinks: () => smartLinks,
  getSmartLink: (idOrSlug: string) =>
    smartLinks.find(l => l.id === idOrSlug || l.slug === idOrSlug),

  // ── Campaigns ───────────────────────────────────────────────
  getCampaigns: () => campaigns,
  getCampaign: (id: string) => campaigns.find(c => c.id === id),

  // ── Automations ─────────────────────────────────────────────
  getAutomations: () => automations,
  getAutomation: (id: string) => automations.find(a => a.id === id),

  // ── Insights ────────────────────────────────────────────────
  getInsights: () => insights,
  getInsight: (id: string) => insights.find(i => i.id === id),
  getUnreadInsights: () => insights.filter(i => !i.isRead && !i.isDismissed),

  // ── Notifications ───────────────────────────────────────────
  getNotifications: () => notifications,
  getUnreadNotifications: () => notifications.filter(n => !n.isRead),
};
