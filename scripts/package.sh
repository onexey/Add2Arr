#!/usr/bin/env bash
#
# Builds a Chrome Web Store upload zip in dist/.
#
# Usage:
#   scripts/package.sh            # version from scripts/calver.sh
#   scripts/package.sh 2026.9.16.0
#
# The manifest version is patched inside the build copy only, so the working
# tree is never modified and CI never has to commit back to main.
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root"

version="${1:-$(scripts/calver.sh)}"

# Chrome Web Store: 1-4 dot-separated integers, 0-65535, no leading zeros.
if ! [[ "$version" =~ ^(0|[1-9][0-9]*)(\.(0|[1-9][0-9]*)){0,3}$ ]]; then
  echo "error: '$version' is not a valid Chrome Web Store version" >&2
  exit 1
fi
IFS='.' read -ra parts <<<"$version"
for part in "${parts[@]}"; do
  if ((part > 65535)); then
    echo "error: version component '$part' exceeds the 65535 maximum" >&2
    exit 1
  fi
done

staging="dist/build"
zip_path="dist/add2arr-${version}.zip"

rm -rf "$staging" "$zip_path"
mkdir -p "$staging"

cp manifest.json "$staging/"
cp -R src icons "$staging/"

# Keep only what the extension actually loads.
find "$staging" -name '.DS_Store' -delete

manifest="$staging/manifest.json"
sed -i.bak -E "s/(\"version\"[[:space:]]*:[[:space:]]*\")[^\"]*(\")/\1${version}\2/" "$manifest"
rm -f "$manifest.bak"

if ! grep -q "\"version\": \"${version}\"" "$manifest"; then
  echo "error: failed to set version in manifest.json" >&2
  exit 1
fi

(cd "$staging" && zip -qr "../../$zip_path" . -x '.*' -x '**/.*')

echo "$zip_path"
