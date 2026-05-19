import { NextResponse } from "next/server";
import { getArtistBySlug, getPlatformSummaries, getPlatformTrends } from "@/lib/db/queries";

const ARTIST_SLUG = process.env.ARTIST_SLUG ?? "reverbzn";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const platformSlug = searchParams.get("platform");

    const artist = await getArtistBySlug(ARTIST_SLUG);
    if (!artist) return NextResponse.json({ success: false, error: "Artist not found" }, { status: 404 });

    if (platformSlug) {
      const trends = await getPlatformTrends(artist.id, platformSlug);
      return NextResponse.json({ success: true, data: trends });
    }

    const summaries = await getPlatformSummaries(artist.id);
    return NextResponse.json({ success: true, data: summaries });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[GET /api/platforms]", err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
