/* Trakt.tv movie and show pages: detect the title and mount the Add2Arr button. */
(() => {
  function pageTarget() {
    // Only the main movie/show summary pages (not seasons, episodes, comments…).
    const match = location.pathname.match(/^\/(movies|shows)\/([^/]+)\/?$/);
    if (!match) return null;
    return { kind: match[1] === 'movies' ? 'movie' : 'series', slug: match[2] };
  }

  function findExternalIds() {
    const ids = { imdbId: null, tmdbId: null, tvdbId: null };
    for (const link of document.querySelectorAll('a[href]')) {
      const href = link.getAttribute('href') || '';
      if (!ids.imdbId) {
        const imdb = href.match(/imdb\.com\/title\/(tt\d+)/i);
        if (imdb) ids.imdbId = imdb[1];
      }
      if (!ids.tmdbId) {
        const tmdb = href.match(/themoviedb\.org\/(?:movie|tv)\/(\d+)/i);
        if (tmdb) ids.tmdbId = Number(tmdb[1]);
      }
      if (!ids.tvdbId) {
        const tvdb = href.match(/thetvdb\.com\/(?:.*[?&]id=|dereferrer\/series\/)(\d+)/i);
        if (tvdb) ids.tvdbId = Number(tvdb[1]);
      }
      if (ids.imdbId && ids.tmdbId && ids.tvdbId) break;
    }
    return ids;
  }

  function slugYear(slug) {
    const match = slug.match(/-((?:19|20)\d{2})$/);
    return match ? Number(match[1]) : null;
  }

  function readTitleAndYear(slug) {
    const h1 = document.querySelector('#summary-wrapper h1, .mobile-title h1, h1');
    let title = null;
    let year = null;

    if (h1) {
      const yearNode = h1.querySelector('.year');
      if (yearNode) {
        const match = yearNode.textContent.match(/(19|20)\d{2}/);
        if (match) year = Number(match[0]);
      }
      const clone = h1.cloneNode(true);
      clone.querySelectorAll('.year, .certification, sup, .tagline, #add2arr-root').forEach((n) => n.remove());
      title = clone.textContent.replace(/\s+/g, ' ').trim() || null;
    }

    if (!year) {
      const meta = document.querySelector('meta[property="video:release_date"]')?.content;
      const match = String(meta || '').match(/(19|20)\d{2}/);
      year = match ? Number(match[0]) : slugYear(slug);
    }
    return { title, year };
  }

  function detect() {
    const target = pageTarget();
    if (!target) return null;

    const ids = findExternalIds();
    const { title, year } = readTitleAndYear(target.slug);
    if (!ids.imdbId && !ids.tmdbId && !ids.tvdbId && !title) return null;

    return {
      kind: target.kind,
      imdbId: ids.imdbId,
      tmdbId: target.kind === 'movie' ? ids.tmdbId : null,
      tvdbId: target.kind === 'series' ? ids.tvdbId : null,
      title,
      year
    };
  }

  const HEADINGS = ['#summary-wrapper h1', '.mobile-title h1', '#info-wrapper h1', 'h1'];

  // Sits inline inside the <h1>, right after the title/year text.
  function mount(host) {
    if (host.isConnected) return true;
    for (const selector of HEADINGS) {
      const h1 = document.querySelector(selector);
      if (!h1) continue;
      host.dataset.compact = '';
      host.style.margin = '0 0 0 14px';
      host.style.verticalAlign = 'middle';
      h1.appendChild(host);
      return true;
    }
    return false;
  }

  window.Add2Arr.createController({ detect, mount });
})();
