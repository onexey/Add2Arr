# Add2Arr

A Chromium browser extension (Manifest V3) that adds a one-click **Add to Radarr / Sonarr**
button to IMDb and Trakt.tv pages.

- **IMDb** — `imdb.com/title/tt…` pages (movies, series, mini-series; episode pages resolve to their parent series)
- **Trakt.tv** — `trakt.tv/movies/<slug>` and `trakt.tv/shows/<slug>` pages

Movies go to Radarr, TV shows go to Sonarr. The button also shows whether the title is
**already in your library**.

## Install (unpacked)

1. Open `chrome://extensions` and enable **Developer mode**.
2. Click **Load unpacked** and select this folder.
3. Open the extension's **Options** page (via the toolbar icon or the extensions menu).
4. For each of Radarr and Sonarr:
   - enter the server URL (e.g. `http://localhost:7878`) and the API key
     (*Settings → General → API Key* in Radarr/Sonarr),
   - click **Connect & load settings** and approve the host-access prompt,
   - pick a quality profile and root folder,
   - click **Save**.

You can configure only Radarr or only Sonarr; the other button will just prompt you to set it up.

## How it works

```
content script (imdb.js / trakt.js)   detects the title on the page
        │  extracts IMDb / TMDB / TVDB id + title + year
        ▼
ui.js   renders a shadow-DOM button and sends a message
        ▼
background/service-worker.js          only place that talks to the network
        ▼
lib/arr.js
   GET  /api/v3/{movie,series}/lookup?term=imdb:tt…   → resolves the title
                                                       (result id > 0 ⇒ already in library)
   POST /api/v3/{movie,series}                       → adds it
```

Radarr needs a TMDB id and Sonarr needs a TVDB id, but both expose lookup endpoints that
accept `imdb:`, `tmdb:` and `tvdb:` terms — so no TMDB/TVDB API keys are required. If no
external id can be found on the page, it falls back to a `title + year` search and only
accepts a result whose year matches.

Sonarr v3 and v4 are both supported: the version is read from `/api/v3/system/status` and
`languageProfileId` is only sent to v3.

## Permissions

| Permission | Why |
| --- | --- |
| `storage` | stores your settings in `chrome.storage.local` (this browser profile only) |
| content scripts on `imdb.com` / `trakt.tv` | to detect the title and inject the button |
| optional host access | granted per-server when you click **Connect & load settings** |

API keys are never exposed to the page: all requests are made from the background service
worker with an `X-Api-Key` header, and only to the server URLs you configured.

## Layout

```
manifest.json
icons/
src/
  background/service-worker.js   message router, permission/config guards
  content/ui.js                  shared shadow-DOM button + SPA navigation handling
  content/imdb.js                IMDb detection (JSON-LD based) + mounting
  content/trakt.js               Trakt detection (external links) + mounting
  lib/arr.js                     Radarr/Sonarr v3 API client
  lib/storage.js                 settings schema + defaults
  options/                       settings UI
```

## Notes & limitations

- Only the main movie/show pages are handled — list, search and grid pages are not (yet).
- One Radarr and one Sonarr instance are supported.
- If the site markup changes and no anchor is found, the button falls back to a floating
  pill in the bottom-right corner so it keeps working.
