// make.fun's public API: read-only GET requests, open to any origin (CORS).
// The full API is described at https://make.fun/api/openapi.json.
//
// Every answer is cached in memory for one minute and revalidated with its
// ETag: an If-None-Match inside the same minute answers 304, so a second
// visit to a view costs no download. Nothing is written, ever.

const API = 'https://make.fun/api';
const TTL_MS = 60000;
const cache = new Map();

async function get(path) {
  const now = Date.now();
  const hit = cache.get(path);
  if (hit && now - hit.at < TTL_MS) return hit.data;
  const headers = hit?.etag ? { 'If-None-Match': hit.etag } : {};
  const res = await fetch(API + path, { headers });
  if (res.status === 304 && hit) {
    hit.at = now;
    return hit.data;
  }
  if (!res.ok) throw new Error(`make.fun ${res.status} for ${path}`);
  const data = await res.json();
  cache.set(path, { data, at: now, etag: res.headers.get('etag') });
  return data;
}

/** The open bounties: { items: [...] } (activity=times leaves out the activity a board does not show). */
export const getBounties = () => get('/competitions?status=open&activity=times');

/** One bounty, by its slug. */
export const getBounty = (slug) => get(`/competitions/${encodeURIComponent(slug)}`);

/** One bounty's leaderboard: { competition, phase, columns, entries: [...] }. */
export const getLeaderboard = (slug) => get(`/competitions/${encodeURIComponent(slug)}/leaderboard`);

/** One account's public profile, by its handle. */
export const getProfile = (handle) => get(`/profiles/${encodeURIComponent(handle)}`);
