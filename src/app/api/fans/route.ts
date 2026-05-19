import { NextResponse } from "next/server";
import { getArtistBySlug, getFans, getFanSegments } from "@/lib/db/queries";

const ARTIST_SLUG = process.env.ARTIST_SLUG ?? "reverbzn";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const include = searchParams.get("include");

    const artist = await getArtistBySlug(ARTIST_SLUG);
    if (!artist) return NextResponse.json({ success: false, error: "Artist not found" }, { status: 404 });

    const [fans, segments] = await Promise.all([
      getFans(artist.id),
      include === "segments" ? getFanSegments(artist.id) : Promise.resolve(undefined),
    ]);

    return NextResponse.json({
      success: true,
      data: { fans, ...(segments ? { segments } : {}) },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[GET /api/fans]", err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
