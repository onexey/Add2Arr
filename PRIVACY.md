# Privacy Policy — Add2Arr

_Last updated: 16 September 2026_

## Summary

**Add2Arr does not collect, transmit, store or sell any personal data.**

There is no Add2Arr server, no analytics, no telemetry, no crash reporting and no
third-party service of any kind. The extension talks only to the Radarr and Sonarr
servers whose addresses you enter yourself.

## What the extension stores

Add2Arr saves your configuration using the browser's `chrome.storage.local` API. It never
leaves your browser profile and is not synced to any Google or Add2Arr account:

- the Radarr/Sonarr server URLs you enter,
- the API keys you enter,
- your chosen quality profile, root folder and add options.

You can erase all of it at any time with the **Clear** button on the options page, or by
removing the extension.

## What the extension sends, and where

When you open a supported IMDb or Trakt.tv page, Add2Arr reads the title's public
identifiers (IMDb/TMDB/TVDB id, name, year) **from the page you are already viewing**. It
sends those identifiers to your own Radarr or Sonarr server in order to:

1. check whether the title is already in your library, and
2. add it when you click the button.

Requests go **only** to the server URLs you configured, carry your API key in the
`X-Api-Key` header, and are made from the extension's background service worker — the API
key is never exposed to the IMDb or Trakt.tv page.

No data is sent anywhere else. No request is made to IMDb, Trakt.tv or any other host.

## Permissions and why they are needed

| Permission | Purpose |
| --- | --- |
| `storage` | Saves your settings locally, as described above. |
| Access to `imdb.com` and `trakt.tv` | Reads the title identifiers on the page and displays the button. Nothing is written to those sites and nothing is read from them beyond the title metadata. |
| Optional access to any `http`/`https` origin | A self-hosted Radarr/Sonarr server can live at any address (`http://localhost:7878`, a LAN IP, a personal domain). The permission is requested **at runtime, for the single origin you type in**, when you press "Connect & load settings". Add2Arr does not inject scripts into, or read data from, any site other than IMDb and Trakt.tv. |

## Browsing history

Add2Arr does not record, store or transmit your browsing history. Its content scripts run
only on `imdb.com/title/*` and `trakt.tv` pages, and only for as long as such a page is
open.

## Children

Add2Arr is a utility for self-hosted media tooling and is not directed at children.

## Changes

Any change to this policy will be published in this file in the project repository, and
the "last updated" date above will change accordingly.

## Contact

Questions or concerns: please open an issue at
<https://github.com/onexey/Add2Arr/issues>.
