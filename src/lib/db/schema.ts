// ============================================================
// REVERBZN OS — Production Database Schema (Drizzle ORM)
// ============================================================
import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  date,
  jsonb,
  index,
  uniqueIndex,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// ── Enums ─────────────────────────────────────────────────────────────────────

export const platformSlugEnum = pgEnum("platform_slug", [
  "spotify",
  "apple_music",
  "audiomack",
  "boomplay",
  "youtube",
  "soundcloud",
]);

export const trackStatusEnum = pgEnum("track_status", [
  "draft",
  "scheduled",
  "released",
]);

export const fanChannelEnum = pgEnum("fan_channel", [
  "email",
  "telegram",
  "whatsapp",
]);

export const fanEventTypeEnum = pgEnum("fan_event_type", [
  "song_played",
  "full_track_listened",
  "song_saved",
  "song_shared",
  "smart_link_clicked",
  "email_opted_in",
  "telegram_joined",
  "whatsapp_joined",
  "campaign_clicked",
  "content_viewed",
  "content_converted",
]);

export const campaignStatusEnum = pgEnum("campaign_status", [
  "draft",
  "active",
  "paused",
  "completed",
  "failed",
]);

export const campaignChannelEnum = pgEnum("campaign_channel", [
  "email",
  "telegram",
  "whatsapp",
  "push",
  "sms",
]);

export const campaignTemplateEnum = pgEnum("campaign_template", [
  "new_release",
  "breakout_push",
  "dormant_reactivation",
  "city_activation",
  "exclusive_drop",
]);

export const automationTypeEnum = pgEnum("automation_type", [
  "spike_detector",
  "city_capture",
  "save_to_community",
  "dormant_reactivation",
  "release_orchestrator",
]);

export const automationStatusEnum = pgEnum("automation_status", [
  "active",
  "paused",
  "error",
  "disabled",
]);

export const runStatusEnum = pgEnum("run_status", [
  "success",
  "failure",
  "skipped",
]);

export const executionStatusEnum = pgEnum("execution_status", [
  "pending",
  "success",
  "failed",
]);

export const insightTypeEnum = pgEnum("insight_type", [
  "alert",
  "opportunity",
  "pattern",
  "money",
  "fan",
  "content",
]);

export const insightPriorityEnum = pgEnum("insight_priority", [
  "critical",
  "high",
  "medium",
  "low",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "automation_alert",
  "campaign_alert",
  "anomaly",
  "weekly_summary",
  "fan_milestone",
  "track_milestone",
  "system",
]);

export const notificationPriorityEnum = pgEnum("notification_priority", [
  "high",
  "medium",
  "low",
]);

// ── Artists ───────────────────────────────────────────────────────────────────

export const artists = pgTable("artists", {
  id:               uuid("id").primaryKey().defaultRandom(),
  name:             varchar("name", { length: 120 }).notNull(),
  slug:             varchar("slug", { length: 80 }).notNull().unique(),
  bio:              text("bio"),
  genres:           text("genres").array().notNull().default(sql`ARRAY[]::text[]`),
  primaryMarkets:   text("primary_markets").array().notNull().default(sql`ARRAY[]::text[]`),
  releaseStrategy:  text("release_strategy"),
  avatarUrl:        text("avatar_url"),
  createdAt:        timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:        timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("artists_slug_idx").on(t.slug),
]);

// ── Platforms (reference) ─────────────────────────────────────────────────────

export const platforms = pgTable("platforms", {
  id:    uuid("id").primaryKey().defaultRandom(),
  name:  varchar("name", { length: 80 }).notNull(),
  slug:  platformSlugEnum("slug").notNull().unique(),
  color: varchar("color", { length: 20 }).notNull().default("#888888"),
}, (t) => [
  uniqueIndex("platforms_slug_idx").on(t.slug),
]);

// ── Tracks ────────────────────────────────────────────────────────────────────

export const tracks = pgTable("tracks", {
  id:              uuid("id").primaryKey().defaultRandom(),
  artistId:        uuid("artist_id").notNull().references(() => artists.id, { onDelete: "cascade" }),
  title:           varchar("title", { length: 200 }).notNull(),
  slug:            varchar("slug", { length: 200 }).notNull(),
  releaseDate:     date("release_date"),
  status:          trackStatusEnum("status").notNull().default("draft"),
  genres:          text("genres").array().notNull().default(sql`ARRAY[]::text[]`),
  coverUrl:        text("cover_url"),
  durationSec:     integer("duration_sec"),
  isrc:            varchar("isrc", { length: 20 }),
  // Computed / cached aggregates (updated by background jobs)
  totalPlays:      integer("total_plays").notNull().default(0),
  totalSaves:      integer("total_saves").notNull().default(0),
  totalShares:     integer("total_shares").notNull().default(0),
  momentumScore:   integer("momentum_score").notNull().default(0),
  breakoutScore:   integer("breakout_score").notNull().default(0),
  replaySignal:    integer("replay_signal").notNull().default(0),
  retentionProxy:  integer("retention_proxy").notNull().default(0),
  createdAt:       timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:       timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("tracks_artist_slug_idx").on(t.artistId, t.slug),
  index("tracks_artist_id_idx").on(t.artistId),
  index("tracks_momentum_idx").on(t.momentumScore),
]);

// ── Platform Track Metrics (daily) ───────────────────────────────────────────

export const platformTrackMetricsDaily = pgTable("platform_track_metrics_daily", {
  id:                  uuid("id").primaryKey().defaultRandom(),
  trackId:             uuid("track_id").notNull().references(() => tracks.id, { onDelete: "cascade" }),
  platformSlug:        platformSlugEnum("platform_slug").notNull(),
  date:                date("date").notNull(),
  plays:               integer("plays").notNull().default(0),
  streams:             integer("streams").notNull().default(0),
  saves:               integer("saves").notNull().default(0),
  listeners:           integer("listeners").notNull().default(0),
  revenueEstimateUsd:  numeric("revenue_estimate_usd", { precision: 10, scale: 4 }).notNull().default("0"),
  createdAt:           timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("ptmd_track_platform_date_idx").on(t.trackId, t.platformSlug, t.date),
  index("ptmd_track_id_idx").on(t.trackId),
  index("ptmd_platform_date_idx").on(t.platformSlug, t.date),
]);

// ── Platform Region Metrics (daily) ──────────────────────────────────────────

