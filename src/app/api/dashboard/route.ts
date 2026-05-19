import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const metrics = db.getDashboardMetrics();
  const streamTrends = db.getStreamTrends();
  const fanTrends = db.getFanTrends();
  const earningsTrends = db.getEarningsTrends();
  const insights = db.getUnreadInsights();
  const notifications = db.getUnreadNotifications();
  const tracks = db.getTracks().slice(0, 5);
  const platformSummaries = db.getPlatformSummaries();

  return NextResponse.json({
    success: true,
    data: {
      metrics,
      streamTrends,
      fanTrends,
      earningsTrends,
      insights,
      notifications,
      topTracks: tracks,
      platformSummaries,
    },
  });
}
