import { NextResponse } from "next/server";
import { getArtistBySlug, getRegionSummaries } from "@/lib/db/queries";

const ARTIST_SLUG = process.env.ARTIST_SLUG ?? "reverbzn";

export async function GET() {
  try {
    const artist = await getArtistBySlug(ARTIST_SLUG);
    if (!artist) return NextResponse.json({ success: false, error: "Artist not found" }, { status: 404 });

    const regions = await getRegionSummaries(artist.id);
    return NextResponse.json({ success: true, data: regions });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[GET /api/regions]", err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
