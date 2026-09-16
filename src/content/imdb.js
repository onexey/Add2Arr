/* IMDb title pages: detect the title and mount the AddToArr button. */
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

  const ANCHORS = [
    '[data-testid="hero-title-block__metadata"]',
    'h1[data-testid="hero__pageTitle"]',
    '[data-testid="hero-title-block__title"]'
  ];

  function mount(host) {
    if (host.isConnected) return true;
    for (const selector of ANCHORS) {
      const anchor = document.querySelector(selector);
      if (!anchor || !anchor.parentElement) continue;
      host.style.margin = '8px 0 4px';
      anchor.insertAdjacentElement('afterend', host);
      return true;
    }
    return false;
  }

  window.AddToArr.createController({ detect, mount });
})();
