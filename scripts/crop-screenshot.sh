#!/usr/bin/env bash
#
# Crops a full-window browser screenshot down to the page content and writes a
# 1280x800 PNG suitable for the Chrome Web Store.
#
# Usage:
#   scripts/crop-screenshot.sh imdb    screenshots/raw.jpeg screenshots/store/out.png
#   scripts/crop-screenshot.sh trakt   screenshots/raw.jpeg screenshots/store/out.png
#   scripts/crop-screenshot.sh options screenshots/raw.png  screenshots/store/out.png
#
# Crop regions are expressed as fractions of the source image, so any capture of
# a full Chrome window with the same toolbars will crop correctly regardless of
# resolution. The imdb/trakt crops remove all browser chrome — tab bar, address
# bar and bookmarks bar — so no personal data ends up in a published screenshot.
# The `options` mode expects a full-page capture of the extension's own options
# page, which has no browser chrome to begin with.
#
# Requires macOS `sips`.
set -euo pipefail

site="${1:?usage: crop-screenshot.sh <imdb|trakt|options> <input> <output>}"
in="${2:?usage: crop-screenshot.sh <imdb|trakt|options> <input> <output>}"
out="${3:?usage: crop-screenshot.sh <imdb|trakt|options> <input> <output>}"

case "$site" in
  imdb)    fx=0.0851; fy=0.1791; fw=0.8268; fh=0.8209; pad=000000 ;;
  trakt)   fx=0.1400; fy=0.1337; fw=0.8400; fh=0.8642; pad=FFFFFF ;;
  # Frames the heading plus the first settings card.
  options) fx=0.1448; fy=0.0287; fw=0.7105; fh=0.6395; pad=F6F7F9 ;;
  *) echo "error: unknown site '$site' (expected imdb, trakt or options)" >&2; exit 1 ;;
esac

[[ -f "$in" ]] || { echo "error: $in not found" >&2; exit 1; }
mkdir -p "$(dirname "$out")"

src_w="$(sips -g pixelWidth  "$in" | awk '/pixelWidth/{print $2}')"
src_h="$(sips -g pixelHeight "$in" | awk '/pixelHeight/{print $2}')"

x=$(printf '%.0f' "$(echo "$src_w * $fx" | bc -l)")
y=$(printf '%.0f' "$(echo "$src_h * $fy" | bc -l)")
w=$(printf '%.0f' "$(echo "$src_w * $fw" | bc -l)")
h=$(printf '%.0f' "$(echo "$src_h * $fh" | bc -l)")

work="${out%.png}.work.png"
# Crop, scale to 1280 wide, then pad to exactly 1280x800 in the page's own
# background colour so the padding is invisible.
sips -s format png -c "$h" "$w" --cropOffset "$y" "$x" "$in" --out "$work" >/dev/null
sips -Z 1280 "$work" --out "$work" >/dev/null
sips -p 800 1280 --padColor "$pad" "$work" --out "$out" >/dev/null
rm -f "$work"

echo "$out ($(sips -g pixelWidth -g pixelHeight "$out" | awk '/pixel/{printf "%s ", $2}'))"
