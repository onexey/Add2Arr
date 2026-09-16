/* Shared UI + page-observation helpers for AddToArr content scripts. */
(() => {
  if (window.__addToArrUiLoaded) return;
  window.__addToArrUiLoaded = true;

  const STYLES = `
    :host { all: initial; }
    .wrap {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      vertical-align: middle;
    }
    .wrap.floating {
      position: fixed;
      right: 16px;
      bottom: 16px;
      z-index: 2147483000;
      padding: 8px 10px;
      border-radius: 10px;
      background: rgba(18, 18, 20, 0.92);
      box-shadow: 0 6px 24px rgba(0, 0, 0, 0.35);
    }
    button {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      margin: 0;
      padding: 0 14px;
      height: 34px;
      border: 0;
      border-radius: 6px;
      background: #f5c518;
      color: #111;
      font-size: 13px;
      font-weight: 700;
      line-height: 1;
      white-space: nowrap;
      cursor: pointer;
      transition: filter .15s ease, opacity .15s ease;
    }
    button:hover:not(:disabled) { filter: brightness(1.08); }
    button:disabled { cursor: default; opacity: .85; }
    button:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
    button.state-exists { background: #2f9e44; color: #fff; }
    button.state-added { background: #2f9e44; color: #fff; }
    button.state-error { background: #c92a2a; color: #fff; }
    button.state-unconfigured { background: #495057; color: #fff; }
    button.state-loading, button.state-adding { background: #868e96; color: #fff; }
    .spinner {
      width: 13px;
      height: 13px;
      border: 2px solid rgba(255, 255, 255, .45);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin .7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .icon { width: 13px; height: 13px; flex: none; }
    .note {
      max-width: 260px;
      font-size: 11px;
      line-height: 1.35;
      color: #c92a2a;
    }
    .wrap.floating .note { color: #ffa8a8; }
    .note:empty { display: none; }
  `;

  const ICONS = {
    plus: '<svg class="icon" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M7 2h2v5h5v2H9v5H7V9H2V7h5z"/></svg>',
    check: '<svg class="icon" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M6.2 12.4 2 8.2l1.5-1.5 2.7 2.7 6.3-6.3L14 4.6z"/></svg>',
    warn: '<svg class="icon" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 1 15 14H1zm-1 5v4h2V6zm0 5v2h2v-2z"/></svg>',
    gear: '<svg class="icon" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 5.5A2.5 2.5 0 1 0 8 10.5 2.5 2.5 0 0 0 8 5.5m6 2.5c0 .4 0 .8-.1 1.2l1.4 1.1-1.5 2.6-1.7-.6q-.9.75-1.9 1.1L9.8 15H6.9l-.4-1.7q-1-.35-1.8-1.1l-1.7.6-1.5-2.6L2.9 9.2Q2.85 8.6 2.85 8t.05-1.2L1.5 5.7 3 3.1l1.7.6q.8-.75 1.8-1.1L6.9 1h2.9l.4 1.7q1 .35 1.9 1.1l1.7-.6 1.5 2.6-1.4 1.1Q14 7.3 14 8"/></svg>'
  };

  const LABELS = {
    movie: { service: 'Radarr', add: 'Add to Radarr', exists: 'In Radarr' },
    series: { service: 'Sonarr', add: 'Add to Sonarr', exists: 'In Sonarr' }
  };

  function send(message) {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage(message, (response) => {
          if (chrome.runtime.lastError) {
            resolve({ ok: false, error: { message: chrome.runtime.lastError.message, code: 'runtime' } });
            return;
          }
          resolve(response || { ok: false, error: { message: 'No response from extension.', code: 'runtime' } });
        });
      } catch (err) {
        resolve({ ok: false, error: { message: err.message, code: 'runtime' } });
      }
    });
  }

  class Widget {
    constructor() {
      this.host = document.createElement('div');
      this.host.id = 'addtoarr-root';
      this.host.style.display = 'inline-flex';
      this.host.style.verticalAlign = 'middle';
      this.shadow = this.host.attachShadow({ mode: 'open' });

      const style = document.createElement('style');
      style.textContent = STYLES;

      this.wrap = document.createElement('div');
      this.wrap.className = 'wrap';

      this.button = document.createElement('button');
      this.button.type = 'button';

      this.note = document.createElement('div');
      this.note.className = 'note';

      this.wrap.append(this.button, this.note);
      this.shadow.append(style, this.wrap);

      this.item = null;
      this.state = 'loading';
      this.button.addEventListener('click', () => this.onClick());
    }

    setFloating(floating) {
      this.wrap.classList.toggle('floating', Boolean(floating));
      this.host.style.display = floating ? 'block' : 'inline-flex';
    }

    render(state, { label, note = '', icon = null, disabled = false, title = '' } = {}) {
      this.state = state;
      this.button.className = `state-${state}`;
      this.button.disabled = disabled;
      this.button.title = title || label;
      this.button.innerHTML = `${icon || ''}<span>${label}</span>`;
      this.note.textContent = note;
    }

    labels() {
      return LABELS[this.item?.kind] || { service: 'Radarr/Sonarr', add: 'Add', exists: 'In library' };
    }

    async refresh(item) {
      this.item = item;
      const l = this.labels();
      this.render('loading', { label: `Checking ${l.service}…`, icon: '<span class="spinner"></span>', disabled: true });

      const res = await send({ type: 'check', item });
      if (this.item !== item) return;

      if (!res.ok) {
        const code = res.error?.code;
        if (code === 'unconfigured' || code === 'no_permission') {
          this.render('unconfigured', {
            label: `Set up ${l.service}`,
            icon: ICONS.gear,
            note: res.error.message,
            title: res.error.message
          });
          this.action = 'options';
          return;
        }
        this.render('error', { label: l.add, icon: ICONS.warn, note: res.error?.message || 'Error', title: res.error?.message });
        this.action = 'add';
        return;
      }

      if (res.inLibrary) {
        this.render('exists', { label: l.exists, icon: ICONS.check, disabled: true, title: `Already in ${l.service}` });
        this.action = null;
        return;
      }

      if (!res.found) {
        this.render('error', {
          label: l.add,
          icon: ICONS.warn,
          note: res.error?.message || `Not found in ${l.service}.`,
          title: 'Click to retry'
        });
        this.action = 'add';
        return;
      }

      this.render('idle', { label: l.add, icon: ICONS.plus, title: `Add "${res.item.title}" to ${l.service}` });
      this.action = 'add';
    }

    async onClick() {
      if (this.action === 'options') {
        send({ type: 'openOptions' });
        return;
      }
      if (this.action !== 'add' || !this.item) return;

      const item = this.item;
      const l = this.labels();
      this.render('adding', { label: `Adding…`, icon: '<span class="spinner"></span>', disabled: true });

      const res = await send({ type: 'add', item });
      if (this.item !== item) return;

      if (!res.ok) {
        if (res.error?.code === 'exists') {
          this.render('exists', { label: l.exists, icon: ICONS.check, disabled: true });
          this.action = null;
          return;
        }
        this.render('error', { label: 'Retry', icon: ICONS.warn, note: res.error?.message || 'Failed to add.' });
        this.action = res.error?.code === 'unconfigured' ? 'options' : 'add';
        return;
      }

      this.render(res.added ? 'added' : 'exists', {
        label: res.added ? `Added to ${l.service}` : l.exists,
        icon: ICONS.check,
        disabled: true
      });
      this.action = null;
    }
  }

  /**
   * Keeps a single widget mounted and in sync with whatever the page shows.
   * `detect()` returns the current item (or null), `mount(host)` places the
   * widget and returns true when it found a suitable anchor.
   */
  function createController({ detect, mount, pollMs = 800 }) {
    const widget = new Widget();
    let currentKey = null;
    let mounted = false;

    const keyOf = (item) =>
      item ? [item.kind, item.imdbId, item.tmdbId, item.tvdbId, item.title, item.year].join('|') : null;

    function tick() {
      const item = detect();
      const key = keyOf(item);

      if (!item) {
        if (widget.host.isConnected) widget.host.remove();
        mounted = false;
        currentKey = null;
        return;
      }

      if (!widget.host.isConnected) mounted = false;

      if (!mounted) {
        const anchored = mount(widget.host);
        if (!anchored) {
          widget.setFloating(true);
          document.body.appendChild(widget.host);
        } else {
          widget.setFloating(false);
        }
        mounted = widget.host.isConnected;
        if (mounted) currentKey = null;
      }

      if (mounted && key !== currentKey) {
        currentKey = key;
        widget.refresh(item);
      }
    }

    const scheduled = { id: 0 };
    const schedule = () => {
      clearTimeout(scheduled.id);
      scheduled.id = setTimeout(tick, 150);
    };

    tick();
    setInterval(tick, pollMs);
    new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
    window.addEventListener('popstate', schedule);
    for (const method of ['pushState', 'replaceState']) {
      const original = history[method];
      history[method] = function patched(...args) {
        const result = original.apply(this, args);
        schedule();
        return result;
      };
    }

    return { widget, tick };
  }

  window.AddToArr = { createController, send };
})();
