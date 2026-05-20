import { env } from "../lib/env.js";

interface SpotifyToken { access_token: string; expires_in: number }
interface SpotifyArtist { id: string; followers: { total: number }; popularity: number }
interface SpotifyTrack { id: string; name: string; popularity: number }
interface SpotifyTopTracks { tracks: SpotifyTrack[] }

let tokenCache: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt) return tokenCache.token;

  const creds = Buffer.from(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`).toString("base64");
  const res   = await fetch("https://accounts.spotify.com/api/token", {
    method:  "POST",
    headers: { Authorization: `Basic ${creds}`, "Content-Type": "application/x-www-form-urlencoded" },
    body:    "grant_type=client_credentials",
  });

  if (!res.ok) throw new Error(`Spotify auth failed: ${res.status}`);
  const data = await res.json() as SpotifyToken;

  tokenCache = { token: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
  return tokenCache.token;
}

async function spotifyGet<T>(path: string): Promise<T> {
  const token = await getAccessToken();
  const res   = await fetch(`https://api.spotify.com/v1${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Spotify API error ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

export async function fetchArtistProfile(spotifyArtistId: string): Promise<SpotifyArtist> {
  return spotifyGet<SpotifyArtist>(`/artists/${spotifyArtistId}`);
}

export async function fetchArtistTopTracks(spotifyArtistId: string, market = "GB"): Promise<SpotifyTopTracks> {
  return spotifyGet<SpotifyTopTracks>(`/artists/${spotifyArtistId}/top-tracks?market=${market}`);
}

export async function fetchTrackDetails(spotifyTrackId: string): Promise<SpotifyTrack> {
  return spotifyGet<SpotifyTrack>(`/tracks/${spotifyTrackId}`);
}

export async function searchTrack(title: string, artistName: string): Promise<SpotifyTrack | null> {
  const q   = encodeURIComponent(`track:${title} artist:${artistName}`);
  const res = await spotifyGet<{ tracks: { items: SpotifyTrack[] } }>(`/search?type=track&q=${q}&limit=1`);
  return res.tracks.items[0] ?? null;
}
