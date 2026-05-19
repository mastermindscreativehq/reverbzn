import { NextResponse } from "next/server";
import { getArtistBySlug, getOverviewMetrics, getStreamTrends, getFanTrends, getTracks, getPlatformSummaries, getInsights, getNotifications } from "@/lib/db/queries";

const ARTIST_SLUG = process.env.ARTIST_SLUG ?? "reverbzn";

export async function GET() {
  try {
    const artist = await getArtistBySlug(ARTIST_SLUG);
    if (!artist) {
      return NextResponse.json({ success: false, error: "Artist not found. Run the seed script first." }, { status: 404 });
    }

    const [metrics, streamTrends, fanTrends, tracks, platformSummaries, insights, notifications] =
      await Promise.all([
        getOverviewMetrics(artist.id),
        getStreamTrends(artist.id),
        getFanTrends(artist.id),
        getTracks(artist.id).then(t => t.slice(0, 5)),
        getPlatformSummaries(artist.id),
        getInsights(artist.id).then(i => i.filter(x => !x.isRead).slice(0, 5)),
        getNotifications(artist.id).then(n => n.filter(x => !x.isRead).slice(0, 5)),
      ]);

    return NextResponse.json({
      success: true,
      data: { metrics, streamTrends, fanTrends, topTracks: tracks, platformSummaries, insights, notifications },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[GET /api/overview]", err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
