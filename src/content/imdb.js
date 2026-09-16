/* IMDb title pages: detect the title and mount the Add2Arr button. */
(() => {
  const TYPE_MAP = {
    Movie: 'movie',
    TVMovie: 'movie',
    Short: 'movie',
    VideoGame: null,
    TVSeries: 'series',
    TVMiniSeries: 'series',
    CreativeWorkSeries: 'series'
  };

  let ldCache = { key: '', data: null };

  function currentImdbId() {
    const match = location.pathname.match(/\/title\/(tt\d+)/);
    return match ? match[1] : null;
  }

  function readLinkedData() {
    if (ldCache.key === location.pathname && ldCache.data) return ldCache.data;
    for (const node of document.querySelectorAll('script[type="application/ld+json"]')) {
      try {
        const data = JSON.parse(node.textContent);
        const entry = Array.isArray(data) ? data.find((d) => d && d['@type']) : data;
        if (entry && entry['@type']) {
          ldCache = { key: location.pathname, data: entry };
          return entry;
        }
      } catch {
        /* ignore malformed blocks */
      }
    }
    return null;
  }

  function fallbackKind() {
    const meta = document.querySelector('[data-testid="hero-title-block__metadata"]');
    const text = (meta?.textContent || '').toLowerCase();
    if (text.includes('tv series') || text.includes('tv mini')) return 'series';
    if (document.querySelector('[data-testid="episodes-header"], a[href*="/episodes?season"]')) return 'series';
    if (text.includes('tv episode')) return 'series';
    return 'movie';
  }

  function heroTitle() {
    const h1 = document.querySelector('h1[data-testid="hero__pageTitle"], [data-testid="hero-title-block__title"], h1');
    return h1 ? h1.textContent.trim() : '';
  }

  function heroYear() {
    const link = document.querySelector('[data-testid="hero-title-block__metadata"] a[href*="releaseinfo"]');
    const match = (link?.textContent || '').match(/(19|20)\d{2}/);
    return match ? Number(match[0]) : null;
  }

  function detect() {
    const imdbId = currentImdbId();
    if (!imdbId) return null;

    const ld = readLinkedData();
    const rawType = ld?.['@type'];

    // Episode pages resolve to their parent series.
    if (rawType === 'TVEpisode') {
      const parent = String(ld?.partOfSeries?.url || '').match(/(tt\d+)/);
      if (!parent) return null;
      return {
        kind: 'series',
        imdbId: parent[1],
        title: String(ld?.partOfSeries?.name || '').trim() || null,
        year: null
      };
    }

    const kind = rawType ? TYPE_MAP[rawType] ?? fallbackKind() : fallbackKind();
    if (!kind) return null;

    const year = Number(String(ld?.datePublished || '').slice(0, 4)) || heroYear();
    return {
      kind,
      imdbId,
      title: (ld?.name && String(ld.name).trim()) || heroTitle() || null,
      year: year || null
    };
  }

  function pageHeading() {
    return document.querySelector('h1[data-testid="hero__pageTitle"], [data-testid="hero-title-block__title"], h1');
  }

  /**
   * The metadata row ("TV Series · 2014–2019 · TV-MA · 30m"). IMDb renames its
   * test ids and CSS classes regularly, so fall back to finding the first short
   * list after the heading that looks like title metadata.
   */
  function findMetadataList(h1) {
    const tagged = document.querySelector('[data-testid="hero-title-block__metadata"]');
    if (tagged) return tagged;
    if (!h1) return null;

    const scope = h1.closest('section, main') || document.body;
    for (const list of scope.querySelectorAll('ul')) {
      if (!(h1.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING)) continue;
      if (list.children.length < 2) continue;
      const text = list.textContent.replace(/\s+/g, ' ').trim();
      if (!text || text.length > 120) continue;
      if (!/(19|20)\d{2}/.test(text) && !/\d+\s*[hm]\b|TV (Series|Mini|Movie|Episode)/i.test(text)) continue;
      return list;
    }
    return null;
  }

  function mount(host) {
    if (host.isConnected) return true;

    const h1 = pageHeading();

    // Preferred: inline at the end of the metadata row.
    const metadata = findMetadataList(h1);
    if (metadata) {
      host.dataset.compact = '';
      host.style.margin = '0 0 0 16px';
      host.style.alignSelf = 'center';
      host.style.flex = 'none';
      metadata.appendChild(host);
      return true;
    }

    // Fallback: below the title block. Insert after the heading's wrapper
    // rather than the heading itself, which sits in a clipped row.
    const block = h1 && h1.parentElement && h1.parentElement !== document.body ? h1.parentElement : h1;
    if (block && block.parentElement) {
      delete host.dataset.compact;
      host.style.margin = '12px 0 4px';
      host.style.alignSelf = '';
      host.style.flex = '';
      block.insertAdjacentElement('afterend', host);
      return true;
    }
    return false;
  }

  window.Add2Arr.createController({ detect, mount });
})();
