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
scripts/                         calver / packaging / store upload
.github/workflows/release.yml    CalVer release automation
```

## Releasing

Versions are **CalVer**: `YYYY.M.D.BUILD` (e.g. `2026.9.16.0`). Components are unpadded
because the Chrome Web Store requires integers of 0–65535 with no leading zeros. `BUILD`
counts releases already cut today, so several are possible per day.

```bash
scripts/calver.sh                     # print the next version
scripts/package.sh                    # build dist/add2arr-<version>.zip
scripts/package.sh 2026.9.16.1        # ...with an explicit version
```

`package.sh` patches the version inside the build copy only — the `version` in the
committed `manifest.json` is just a placeholder and the working tree is never modified, so
CI never has to commit back to `main`.

### Automation

`.github/workflows/release.yml`:

- **every push to `main`** (excluding markdown-only changes, or commits containing
  `[skip release]`) builds the zip and publishes a tagged GitHub release with generated
  notes;
- **Chrome Web Store upload is deliberately manual** — run the workflow via
  *Actions → Release → Run workflow* with **publish** ticked. Pushing every commit into the
  store would queue a human review each time.

Store uploads need these repository secrets on a `chrome-web-store`
[environment](https://docs.github.com/actions/deployment/targeting-different-environments):
`CWS_EXTENSION_ID`, `CWS_CLIENT_ID`, `CWS_CLIENT_SECRET`, `CWS_REFRESH_TOKEN`
(OAuth scope `https://www.googleapis.com/auth/chromewebstore`). Locally:

```bash
PUBLISH=true scripts/publish-cws.sh dist/add2arr-2026.9.16.0.zip
```

Omit `PUBLISH=true` to upload a draft without submitting for review.

See [STORE-LISTING.md](STORE-LISTING.md) for the listing copy and permission
justifications, and [PRIVACY.md](PRIVACY.md) for the privacy policy.

## Notes & limitations

- Only the main movie/show pages are handled — list, search and grid pages are not (yet).
- One Radarr and one Sonarr instance are supported.
- The button is injected inline into the page's `<h1>`, right after the title. If no
  heading is found (e.g. after a site redesign) it falls back to a floating pill in the
  bottom-right corner so it keeps working.
