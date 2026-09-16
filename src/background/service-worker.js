import { getSettings, isConfigured } from '../lib/storage.js';
import { ArrError, lookup, addMovie, addSeries, clearVersionCache } from '../lib/arr.js';

const SERVICE_BY_KIND = { movie: 'radarr', series: 'sonarr' };

function serviceLabel(service) {
  return service === 'radarr' ? 'Radarr' : 'Sonarr';
}

function toError(err) {
  if (err instanceof ArrError) return { message: err.message, code: err.code, status: err.status };
  return { message: err?.message || 'Unexpected error', code: 'error', status: 0 };
}

function summarize(result, kind) {
  if (!result) return null;
  return {
    title: result.title,
    year: result.year,
    tmdbId: result.tmdbId ?? null,
    tvdbId: result.tvdbId ?? null,
    imdbId: result.imdbId ?? null,
    inLibrary: Number(result.id) > 0,
    kind
  };
}

async function resolveConfig(kind) {
  const service = SERVICE_BY_KIND[kind];
  if (!service) throw new ArrError(`Unsupported media type "${kind}".`, { code: 'bad_kind' });
  const settings = await getSettings();
  const cfg = settings[service];
  if (!isConfigured(cfg)) {
    throw new ArrError(`${serviceLabel(service)} is not configured yet.`, { code: 'unconfigured' });
  }
  return { service, cfg };
}

async function handleCheck(item) {
  const { service, cfg } = await resolveConfig(item.kind);
  const result = await lookup(cfg, item, item.kind);
  if (!result) {
    return {
      ok: true,
      service,
      found: false,
      inLibrary: false,
      error: { message: `${serviceLabel(service)} could not find this title.`, code: 'not_found' }
    };
  }
  return { ok: true, service, found: true, inLibrary: Number(result.id) > 0, item: summarize(result, item.kind) };
}

async function handleAdd(item) {
  const { service, cfg } = await resolveConfig(item.kind);
  const result = await lookup(cfg, item, item.kind);
  if (!result) throw new ArrError(`${serviceLabel(service)} could not find this title.`, { code: 'not_found' });
  if (Number(result.id) > 0) {
    return { ok: true, service, added: false, inLibrary: true, item: summarize(result, item.kind) };
  }

  const added = item.kind === 'movie' ? await addMovie(cfg, result) : await addSeries(cfg, result);
  return { ok: true, service, added: true, inLibrary: true, item: summarize({ ...added, id: added?.id || 1 }, item.kind) };
}

async function handleConfigState() {
  const settings = await getSettings();
  return {
    ok: true,
    radarr: isConfigured(settings.radarr),
    sonarr: isConfigured(settings.sonarr)
  };
}

const HANDLERS = {
  check: (msg) => handleCheck(msg.item),
  add: (msg) => handleAdd(msg.item),
  configState: () => handleConfigState(),
  openOptions: async () => {
    await chrome.runtime.openOptionsPage();
    return { ok: true };
  }
};

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  const handler = HANDLERS[msg?.type];
  if (!handler) return false;
  Promise.resolve(handler(msg))
    .then(sendResponse)
    .catch((err) => sendResponse({ ok: false, error: toError(err) }));
  return true;
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && (changes.radarr || changes.sonarr)) clearVersionCache();
});
