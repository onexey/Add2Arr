const TIMEOUT_MS = 20000;
const versionCache = new Map();

export class ArrError extends Error {
  constructor(message, { status = 0, code = 'error' } = {}) {
    super(message);
    this.name = 'ArrError';
    this.status = status;
    this.code = code;
  }
}

export function normalizeUrl(url) {
  return String(url || '').trim().replace(/\/+$/, '');
}

export function originPattern(url) {
  try {
    const { protocol, host } = new URL(normalizeUrl(url));
    if (protocol !== 'http:' && protocol !== 'https:') return null;
    return `${protocol}//${host}/*`;
  } catch {
    return null;
  }
}

export async function ensurePermission(url) {
  const pattern = originPattern(url);
  if (!pattern) throw new ArrError('Invalid URL. Use e.g. http://localhost:7878', { code: 'bad_url' });
  const granted = await chrome.permissions.contains({ origins: [pattern] });
  if (!granted) {
    throw new ArrError(
      `AddToArr is not allowed to reach ${pattern}. Open the extension options and press "Grant access".`,
      { code: 'no_permission' }
    );
  }
  return pattern;
}

function extractErrorMessage(payload, fallback) {
  if (!payload) return fallback;
  if (typeof payload === 'string') return payload.slice(0, 300) || fallback;
  if (Array.isArray(payload)) {
    const msgs = payload
      .map((e) => e && (e.errorMessage || e.message || e.detail))
      .filter(Boolean);
    if (msgs.length) return msgs.join(' ');
  }
  return payload.message || payload.error || payload.detail || fallback;
}

export async function request(cfg, path, { method = 'GET', body, query } = {}) {
  const base = normalizeUrl(cfg.url);
  await ensurePermission(base);

  let url;
  try {
    url = new URL(base + path);
  } catch {
    throw new ArrError('Invalid URL.', { code: 'bad_url' });
  }
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res;
  try {
    res = await fetch(url.toString(), {
      method,
      signal: controller.signal,
      credentials: 'omit',
      headers: {
        Accept: 'application/json',
        'X-Api-Key': cfg.apiKey,
        ...(body ? { 'Content-Type': 'application/json' } : {})
      },
      body: body ? JSON.stringify(body) : undefined
    });
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') throw new ArrError('Request timed out.', { code: 'timeout' });
    throw new ArrError(`Could not reach ${base}. Is it running and reachable?`, { code: 'network' });
  }
  clearTimeout(timer);

  const text = await res.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!res.ok) {
    if (res.status === 401) throw new ArrError('Unauthorized — check the API key.', { status: 401, code: 'auth' });
    const msg = extractErrorMessage(payload, `${res.status} ${res.statusText}`);
    const code = /already been added|already exists/i.test(String(msg)) ? 'exists' : 'http';
    throw new ArrError(msg, { status: res.status, code });
  }

  return payload;
}

export async function getSystemStatus(cfg) {
  return request(cfg, '/api/v3/system/status');
}

export async function getMajorVersion(cfg) {
  const key = normalizeUrl(cfg.url);
  if (versionCache.has(key)) return versionCache.get(key);
  const status = await getSystemStatus(cfg);
  const major = parseInt(String(status?.version || '0').split('.')[0], 10) || 0;
  versionCache.set(key, major);
  return major;
}

export function clearVersionCache() {
  versionCache.clear();
}

export const getQualityProfiles = (cfg) => request(cfg, '/api/v3/qualityprofile');
export const getRootFolders = (cfg) => request(cfg, '/api/v3/rootfolder');
export const getLanguageProfiles = (cfg) => request(cfg, '/api/v3/languageprofile');

/**
 * Build the ordered list of lookup terms to try for an item.
 */
