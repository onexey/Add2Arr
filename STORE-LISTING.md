# Chrome Web Store listing

Copy-paste material for the [developer dashboard](https://chrome.google.com/webstore/devconsole).
Keep this file in sync whenever permissions or behaviour change.

---

## Item name

```
Add2Arr — Add to Radarr & Sonarr from IMDb and Trakt
```

## Short description (132 characters max)

```
Adds an "Add to Radarr / Sonarr" button to IMDb and Trakt.tv, with one-click adding and in-library status.
```

## Category

Productivity (alternative: Tools)

## Detailed description

```
Add2Arr puts a single button on IMDb and Trakt.tv pages so you can send a movie or TV
show straight to your own Radarr or Sonarr server — without copying titles between tabs.

FEATURES

• One-click adding — movies go to Radarr, TV shows go to Sonarr.
• At-a-glance status — the button tells you when a title is already in your library.
• Accurate matching — titles are resolved by IMDb, TMDB or TVDB id rather than by name,
  so you get the right entry and the right year.
• Your defaults, respected — pick the quality profile, root folder, monitoring options and
  whether to start searching immediately.
• Works with Sonarr v3 and v4, and Radarr v3 API (v4/v5 apps).

WHERE IT WORKS

• imdb.com title pages — movies, series and mini-series. Episode pages resolve to the
  parent series.
• trakt.tv movie and show pages.

SETUP

1. Open the extension options.
2. Enter your Radarr and/or Sonarr address (for example http://localhost:7878) and the API
   key from Settings → General → API Key.
3. Press "Connect & load settings", approve access to that address, then choose a quality
   profile and root folder, and save.

You can configure just Radarr, just Sonarr, or both.

PRIVACY

Add2Arr has no servers, no accounts, no analytics and no telemetry. Your settings and API
keys stay in your browser profile, and the only thing the extension ever contacts is the
Radarr/Sonarr address you typed in yourself. It is open source — read every line at
https://github.com/onexey/Add2Arr

NOT AFFILIATED

Add2Arr is an independent project and is not affiliated with, endorsed by, or connected to
IMDb, Trakt.tv, Radarr or Sonarr.
```

## Single purpose statement

```
Add2Arr has one purpose: to let a user send a movie or TV show they are viewing on IMDb or
Trakt.tv to their own self-hosted Radarr or Sonarr instance, and to show whether that title
is already in their library.
```

---

## Permission justifications

### `storage`

```
Stores the user's own configuration: their Radarr/Sonarr server addresses, API keys, and
their chosen quality profile, root folder and add options. This data is kept in
chrome.storage.local, is never transmitted anywhere by the extension, and can be erased
from the options page.
```

### Host access to `imdb.com` and `trakt.tv` (content scripts)

```
The button has to be shown on the title page the user is looking at, and the extension
needs to read that page's public identifiers (IMDb/TMDB/TVDB id, title, year) to know which
movie or show to add. Content scripts are limited to imdb.com/title/* and trakt.tv pages.
No data from these sites is collected, stored or transmitted to anyone other than the
user's own Radarr/Sonarr server.
```

### Optional host access to `http://*/*` and `https://*/*`

```
Radarr and Sonarr are self-hosted: a user's instance may be at http://localhost:7878, a LAN
address such as http://192.168.1.10:8989, or a personal domain such as
https://sonarr.example.com. There is no way to know that address in advance, so it cannot
be declared statically.

This permission is declared as OPTIONAL and is never held by default. It is requested at
runtime, through chrome.permissions.request, only for the single origin the user types into
the options page, and only when they press "Connect & load settings". A user who configures
only http://localhost:7878 grants access to exactly that origin.

The extension does not inject content scripts into, or read data from, any site other than
imdb.com and trakt.tv. This permission is used solely to make API calls (from the background
service worker) to the user's own media server.
```

### Remote code

```
None. The extension contains no remote code, no eval, and no external dependencies. All
logic ships in the package.
```

---

## Data usage disclosures

Tick **nothing** in the data collection matrix, and confirm all three certifications:

| Question | Answer |
| --- | --- |
| Does it collect personally identifiable information? | No |
| Health / financial / authentication / personal communications / location / web history / user activity? | No |
| Website content? | No — page identifiers are read and used locally to build the API request, never collected or transmitted to the developer |
| Sold to third parties? | No |
| Used or transferred for purposes unrelated to the single purpose? | No |
| Used to determine creditworthiness / for lending? | No |

Privacy policy URL:

```
https://github.com/onexey/Add2Arr/blob/main/PRIVACY.md
```

---

## Graphic assets

| Asset | Size | Required | Status |
| --- | --- | --- | --- |
| Store icon | 128×128 PNG | Yes | `icons/icon128.png` |
| Screenshots | 1280×800 PNG, 1–5 | Yes | `screenshots/store/` |
| Small promo tile | 440×280 | No | optional |
| Marquee promo tile | 1400×560 | No | optional |

The store accepts at most 5 screenshots. Recommended order — lead with the two states of
the button, since that is the whole product:

1. `imdb-movie-add-to-radarr.png` — the "Add to Radarr" button on an IMDb film.
2. `imdb-movie-in-radarr.png` — the same film showing the green "In Radarr" state.
3. `trakt-series-add-to-sonarr.png` — "Add to Sonarr" on a Trakt show.
4. `trakt-series-in-sonarr.png` — the green "In Sonarr" state on Trakt.
5. A screenshot of the **options page**, connected, with the quality profile and root
   folder dropdowns populated. **TODO** — blur or replace the API key first.

Also available: `imdb-series-add-to-sonarr.png`, `trakt-movie-add-to-radarr.png`,
`trakt-movie-in-radarr.png`, and `trakt-not-configured.png` (the "Set up Sonarr" prompt).

### Regenerating

Raw full-window captures are **not committed** — they include the browser's tab and
bookmarks bars. Crop them with:

```bash
scripts/crop-screenshot.sh imdb  screenshots/raw.jpeg screenshots/store/name.png
scripts/crop-screenshot.sh trakt screenshots/raw.jpeg screenshots/store/name.png
```

The script strips all browser chrome, scales to 1280 wide and pads to exactly 1280×800 in
the page's own background colour, so the padding is invisible.

---

## Distribution

- Visibility: **Public**
- Regions: all
- Pricing: free
- If the account is ever used for paid items, the EU trader declaration must be completed.