export const platformRegionMetricsDaily = pgTable("platform_region_metrics_daily", {
  id:            uuid("id").primaryKey().defaultRandom(),
  artistId:      uuid("artist_id").notNull().references(() => artists.id, { onDelete: "cascade" }),
  platformSlug:  platformSlugEnum("platform_slug").notNull(),
  date:          date("date").notNull(),
  countryCode:   varchar("country_code", { length: 4 }).notNull(),
  country:       varchar("country", { length: 100 }).notNull(),
  city:          varchar("city", { length: 100 }),
  plays:         integer("plays").notNull().default(0),
  listeners:     integer("listeners").notNull().default(0),
  saves:         integer("saves").notNull().default(0),
  createdAt:     timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("prmd_artist_date_idx").on(t.artistId, t.date),
  index("prmd_country_date_idx").on(t.countryCode, t.date),
  uniqueIndex("prmd_unique_idx").on(t.artistId, t.platformSlug, t.date, t.countryCode),
]);

// ── Fans ──────────────────────────────────────────────────────────────────────

export const fans = pgTable("fans", {
  id:               uuid("id").primaryKey().defaultRandom(),
  artistId:         uuid("artist_id").notNull().references(() => artists.id, { onDelete: "cascade" }),
  displayName:      varchar("display_name", { length: 200 }).notNull(),
  email:            varchar("email", { length: 320 }),
  telegramId:       varchar("telegram_id", { length: 100 }),
  whatsappPhone:    varchar("whatsapp_phone", { length: 30 }),
  country:          varchar("country", { length: 100 }),
  city:             varchar("city", { length: 100 }),
  countryCode:      varchar("country_code", { length: 4 }),
  sourcePlatform:   platformSlugEnum("source_platform"),
  favoriteTrackId:  uuid("favorite_track_id").references(() => tracks.id, { onDelete: "set null" }),
  channels:         fanChannelEnum("channels").array().notNull().default(sql`ARRAY[]::fan_channel[]`),
  tags:             text("tags").array().notNull().default(sql`ARRAY[]::text[]`),
  segments:         text("segments").array().notNull().default(sql`ARRAY[]::text[]`),
  notes:            text("notes"),
  engagementScore:  integer("engagement_score").notNull().default(0),
  superfanScore:    integer("superfan_score").notNull().default(0),
  joinedAt:         timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  lastActiveAt:     timestamp("last_active_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt:        timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:        timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("fans_artist_id_idx").on(t.artistId),
  index("fans_email_idx").on(t.email),
  index("fans_engagement_idx").on(t.engagementScore),
  index("fans_superfan_idx").on(t.superfanScore),
]);

// ── Fan Events ────────────────────────────────────────────────────────────────

export const fanEvents = pgTable("fan_events", {
  id:           uuid("id").primaryKey().defaultRandom(),
  artistId:     uuid("artist_id").notNull().references(() => artists.id, { onDelete: "cascade" }),
  fanId:        uuid("fan_id").references(() => fans.id, { onDelete: "set null" }),
  eventType:    fanEventTypeEnum("event_type").notNull(),
  trackId:      uuid("track_id").references(() => tracks.id, { onDelete: "set null" }),
  platformSlug: platformSlugEnum("platform_slug"),
  countryCode:  varchar("country_code", { length: 4 }),
  country:      varchar("country", { length: 100 }),
  city:         varchar("city", { length: 100 }),
  metadata:     jsonb("metadata"),
  occurredAt:   timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("fan_events_artist_id_idx").on(t.artistId),
  index("fan_events_fan_id_idx").on(t.fanId),
  index("fan_events_event_type_idx").on(t.eventType),
  index("fan_events_occurred_at_idx").on(t.occurredAt),
  index("fan_events_track_id_idx").on(t.trackId),
]);

// ── Fan Segments ──────────────────────────────────────────────────────────────

export const fanSegments = pgTable("fan_segments", {
  id:          uuid("id").primaryKey().defaultRandom(),
  artistId:    uuid("artist_id").notNull().references(() => artists.id, { onDelete: "cascade" }),
  name:        varchar("name", { length: 120 }).notNull(),
  description: text("description"),
  rules:       jsonb("rules").notNull().default(sql`'[]'::jsonb`),
  memberCount: integer("member_count").notNull().default(0),
  createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:   timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("fan_segments_artist_id_idx").on(t.artistId),
]);

export const fanSegmentMembers = pgTable("fan_segment_members", {
  segmentId: uuid("segment_id").notNull().references(() => fanSegments.id, { onDelete: "cascade" }),
  fanId:     uuid("fan_id").notNull().references(() => fans.id, { onDelete: "cascade" }),
  addedAt:   timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  primaryKey({ columns: [t.segmentId, t.fanId] }),
]);

// ── Smart Links ───────────────────────────────────────────────────────────────

export const smartLinks = pgTable("smart_links", {
  id:                uuid("id").primaryKey().defaultRandom(),
  artistId:          uuid("artist_id").notNull().references(() => artists.id, { onDelete: "cascade" }),
  trackId:           uuid("track_id").references(() => tracks.id, { onDelete: "set null" }),
  title:             varchar("title", { length: 200 }).notNull(),
  slug:              varchar("slug", { length: 100 }).notNull(),
  externalUrl:       text("external_url"),
  platformLinks:     jsonb("platform_links").notNull().default(sql`'[]'::jsonb`),
  totalClicks:       integer("total_clicks").notNull().default(0),
  totalConversions:  integer("total_conversions").notNull().default(0),
  conversionRate:    numeric("conversion_rate", { precision: 6, scale: 2 }).notNull().default("0"),
  isActive:          boolean("is_active").notNull().default(true),
  createdAt:         timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:         timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("smart_links_artist_slug_idx").on(t.artistId, t.slug),
  index("smart_links_artist_id_idx").on(t.artistId),
]);

export const smartLinkClicks = pgTable("smart_link_clicks", {
  id:          uuid("id").primaryKey().defaultRandom(),
  smartLinkId: uuid("smart_link_id").notNull().references(() => smartLinks.id, { onDelete: "cascade" }),
  country:     varchar("country", { length: 100 }),
  countryCode: varchar("country_code", { length: 4 }),
  device:      varchar("device", { length: 50 }),
  referrer:    text("referrer"),
  convertedTo: platformSlugEnum("converted_to"),
  clickedAt:   timestamp("clicked_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("slc_smart_link_id_idx").on(t.smartLinkId),
  index("slc_clicked_at_idx").on(t.clickedAt),
]);

// ── Campaigns ─────────────────────────────────────────────────────────────────

export const campaigns = pgTable("campaigns", {
  id:                uuid("id").primaryKey().defaultRandom(),
  artistId:          uuid("artist_id").notNull().references(() => artists.id, { onDelete: "cascade" }),
  insightId:         uuid("insight_id").references(() => insights.id, { onDelete: "set null" }),
  executionId:       uuid("execution_id").references(() => executions.id, { onDelete: "set null" }),
  name:              varchar("name", { length: 200 }).notNull(),
  template:          campaignTemplateEnum("template").notNull(),
  status:            campaignStatusEnum("status").notNull().default("draft"),
  channel:           campaignChannelEnum("channel").notNull(),
  targetSegmentId:   uuid("target_segment_id").references(() => fanSegments.id, { onDelete: "set null" }),
  message:           text("message").notNull(),
  scheduledAt:       timestamp("scheduled_at", { withTimezone: true }),
  sentAt:            timestamp("sent_at", { withTimezone: true }),
  recipientCount:    integer("recipient_count").notNull().default(0),
  deliveredCount:    integer("delivered_count").notNull().default(0),
  openCount:         integer("open_count").notNull().default(0),
  clickCount:        integer("click_count").notNull().default(0),
  conversionCount:   integer("conversion_count").notNull().default(0),
  openRate:          numeric("open_rate", { precision: 6, scale: 2 }).notNull().default("0"),
  clickRate:         numeric("click_rate", { precision: 6, scale: 2 }).notNull().default("0"),
  conversionRate:    numeric("conversion_rate", { precision: 6, scale: 2 }).notNull().default("0"),
  completedAt:       timestamp("completed_at", { withTimezone: true }),
  errorMessage:      text("error_message"),
  createdAt:         timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:         timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("campaigns_artist_id_idx").on(t.artistId),
  index("campaigns_status_idx").on(t.status),
]);

// ── Automation Runs ───────────────────────────────────────────────────────────

export const automations = pgTable("automations", {
  id:            uuid("id").primaryKey().defaultRandom(),
  artistId:      uuid("artist_id").notNull().references(() => artists.id, { onDelete: "cascade" }),
  type:          automationTypeEnum("type").notNull(),
  name:          varchar("name", { length: 120 }).notNull(),
  description:   text("description"),
  status:        automationStatusEnum("status").notNull().default("active"),
  isEnabled:     boolean("is_enabled").notNull().default(true),
  thresholds:    jsonb("thresholds").notNull().default(sql`'{}'::jsonb`),
  lastRunAt:     timestamp("last_run_at", { withTimezone: true }),
  nextRunAt:     timestamp("next_run_at", { withTimezone: true }),
  lastRunStatus: runStatusEnum("last_run_status"),
  runCount:      integer("run_count").notNull().default(0),
  successCount:  integer("success_count").notNull().default(0),
  createdAt:     timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:     timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("automations_artist_id_idx").on(t.artistId),
]);

export const automationRuns = pgTable("automation_runs", {
  id:            uuid("id").primaryKey().defaultRandom(),
  automationId:  uuid("automation_id").notNull().references(() => automations.id, { onDelete: "cascade" }),
  status:        runStatusEnum("status").notNull(),
  message:       text("message").notNull(),
  details:       jsonb("details"),
  durationMs:    integer("duration_ms"),
  runAt:         timestamp("run_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("automation_runs_automation_id_idx").on(t.automationId),
  index("automation_runs_run_at_idx").on(t.runAt),
]);

// ── Insights ──────────────────────────────────────────────────────────────────

export const insights = pgTable("insights", {
  id:                uuid("id").primaryKey().defaultRandom(),
  artistId:          uuid("artist_id").notNull().references(() => artists.id, { onDelete: "cascade" }),
  type:              insightTypeEnum("type").notNull(),
  priority:          insightPriorityEnum("priority").notNull().default("medium"),
  title:             varchar("title", { length: 300 }).notNull(),
  message:           text("message").notNull(),
  explanation:       text("explanation"),
  recommendedAction: text("recommended_action"),
  actionLabel:       varchar("action_label", { length: 100 }),
  actionUrl:         text("action_url"),
  isRead:            boolean("is_read").notNull().default(false),
  isDismissed:       boolean("is_dismissed").notNull().default(false),
  expiresAt:         timestamp("expires_at", { withTimezone: true }),
  metadata:          jsonb("metadata"),
  createdAt:         timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:         timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("insights_artist_id_idx").on(t.artistId),
  index("insights_priority_idx").on(t.priority),
  index("insights_is_read_idx").on(t.isRead),
]);

// ── Action Executions ─────────────────────────────────────────────────────────

export const executions = pgTable("executions", {
  id:         uuid("id").primaryKey().defaultRandom(),
  insightId:  uuid("insight_id").notNull().references(() => insights.id, { onDelete: "cascade" }),
  actionType: varchar("action_type", { length: 100 }).notNull(),
  status:     executionStatusEnum("status").notNull().default("pending"),
  response:   jsonb("response"),
  createdAt:  timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("executions_insight_id_idx").on(t.insightId),
  index("executions_created_at_idx").on(t.createdAt),
]);

// ── Notifications ─────────────────────────────────────────────────────────────

export const notifications = pgTable("notifications", {
  id:        uuid("id").primaryKey().defaultRandom(),
  artistId:  uuid("artist_id").notNull().references(() => artists.id, { onDelete: "cascade" }),
  type:      notificationTypeEnum("type").notNull(),
  priority:  notificationPriorityEnum("priority").notNull().default("medium"),
  title:     varchar("title", { length: 300 }).notNull(),
  message:   text("message").notNull(),
  isRead:    boolean("is_read").notNull().default(false),
  actionUrl: text("action_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("notifications_artist_id_idx").on(t.artistId),
  index("notifications_is_read_idx").on(t.isRead),
  index("notifications_created_at_idx").on(t.createdAt),
]);

// ── Relations ─────────────────────────────────────────────────────────────────

export const artistsRelations = relations(artists, ({ many }) => ({
  tracks:                    many(tracks),
  fans:                      many(fans),
  fanEvents:                 many(fanEvents),
  fanSegments:               many(fanSegments),
  smartLinks:                many(smartLinks),
  campaigns:                 many(campaigns),
  automations:               many(automations),
  insights:                  many(insights),
  notifications:             many(notifications),
  platformRegionMetrics:     many(platformRegionMetricsDaily),
}));

export const tracksRelations = relations(tracks, ({ one, many }) => ({
  artist:          one(artists, { fields: [tracks.artistId], references: [artists.id] }),
  platformMetrics: many(platformTrackMetricsDaily),
  fanEvents:       many(fanEvents),
  smartLinks:      many(smartLinks),
}));

export const fansRelations = relations(fans, ({ one, many }) => ({
  artist:       one(artists, { fields: [fans.artistId], references: [artists.id] }),
  favoriteTrack: one(tracks, { fields: [fans.favoriteTrackId], references: [tracks.id] }),
  events:       many(fanEvents),
  segments:     many(fanSegmentMembers),
}));

export const fanEventsRelations = relations(fanEvents, ({ one }) => ({
  artist: one(artists, { fields: [fanEvents.artistId], references: [artists.id] }),
  fan:    one(fans,    { fields: [fanEvents.fanId],    references: [fans.id] }),
  track:  one(tracks,  { fields: [fanEvents.trackId],  references: [tracks.id] }),
}));

export const campaignsRelations = relations(campaigns, ({ one }) => ({
  artist:    one(artists,     { fields: [campaigns.artistId],        references: [artists.id] }),
  segment:   one(fanSegments, { fields: [campaigns.targetSegmentId], references: [fanSegments.id] }),
  insight:   one(insights,    { fields: [campaigns.insightId],       references: [insights.id] }),
  execution: one(executions,  { fields: [campaigns.executionId],     references: [executions.id] }),
}));

export const automationsRelations = relations(automations, ({ one, many }) => ({
  artist: one(artists,        { fields: [automations.artistId], references: [artists.id] }),
  runs:   many(automationRuns),
}));

export const automationRunsRelations = relations(automationRuns, ({ one }) => ({
  automation: one(automations, { fields: [automationRuns.automationId], references: [automations.id] }),
}));

export const insightsRelations = relations(insights, ({ one, many }) => ({
  artist:     one(artists, { fields: [insights.artistId], references: [artists.id] }),
  executions: many(executions),
  campaigns:  many(campaigns),
}));

export const executionsRelations = relations(executions, ({ one }) => ({
  insight: one(insights, { fields: [executions.insightId], references: [insights.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  artist: one(artists, { fields: [notifications.artistId], references: [artists.id] }),
}));

// ── Exported type helpers ─────────────────────────────────────────────────────

export type Artist              = typeof artists.$inferSelect;
export type InsertArtist        = typeof artists.$inferInsert;
export type Track               = typeof tracks.$inferSelect;
export type InsertTrack         = typeof tracks.$inferInsert;
export type Platform            = typeof platforms.$inferSelect;
export type InsertPlatform      = typeof platforms.$inferInsert;
export type PlatformTrackMetric = typeof platformTrackMetricsDaily.$inferSelect;
export type InsertPlatformTrackMetric = typeof platformTrackMetricsDaily.$inferInsert;
export type PlatformRegionMetric = typeof platformRegionMetricsDaily.$inferSelect;
export type InsertPlatformRegionMetric = typeof platformRegionMetricsDaily.$inferInsert;
export type Fan                 = typeof fans.$inferSelect;
export type InsertFan           = typeof fans.$inferInsert;
export type FanEvent            = typeof fanEvents.$inferSelect;
export type InsertFanEvent      = typeof fanEvents.$inferInsert;
export type FanSegment          = typeof fanSegments.$inferSelect;
export type SmartLink           = typeof smartLinks.$inferSelect;
export type Campaign            = typeof campaigns.$inferSelect;
export type InsertCampaign      = typeof campaigns.$inferInsert;
export type Automation          = typeof automations.$inferSelect;
export type AutomationRun       = typeof automationRuns.$inferSelect;
export type InsertAutomationRun = typeof automationRuns.$inferInsert;
export type Insight             = typeof insights.$inferSelect;
export type Execution           = typeof executions.$inferSelect;
export type InsertExecution     = typeof executions.$inferInsert;
export type Notification        = typeof notifications.$inferSelect;

// ============================================================
// ARTIST INTELLIGENCE OS — Extended Schema
// Royalties · Sync · Releases · Catalog · Fan Intel
// ============================================================

// ── New Enums ─────────────────────────────────────────────────────────────────

export const royaltyReportStatusEnum = pgEnum("royalty_report_status", [
  "draft", "processing", "confirmed", "paid",
]);

export const royaltyTypeEnum = pgEnum("royalty_type", [
  "streaming", "download", "sync", "performance", "mechanical", "neighbouring_rights",
]);

export const syncMediaTypeEnum = pgEnum("sync_media_type", [
  "film", "tv_series", "documentary", "game", "advertisement", "trailer", "short_film",
]);

export const syncOpportunityStatusEnum = pgEnum("sync_opportunity_status", [
  "open", "reviewing", "closed", "filled",
]);

export const syncPitchStatusEnum = pgEnum("sync_pitch_status", [
  "draft", "submitted", "shortlisted", "licensed", "rejected", "expired",
]);

export const releaseTypeEnum = pgEnum("release_type", [
  "single", "ep", "album", "mixtape", "compilation",
]);

export const releaseStatusEnum = pgEnum("release_status", [
  "concept", "recording", "mixing", "mastered", "submitted", "scheduled", "released",
]);

export const assetTypeEnum = pgEnum("asset_type", [
  "cover_art", "audio_master", "stems", "press_kit", "lyric_sheet", "video",
]);

export const assetStatusEnum = pgEnum("asset_status", [
  "pending", "in_progress", "ready", "approved",
]);

export const trackLifecyclePhaseEnum = pgEnum("track_lifecycle_phase", [
  "rising", "peak", "plateau", "declining", "dormant", "evergreen",
]);

export const catalogInsightTypeEnum = pgEnum("catalog_insight_type", [
  "sleeper_hit", "stream_decay", "revival_candidate", "evergreen_alert", "era_peak", "breakout_signal",
]);

export const fanClusterEnum = pgEnum("fan_cluster", [
  "superfan", "core", "casual", "dormant", "new",
]);

// ── Royalty Sources ───────────────────────────────────────────────────────────

export const royaltySources = pgTable("royalty_sources", {
  id:            uuid("id").primaryKey().defaultRandom(),
  artistId:      uuid("artist_id").notNull().references(() => artists.id, { onDelete: "cascade" }),
  platformSlug:  platformSlugEnum("platform_slug").notNull(),
  sourceName:    varchar("source_name", { length: 120 }).notNull(),
  payoutModel:   varchar("payout_model", { length: 80 }),
  rpm:           numeric("rpm", { precision: 8, scale: 5 }).notNull().default("0"),
  territory:     varchar("territory", { length: 4 }),
  isActive:      boolean("is_active").notNull().default(true),
  createdAt:     timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("royalty_sources_artist_id_idx").on(t.artistId),
]);

// ── Royalty Reports ───────────────────────────────────────────────────────────

export const royaltyReports = pgTable("royalty_reports", {
  id:            uuid("id").primaryKey().defaultRandom(),
  artistId:      uuid("artist_id").notNull().references(() => artists.id, { onDelete: "cascade" }),
  periodLabel:   varchar("period_label", { length: 20 }).notNull(),
  periodStart:   date("period_start").notNull(),
  periodEnd:     date("period_end").notNull(),
  totalUsd:      numeric("total_usd", { precision: 12, scale: 4 }).notNull().default("0"),
  status:        royaltyReportStatusEnum("status").notNull().default("draft"),
  entryCount:    integer("entry_count").notNull().default(0),
  topPlatform:   varchar("top_platform", { length: 80 }),
  topTrackTitle: varchar("top_track_title", { length: 200 }),
  notes:         text("notes"),
  createdAt:     timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("royalty_reports_artist_id_idx").on(t.artistId),
  index("royalty_reports_period_idx").on(t.periodStart),
]);

// ── Royalty Entries ───────────────────────────────────────────────────────────

export const royaltyEntries = pgTable("royalty_entries", {
  id:            uuid("id").primaryKey().defaultRandom(),
  reportId:      uuid("report_id").notNull().references(() => royaltyReports.id, { onDelete: "cascade" }),
  trackId:       uuid("track_id").references(() => tracks.id, { onDelete: "set null" }),
  artistId:      uuid("artist_id").notNull().references(() => artists.id, { onDelete: "cascade" }),
  platformSlug:  platformSlugEnum("platform_slug").notNull(),
  territory:     varchar("territory", { length: 4 }),
  streams:       integer("streams").notNull().default(0),
  royaltyUsd:    numeric("royalty_usd", { precision: 10, scale: 4 }).notNull().default("0"),
  royaltyType:   royaltyTypeEnum("royalty_type").notNull().default("streaming"),
  createdAt:     timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("royalty_entries_report_id_idx").on(t.reportId),
  index("royalty_entries_artist_id_idx").on(t.artistId),
]);

// ── Payout Forecasts ──────────────────────────────────────────────────────────

export const payoutForecasts = pgTable("payout_forecasts", {
  id:             uuid("id").primaryKey().defaultRandom(),
  artistId:       uuid("artist_id").notNull().references(() => artists.id, { onDelete: "cascade" }),
  periodLabel:    varchar("period_label", { length: 20 }).notNull(),
  forecastUsd:    numeric("forecast_usd", { precision: 12, scale: 4 }).notNull().default("0"),
  lowUsd:         numeric("low_usd", { precision: 12, scale: 4 }).notNull().default("0"),
  highUsd:        numeric("high_usd", { precision: 12, scale: 4 }).notNull().default("0"),
  confidencePct:  integer("confidence_pct").notNull().default(0),
  basisNote:      text("basis_note"),
  factors:        text("factors").array().notNull().default(sql`ARRAY[]::text[]`),
  createdAt:      timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("payout_forecasts_artist_id_idx").on(t.artistId),
]);

// ── Music Supervisors ─────────────────────────────────────────────────────────

export const musicSupervisors = pgTable("music_supervisors", {
  id:              uuid("id").primaryKey().defaultRandom(),
  name:            varchar("name", { length: 120 }).notNull(),
  company:         varchar("company", { length: 200 }).notNull(),
  role:            varchar("role", { length: 100 }),
  email:           varchar("email", { length: 320 }),
  linkedinUrl:     text("linkedin_url"),
  mediaTypes:      syncMediaTypeEnum("media_types").array().notNull().default(sql`ARRAY[]::sync_media_type[]`),
  genreFocus:      text("genre_focus").array().notNull().default(sql`ARRAY[]::text[]`),
  credits:         text("credits").array().notNull().default(sql`ARRAY[]::text[]`),
  dealCount:       integer("deal_count").notNull().default(0),
  lastContactedAt: timestamp("last_contacted_at", { withTimezone: true }),
  notes:           text("notes"),
  createdAt:       timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("music_supervisors_company_idx").on(t.company),
]);

// ── Sync Opportunities ────────────────────────────────────────────────────────

export const syncOpportunities = pgTable("sync_opportunities", {
  id:             uuid("id").primaryKey().defaultRandom(),
  artistId:       uuid("artist_id").notNull().references(() => artists.id, { onDelete: "cascade" }),
  supervisorId:   uuid("supervisor_id").references(() => musicSupervisors.id, { onDelete: "set null" }),
  title:          varchar("title", { length: 300 }).notNull(),
  description:    text("description"),
  mediaType:      syncMediaTypeEnum("media_type").notNull(),
  budgetTier:     varchar("budget_tier", { length: 50 }),
  budgetMinUsd:   integer("budget_min_usd"),
  budgetMaxUsd:   integer("budget_max_usd"),
  deadline:       date("deadline"),
  status:         syncOpportunityStatusEnum("status").notNull().default("open"),
  moodTags:       text("mood_tags").array().notNull().default(sql`ARRAY[]::text[]`),
  genreTags:      text("genre_tags").array().notNull().default(sql`ARRAY[]::text[]`),
  bpmMin:         integer("bpm_min"),
  bpmMax:         integer("bpm_max"),
  needsVocals:    boolean("needs_vocals"),
  createdAt:      timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("sync_opportunities_artist_id_idx").on(t.artistId),
  index("sync_opportunities_status_idx").on(t.status),
]);

// ── Sync Pitches ──────────────────────────────────────────────────────────────

export const syncPitches = pgTable("sync_pitches", {
  id:              uuid("id").primaryKey().defaultRandom(),
  opportunityId:   uuid("opportunity_id").notNull().references(() => syncOpportunities.id, { onDelete: "cascade" }),
  trackId:         uuid("track_id").notNull().references(() => tracks.id, { onDelete: "cascade" }),
  artistId:        uuid("artist_id").notNull().references(() => artists.id, { onDelete: "cascade" }),
  status:          syncPitchStatusEnum("status").notNull().default("draft"),
  pitchNotes:      text("pitch_notes"),
  submittedAt:     timestamp("submitted_at", { withTimezone: true }),
  responseNotes:   text("response_notes"),
  licensingFeeUsd: integer("licensing_fee_usd"),
  createdAt:       timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("sync_pitches_opportunity_id_idx").on(t.opportunityId),
  index("sync_pitches_track_id_idx").on(t.trackId),
  index("sync_pitches_artist_id_idx").on(t.artistId),
  index("sync_pitches_status_idx").on(t.status),
]);

// ── Track Sync Profiles ───────────────────────────────────────────────────────

export const trackSyncProfiles = pgTable("track_sync_profiles", {
  id:                uuid("id").primaryKey().defaultRandom(),
  trackId:           uuid("track_id").notNull().unique().references(() => tracks.id, { onDelete: "cascade" }),
  bpm:               integer("bpm"),
  musicalKey:        varchar("musical_key", { length: 10 }),
  moods:             text("moods").array().notNull().default(sql`ARRAY[]::text[]`),
  energyLevel:       integer("energy_level"),
  cinematicFitScore: integer("cinematic_fit_score").notNull().default(0),
  sceneTypes:        text("scene_types").array().notNull().default(sql`ARRAY[]::text[]`),
  hasCleanVersion:   boolean("has_clean_version").notNull().default(false),
  lyricType:         varchar("lyric_type", { length: 30 }),
  syncScore:         integer("sync_score").notNull().default(0),
  createdAt:         timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:         timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("track_sync_profiles_track_id_idx").on(t.trackId),
]);

// ── Releases ──────────────────────────────────────────────────────────────────

export const releases = pgTable("releases", {
  id:                 uuid("id").primaryKey().defaultRandom(),
  artistId:           uuid("artist_id").notNull().references(() => artists.id, { onDelete: "cascade" }),
  title:              varchar("title", { length: 200 }).notNull(),
  releaseType:        releaseTypeEnum("release_type").notNull().default("single"),
  status:             releaseStatusEnum("status").notNull().default("concept"),
  releaseDate:        date("release_date"),
  announcementDate:   date("announcement_date"),
  coverUrl:           text("cover_url"),
  healthScore:        integer("health_score").notNull().default(0),
  preSaveCount:       integer("pre_save_count").notNull().default(0),
  targetStreams:       integer("target_streams"),
  promoBudgetUsd:     integer("promo_budget_usd"),
  dspsSubmitted:      boolean("dsps_submitted").notNull().default(false),
  targetMarkets:      text("target_markets").array().notNull().default(sql`ARRAY[]::text[]`),
  aiRecommendations:  text("ai_recommendations").array().notNull().default(sql`ARRAY[]::text[]`),
  notes:              text("notes"),
  createdAt:          timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:          timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("releases_artist_id_idx").on(t.artistId),
  index("releases_status_idx").on(t.status),
  index("releases_release_date_idx").on(t.releaseDate),
]);

// ── Release Campaigns ─────────────────────────────────────────────────────────

export const releaseCampaigns = pgTable("release_campaigns", {
  id:           uuid("id").primaryKey().defaultRandom(),
  releaseId:    uuid("release_id").notNull().references(() => releases.id, { onDelete: "cascade" }),
  artistId:     uuid("artist_id").notNull().references(() => artists.id, { onDelete: "cascade" }),
  name:         varchar("name", { length: 200 }).notNull(),
  type:         varchar("type", { length: 80 }).notNull(),
  channel:      campaignChannelEnum("channel").notNull(),
  status:       campaignStatusEnum("status").notNull().default("draft"),
  targetReach:  integer("target_reach"),
  actualReach:  integer("actual_reach"),
  budgetUsd:    integer("budget_usd"),
  scheduledAt:  timestamp("scheduled_at", { withTimezone: true }),
  completedAt:  timestamp("completed_at", { withTimezone: true }),
  createdAt:    timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("release_campaigns_release_id_idx").on(t.releaseId),
]);

// ── Release Assets ────────────────────────────────────────────────────────────

export const releaseAssets = pgTable("release_assets", {
  id:        uuid("id").primaryKey().defaultRandom(),
  releaseId: uuid("release_id").notNull().references(() => releases.id, { onDelete: "cascade" }),
  type:      assetTypeEnum("type").notNull(),
  label:     varchar("label", { length: 120 }).notNull(),
  url:       text("url"),
  status:    assetStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("release_assets_release_id_idx").on(t.releaseId),
]);

// ── Release Checklists ────────────────────────────────────────────────────────

export const releaseChecklists = pgTable("release_checklists", {
  id:        uuid("id").primaryKey().defaultRandom(),
  releaseId: uuid("release_id").notNull().references(() => releases.id, { onDelete: "cascade" }),
  category:  varchar("category", { length: 80 }).notNull(),
  item:      varchar("item", { length: 300 }).notNull(),
  isDone:    boolean("is_done").notNull().default(false),
  dueDate:   date("due_date"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("release_checklists_release_id_idx").on(t.releaseId),
]);

// ── Catalog Tracks ────────────────────────────────────────────────────────────

export const catalogTracks = pgTable("catalog_tracks", {
  id:                    uuid("id").primaryKey().defaultRandom(),
  trackId:               uuid("track_id").notNull().unique().references(() => tracks.id, { onDelete: "cascade" }),
  artistId:              uuid("artist_id").notNull().references(() => artists.id, { onDelete: "cascade" }),
  lifecyclePhase:        trackLifecyclePhaseEnum("lifecycle_phase").notNull().default("rising"),
  evergreenScore:        integer("evergreen_score").notNull().default(0),
  decayRatePct:          numeric("decay_rate_pct", { precision: 6, scale: 2 }).notNull().default("0"),
  revivalPotential:      integer("revival_potential").notNull().default(0),
  peakStreams:           integer("peak_streams"),
  peakDate:             date("peak_date"),
  currentMonthlyStreams: integer("current_monthly_streams").notNull().default(0),
  totalPlaylists:        integer("total_playlists").notNull().default(0),
  lastAnalyzedAt:        timestamp("last_analyzed_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt:             timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("catalog_tracks_artist_id_idx").on(t.artistId),
  index("catalog_tracks_lifecycle_idx").on(t.lifecyclePhase),
]);

// ── Catalog Insights ──────────────────────────────────────────────────────────

export const catalogInsights = pgTable("catalog_insights", {
  id:          uuid("id").primaryKey().defaultRandom(),
  artistId:    uuid("artist_id").notNull().references(() => artists.id, { onDelete: "cascade" }),
  trackId:     uuid("track_id").references(() => tracks.id, { onDelete: "set null" }),
  insightType: catalogInsightTypeEnum("insight_type").notNull(),
  title:       varchar("title", { length: 300 }).notNull(),
  body:        text("body").notNull(),
  action:      text("action"),
  urgency:     insightPriorityEnum("urgency").notNull().default("medium"),
  isDismissed: boolean("is_dismissed").notNull().default(false),
  createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("catalog_insights_artist_id_idx").on(t.artistId),
  index("catalog_insights_urgency_idx").on(t.urgency),
]);

// ── Playlist History ──────────────────────────────────────────────────────────

export const playlistHistory = pgTable("playlist_history", {
  id:             uuid("id").primaryKey().defaultRandom(),
  trackId:        uuid("track_id").notNull().references(() => tracks.id, { onDelete: "cascade" }),
  artistId:       uuid("artist_id").notNull().references(() => artists.id, { onDelete: "cascade" }),
  playlistName:   varchar("playlist_name", { length: 300 }).notNull(),
  platformSlug:   platformSlugEnum("platform_slug").notNull(),
  followerCount:  integer("follower_count").notNull().default(0),
  addedAt:        date("added_at").notNull(),
  removedAt:      date("removed_at"),
  peakPosition:   integer("peak_position"),
  impactStreams:  integer("impact_streams").notNull().default(0),
  createdAt:      timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("playlist_history_track_id_idx").on(t.trackId),
  index("playlist_history_artist_id_idx").on(t.artistId),
]);

// ── Track Lifecycle Metrics ───────────────────────────────────────────────────

export const trackLifecycleMetrics = pgTable("track_lifecycle_metrics", {
  id:               uuid("id").primaryKey().defaultRandom(),
  trackId:          uuid("track_id").notNull().references(() => tracks.id, { onDelete: "cascade" }),
  weekStart:        date("week_start").notNull(),
  streams:          integer("streams").notNull().default(0),
  streamDeltaPct:   numeric("stream_delta_pct", { precision: 8, scale: 2 }).notNull().default("0"),
  saves:            integer("saves").notNull().default(0),
  savesDeltaPct:    numeric("saves_delta_pct", { precision: 8, scale: 2 }).notNull().default("0"),
  playlistCount:    integer("playlist_count").notNull().default(0),
  createdAt:        timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("tlm_track_week_idx").on(t.trackId, t.weekStart),
  index("tlm_track_id_idx").on(t.trackId),
]);

// ── Fan Scores ────────────────────────────────────────────────────────────────

export const fanScores = pgTable("fan_scores", {
  id:                uuid("id").primaryKey().defaultRandom(),
  fanId:             uuid("fan_id").notNull().unique().references(() => fans.id, { onDelete: "cascade" }),
  artistId:          uuid("artist_id").notNull().references(() => artists.id, { onDelete: "cascade" }),
  ltvScore:          integer("ltv_score").notNull().default(0),
  cluster:           fanClusterEnum("cluster").notNull().default("new"),
  engagement30d:     integer("engagement_30d").notNull().default(0),
  spendPotentialUsd: integer("spend_potential_usd").notNull().default(0),
  telegramConverted: boolean("telegram_converted").notNull().default(false),
  emailConverted:    boolean("email_converted").notNull().default(false),
  lastScoredAt:      timestamp("last_scored_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt:         timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("fan_scores_artist_id_idx").on(t.artistId),
  index("fan_scores_cluster_idx").on(t.cluster),
  index("fan_scores_ltv_idx").on(t.ltvScore),
]);

// ── Fan Locations ─────────────────────────────────────────────────────────────

export const fanLocations = pgTable("fan_locations", {
  id:               uuid("id").primaryKey().defaultRandom(),
  artistId:         uuid("artist_id").notNull().references(() => artists.id, { onDelete: "cascade" }),
  countryCode:      varchar("country_code", { length: 4 }).notNull(),
  country:          varchar("country", { length: 100 }).notNull(),
  city:             varchar("city", { length: 100 }),
  fanCount:         integer("fan_count").notNull().default(0),
  engagementIndex:  integer("engagement_index").notNull().default(0),
  superfanCount:    integer("superfan_count").notNull().default(0),
  telegramCount:    integer("telegram_count").notNull().default(0),
  updatedAt:        timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt:        timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("fan_locations_artist_id_idx").on(t.artistId),
  uniqueIndex("fan_locations_artist_country_city_idx").on(t.artistId, t.countryCode, t.city),
]);

// ── Fan Engagement History ────────────────────────────────────────────────────

export const fanEngagementHistory = pgTable("fan_engagement_history", {
  id:               uuid("id").primaryKey().defaultRandom(),
  fanId:            uuid("fan_id").notNull().references(() => fans.id, { onDelete: "cascade" }),
  weekStart:        date("week_start").notNull(),
  eventsCount:      integer("events_count").notNull().default(0),
  tracksPlayed:     integer("tracks_played").notNull().default(0),
  saves:            integer("saves").notNull().default(0),
  shares:           integer("shares").notNull().default(0),
  campaignOpens:    integer("campaign_opens").notNull().default(0),
  telegramMessages: integer("telegram_messages").notNull().default(0),
  createdAt:        timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("feh_fan_week_idx").on(t.fanId, t.weekStart),
  index("feh_fan_id_idx").on(t.fanId),
]);

// ── New Relations ─────────────────────────────────────────────────────────────

export const royaltyReportsRelations = relations(royaltyReports, ({ one, many }) => ({
  artist:  one(artists,        { fields: [royaltyReports.artistId], references: [artists.id] }),
  entries: many(royaltyEntries),
}));

export const royaltyEntriesRelations = relations(royaltyEntries, ({ one }) => ({
  report: one(royaltyReports, { fields: [royaltyEntries.reportId], references: [royaltyReports.id] }),
  track:  one(tracks,         { fields: [royaltyEntries.trackId],  references: [tracks.id] }),
}));

export const payoutForecastsRelations = relations(payoutForecasts, ({ one }) => ({
  artist: one(artists, { fields: [payoutForecasts.artistId], references: [artists.id] }),
}));

export const musicSupervisorsRelations = relations(musicSupervisors, ({ many }) => ({
  opportunities: many(syncOpportunities),
}));

export const syncOpportunitiesRelations = relations(syncOpportunities, ({ one, many }) => ({
  artist:     one(artists,           { fields: [syncOpportunities.artistId],     references: [artists.id] }),
  supervisor: one(musicSupervisors,  { fields: [syncOpportunities.supervisorId], references: [musicSupervisors.id] }),
  pitches:    many(syncPitches),
}));

export const syncPitchesRelations = relations(syncPitches, ({ one }) => ({
  opportunity: one(syncOpportunities, { fields: [syncPitches.opportunityId], references: [syncOpportunities.id] }),
  track:       one(tracks,            { fields: [syncPitches.trackId],       references: [tracks.id] }),
  artist:      one(artists,           { fields: [syncPitches.artistId],      references: [artists.id] }),
}));

export const trackSyncProfilesRelations = relations(trackSyncProfiles, ({ one }) => ({
  track: one(tracks, { fields: [trackSyncProfiles.trackId], references: [tracks.id] }),
}));

export const releasesRelations = relations(releases, ({ one, many }) => ({
  artist:     one(artists, { fields: [releases.artistId], references: [artists.id] }),
  campaigns:  many(releaseCampaigns),
  assets:     many(releaseAssets),
  checklists: many(releaseChecklists),
}));

export const releaseCampaignsRelations = relations(releaseCampaigns, ({ one }) => ({
  release: one(releases, { fields: [releaseCampaigns.releaseId], references: [releases.id] }),
}));

export const releaseAssetsRelations = relations(releaseAssets, ({ one }) => ({
  release: one(releases, { fields: [releaseAssets.releaseId], references: [releases.id] }),
}));

export const releaseChecklistsRelations = relations(releaseChecklists, ({ one }) => ({
  release: one(releases, { fields: [releaseChecklists.releaseId], references: [releases.id] }),
}));

export const catalogTracksRelations = relations(catalogTracks, ({ one, many }) => ({
  track:           one(tracks,  { fields: [catalogTracks.trackId],  references: [tracks.id] }),
  artist:          one(artists, { fields: [catalogTracks.artistId], references: [artists.id] }),
  lifecycleMetrics: many(trackLifecycleMetrics),
}));

export const catalogInsightsRelations = relations(catalogInsights, ({ one }) => ({
  artist: one(artists, { fields: [catalogInsights.artistId], references: [artists.id] }),
  track:  one(tracks,  { fields: [catalogInsights.trackId],  references: [tracks.id] }),
}));

export const playlistHistoryRelations = relations(playlistHistory, ({ one }) => ({
  track:  one(tracks,  { fields: [playlistHistory.trackId],  references: [tracks.id] }),
  artist: one(artists, { fields: [playlistHistory.artistId], references: [artists.id] }),
}));

export const trackLifecycleMetricsRelations = relations(trackLifecycleMetrics, ({ one }) => ({
  track: one(tracks, { fields: [trackLifecycleMetrics.trackId], references: [tracks.id] }),
}));

export const fanScoresRelations = relations(fanScores, ({ one }) => ({
  fan:    one(fans,    { fields: [fanScores.fanId],    references: [fans.id] }),
  artist: one(artists, { fields: [fanScores.artistId], references: [artists.id] }),
}));

export const fanLocationsRelations = relations(fanLocations, ({ one }) => ({
  artist: one(artists, { fields: [fanLocations.artistId], references: [artists.id] }),
}));

export const fanEngagementHistoryRelations = relations(fanEngagementHistory, ({ one }) => ({
  fan: one(fans, { fields: [fanEngagementHistory.fanId], references: [fans.id] }),
}));

// ── New Type Exports ──────────────────────────────────────────────────────────

export type RoyaltySource          = typeof royaltySources.$inferSelect;
export type InsertRoyaltySource    = typeof royaltySources.$inferInsert;
export type RoyaltyReport          = typeof royaltyReports.$inferSelect;
export type InsertRoyaltyReport    = typeof royaltyReports.$inferInsert;
export type RoyaltyEntry           = typeof royaltyEntries.$inferSelect;
export type InsertRoyaltyEntry     = typeof royaltyEntries.$inferInsert;
export type PayoutForecast         = typeof payoutForecasts.$inferSelect;
export type InsertPayoutForecast   = typeof payoutForecasts.$inferInsert;
export type MusicSupervisor        = typeof musicSupervisors.$inferSelect;
export type InsertMusicSupervisor  = typeof musicSupervisors.$inferInsert;
export type SyncOpportunity        = typeof syncOpportunities.$inferSelect;
export type InsertSyncOpportunity  = typeof syncOpportunities.$inferInsert;
export type SyncPitch              = typeof syncPitches.$inferSelect;
export type InsertSyncPitch        = typeof syncPitches.$inferInsert;
export type TrackSyncProfile       = typeof trackSyncProfiles.$inferSelect;
export type InsertTrackSyncProfile = typeof trackSyncProfiles.$inferInsert;
export type Release                = typeof releases.$inferSelect;
export type InsertRelease          = typeof releases.$inferInsert;
export type ReleaseCampaign        = typeof releaseCampaigns.$inferSelect;
export type ReleaseAsset           = typeof releaseAssets.$inferSelect;
export type ReleaseChecklist       = typeof releaseChecklists.$inferSelect;
export type CatalogTrack           = typeof catalogTracks.$inferSelect;
export type InsertCatalogTrack     = typeof catalogTracks.$inferInsert;
export type CatalogInsight         = typeof catalogInsights.$inferSelect;
export type InsertCatalogInsight   = typeof catalogInsights.$inferInsert;
export type PlaylistHistoryEntry   = typeof playlistHistory.$inferSelect;
export type TrackLifecycleMetric   = typeof trackLifecycleMetrics.$inferSelect;
export type FanScore               = typeof fanScores.$inferSelect;
export type InsertFanScore         = typeof fanScores.$inferInsert;
export type FanLocation            = typeof fanLocations.$inferSelect;
export type InsertFanLocation      = typeof fanLocations.$inferInsert;
export type FanEngagementHistory   = typeof fanEngagementHistory.$inferSelect;
