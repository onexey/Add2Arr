export const DEFAULTS = {
  radarr: {
    url: '',
    apiKey: '',
    qualityProfileId: null,
    rootFolderPath: '',
    minimumAvailability: 'released',
    monitored: true,
    searchOnAdd: true,
    tags: []
  },
  sonarr: {
    url: '',
    apiKey: '',
    qualityProfileId: null,
    languageProfileId: null,
    rootFolderPath: '',
    seriesType: 'standard',
    seasonFolder: true,
    monitored: true,
    monitor: 'all',
    searchOnAdd: true,
    tags: []
  }
};

function merge(defaults, stored) {
  return { ...defaults, ...(stored && typeof stored === 'object' ? stored : {}) };
}

export async function getSettings() {
  const stored = await chrome.storage.local.get(['radarr', 'sonarr']);
  return {
    radarr: merge(DEFAULTS.radarr, stored.radarr),
    sonarr: merge(DEFAULTS.sonarr, stored.sonarr)
  };
}

export async function getService(service) {
  const settings = await getSettings();
  return settings[service];
}

export async function saveService(service, patch) {
  const current = await getService(service);
  const next = merge(current, patch);
  await chrome.storage.local.set({ [service]: next });
  return next;
}

export function isConfigured(cfg) {
  return Boolean(cfg && cfg.url && cfg.apiKey && cfg.qualityProfileId && cfg.rootFolderPath);
}