function lookupTerms({ imdbId, tmdbId, tvdbId, title, year }, kind) {
  const terms = [];
  if (kind === 'movie') {
    if (imdbId) terms.push(`imdb:${imdbId}`);
    if (tmdbId) terms.push(`tmdb:${tmdbId}`);
  } else {
    if (tvdbId) terms.push(`tvdb:${tvdbId}`);
    if (imdbId) terms.push(`imdb:${imdbId}`);
    if (tmdbId) terms.push(`tmdb:${tmdbId}`);
  }
  if (title) terms.push(year ? `${title} ${year}` : title);
  return terms;
}

function matchesItem(candidate, item, kind) {
  if (!candidate) return false;
  if (item.imdbId && candidate.imdbId && candidate.imdbId === item.imdbId) return true;
  if (kind === 'movie' && item.tmdbId && candidate.tmdbId && Number(candidate.tmdbId) === Number(item.tmdbId)) return true;
  if (kind === 'series' && item.tvdbId && candidate.tvdbId && Number(candidate.tvdbId) === Number(item.tvdbId)) return true;
  return false;
}

/**
 * Resolve an item (imdb/tmdb/tvdb id or title+year) to a full Radarr/Sonarr
 * lookup result. The result carries `id > 0` when it is already in the library.
 */
export async function lookup(cfg, item, kind) {
  const path = kind === 'movie' ? '/api/v3/movie/lookup' : '/api/v3/series/lookup';
  const terms = lookupTerms(item, kind);
  let lastError = null;

  for (const term of terms) {
    let results;
    try {
      results = await request(cfg, path, { query: { term } });
    } catch (err) {
      if (err.code === 'no_permission' || err.code === 'auth') throw err;
      lastError = err;
      continue;
    }
    if (!Array.isArray(results) || results.length === 0) continue;

    const exact = results.find((r) => matchesItem(r, item, kind));
    if (exact) return exact;
    // ID-based terms return a single authoritative result.
    if (term.includes(':')) return results[0];
    // Title search: only trust it when the year lines up.
    if (item.year) {
      const byYear = results.find((r) => Number(r.year) === Number(item.year));
      if (byYear) return byYear;
      continue;
    }
    return results[0];
  }

  if (lastError) throw lastError;
  return null;
}

export async function addMovie(cfg, lookupResult) {
  const body = {
    ...lookupResult,
    qualityProfileId: Number(cfg.qualityProfileId),
    rootFolderPath: cfg.rootFolderPath,
    minimumAvailability: cfg.minimumAvailability || 'released',
    monitored: cfg.monitored !== false,
    tags: Array.isArray(cfg.tags) ? cfg.tags : [],
    addOptions: {
      searchForMovie: cfg.searchOnAdd !== false,
      monitor: cfg.monitored !== false ? 'movieOnly' : 'none'
    }
  };
  delete body.id;
  return request(cfg, '/api/v3/movie', { method: 'POST', body });
}

export async function addSeries(cfg, lookupResult) {
  const major = await getMajorVersion(cfg);
  const body = {
    ...lookupResult,
    qualityProfileId: Number(cfg.qualityProfileId),
    rootFolderPath: cfg.rootFolderPath,
    seriesType: cfg.seriesType || 'standard',
    seasonFolder: cfg.seasonFolder !== false,
    monitored: cfg.monitored !== false,
    tags: Array.isArray(cfg.tags) ? cfg.tags : [],
    addOptions: {
      monitor: cfg.monitored !== false ? cfg.monitor || 'all' : 'none',
      searchForMissingEpisodes: cfg.searchOnAdd !== false,
      searchForCutoffUnmetEpisodes: false
    }
  };
  delete body.id;

  if (major > 0 && major < 4) {
    let languageProfileId = Number(cfg.languageProfileId) || 0;
    if (!languageProfileId) {
      const profiles = await getLanguageProfiles(cfg).catch(() => []);
      languageProfileId = Array.isArray(profiles) && profiles[0] ? profiles[0].id : 1;
    }
    body.languageProfileId = languageProfileId;
  } else {
    delete body.languageProfileId;
  }

  return request(cfg, '/api/v3/series', { method: 'POST', body });
}
