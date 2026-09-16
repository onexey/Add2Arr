import { DEFAULTS, getSettings, saveService } from '../lib/storage.js';
import {
  ArrError,
  clearVersionCache,
  getLanguageProfiles,
  getQualityProfiles,
  getRootFolders,
  getSystemStatus,
  normalizeUrl,
  originPattern
} from '../lib/arr.js';

const panels = new Map();

function setStatus(el, message, kind = '') {
  el.textContent = message;
  el.className = `status${kind ? ` ${kind}` : ''}`;
}

function fillSelect(select, options, selected) {
  select.innerHTML = '';
  for (const { value, label } of options) {
    const option = document.createElement('option');
    option.value = String(value);
    option.textContent = label;
    select.appendChild(option);
  }
  const match = options.find((o) => String(o.value) === String(selected));
  select.value = match ? String(match.value) : options[0] ? String(options[0].value) : '';
  select.disabled = options.length === 0;
}

function readValues(panel) {
  const values = {};
  for (const field of panel.querySelectorAll('input[name], select[name]')) {
    if (field.type === 'checkbox') values[field.name] = field.checked;
    else if (field.name.endsWith('Id')) values[field.name] = field.value ? Number(field.value) : null;
    else values[field.name] = field.value.trim();
  }
  return values;
}

function writeValues(panel, cfg) {
  for (const field of panel.querySelectorAll('input[name], select[name]')) {
    const value = cfg[field.name];
    if (field.type === 'checkbox') field.checked = value !== false;
    else if (field.tagName === 'SELECT') {
      if (value !== null && value !== undefined && value !== '') {
        if (!field.options.length) {
          const option = document.createElement('option');
          option.value = String(value);
          option.textContent = String(value);
          field.appendChild(option);
        }
        field.value = String(value);
      }
    } else field.value = value ?? '';
  }
}

async function connect(panel, service) {
  const status = panel.querySelector('[data-role="status"]');
  const url = normalizeUrl(panel.querySelector('[name="url"]').value);
  const apiKey = panel.querySelector('[name="apiKey"]').value.trim();

  if (!url || !apiKey) {
    setStatus(status, 'Enter both a server URL and an API key.', 'err');
    return;
  }
  const pattern = originPattern(url);
  if (!pattern) {
    setStatus(status, 'That URL is not valid. Example: http://localhost:7878', 'err');
    return;
  }

  // Must run inside the click gesture, before any other await.
  const granted = await chrome.permissions.request({ origins: [pattern] });
  if (!granted) {
    setStatus(status, `Access to ${pattern} was denied. Add2Arr cannot reach the server without it.`, 'err');
    return;
  }

  clearVersionCache();
  const cfg = { url, apiKey };
  setStatus(status, 'Connecting…');

  try {
    const info = await getSystemStatus(cfg);
    const major = parseInt(String(info?.version || '0').split('.')[0], 10) || 0;
    const stored = (await getSettings())[service];

    const [profiles, folders] = await Promise.all([getQualityProfiles(cfg), getRootFolders(cfg)]);

    fillSelect(
      panel.querySelector('[name="qualityProfileId"]'),
      (profiles || []).map((p) => ({ value: p.id, label: p.name })),
      stored.qualityProfileId
    );
    fillSelect(
      panel.querySelector('[name="rootFolderPath"]'),
      (folders || []).map((f) => ({ value: f.path, label: f.path })),
      stored.rootFolderPath
    );

    const languageRow = panel.querySelector('[data-role="languageRow"]');
    if (languageRow) {
      const needsLanguage = major > 0 && major < 4;
      languageRow.hidden = !needsLanguage;
      if (needsLanguage) {
        const languages = await getLanguageProfiles(cfg).catch(() => []);
        fillSelect(
          panel.querySelector('[name="languageProfileId"]'),
          (languages || []).map((l) => ({ value: l.id, label: l.name })),
          stored.languageProfileId
        );
      }
    }

    setStatus(status, `Connected to ${info?.appName || service} ${info?.version || ''}`.trim(), 'ok');
  } catch (err) {
    const message = err instanceof ArrError ? err.message : err.message || 'Connection failed.';
    setStatus(status, message, 'err');
  }
}

async function save(panel, service) {
  const saved = panel.querySelector('[data-role="saved"]');
  const values = readValues(panel);

  if (!values.url || !values.apiKey) {
    setStatus(saved, 'Server URL and API key are required.', 'err');
    return;
  }
  if (!values.qualityProfileId || !values.rootFolderPath) {
    setStatus(saved, 'Press “Connect & load settings” first, then pick a quality profile and root folder.', 'err');
    return;
  }

  values.url = normalizeUrl(values.url);
  await saveService(service, values);
  clearVersionCache();
  setStatus(saved, 'Saved.', 'ok');
  setTimeout(() => setStatus(saved, ''), 2500);
}

async function clear(panel, service) {
  const saved = panel.querySelector('[data-role="saved"]');
  const { url } = readValues(panel);
  const pattern = originPattern(url);
  if (pattern) await chrome.permissions.remove({ origins: [pattern] }).catch(() => {});

  await chrome.storage.local.remove(service);
  clearVersionCache();
  writeValues(panel, DEFAULTS[service]);
  for (const select of panel.querySelectorAll('select[name$="Id"], select[name="rootFolderPath"]')) {
    select.innerHTML = '';
    select.disabled = true;
  }
  setStatus(panel.querySelector('[data-role="status"]'), '');
  setStatus(saved, 'Cleared.', 'ok');
}

async function init() {
  const settings = await getSettings();
  for (const panel of document.querySelectorAll('.card[data-service]')) {
    const service = panel.dataset.service;
    panels.set(service, panel);
    writeValues(panel, settings[service]);

    panel.addEventListener('click', (event) => {
      const action = event.target.closest('button')?.dataset.action;
      if (action === 'connect') connect(panel, service);
      else if (action === 'save') save(panel, service);
      else if (action === 'clear') clear(panel, service);
    });
  }
}

init();
