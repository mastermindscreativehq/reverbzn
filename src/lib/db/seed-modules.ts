// ============================================================
// REVERBZN OS — Artist Intelligence Modules Seed
// Run: npx dotenv-cli -e .env.local -- npx tsx src/lib/db/seed-modules.ts
// ============================================================
import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { subDays, format, addDays, subWeeks, startOfWeek } from "date-fns";
import * as schema from "./schema";
import { eq } from "drizzle-orm";

const client = postgres(process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL ?? "", {
  prepare: false,
});
const db = drizzle(client, { schema });

function dStr(n: number) { return format(subDays(new Date(), n), "yyyy-MM-dd"); }
function fStr(d: Date)   { return format(d, "yyyy-MM-dd"); }
function rand(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function noise(base: number, pct = 0.2) { return Math.max(0, Math.floor(base * (1 - pct + Math.random() * pct * 2))); }

async function seedModules() {
  console.log("🌱 Starting REVERBZN OS Modules seed...\n");

  const artist = await db.query.artists.findFirst({
    where: eq(schema.artists.slug, "reverbzn"),
  });
  if (!artist) throw new Error("Artist not found — run npm run db:seed first");
  const artistId = artist.id;

  const allTracks = await db.query.tracks.findMany({
    where: eq(schema.tracks.artistId, artistId),
  });
  const trackMap = new Map(allTracks.map(t => [t.slug, t]));

  console.log(`✓ Found artist: ${artist.name}, ${allTracks.length} tracks\n`);

  // ── ROYALTIES ──────────────────────────────────────────────

  console.log("Seeding royalty sources...");
  const sources = await db.insert(schema.royaltySources).values([
    { artistId, platformSlug: "spotify",     sourceName: "Spotify Streaming",         payoutModel: "Pro-rata pool",       rpm: "0.00384" },
    { artistId, platformSlug: "spotify",     sourceName: "Spotify US Premium",        payoutModel: "Subscription-based",  rpm: "0.00512", territory: "US"  },
    { artistId, platformSlug: "apple_music", sourceName: "Apple Music Streaming",     payoutModel: "Subscription-based",  rpm: "0.00504" },
    { artistId, platformSlug: "audiomack",   sourceName: "Audiomack Streaming",       payoutModel: "Per-stream rate",     rpm: "0.00274" },
    { artistId, platformSlug: "boomplay",    sourceName: "Boomplay Africa",           payoutModel: "Per-stream rate",     rpm: "0.00200", territory: "AF"  },
    { artistId, platformSlug: "youtube",     sourceName: "YouTube Content ID",        payoutModel: "Content ID split",    rpm: "0.00131" },
    { artistId, platformSlug: "soundcloud",  sourceName: "SoundCloud Fan-Powered",    payoutModel: "Fan-powered royalties", rpm: "0.00086" },
  ]).onConflictDoNothing().returning();
  console.log(`✓ ${sources.length} royalty sources\n`);

  console.log("Seeding royalty reports (12 months)...");
  const monthlyRevenue = [1820, 2140, 1980, 2460, 2310, 2780, 3120, 2650, 2940, 3280, 2870, 2847];
  const monthLabels = [
    "Jun 2024","Jul 2024","Aug 2024","Sep 2024","Oct 2024","Nov 2024",
    "Dec 2024","Jan 2025","Feb 2025","Mar 2025","Apr 2025","May 2025",
  ];
  const topPlatforms = ["Audiomack","Spotify","Audiomack","Boomplay","Spotify","Spotify","Spotify","Audiomack","Spotify","Spotify","Spotify","Audiomack"];
  const topTracks = ["Lagos Nights","Frequencies","Lagos Nights","Elevation","Wavelength","Frequencies","Lagos Nights","Wavelength","Midnight Groove","Lagos Nights","Signal Lost","Lagos Nights"];
  const statuses: Array<"paid"|"confirmed"|"processing"> = [
    "paid","paid","paid","paid","paid","paid","paid","paid","paid","paid","confirmed","processing"
  ];

  const reportRows: schema.InsertRoyaltyReport[] = [];
  for (let m = 0; m < 12; m++) {
    const periodStart = fStr(new Date(2024, 5 + m, 1));
    const periodEnd   = fStr(new Date(2024, 5 + m + 1, 0));
    reportRows.push({
      artistId,
      periodLabel:    monthLabels[m],
      periodStart,
      periodEnd,
      totalUsd:       String(monthlyRevenue[m].toFixed(4)),
      status:         statuses[m],
      entryCount:     rand(36, 62),
      topPlatform:    topPlatforms[m],
      topTrackTitle:  topTracks[m],
    });
  }
  const reports = await db.insert(schema.royaltyReports).values(reportRows).onConflictDoNothing().returning();
  console.log(`✓ ${reports.length} royalty reports\n`);

  console.log("Seeding payout forecasts...");
  await db.insert(schema.payoutForecasts).values([
    { artistId, periodLabel: "Jun 2025", forecastUsd: "3050", lowUsd: "2600", highUsd: "3480", confidencePct: 84, basisNote: "Based on 90-day trend + Signal Lost momentum", factors: ["Signal Lost breakout trajectory", "Midnight Groove EP launch", "Afrobeats seasonal bump"] },
    { artistId, periodLabel: "Jul 2025", forecastUsd: "3210", lowUsd: "2750", highUsd: "3720", confidencePct: 72, basisNote: "EP release impact + summer streaming uplift", factors: ["Midnight Groove EP full rollout", "UK summer streaming peak", "Editorial playlist potential"] },
    { artistId, periodLabel: "Aug 2025", forecastUsd: "3380", lowUsd: "2900", highUsd: "4010", confidencePct: 61, basisNote: "Post-EP long tail + new single prep", factors: ["EP long tail", "FIFA 26 potential sync", "German market activation"] },
  ]).onConflictDoNothing();
  console.log("✓ 3 payout forecasts\n");

  // ── SYNC / MUSIC SUPERVISORS ──────────────────────────────

  console.log("Seeding music supervisors...");
  const supervisorData = [
    { name: "Marcus Webb",      company: "Netflix Music",         role: "Head of Music",           email: "m.webb@netflix.com",   mediaTypes: ["tv_series","documentary","film" ] as Array<"film"|"tv_series"|"documentary"|"game"|"advertisement"|"trailer"|"short_film">, genreFocus: ["Afrobeats","R&B","Global"], credits: ["Queen Charlotte","African Queens","Jinja"],   dealCount: 3, lastContactedDays: 7    },
    { name: "Priya Sharma",     company: "EA Sports",             role: "Music Supervisor",        email: "p.sharma@ea.com",      mediaTypes: ["game","advertisement"] as Array<"film"|"tv_series"|"documentary"|"game"|"advertisement"|"trailer"|"short_film">,            genreFocus: ["Afrobeats","Hip-Hop","Electronic"],  credits: ["EA Sports FC 25","Madden 26"],               dealCount: 0, lastContactedDays: 16   },
    { name: "Sofia Reyes",      company: "Hulu Originals",        role: "Music Coordinator",       email: "s.reyes@hulu.com",     mediaTypes: ["documentary","tv_series"] as Array<"film"|"tv_series"|"documentary"|"game"|"advertisement"|"trailer"|"short_film">,          genreFocus: ["World Music","Soul","Afrobeats"],     credits: ["This Fool","Diaspora Stories S1"],           dealCount: 0, lastContactedDays: 21   },
    { name: "James Holbrook",   company: "Apple TV+ Music",       role: "Senior Music Supervisor", email: "j.holbrook@apple.com", mediaTypes: ["film","trailer","tv_series"] as Array<"film"|"tv_series"|"documentary"|"game"|"advertisement"|"trailer"|"short_film">,        genreFocus: ["Cinematic","Electronic","R&B"],       credits: ["Killers of the Flower Moon (Trailer)"],     dealCount: 1, lastContactedDays: 11   },
    { name: "David Chen",       company: "FIFA / Budweiser",      role: "Brand Music Director",    email: "d.chen@fifa.com",      mediaTypes: ["advertisement","game"] as Array<"film"|"tv_series"|"documentary"|"game"|"advertisement"|"trailer"|"short_film">,              genreFocus: ["Afrobeats","Pop","Latin"],            credits: ["FIFA World Cup 2026 Promo"],                dealCount: 0, lastContactedDays: null },
    { name: "Amara Nwosu",      company: "Criterion Films",       role: "Music Supervisor",        email: "a.nwosu@criterion.com",mediaTypes: ["film","short_film"] as Array<"film"|"tv_series"|"documentary"|"game"|"advertisement"|"trailer"|"short_film">,               genreFocus: ["Afrobeats","Soul","R&B"],             credits: ["Between Two Worlds","Lagos Chronicles"],    dealCount: 1, lastContactedDays: 29   },
    { name: "Tom Bradley",      company: "BBC Music",             role: "Music Editor",            email: "t.bradley@bbc.co.uk",  mediaTypes: ["documentary","tv_series"] as Array<"film"|"tv_series"|"documentary"|"game"|"advertisement"|"trailer"|"short_film">,           genreFocus: ["World","Afrobeats","Folk"],           credits: ["BBC Africa Eye S2","Planet Africa"],         dealCount: 1, lastContactedDays: 65   },
    { name: "Keiko Tanaka",     company: "Sky Sports Japan",      role: "Content Music Lead",      email: "k.tanaka@sky.jp",      mediaTypes: ["advertisement","tv_series"] as Array<"film"|"tv_series"|"documentary"|"game"|"advertisement"|"trailer"|"short_film">,         genreFocus: ["Electronic","Pop","Afrobeats"],       credits: ["Sky Sports UEFA","Wavelength (Licensed)"],  dealCount: 1, lastContactedDays: 80   },
  ];

  const supervisorRows = await db.insert(schema.musicSupervisors).values(
    supervisorData.map(s => ({
      name:            s.name,
      company:         s.company,
      role:            s.role,
      email:           s.email,
      mediaTypes:      s.mediaTypes,
      genreFocus:      s.genreFocus,
      credits:         s.credits,
      dealCount:       s.dealCount,
      lastContactedAt: s.lastContactedDays ? new Date(Date.now() - s.lastContactedDays * 86400000) : undefined,
    }))
  ).onConflictDoNothing().returning();
  console.log(`✓ ${supervisorRows.length} music supervisors\n`);

  const supervisorMap = new Map(supervisorRows.map(s => [s.name, s]));

  console.log("Seeding sync opportunities...");
  const opportunityRows = await db.insert(schema.syncOpportunities).values([
    { artistId, supervisorId: supervisorMap.get("Marcus Webb")?.id,    title: "Netflix Original Series — Lagos After Dark", mediaType: "tv_series",     budgetTier: "Mid-High", budgetMinUsd: 8000,  budgetMaxUsd: 15000, deadline: dStr(-5),  status: "open",     moodTags: ["cinematic","night","urban"],     genreTags: ["Afrobeats","R&B"],  bpmMin: 80,  bpmMax: 110, needsVocals: true  },
    { artistId, supervisorId: supervisorMap.get("Priya Sharma")?.id,    title: "EA Sports FC 26 — Season Soundtrack",        mediaType: "game",          budgetTier: "High",     budgetMinUsd: 5000,  budgetMaxUsd: 12000, deadline: dStr(-30), status: "open",     moodTags: ["energy","hype","stadium"],       genreTags: ["Afrobeats","Electronic"], bpmMin: 120, bpmMax: 140, needsVocals: true  },
    { artistId, supervisorId: supervisorMap.get("Sofia Reyes")?.id,     title: "Hulu Documentary — African Diaspora Stories", mediaType: "documentary",  budgetTier: "Mid",      budgetMinUsd: 3000,  budgetMaxUsd: 7000,  deadline: dStr(-45), status: "reviewing", moodTags: ["emotional","hopeful","cultural"], genreTags: ["Afrobeats","Soul"], bpmMin: 60,  bpmMax: 90,  needsVocals: false },
    { artistId, supervisorId: supervisorMap.get("James Holbrook")?.id,  title: "Apple TV+ Drama — Trailer Package",          mediaType: "trailer",       budgetTier: "Premium",  budgetMinUsd: 12000, budgetMaxUsd: 25000, deadline: dStr(-3),  status: "open",     moodTags: ["cinematic","tension","epic"],    genreTags: ["Electronic","Cinematic"], bpmMin: 90, bpmMax: 120, needsVocals: false },
    { artistId, supervisorId: supervisorMap.get("David Chen")?.id,      title: "FIFA 26 Campaign Anthem",                    mediaType: "advertisement", budgetTier: "Premium",  budgetMinUsd: 20000, budgetMaxUsd: 40000, deadline: dStr(-60), status: "open",     moodTags: ["victory","pride","global"],      genreTags: ["Afrobeats","Pop"],  bpmMin: 100, bpmMax: 130, needsVocals: true  },
    { artistId, supervisorId: supervisorMap.get("Amara Nwosu")?.id,     title: "Indie Film — Between Two Worlds",             mediaType: "film",          budgetTier: "Indie",    budgetMinUsd: 2000,  budgetMaxUsd: 5000,  deadline: dStr(-90), status: "open",     moodTags: ["nostalgic","longing","introspective"], genreTags: ["R&B","Soul"], bpmMin: 65, bpmMax: 95, needsVocals: true },
  ]).onConflictDoNothing().returning();
  console.log(`✓ ${opportunityRows.length} sync opportunities\n`);

  console.log("Seeding track sync profiles...");
  const syncProfileData = [
    { slug: "lagos-nights",    bpm: 98,  key: "F Min",  moods: ["cinematic","night","urban","romantic"],          energy: 72, cinematicFit: 91, sceneTypes: ["city night","club sequence","romance","montage"],  hasClean: true,  lyricType: "with_vocals", syncScore: 91 },
    { slug: "signal-lost",     bpm: 142, key: "D Min",  moods: ["intense","chase","electronic","tension"],         energy: 88, cinematicFit: 84, sceneTypes: ["action","chase","sports","hype"],                  hasClean: true,  lyricType: "with_vocals", syncScore: 87 },
    { slug: "frequencies",     bpm: 112, key: "G Maj",  moods: ["euphoric","dance","night","energy"],              energy: 82, cinematicFit: 79, sceneTypes: ["party","festival","advertisement","opening credits"], hasClean: true, lyricType: "with_vocals", syncScore: 83 },
    { slug: "midnight-groove", bpm: 88,  key: "A Min",  moods: ["sensual","midnight","smooth","deep"],             energy: 64, cinematicFit: 88, sceneTypes: ["romance","night club","drama","seduction"],         hasClean: false, lyricType: "with_vocals", syncScore: 85 },
    { slug: "elevation",       bpm: 72,  key: "Eb Maj", moods: ["spiritual","hopeful","uplifting","emotional"],    energy: 56, cinematicFit: 82, sceneTypes: ["documentary","inspire","sports montage","sunrise"],   hasClean: true,  lyricType: "with_vocals", syncScore: 78 },
    { slug: "wavelength",      bpm: 104, key: "Bb Min", moods: ["driving","road","adventure","free"],             energy: 76, cinematicFit: 79, sceneTypes: ["travel","road trip","advertisement","sports"],         hasClean: true,  lyricType: "with_vocals", syncScore: 82 },
    { slug: "echo-chamber",    bpm: 128, key: "F# Min", moods: ["dark","electronic","dystopian","cold"],           energy: 85, cinematicFit: 77, sceneTypes: ["sci-fi","thriller","game","action"],                 hasClean: true,  lyricType: "instrumental", syncScore: 76 },
    { slug: "reverb-season",   bpm: 95,  key: "C Maj",  moods: ["nostalgic","summer","chill","warm"],              energy: 61, cinematicFit: 72, sceneTypes: ["lifestyle","summer","ad","fashion"],                  hasClean: true,  lyricType: "with_vocals", syncScore: 71 },
    { slug: "digital-love",    bpm: 84,  key: "Ab Maj", moods: ["romantic","digital","longing","soft"],            energy: 52, cinematicFit: 70, sceneTypes: ["romance","drama","series","slow burn"],              hasClean: true,  lyricType: "with_vocals", syncScore: 68 },
  ];
  for (const p of syncProfileData) {
    const track = trackMap.get(p.slug);
    if (!track) continue;
    await db.insert(schema.trackSyncProfiles).values({
      trackId: track.id, bpm: p.bpm, musicalKey: p.key, moods: p.moods,
      energyLevel: p.energy, cinematicFitScore: p.cinematicFit, sceneTypes: p.sceneTypes,
      hasCleanVersion: p.hasClean, lyricType: p.lyricType, syncScore: p.syncScore,
    }).onConflictDoNothing();
  }
  console.log(`✓ ${syncProfileData.length} track sync profiles\n`);

  // ── RELEASES ──────────────────────────────────────────────

  console.log("Seeding releases...");
  const releaseRows = await db.insert(schema.releases).values([
    {
      artistId,
      title:          "Signal Lost",
      releaseType:    "single",
      status:         "released",
      releaseDate:    dStr(30),
      healthScore:    94,
      preSaveCount:   892,
      targetStreams:  200000,
      dspsSubmitted:  true,
      targetMarkets:  ["Nigeria", "Ghana", "UK"],
      aiRecommendations: [],
    },
    {
      artistId,
      title:          "Midnight Groove EP",
      releaseType:    "ep",
      status:         "mastered",
      releaseDate:    dStr(-26),
      announcementDate: dStr(-13),
      healthScore:    82,
      preSaveCount:   1247,
      targetStreams:  500000,
      dspsSubmitted:  true,
      targetMarkets:  ["Nigeria", "UK", "United States", "Ghana"],
      promoBudgetUsd: 2500,
      aiRecommendations: [
        "Submit to Spotify editorial at least 7 days before release date",
        "Announce pre-save campaign on Telegram now",
        "Schedule Instagram Reels teaser campaign starting announcement date",
        "Pitch lead single to Afrobeats playlists on Apple Music editorial",
      ],
    },
    {
      artistId,
      title:          "Frequencies Album",
      releaseType:    "album",
      status:         "recording",
      releaseDate:    dStr(-115),
      healthScore:    41,
      preSaveCount:   0,
      targetStreams:  2000000,
      dspsSubmitted:  false,
      targetMarkets:  ["Nigeria", "UK", "United States", "Ghana", "South Africa"],
      promoBudgetUsd: 8000,
      aiRecommendations: [
        "Recording phase — stay on schedule to hit release date",
        "Start building anticipation on socials 8 weeks before release",
        "Consider releasing 2 singles from the album before drop",
      ],
    },
  ]).onConflictDoNothing().returning();
  console.log(`✓ ${releaseRows.length} releases\n`);

  const epRelease = releaseRows.find(r => r.title === "Midnight Groove EP");
  if (epRelease) {
    await db.insert(schema.releaseAssets).values([
      { releaseId: epRelease.id, type: "cover_art",    label: "Cover Art",    status: "approved"     },
      { releaseId: epRelease.id, type: "audio_master", label: "Audio Master", status: "approved"     },
      { releaseId: epRelease.id, type: "lyric_sheet",  label: "Lyric Sheet",  status: "ready"        },
      { releaseId: epRelease.id, type: "press_kit",    label: "Press Kit",    status: "pending"      },
      { releaseId: epRelease.id, type: "video",        label: "Music Video",  status: "in_progress"  },
    ]).onConflictDoNothing();

    await db.insert(schema.releaseChecklists).values([
      { releaseId: epRelease.id, category: "Distribution", item: "Upload to DistroKid",              isDone: true  },
      { releaseId: epRelease.id, category: "Distribution", item: "Submit to Spotify editorial",      isDone: true  },
      { releaseId: epRelease.id, category: "Distribution", item: "Apple Music pre-release pitch",    isDone: false },
      { releaseId: epRelease.id, category: "Distribution", item: "Audiomack upload",                 isDone: true  },
      { releaseId: epRelease.id, category: "Marketing",    item: "Cover art finalised",              isDone: true  },
      { releaseId: epRelease.id, category: "Marketing",    item: "Instagram teaser posted",          isDone: false },
      { releaseId: epRelease.id, category: "Marketing",    item: "Telegram announcement sent",       isDone: false },
      { releaseId: epRelease.id, category: "Marketing",    item: "Pre-save link live",               isDone: true  },
      { releaseId: epRelease.id, category: "Press",        item: "Press release drafted",            isDone: true  },
      { releaseId: epRelease.id, category: "Press",        item: "Blog / media pitches sent",        isDone: false },
      { releaseId: epRelease.id, category: "Legal",        item: "PRO registration completed",       isDone: true  },
      { releaseId: epRelease.id, category: "Legal",        item: "ISRC codes assigned",              isDone: true  },
    ]).onConflictDoNothing();
    console.log("✓ Release assets + checklists seeded\n");
  }

  // ── CATALOG INTELLIGENCE ──────────────────────────────────

  console.log("Seeding catalog tracks...");
  const catalogData = [
    { slug: "lagos-nights",    phase: "evergreen"  as const, evergreenScore: 87, decayRate: "1.20", revivalPotential: 42, peakStreams: 9840, currentMonthly: 8920, totalPlaylists: 47 },
    { slug: "midnight-groove", phase: "rising"     as const, evergreenScore: 62, decayRate: "-4.10", revivalPotential: 71, peakStreams: 7240, currentMonthly: 7240, totalPlaylists: 31 },
    { slug: "signal-lost",     phase: "peak"       as const, evergreenScore: 58, decayRate: "-2.40", revivalPotential: 81, peakStreams: 8420, currentMonthly: 8100, totalPlaylists: 28 },
    { slug: "frequencies",     phase: "plateau"    as const, evergreenScore: 71, decayRate: "2.80",  revivalPotential: 68, peakStreams: 8240, currentMonthly: 6920, totalPlaylists: 38 },
    { slug: "wavelength",      phase: "plateau"    as const, evergreenScore: 66, decayRate: "3.40",  revivalPotential: 74, peakStreams: 7840, currentMonthly: 6120, totalPlaylists: 29 },
    { slug: "elevation",       phase: "declining"  as const, evergreenScore: 49, decayRate: "7.20",  revivalPotential: 82, peakStreams: 6840, currentMonthly: 3740, totalPlaylists: 18 },
    { slug: "reverb-season",   phase: "dormant"    as const, evergreenScore: 31, decayRate: "12.40", revivalPotential: 58, peakStreams: 4820, currentMonthly: 1240, totalPlaylists: 8  },
    { slug: "echo-chamber",    phase: "declining"  as const, evergreenScore: 44, decayRate: "5.80",  revivalPotential: 71, peakStreams: 3920, currentMonthly: 2140, totalPlaylists: 14 },
    { slug: "digital-love",    phase: "dormant"    as const, evergreenScore: 24, decayRate: "14.80", revivalPotential: 47, peakStreams: 6120, currentMonthly: 820,  totalPlaylists: 5  },
  ];
  for (const c of catalogData) {
    const track = trackMap.get(c.slug);
    if (!track) continue;
    await db.insert(schema.catalogTracks).values({
      trackId: track.id, artistId,
      lifecyclePhase:       c.phase,
      evergreenScore:       c.evergreenScore,
      decayRatePct:         c.decayRate,
      revivalPotential:     c.revivalPotential,
      peakStreams:          c.peakStreams,
      currentMonthlyStreams: c.currentMonthly,
      totalPlaylists:       c.totalPlaylists,
      peakDate:             dStr(rand(7, 60)),
    }).onConflictDoNothing();
  }
  console.log(`✓ ${catalogData.length} catalog tracks\n`);

  console.log("Seeding catalog insights...");
  const lagosTr = trackMap.get("lagos-nights");
  const sigTr   = trackMap.get("signal-lost");
  const eleTr   = trackMap.get("elevation");
  const revTr   = trackMap.get("reverb-season");
  const digTr   = trackMap.get("digital-love");

  await db.insert(schema.catalogInsights).values([
    { artistId, trackId: digTr?.id, insightType: "sleeper_hit",       urgency: "high",     title: "Digital Love — Unrecognised Sleeper Hit", body: "Digital Love peaked at 6K+ weekly streams then entered deep dormancy. German and French market potential is untapped.", action: "Launch Germany/France Spotify playlist pitch campaign" },
    { artistId, trackId: eleTr?.id, insightType: "stream_decay",      urgency: "critical", title: "Elevation — Rapid Decay Alert",            body: "Elevation losing 7.2% weekly — highest decay rate in catalog. 6 weeks to deep dormancy without intervention.", action: "Submit to Inspirational Afrobeats playlists immediately" },
    { artistId, trackId: revTr?.id, insightType: "revival_candidate", urgency: "high",     title: "Reverb Season — Sync + Playlist Revival",  body: "Dormant 3 months but mood profile matches 3 open sync opportunities. Never properly pushed to European markets.", action: "Pitch Reverb Season to Hulu Documentary brief and UK Afrobeats editorial" },
    { artistId, trackId: lagosTr?.id, insightType: "evergreen_alert", urgency: "low",      title: "Lagos Nights — Evergreen Status Confirmed", body: "Maintaining 91% of peak for 180+ days across 47 playlists. Your most reliable revenue anchor.", action: "Set up automated playlist drop monitoring for Lagos Nights" },
    { artistId, trackId: sigTr?.id, insightType: "breakout_signal",   urgency: "high",     title: "Signal Lost — Breakout Window Open Now",   body: "At peak (8,420 weekly) with no decline for 3 weeks. Breakout score 92. Maximum algorithmic momentum window.", action: "Submit to Spotify New Music Friday and Apple Music New in Afrobeats now" },
  ]).onConflictDoNothing();
  console.log("✓ 5 catalog insights\n");

  console.log("Seeding playlist history...");
  const playlistSeed = [
    { slug: "lagos-nights",    playlist: "Afrobeats Heat",       platform: "spotify"     as const, followers: 284000, addedDays: 128, peakPos: 8,  impact: 24100 },
    { slug: "lagos-nights",    playlist: "African Heat",         platform: "apple_music" as const, followers: 142000, addedDays: 105, peakPos: 12, impact: 18400 },
    { slug: "signal-lost",     playlist: "New Music Friday UK",  platform: "spotify"     as const, followers: 2100000, addedDays: 30, peakPos: 22, impact: 41200 },
    { slug: "frequencies",     playlist: "Afropop Rising",       platform: "audiomack"   as const, followers: 89000,  addedDays: 223, peakPos: 4,  impact: 12800 },
    { slug: "midnight-groove", playlist: "Late Night Vibes",     platform: "spotify"     as const, followers: 310000, addedDays: 65,  peakPos: 16, impact: 29300 },
    { slug: "wavelength",      playlist: "Drive Time Afrobeats", platform: "audiomack"   as const, followers: 71000,  addedDays: 240, removedDays: 130, peakPos: 6, impact: 9400 },
    { slug: "elevation",       playlist: "Sunday Gospel & Soul", platform: "apple_music" as const, followers: 88000,  addedDays: 198, removedDays: 80, peakPos: 9, impact: 7200 },
  ];
  for (const p of playlistSeed) {
    const track = trackMap.get(p.slug);
    if (!track) continue;
    await db.insert(schema.playlistHistory).values({
      trackId: track.id, artistId,
      playlistName:  p.playlist,
      platformSlug:  p.platform,
      followerCount: p.followers,
      addedAt:       dStr(p.addedDays),
      removedAt:     p.removedDays ? dStr(p.removedDays) : undefined,
      peakPosition:  p.peakPos,
      impactStreams:  p.impact,
    }).onConflictDoNothing();
  }
  console.log(`✓ ${playlistSeed.length} playlist history entries\n`);

  // ── FAN INTEL ─────────────────────────────────────────────

  console.log("Seeding fan locations...");
  await db.insert(schema.fanLocations).values([
    { artistId, countryCode: "NG", country: "Nigeria",        city: "Lagos",        fanCount: 3240, engagementIndex: 88, superfanCount: 8,  telegramCount: 1840 },
    { artistId, countryCode: "NG", country: "Nigeria",        city: "Abuja",        fanCount: 310,  engagementIndex: 76, superfanCount: 2,  telegramCount: 240  },
    { artistId, countryCode: "GB", country: "United Kingdom", city: "London",       fanCount: 1180, engagementIndex: 79, superfanCount: 4,  telegramCount: 210  },
    { artistId, countryCode: "GH", country: "Ghana",          city: "Accra",        fanCount: 940,  engagementIndex: 82, superfanCount: 5,  telegramCount: 480  },
    { artistId, countryCode: "KE", country: "Kenya",          city: "Nairobi",      fanCount: 720,  engagementIndex: 71, superfanCount: 3,  telegramCount: 310  },
    { artistId, countryCode: "US", country: "United States",  city: "New York",     fanCount: 580,  engagementIndex: 64, superfanCount: 2,  telegramCount: 84   },
    { artistId, countryCode: "ZA", country: "South Africa",   city: "Johannesburg", fanCount: 490,  engagementIndex: 69, superfanCount: 2,  telegramCount: 190  },
    { artistId, countryCode: "US", country: "United States",  city: "Atlanta",      fanCount: 320,  engagementIndex: 62, superfanCount: 1,  telegramCount: 48   },
    { artistId, countryCode: "CA", country: "Canada",         city: "Toronto",      fanCount: 240,  engagementIndex: 58, superfanCount: 1,  telegramCount: 38   },
    { artistId, countryCode: "DE", country: "Germany",        city: "Berlin",       fanCount: 180,  engagementIndex: 54, superfanCount: 1,  telegramCount: 24   },
  ]).onConflictDoNothing();
  console.log("✓ 10 fan locations\n");

  console.log("Seeding fan scores...");
  const allFans = await db.query.fans.findMany({ where: eq(schema.fans.artistId, artistId) });
  for (const fan of allFans) {
    const ltv = Math.min(100, fan.superfanScore > 80 ? rand(82, 95) : fan.engagementScore > 60 ? rand(62, 81) : rand(30, 61));
    const cluster = ltv >= 82 ? "superfan" : ltv >= 62 ? "core" : ltv >= 40 ? "casual" : "dormant";
    await db.insert(schema.fanScores).values({
      fanId:             fan.id,
      artistId,
      ltvScore:          ltv,
      cluster:           cluster as "superfan" | "core" | "casual" | "dormant" | "new",
      engagement30d:     noise(fan.engagementScore, 0.15),
      spendPotentialUsd: rand(50, 280),
      telegramConverted: fan.channels?.includes("telegram") ?? false,
      emailConverted:    fan.channels?.includes("email") ?? false,
    }).onConflictDoNothing();
  }
  console.log(`✓ ${allFans.length} fan scores seeded\n`);

  console.log("\n✅ All modules seeded successfully!");
  await client.end();
}

seedModules().catch(err => {
  console.error(err);
  process.exit(1);
});
