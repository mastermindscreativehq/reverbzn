// ============================================================
// REVERBZN OS — Core Types
// ============================================================

export type Platform =
  | "spotify"
  | "apple_music"
  | "audiomack"
  | "boomplay"
  | "youtube"
  | "soundcloud";

export type InsightType =
  | "alert"
  | "opportunity"
  | "pattern"
  | "money"
  | "fan"
  | "content";

export type InsightPriority = "critical" | "high" | "medium" | "low";

export type CampaignStatus = "draft" | "active" | "paused" | "completed" | "failed";
export type CampaignChannel = "email" | "telegram" | "whatsapp" | "push" | "sms";
export type CampaignTemplate =
  | "new_release"
  | "breakout_push"
  | "dormant_reactivation"
  | "city_activation"
  | "exclusive_drop";

export type AutomationStatus = "active" | "paused" | "error" | "disabled";
export type AutomationType =
  | "spike_detector"
  | "city_capture"
  | "save_to_community"
  | "dormant_reactivation"
  | "release_orchestrator";

export type FanEventType =
  | "song_played"
  | "full_track_listened"
  | "song_saved"
  | "song_shared"
  | "smart_link_clicked"
  | "email_opted_in"
  | "telegram_joined"
  | "whatsapp_joined"
  | "campaign_clicked"
  | "content_viewed"
  | "content_converted";

export type NotificationType =
  | "automation_alert"
  | "campaign_alert"
  | "anomaly"
  | "weekly_summary"
  | "fan_milestone"
  | "track_milestone"
  | "system";

// ============================================================
// Domain Entities
// ============================================================

export interface Artist {
  id: string;
  name: string;
  slug: string;
  bio: string;
  genres: string[];
  primaryMarkets: string[];
  releaseStrategy: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface Track {
  id: string;
  artistId: string;
  title: string;
  slug: string;
  releaseDate: string;
  status: "released" | "scheduled" | "draft";
  genres: string[];
  coverUrl?: string;
  durationSec: number;
  totalPlays: number;
  totalSaves: number;
  totalShares: number;
  momentumScore: number;
  breakoutScore: number;
  replaySignal: number;
  retentionProxy: number;
  isrc?: string;
}

export interface Platform_ {
  id: string;
  name: string;
  slug: Platform;
  iconUrl?: string;
  color: string;
}

export interface PlatformTrackMetric {
  id: string;
  trackId: string;
  platformSlug: Platform;
  date: string;
  plays: number;
  saves: number;
  listeners: number;
  streams: number;
  revenueEstimateUsd: number;
}

export interface PlatformMetricSummary {
  platformSlug: Platform;
  platformName: string;
  color: string;
  totalStreams: number;
  totalListeners: number;
  revenueEstimateUsd: number;
  weeklyGrowthPct: number;
  promoEfficiencyScore: number;
  topTrack: string;
}

export interface RegionMetric {
  id: string;
  country: string;
  countryCode: string;
  city?: string;
  date: string;
  platformSlug: Platform;
  plays: number;
  listeners: number;
  saves: number;
  breakoutScore: number;
  topTrackId: string;
}

export interface RegionSummary {
  country: string;
  countryCode: string;
  flag: string;
  totalPlays: number;
  totalListeners: number;
  weeklyGrowthPct: number;
  breakoutScore: number;
  topTrackTitle: string;
  topCities: string[];
  languageNote?: string;
}

export interface Fan {
  id: string;
  artistId: string;
  displayName: string;
  email?: string;
  telegramId?: string;
  whatsappPhone?: string;
  country: string;
  city?: string;
  sourcePlatform: Platform;
  favoriteTrackId?: string;
  favoriteTrackTitle?: string;
  engagementScore: number;
  superfanScore: number;
  joinedAt: string;
  lastActiveAt: string;
  channels: ("email" | "telegram" | "whatsapp")[];
  tags: string[];
  notes?: string;
  segments: string[];
}

export interface FanEvent {
  id: string;
  fanId?: string;
  artistId: string;
  eventType: FanEventType;
  trackId?: string;
  platformSlug?: Platform;
  country?: string;
  city?: string;
  metadata?: Record<string, unknown>;
  occurredAt: string;
}

export interface FanSegment {
  id: string;
  artistId: string;
  name: string;
  description: string;
  rules: SegmentRule[];
  memberCount: number;
  createdAt: string;
}

export interface SegmentRule {
  field: string;
  operator: "eq" | "gt" | "lt" | "contains" | "in";
  value: string | number | string[];
}

export interface SmartLink {
  id: string;
  artistId: string;
  trackId?: string;
  title: string;
  slug: string;
  url: string;
  platforms: { platformSlug: Platform; url: string }[];
  totalClicks: number;
  totalConversions: number;
  conversionRate: number;
  createdAt: string;
  isActive: boolean;
}

export interface SmartLinkClick {
  id: string;
  smartLinkId: string;
  country?: string;
  device?: string;
  referrer?: string;
  convertedTo?: Platform;
  clickedAt: string;
}

export interface Campaign {
  id: string;
  artistId: string;
  name: string;
  template: CampaignTemplate;
  status: CampaignStatus;
  channel: CampaignChannel;
  targetSegmentId?: string;
  targetSegmentName?: string;
  message: string;
  scheduledAt?: string;
  sentAt?: string;
  recipientCount: number;
  openCount: number;
  clickCount: number;
  conversionCount: number;
  openRate: number;
  clickRate: number;
  conversionRate: number;
  createdAt: string;
}

export interface Automation {
  id: string;
  artistId: string;
  type: AutomationType;
  name: string;
  description: string;
  status: AutomationStatus;
  isEnabled: boolean;
  thresholds: Record<string, number | string>;
  lastRunAt?: string;
  nextRunAt?: string;
  lastRunStatus?: "success" | "failure" | "skipped";
  runCount: number;
  successCount: number;
  logs: AutomationLog[];
}

export interface AutomationLog {
  id: string;
  automationId: string;
  status: "success" | "failure" | "skipped";
  message: string;
  details?: Record<string, unknown>;
  runAt: string;
  durationMs: number;
}

export interface Insight {
  id: string;
  artistId: string;
  type: InsightType;
  priority: InsightPriority;
  title: string;
  message: string;
  explanation: string;
  recommendedAction: string;
  actionLabel?: string;
  actionUrl?: string;
  isRead: boolean;
  isDismissed: boolean;
  createdAt: string;
  expiresAt?: string;
  metadata?: Record<string, unknown>;
}

export interface Notification {
  id: string;
  artistId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  priority: "high" | "medium" | "low";
  createdAt: string;
  actionUrl?: string;
}

// ============================================================
// Dashboard Summary Types
// ============================================================

export interface DashboardMetrics {
  totalStreams: number;
  totalStreamsGrowthPct: number;
  estimatedEarningsUsd: number;
  earningsGrowthPct: number;
  ownedAudienceCount: number;
  audienceGrowthPct: number;
  topPlatform: string;
  topTrack: string;
  topRegion: string;
  fanGrowthThisWeek: number;
  communityConversionRate: number;
  momentumScore: number;
}

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: string;
}

export interface TrendPoint {
  date: string;
  value: number;
  label?: string;
}
