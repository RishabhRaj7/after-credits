import { dedupe, identity, type Entry } from './library';

/* ── the live log ──────────────────────────────────────────────────────────
   A GitHub Gist holds everything that changed since the library was baked:
   titles logged since, edits, removals. Every visitor reads it at load and
   layers it over the baked library, so a new title shows up without a
   commit or a rebuild. Only the owner can write — with a GitHub token that
   never leaves their browser.

   One-time setup: create a gist containing a file named GIST_FILE (content
   `{}` is fine), then put its id in VITE_LIBRARY_GIST_ID (host env var or
   .env.local) or in DEFAULT_GIST_ID below. */

const DEFAULT_GIST_ID = '';
/* accepts the bare id or the whole gist URL (https://gist.github.com/<user>/<id>) */
export function parseGistId(raw: string): string {
  const m = raw.trim().match(/([0-9a-f]{20,})\/?(?:#.*)?$/i);
  return m ? m[1] : '';
}
export const GIST_ID: string = parseGistId((import.meta.env.VITE_LIBRARY_GIST_ID as string | undefined) || DEFAULT_GIST_ID);
export const GIST_FILE = 'after-credits-live.json';

export interface Overlay {
  version: 1;
  updatedAt: string;
  /** titles added since the bake, or baked titles that were edited */
  entries: Entry[];
  /** ids of baked titles that were removed */
  removed: string[];
}

const EMPTY: Overlay = { version: 1, updatedAt: '', entries: [], removed: [] };
const LS_TOKEN = 'ac:github:token';

export function liveEnabled(): boolean {
  return !!GIST_ID;
}

export function getGithubToken(): string {
  try {
    return localStorage.getItem(LS_TOKEN) ?? '';
  } catch {
    return '';
  }
}

export function setGithubToken(token: string): void {
  try {
    if (token) localStorage.setItem(LS_TOKEN, token);
    else localStorage.removeItem(LS_TOKEN);
  } catch {
    /* noop */
  }
}

function parse(raw: string | undefined): Overlay {
  if (!raw) return EMPTY;
  try {
    const o = JSON.parse(raw) as Partial<Overlay>;
    return {
      version: 1,
      updatedAt: o.updatedAt ?? '',
      entries: Array.isArray(o.entries) ? o.entries : [],
      removed: Array.isArray(o.removed) ? o.removed : [],
    };
  } catch {
    return EMPTY;
  }
}

/* read with the API (not the raw CDN) so a fresh log shows up immediately */
export async function fetchOverlay(): Promise<Overlay | null> {
  if (!GIST_ID) return null;
  try {
    const token = getGithubToken();
    const res = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
      headers: { Accept: 'application/vnd.github+json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const gist = (await res.json()) as { files?: Record<string, { content?: string; truncated?: boolean; raw_url?: string }> };
    const file = gist.files?.[GIST_FILE];
    if (!file) return EMPTY;
    if (file.truncated && file.raw_url) return parse(await (await fetch(file.raw_url)).text());
    return parse(file.content);
  } catch {
    return null;
  }
}

export async function publishOverlay(overlay: Overlay): Promise<void> {
  const token = getGithubToken();
  if (!GIST_ID) throw new Error('No gist configured (VITE_LIBRARY_GIST_ID).');
  if (!token) throw new Error('Add your GitHub token in Quick log → setup first.');
  const res = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
    method: 'PATCH',
    headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ files: { [GIST_FILE]: { content: JSON.stringify(overlay, null, 1) } } }),
  });
  if (res.status === 401 || res.status === 403) throw new Error('GitHub rejected the token — it needs the "gist" scope.');
  if (res.status === 404) throw new Error('Gist not found — check the id, and that the token owns it.');
  if (!res.ok) throw new Error(`GitHub returned ${res.status}.`);
}

/* baked library + overlay → what visitors see. A gist entry replaces the
   baked title it matches by id or by identity, so nothing appears twice. */
export function applyOverlay(base: Entry[], overlay: Overlay): Entry[] {
  const removed = new Set(overlay.removed);
  const patches = dedupe(overlay.entries.filter((e) => !removed.has(e.id)));
  const byId = new Map(patches.map((e) => [e.id, e]));
  const byIdentity = new Map(patches.map((e) => [identity(e), e]));
  const used = new Set<Entry>();
  const out: Entry[] = [];
  for (const e of base) {
    if (removed.has(e.id)) continue;
    const p = byId.get(e.id) ?? byIdentity.get(identity(e));
    if (p && !used.has(p)) {
      used.add(p);
      out.push(p);
    } else if (!p) {
      out.push(e);
    }
  }
  for (const p of patches) if (!used.has(p)) out.push(p);
  return dedupe(out);
}

/* current library → the smallest overlay that reproduces it from the bake */
export function diffOverlay(base: Entry[], next: Entry[]): Overlay {
  const baseById = new Map(base.map((e) => [e.id, JSON.stringify(e)]));
  const nextIds = new Set(next.map((e) => e.id));
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    entries: next.filter((e) => baseById.get(e.id) !== JSON.stringify(e)),
    removed: base.filter((e) => !nextIds.has(e.id)).map((e) => e.id),
  };
}
