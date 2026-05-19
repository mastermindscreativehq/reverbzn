// ============================================================
// REVERBZN OS — Database Seed Script
// Run: npx dotenv-cli -e .env.local -- npx tsx src/lib/db/seed.ts
// ============================================================
import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { subDays, format, subWeeks } from "date-fns";
import * as schema from "./schema";

// ── Client (direct connection for seed) ──────────────────────
const client = postgres(process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL ?? "", {
  prepare: false,
});
const db = drizzle(client, { schema });

// ── Helpers ───────────────────────────────────────────────────
function days(n: number) { return subDays(new Date(), n); }
function dStr(n: number) { return format(subDays(new Date(), n), "yyyy-MM-dd"); }
function rand(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function noise(base: number, pct = 0.25) { return Math.max(0, Math.floor(base * (1 - pct + Math.random() * pct * 2))); }

async function seed() {
  console.log("🌱 Starting REVERBZN OS seed...\n");

  // ── 1. ARTIST ──────────────────────────────────────────────
  console.log("Creating artist...");
  const [artist] = await db
    .insert(schema.artists)
    .values({
      name: "ReverbZn",
      slug: "reverbzn",
      bio: "Nigerian-born sonic architect blending Afrobeats, electronic textures, and R&B frequencies into a sound that resonates across continents. ReverbZn is building a movement — one frequency at a time.",
      genres: ["Afrobeats", "Afropop", "Electronic", "R&B", "Soul"],
      primaryMarkets: ["Nigeria", "UK", "United States", "Ghana", "South Africa", "Kenya"],
      releaseStrategy: "Quarterly EPs with consistent single drops every 3-4 weeks",
    })
    .onConflictDoNothing()
    .returning();

  if (!artist) {
    console.log("Artist already exists, fetching...");
    const existing = await db.query.artists.findFirst({ where: (a, { eq }) => eq(a.slug, "reverbzn") });
    if (!existing) throw new Error("Could not create or find artist");
    return runSeedWithArtist(existing);
  }
  await runSeedWithArtist(artist);
}

async function runSeedWithArtist(artist: schema.Artist) {
  const artistId = artist.id;
  console.log(`✓ Artist: ${artist.name} (${artistId})\n`);

  // ── 2. PLATFORMS ───────────────────────────────────────────
  console.log("Creating platforms...");
  const platformRows = await db
    .insert(schema.platforms)
    .values([
      { name: "Spotify",     slug: "spotify",     color: "#1DB954" },
      { name: "Apple Music", slug: "apple_music",  color: "#FA243C" },
      { name: "Audiomack",   slug: "audiomack",    color: "#FFA500" },
      { name: "Boomplay",    slug: "boomplay",     color: "#E2392E" },
      { name: "YouTube",     slug: "youtube",      color: "#FF0000" },
      { name: "SoundCloud",  slug: "soundcloud",   color: "#FF5500" },
    ])
    .onConflictDoNothing()
    .returning();
  console.log(`✓ ${platformRows.length} platforms\n`);

  // ── 3. TRACKS ──────────────────────────────────────────────
  console.log("Creating tracks...");
  const trackData = [
    { title: "Lagos Nights",    slug: "lagos-nights",    relDays: 180, genres: ["Afrobeats"],              dur: 214, plays: 487320, saves: 61400, shares: 12800, mom: 87, brk: 91, rep: 78, ret: 82 },
    { title: "Frequencies",     slug: "frequencies",     relDays: 120, genres: ["Afropop","Electronic"],   dur: 198, plays: 312550, saves: 43200, shares:  9600, mom: 74, brk: 79, rep: 71, ret: 76 },
    { title: "Elevation",       slug: "elevation",       relDays: 240, genres: ["R&B","Soul"],             dur: 226, plays: 198770, saves: 29500, shares:  5400, mom: 58, brk: 62, rep: 65, ret: 68 },
    { title: "Midnight Groove", slug: "midnight-groove", relDays:  90, genres: ["Afrobeats"],              dur: 232, plays: 224880, saves: 31600, shares:  7200, mom: 81, brk: 84, rep: 73, ret: 79 },
    { title: "Echo Chamber",    slug: "echo-chamber",    relDays:  60, genres: ["Alternative","Electronic"],dur: 189, plays: 143290, saves: 21000, shares:  4800, mom: 69, brk: 73, rep: 67, ret: 71 },
    { title: "Wavelength",      slug: "wavelength",      relDays: 150, genres: ["Afropop"],                dur: 208, plays: 267110, saves: 37800, shares:  8100, mom: 76, brk: 80, rep: 69, ret: 74 },
    { title: "Reverb Season",   slug: "reverb-season",   relDays: 210, genres: ["Electronic","Afrobeats"], dur: 221, plays: 156440, saves: 19200, shares:  3900, mom: 52, brk: 55, rep: 58, ret: 62 },
    { title: "Signal Lost",     slug: "signal-lost",     relDays:  30, genres: ["R&B"],                   dur: 194, plays:  89430, saves: 15600, shares:  3200, mom: 88, brk: 92, rep: 84, ret: 77 },
    { title: "Digital Love",    slug: "digital-love",    relDays: 270, genres: ["Afropop"],                dur: 203, plays: 134220, saves: 16800, shares:  3100, mom: 44, brk: 48, rep: 51, ret: 58 },
  ];

  const trackRows = await db
    .insert(schema.tracks)
    .values(trackData.map((t, i) => ({
      artistId,
      title:          t.title,
      slug:           t.slug,
      releaseDate:    dStr(t.relDays),
      status:         "released" as const,
      genres:         t.genres,
      durationSec:    t.dur,
      isrc:           `NGREV240000${i + 1}`,
      totalPlays:     t.plays,
      totalSaves:     t.saves,
      totalShares:    t.shares,
      momentumScore:  t.mom,
      breakoutScore:  t.brk,
      replaySignal:   t.rep,
      retentionProxy: t.ret,
    })))
    .onConflictDoNothing()
    .returning();

  const trackMap = new Map(trackRows.map(t => [t.slug, t]));
  console.log(`✓ ${trackRows.length} tracks\n`);

  // ── 4. PLATFORM TRACK METRICS (last 90 days) ───────────────
  console.log("Creating platform track metrics (90 days × 6 platforms × 9 tracks)...");
  const platformSlugs = ["spotify", "apple_music", "audiomack", "boomplay", "youtube", "soundcloud"] as const;

  // Revenue per stream estimates (USD)
  const rpmMap: Record<string, number> = {
    spotify: 0.004, apple_music: 0.005, audiomack: 0.002,
    boomplay: 0.002, youtube: 0.003, soundcloud: 0.001,
  };

  // Distribution weights per platform
  const platformWeights: Record<string, number> = {
    spotify: 0.35, apple_music: 0.08, audiomack: 0.26,
    boomplay: 0.15, youtube: 0.12, soundcloud: 0.04,
  };

  const ptmRows: schema.InsertPlatformTrackMetric[] = [];
  for (const track of trackData.slice(0, 5)) { // top 5 tracks get full history
    const trackRow = trackMap.get(track.slug);
    if (!trackRow) continue;
    const dailyBase = Math.floor(track.plays / 90);

    for (let d = 89; d >= 0; d--) {
      for (const pSlug of platformSlugs) {
        const weight = platformWeights[pSlug];
        const dayPlays = noise(dailyBase * weight, 0.3);
        const rpm = rpmMap[pSlug];
        ptmRows.push({
          trackId:            trackRow.id,
          platformSlug:       pSlug,
          date:               dStr(d),
          plays:              dayPlays,
          streams:            dayPlays,
          saves:              Math.floor(dayPlays * 0.126),
          listeners:          Math.floor(dayPlays * 0.78),
          revenueEstimateUsd: String((dayPlays * rpm).toFixed(4)),
        });
      }
    }
  }

  // Insert in batches of 500
  for (let i = 0; i < ptmRows.length; i += 500) {
    await db.insert(schema.platformTrackMetricsDaily).values(ptmRows.slice(i, i + 500)).onConflictDoNothing();
  }
  console.log(`✓ ${ptmRows.length} platform track metric rows\n`);

  // ── 5. REGION METRICS (last 90 days) ───────────────────────
  console.log("Creating region metrics (90 days × 8 countries)...");
  const regionData = [
    { cc: "NG", country: "Nigeria",        cities: ["Lagos","Abuja","Port Harcourt"], basePlays: 12400, growth: 0.14 },
    { cc: "GH", country: "Ghana",          cities: ["Accra","Kumasi"],                basePlays:  3460, growth: 0.22 },
    { cc: "GB", country: "United Kingdom", cities: ["London","Manchester"],           basePlays:  3180, growth: 0.09 },
    { cc: "US", country: "United States",  cities: ["New York","Atlanta","Houston"],  basePlays:  2200, growth: 0.07 },
    { cc: "KE", country: "Kenya",          cities: ["Nairobi","Mombasa"],            basePlays:  1730, growth: 0.31 },
    { cc: "ZA", country: "South Africa",   cities: ["Johannesburg","Cape Town"],     basePlays:  1490, growth: 0.17 },
    { cc: "CA", country: "Canada",         cities: ["Toronto","Vancouver"],          basePlays:   990, growth: 0.11 },
    { cc: "DE", country: "Germany",        cities: ["Berlin","Frankfurt"],           basePlays:   498, growth: 0.19 },
  ];

  const prmRows: schema.InsertPlatformRegionMetric[] = [];
  for (let d = 89; d >= 0; d--) {
    for (const region of regionData) {
      const dayFactor = Math.pow(1 + region.growth / 90, 89 - d);
      for (const pSlug of ["spotify", "audiomack", "boomplay"] as const) {
        const pWeight = pSlug === "spotify" ? 0.4 : pSlug === "audiomack" ? 0.35 : 0.25;
        const plays = noise(Math.floor(region.basePlays * pWeight * dayFactor), 0.3);
        prmRows.push({
          artistId:     artistId,
          platformSlug: pSlug,
          date:         dStr(d),
          countryCode:  region.cc,
          country:      region.country,
          city:         region.cities[d % region.cities.length],
          plays,
          listeners:    Math.floor(plays * 0.78),
          saves:        Math.floor(plays * 0.13),
        });
      }
    }
  }

  for (let i = 0; i < prmRows.length; i += 500) {
    await db.insert(schema.platformRegionMetricsDaily).values(prmRows.slice(i, i + 500)).onConflictDoNothing();
  }
  console.log(`✓ ${prmRows.length} region metric rows\n`);

  // ── 6. FANS ────────────────────────────────────────────────
  console.log("Creating fans...");
  const lagosNights = trackMap.get("lagos-nights")!;
  const signalLost  = trackMap.get("signal-lost")!;
  const frequencies = trackMap.get("frequencies")!;
  const wavelength  = trackMap.get("wavelength")!;
  const elevation   = trackMap.get("elevation")!;
  const mdGroove    = trackMap.get("midnight-groove")!;

  const fanRows = await db
    .insert(schema.fans)
    .values([
      { artistId, displayName: "Adaeze Okonkwo",  email: "adaeze@gmail.com",       country: "Nigeria",        city: "Lagos",        countryCode: "NG", sourcePlatform: "audiomack",   favoriteTrackId: lagosNights.id, channels: ["email","telegram"], engagementScore: 94, superfanScore: 89, tags: ["superfan","early-adopter","lagos"],    segments: ["superfans","lagos-crew"],     joinedAt: days(180), lastActiveAt: days(1),  notes: "Attended virtual listening session. Very vocal on social." },
      { artistId, displayName: "Kwame Asante",     email: "kwame.asante@outlook.com", telegramId: "@kwameasante", country: "Ghana", city: "Accra", countryCode: "GH", sourcePlatform: "spotify",  favoriteTrackId: mdGroove.id,    channels: ["email","telegram"], engagementScore: 87, superfanScore: 81, tags: ["ghana-plug","afrobeats-head"],         segments: ["ghana-crew","active-fans"],   joinedAt: days(142), lastActiveAt: days(3),  notes: "Shares every release to his network in Accra." },
      { artistId, displayName: "Priya Sharma",     email: "priya.s@proton.me",       country: "United Kingdom", city: "London",  countryCode: "GB", sourcePlatform: "spotify",   favoriteTrackId: frequencies.id,  channels: ["email"],           engagementScore: 79, superfanScore: 71, tags: ["uk-diaspora","electronic-fan"],        segments: ["uk-fans","email-list"],       joinedAt: days(98),  lastActiveAt: days(7),  notes: "Found via Spotify editorial. High playlist-add rate." },
      { artistId, displayName: "Temi Adeyemi",     email: "temiade@yahoo.com",        telegramId: "@temiade",   country: "Nigeria", city: "Abuja", countryCode: "NG", sourcePlatform: "boomplay",  favoriteTrackId: lagosNights.id,  channels: ["telegram","email"], engagementScore: 91, superfanScore: 86, tags: ["superfan","abuja","repeat-listener"],  segments: ["superfans","nigeria-core"],   joinedAt: days(165), lastActiveAt: days(2),  notes: "Streams Lagos Nights daily. Joined telegram same day as release." },
      { artistId, displayName: "Marcus Thompson",                                                                 country: "United States", city: "Atlanta", countryCode: "US", sourcePlatform: "spotify",  favoriteTrackId: lagosNights.id,  channels: ["email"],           engagementScore: 68, superfanScore: 58, tags: ["atlanta","us-market","afrobeats-curious"], segments: ["us-fans"],                   joinedAt: days(77),  lastActiveAt: days(14), notes: "Came from Afrobeats Atlanta playlist feature." },
      { artistId, displayName: "Amara Diallo",                                         telegramId: "@amarad",     country: "Kenya", city: "Nairobi", countryCode: "KE", sourcePlatform: "audiomack", favoriteTrackId: signalLost.id,   channels: ["telegram"],        engagementScore: 88, superfanScore: 83, tags: ["kenya-breakout","new-fan","superfan"],  segments: ["kenya-fans","active-fans","superfans"], joinedAt: days(28), lastActiveAt: days(1),  notes: "New but high engagement. Signal Lost her entry track." },
      { artistId, displayName: "Olumide Bello",    email: "olumide.b@gmail.com",      telegramId: "@olumideb",   country: "Nigeria", city: "Lagos", countryCode: "NG", sourcePlatform: "audiomack", favoriteTrackId: wavelength.id,   channels: ["email","telegram"], engagementScore: 82, superfanScore: 75, tags: ["lagos","producer-curious"],            segments: ["lagos-crew","active-fans"],   joinedAt: days(134), lastActiveAt: days(5),  notes: "Asks about production credits. Possibly a producer." },
      { artistId, displayName: "Sophie Chen",      email: "sophie.chen@gmail.com",                               country: "United Kingdom", city: "London", countryCode: "GB", sourcePlatform: "youtube",  favoriteTrackId: null,            channels: ["email"],           engagementScore: 61, superfanScore: 49, tags: ["uk-electronic","youtube-discovery"],   segments: ["uk-fans"],                   joinedAt: days(45),  lastActiveAt: days(22), notes: "Discovered via YouTube algorithm. Irregular activity." },
      { artistId, displayName: "Chidi Okafor",     email: "chidi.okafor@gmail.com",                              country: "Nigeria", city: "Port Harcourt", countryCode: "NG", sourcePlatform: "audiomack", favoriteTrackId: elevation.id,  channels: ["email"],           engagementScore: 73, superfanScore: 66, tags: ["nigeria","rb-fan"],                    segments: ["nigeria-core"],              joinedAt: days(210), lastActiveAt: days(9),  notes: "Long-time fan. Active around release periods." },
      { artistId, displayName: "Kefilwe Mokoena",  email: "k.mokoena@gmail.com",                                 country: "South Africa", city: "Johannesburg", countryCode: "ZA", sourcePlatform: "spotify",  favoriteTrackId: wavelength.id,   channels: ["email"],           engagementScore: 76, superfanScore: 69, tags: ["sa-market","johannesburg","afropop"],  segments: ["sa-fans","active-fans"],     joinedAt: days(112), lastActiveAt: days(6),  notes: "Spotted the Wavelength Amapiano-crossover potential. High saves." },
    ])
    .onConflictDoNothing()
    .returning();
  console.log(`✓ ${fanRows.length} fans\n`);

  // ── 7. FAN SEGMENTS ────────────────────────────────────────
  console.log("Creating fan segments...");
  const segmentRows = await db
    .insert(schema.fanSegments)
    .values([
      { artistId, name: "Superfans",     description: "Fans with superfan score > 75",         rules: [{ field: "superfanScore", operator: "gt", value: 75 }],             memberCount: 4,  createdAt: days(150), updatedAt: days(0) },
      { artistId, name: "Active Fans",   description: "Last active within 14 days",            rules: [{ field: "lastActiveDays", operator: "lt", value: 14 }],            memberCount: 7,  createdAt: days(100), updatedAt: days(0) },
      { artistId, name: "Nigeria Core",  description: "Fans from Nigeria",                     rules: [{ field: "country", operator: "eq", value: "Nigeria" }],            memberCount: 4,  createdAt: days(200), updatedAt: days(0) },
      { artistId, name: "UK Fans",       description: "Fans from United Kingdom",              rules: [{ field: "country", operator: "eq", value: "United Kingdom" }],     memberCount: 2,  createdAt: days(90),  updatedAt: days(0) },
      { artistId, name: "Email List",    description: "Fans with verified email",              rules: [{ field: "channels", operator: "contains", value: "email" }],       memberCount: 8,  createdAt: days(200), updatedAt: days(0) },
      { artistId, name: "Telegram Crew", description: "Fans on Telegram channel",             rules: [{ field: "channels", operator: "contains", value: "telegram" }],    memberCount: 5,  createdAt: days(120), updatedAt: days(0) },
      { artistId, name: "Kenya Fans",    description: "Fans from Kenya — fastest growing market", rules: [{ field: "country", operator: "eq", value: "Kenya" }],           memberCount: 1,  createdAt: days(30),  updatedAt: days(0) },
    ])
    .onConflictDoNothing()
    .returning();
  const segMap = new Map(segmentRows.map(s => [s.name, s]));
  console.log(`✓ ${segmentRows.length} segments\n`);

  // ── 8. FAN EVENTS ──────────────────────────────────────────
  console.log("Creating fan events...");
  const fanMap = new Map(fanRows.map(f => [f.displayName, f]));
  const eventRows: schema.InsertFanEvent[] = [];

  // Generate realistic event history per fan
  for (const fan of fanRows) {
    const trackIds = [lagosNights.id, frequencies.id, mdGroove.id, signalLost.id];
    const pSlugs  = ["spotify","audiomack","boomplay"] as const;
    const numEvents = rand(4, 12);
    for (let e = 0; e < numEvents; e++) {
      const evTypes: schema.InsertFanEvent["eventType"][] = [
        "song_played","full_track_listened","song_saved","song_shared","smart_link_clicked"
      ];
      eventRows.push({
        artistId,
        fanId:        fan.id,
        eventType:    evTypes[e % evTypes.length],
        trackId:      trackIds[e % trackIds.length],
        platformSlug: pSlugs[e % pSlugs.length],
        countryCode:  fan.countryCode ?? undefined,
        country:      fan.country ?? undefined,
        city:         fan.city ?? undefined,
        occurredAt:   days(rand(0, 60)),
      });
    }
  }

  // Community conversion events
  for (const fan of fanRows) {
    if (fan.channels.includes("email")) {
      eventRows.push({ artistId, fanId: fan.id, eventType: "email_opted_in", country: fan.country ?? undefined, occurredAt: fan.joinedAt });
    }
    if (fan.channels.includes("telegram")) {
      eventRows.push({ artistId, fanId: fan.id, eventType: "telegram_joined", country: fan.country ?? undefined, occurredAt: fan.joinedAt });
    }
  }

  await db.insert(schema.fanEvents).values(eventRows).onConflictDoNothing();
  console.log(`✓ ${eventRows.length} fan events\n`);

  // ── 9. SMART LINKS ─────────────────────────────────────────
  console.log("Creating smart links...");
  const slRows = await db
    .insert(schema.smartLinks)
    .values([
      {
        artistId, trackId: lagosNights.id,
        title: "Lagos Nights — Stream Everywhere", slug: "lagos-nights",
        externalUrl: "https://reverbzn.lnk.to/lagos-nights",
        platformLinks: [
          { platformSlug: "spotify",     url: "https://open.spotify.com/track/lagos-nights-example" },
          { platformSlug: "apple_music", url: "https://music.apple.com/track/lagos-nights-example" },
          { platformSlug: "audiomack",   url: "https://audiomack.com/reverbzn/song/lagos-nights" },
          { platformSlug: "boomplay",    url: "https://www.boomplay.com/songs/lagos-nights-example" },
          { platformSlug: "youtube",     url: "https://youtube.com/watch?v=lagos-nights-example" },
        ],
        totalClicks: 24880, totalConversions: 18640, conversionRate: "74.90", isActive: true,
        createdAt: days(180), updatedAt: days(0),
      },
      {
        artistId, trackId: signalLost.id,
        title: "Signal Lost — New Single", slug: "signal-lost",
        externalUrl: "https://reverbzn.lnk.to/signal-lost",
        platformLinks: [
          { platformSlug: "spotify",     url: "https://open.spotify.com/track/signal-lost-example" },
          { platformSlug: "apple_music", url: "https://music.apple.com/track/signal-lost-example" },
          { platformSlug: "audiomack",   url: "https://audiomack.com/reverbzn/song/signal-lost" },
          { platformSlug: "boomplay",    url: "https://www.boomplay.com/songs/signal-lost-example" },
        ],
        totalClicks: 8440, totalConversions: 6120, conversionRate: "72.51", isActive: true,
        createdAt: days(30), updatedAt: days(0),
      },
      {
        artistId, trackId: frequencies.id,
        title: "Frequencies — Stream Now", slug: "frequencies",
        externalUrl: "https://reverbzn.lnk.to/frequencies",
        platformLinks: [
          { platformSlug: "spotify",     url: "https://open.spotify.com/track/frequencies-example" },
          { platformSlug: "apple_music", url: "https://music.apple.com/track/frequencies-example" },
          { platformSlug: "audiomack",   url: "https://audiomack.com/reverbzn/song/frequencies" },
          { platformSlug: "youtube",     url: "https://youtube.com/watch?v=frequencies-example" },
        ],
        totalClicks: 11230, totalConversions: 7840, conversionRate: "69.81", isActive: true,
        createdAt: days(120), updatedAt: days(0),
      },
      {
        artistId,
        title: "Join The ReverbZn Community", slug: "community",
        externalUrl: "https://reverbzn.lnk.to/community",
        platformLinks: [],
        totalClicks: 6220, totalConversions: 3110, conversionRate: "50.00", isActive: true,
        createdAt: days(200), updatedAt: days(0),
      },
    ])
    .onConflictDoNothing()
    .returning();
  console.log(`✓ ${slRows.length} smart links\n`);

  // ── 10. CAMPAIGNS ──────────────────────────────────────────
  console.log("Creating campaigns...");
  const emailSeg    = segMap.get("Email List");
  const telegramSeg = segMap.get("Telegram Crew");
  const kenyaSeg    = segMap.get("Kenya Fans");
  const superfanSeg = segMap.get("Superfans");

  await db
    .insert(schema.campaigns)
    .values([
      {
        artistId, name: "Signal Lost — Launch Push", template: "new_release", status: "completed", channel: "email",
        targetSegmentId: emailSeg?.id, message: "🔊 Signal Lost is OUT NOW. This one's for you. Stream it everywhere — you already know where to find it.",
        scheduledAt: days(30), sentAt: days(30), recipientCount: 8, openCount: 7, clickCount: 6, conversionCount: 5,
        openRate: "87.50", clickRate: "75.00", conversionRate: "62.50", createdAt: days(32), updatedAt: days(30),
      },
      {
        artistId, name: "Lagos Nights — Breakout Song Push", template: "breakout_push", status: "completed", channel: "telegram",
        targetSegmentId: telegramSeg?.id, message: "Lagos Nights has been breaking walls 🔥 Share this to someone who needs to hear it. Help us crack 500K.",
        scheduledAt: days(60), sentAt: days(60), recipientCount: 5, openCount: 5, clickCount: 4, conversionCount: 3,
        openRate: "100.00", clickRate: "80.00", conversionRate: "60.00", createdAt: days(62), updatedAt: days(60),
      },
      {
        artistId, name: "Kenya Fanbase Activation", template: "city_activation", status: "active", channel: "telegram",
        targetSegmentId: kenyaSeg?.id, message: "Nairobi is VIBRATING to ReverbZn 🇰🇪 Be the first to stream Signal Lost and share with your crew. We see you!",
        scheduledAt: days(2), recipientCount: 1, openCount: 1, clickCount: 1, conversionCount: 1,
        openRate: "100.00", clickRate: "100.00", conversionRate: "100.00", createdAt: days(3), updatedAt: days(2),
      },
      {
        artistId, name: "Dormant Fan Reactivation", template: "dormant_reactivation", status: "completed", channel: "email",
        targetSegmentId: emailSeg?.id, message: "Hey — it's been a minute. You probably missed the drop. Here's what you need to hear this week 👇",
        scheduledAt: days(90), sentAt: days(90), recipientCount: 3, openCount: 2, clickCount: 1, conversionCount: 1,
        openRate: "66.70", clickRate: "33.30", conversionRate: "33.30", createdAt: days(92), updatedAt: days(90),
      },
      {
        artistId, name: "Frequencies — Exclusive Early Access", template: "exclusive_drop", status: "completed", channel: "email",
        targetSegmentId: superfanSeg?.id, message: "You're on the inside. Frequencies drops midnight tonight — you're hearing it first. Link's live 🔑",
        scheduledAt: days(121), sentAt: days(121), recipientCount: 4, openCount: 4, clickCount: 4, conversionCount: 4,
        openRate: "100.00", clickRate: "100.00", conversionRate: "100.00", createdAt: days(122), updatedAt: days(121),
      },
    ])
    .onConflictDoNothing();
  console.log("✓ 5 campaigns\n");

  // ── 11. AUTOMATIONS ────────────────────────────────────────
  console.log("Creating automations...");
  const autoRows = await db
    .insert(schema.automations)
    .values([
      {
        artistId, type: "spike_detector", name: "Spike Detector",
        description: "Monitors all platforms every 6 hours for unusual stream spikes (>20% in any 6h window). Alerts via Telegram and triggers promotional push.",
        status: "active", isEnabled: true, thresholds: { spikePercent: 20, windowHours: 6 },
        lastRunAt: days(7), nextRunAt: days(-1), lastRunStatus: "skipped", runCount: 84, successCount: 12,
        createdAt: days(200), updatedAt: days(7),
      },
      {
        artistId, type: "city_capture", name: "City Capture",
        description: "Detects breakout cities (>100% WoW stream growth) and auto-generates a city-specific fan activation campaign.",
        status: "active", isEnabled: true, thresholds: { weeklyGrowthPct: 100, minimumPlays: 500 },
        lastRunAt: days(20), nextRunAt: days(-1), lastRunStatus: "success", runCount: 21, successCount: 3,
        createdAt: days(200), updatedAt: days(20),
      },
      {
        artistId, type: "save_to_community", name: "Save → Community Funnel",
        description: "When a fan saves 3+ songs, trigger smart link to join email/telegram community. Converts passive listeners into owned audience.",
        status: "active", isEnabled: true, thresholds: { minSaves: 3, windowDays: 14 },
        lastRunAt: days(3), nextRunAt: days(0), lastRunStatus: "success", runCount: 42, successCount: 28,
        createdAt: days(200), updatedAt: days(3),
      },
      {
        artistId, type: "dormant_reactivation", name: "Dormant Fan Reactivation",
        description: "Identifies fans inactive for >30 days. Sends personalized re-engagement email with their most-played track and a new song recommendation.",
        status: "paused", isEnabled: false, thresholds: { inactiveDays: 30, emailCooldownDays: 60 },
        lastRunAt: days(90), lastRunStatus: "success", runCount: 8, successCount: 7,
        createdAt: days(200), updatedAt: days(90),
      },
      {
        artistId, type: "release_orchestrator", name: "Release Orchestrator",
        description: "Full release sequence automation: pre-save campaign, day-of announcement, 3-day push, week-two analysis.",
        status: "active", isEnabled: true, thresholds: { preSaveDays: 7, analysisDay: 14 },
        lastRunAt: days(30), lastRunStatus: "success", runCount: 3, successCount: 3,
        createdAt: days(200), updatedAt: days(30),
      },
    ])
    .onConflictDoNothing()
    .returning();

  // Automation run logs
  if (autoRows.length > 0) {
    const spikeAuto = autoRows.find(a => a.type === "spike_detector");
    const cityAuto  = autoRows.find(a => a.type === "city_capture");
    const saveAuto  = autoRows.find(a => a.type === "save_to_community");
    const dormAuto  = autoRows.find(a => a.type === "dormant_reactivation");

    const runLogs: schema.InsertAutomationRun[] = [];
    if (spikeAuto) {
      runLogs.push(
        { automationId: spikeAuto.id, status: "success", message: "Spike detected on Lagos Nights — +31% in 6h. Telegram alert sent.", details: { track: "Lagos Nights", platform: "audiomack", spikePercent: 31 }, runAt: days(14), durationMs: 1240 },
        { automationId: spikeAuto.id, status: "skipped", message: "No spike detected. Max increase: 4.2%.", runAt: days(7), durationMs: 890 },
      );
    }
    if (cityAuto) {
      runLogs.push({ automationId: cityAuto.id, status: "success", message: "Nairobi breakout detected. Signal Lost +142% WoW. City capture campaign queued.", details: { city: "Nairobi", country: "Kenya", growthPct: 142, track: "Signal Lost" }, runAt: days(20), durationMs: 2100 });
    }
    if (saveAuto) {
      runLogs.push({ automationId: saveAuto.id, status: "success", message: "14 high-save events processed. 3 fans moved to email opt-in funnel.", details: { highSaveEvents: 14, funnelEntered: 3, converted: 1 }, runAt: days(3), durationMs: 1560 });
    }
    if (dormAuto) {
      runLogs.push({ automationId: dormAuto.id, status: "success", message: "22 dormant fans identified (>30 days inactive). Reactivation email queued.", details: { dormantFans: 22, emailsQueued: 22, opens: 14, reclicks: 9 }, runAt: days(90), durationMs: 3200 });
    }
    if (runLogs.length) await db.insert(schema.automationRuns).values(runLogs).onConflictDoNothing();
  }
  console.log(`✓ ${autoRows.length} automations + run logs\n`);

  // ── 12. INSIGHTS ───────────────────────────────────────────
  console.log("Creating insights...");
  await db
    .insert(schema.insights)
    .values([
      {
        artistId, type: "opportunity", priority: "critical",
        title: "Kenya Is Breaking — Move Now",
        message: "Nairobi streams grew 142% week-over-week. Signal Lost is going viral there organically.",
        explanation: "Kenya was not in the top 5 markets last month. This week it jumped to #5 with 31K plays. Signal Lost is the engine — save rate is 3x your average in Nairobi. This is a genuine organic breakout, not a fluke.",
        recommendedAction: "Launch a Kenya-specific campaign this week. Personalize the message for Nairobi. Add local hashtags. Contact Kenyan Afrobeats playlist curators immediately.",
        actionLabel: "Launch Kenya Campaign", actionUrl: "/campaigns",
        isRead: false, isDismissed: false, createdAt: days(1), updatedAt: days(1),
      },
      {
        artistId, type: "money", priority: "high",
        title: "Audiomack Revenue Underperforming vs Streams",
        message: "Audiomack drives 29% of total streams but only 16% of estimated revenue. The RPM gap is significant.",
        explanation: "Your Audiomack RPM is $0.002 vs Spotify's $0.004. You are heavily indexed on Audiomack in Nigeria and Ghana — markets where RPM is structurally lower.",
        recommendedAction: "Shift 20% of Nigeria promo budget toward Spotify and Apple Music playlist targeting.",
        actionLabel: "See Platform Analytics", actionUrl: "/platforms",
        isRead: false, isDismissed: false, createdAt: days(2), updatedAt: days(2),
      },
      {
        artistId, type: "pattern", priority: "high",
        title: "Signal Lost Has Fastest 30-Day Velocity Ever",
        message: "Signal Lost is tracking 2.3x faster than Lagos Nights in its first 30 days.",
        explanation: "At 30 days post-release, Signal Lost has 89K plays versus Lagos Nights' 38K at the same point. The saves/plays ratio is 17.4% vs your catalog average of 12.6%.",
        recommendedAction: "Signal Lost needs a second promotional push NOW. Run the breakout push campaign template.",
        actionLabel: "Launch Breakout Push", actionUrl: "/campaigns",
        isRead: false, isDismissed: false, createdAt: days(1), updatedAt: days(1),
      },
      {
        artistId, type: "fan", priority: "medium",
        title: "5 High-Engagement Fans Have No Telegram",
        message: "You have 5 fans with engagement scores >70 who are not on Telegram yet.",
        explanation: "These fans are actively listening and saving but haven't joined your owned channel. Telegram fans have 4x higher re-engagement rates when a new release drops.",
        recommendedAction: "Send a personalized invite to join the Telegram community to these 5 fans via email.",
        actionLabel: "View These Fans", actionUrl: "/fans",
        isRead: true, isDismissed: false, createdAt: days(3), updatedAt: days(3),
      },
      {
        artistId, type: "alert", priority: "high",
        title: "Reverb Season & Digital Love Are Going Cold",
        message: "Two tracks showing >40% stream decline over 60 days with no playlist activity.",
        explanation: "Reverb Season and Digital Love have both lost playlist momentum and are receiving minimal organic discovery. Without intervention, they'll enter long-tail dormancy.",
        recommendedAction: "Create a 'catalog discovery' smart link featuring both tracks. Pitch to editorial playlists that cover back-catalog.",
        actionLabel: "View Tracks", actionUrl: "/tracks",
        isRead: false, isDismissed: false, createdAt: days(5), updatedAt: days(5),
      },
      {
        artistId, type: "content", priority: "medium",
        title: "Zero Content Posted This Week",
        message: "No content activity detected for 7 days. Fan engagement drops 23% after 5-day content gaps.",
        explanation: "Based on historical data, fan engagement (saves, shares, smart link clicks) drops an average of 23% after content gaps of 5+ days. You're currently at day 7.",
        recommendedAction: "Post at minimum one piece of content today: a behind-the-scenes clip of Signal Lost, a short vocal snippet, or a track appreciation post.",
        actionLabel: "Content Ideas", actionUrl: "/insights",
        isRead: false, isDismissed: false, createdAt: days(0), updatedAt: days(0),
      },
      {
        artistId, type: "opportunity", priority: "medium",
        title: "Atlanta Showing Consistent Growth",
        message: "Atlanta streams have grown 8 consecutive weeks. Afrobeats scene there is primed.",
        explanation: "Atlanta has shown steady WoW stream growth for 8 straight weeks, primarily driven by Lagos Nights and Midnight Groove.",
        recommendedAction: "Submit Lagos Nights and Midnight Groove to Atlanta Afrobeats curators. Consider scheduling a social post timed to Atlanta prime hours.",
        actionLabel: "View Region Data", actionUrl: "/regions",
        isRead: true, isDismissed: false, createdAt: days(4), updatedAt: days(4),
      },
    ])
    .onConflictDoNothing();
  console.log("✓ 7 insights\n");

  // ── 13. NOTIFICATIONS ──────────────────────────────────────
  console.log("Creating notifications...");
  await db
    .insert(schema.notifications)
    .values([
      { artistId, type: "track_milestone", priority: "high",   title: "Lagos Nights Hit 400K Streams! 🎯",          message: "Lagos Nights crossed 400,000 total streams today. Your biggest milestone yet.",                               isRead: false, createdAt: days(14), actionUrl: "/tracks/lagos-nights" },
      { artistId, type: "automation_alert", priority: "high",  title: "City Capture: Nairobi Breakout Detected",     message: "Signal Lost grew 142% WoW in Nairobi. A city activation campaign has been queued automatically.",          isRead: false, createdAt: days(20), actionUrl: "/automations" },
      { artistId, type: "campaign_alert",  priority: "medium", title: "Signal Lost Launch Campaign — Completed",     message: "Email campaign sent to 8 fans. 87.5% open rate. 5 conversions recorded.",                                    isRead: true,  createdAt: days(30), actionUrl: "/campaigns" },
      { artistId, type: "fan_milestone",   priority: "medium", title: "10th Fan Joined Community",                   message: "Kefilwe Mokoena joined via email from South Africa. Community growing across 7 countries.",                   isRead: true,  createdAt: days(42), actionUrl: "/fans" },
      { artistId, type: "weekly_summary",  priority: "low",    title: "Weekly Summary — Strong Growth Week",         message: "This week: +12.4% streams, 3 new fans, 1 active campaign, 2 automation successes. Momentum score: 87.",      isRead: false, createdAt: days(7),  actionUrl: "/dashboard" },
      { artistId, type: "anomaly",         priority: "high",   title: "Unusual Stream Spike — Lagos Nights",         message: "Lagos Nights received 8,400 streams in 6 hours on Audiomack — 3.1x your daily average.",                     isRead: true,  createdAt: days(14), actionUrl: "/tracks/lagos-nights" },
      { artistId, type: "track_milestone", priority: "medium", title: "Signal Lost: 1,000 Saves Milestone",          message: "Signal Lost has been saved by 1,000 listeners. Exceptional performance for a track 30 days old.",             isRead: false, createdAt: days(5),  actionUrl: "/tracks/signal-lost" },
    ])
    .onConflictDoNothing();
  console.log("✓ 7 notifications\n");

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✅ REVERBZN OS seed complete!");
  console.log(`   Artist ID: ${artistId}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
}).finally(() => {
  process.exit(0);
});
