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
