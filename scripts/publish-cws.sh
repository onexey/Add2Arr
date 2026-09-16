#!/usr/bin/env bash
#
# Uploads (and optionally publishes) a zip to the Chrome Web Store.
#
# Usage:
#   scripts/publish-cws.sh dist/add2arr-2026.9.16.0.zip          # upload as draft
#   PUBLISH=true scripts/publish-cws.sh dist/add2arr-...zip      # upload + submit for review
#
# Required environment variables:
#   CWS_EXTENSION_ID       the item id from the developer dashboard URL
#   CWS_CLIENT_ID          OAuth client id      (Google Cloud console)
#   CWS_CLIENT_SECRET      OAuth client secret
#   CWS_REFRESH_TOKEN      OAuth refresh token with scope
#                          https://www.googleapis.com/auth/chromewebstore
set -euo pipefail

zip_path="${1:?usage: publish-cws.sh <zip>}"
[[ -f "$zip_path" ]] || { echo "error: $zip_path not found" >&2; exit 1; }

for var in CWS_EXTENSION_ID CWS_CLIENT_ID CWS_CLIENT_SECRET CWS_REFRESH_TOKEN; do
  [[ -n "${!var:-}" ]] || { echo "error: $var is not set" >&2; exit 1; }
done

json_field() {
  # Extracts a top-level string field without requiring jq.
  grep -o "\"$1\"[[:space:]]*:[[:space:]]*\"[^\"]*\"" | head -1 | sed -E 's/.*"([^"]*)"$/\1/'
}

echo "==> Requesting access token"
token_response="$(curl -sS -X POST https://oauth2.googleapis.com/token \
  -d "client_id=${CWS_CLIENT_ID}" \
  -d "client_secret=${CWS_CLIENT_SECRET}" \
  -d "refresh_token=${CWS_REFRESH_TOKEN}" \
  -d 'grant_type=refresh_token')"

access_token="$(printf '%s' "$token_response" | json_field access_token)"
if [[ -z "$access_token" ]]; then
  echo "error: could not obtain an access token" >&2
  printf '%s\n' "$token_response" | sed -E 's/"(refresh_token|access_token)":"[^"]*"/"\1":"***"/g' >&2
  exit 1
fi

echo "==> Uploading $zip_path to item $CWS_EXTENSION_ID"
upload_response="$(curl -sS -X PUT \
  -H "Authorization: Bearer ${access_token}" \
  -H 'x-goog-api-version: 2' \
  -T "$zip_path" \
  "https://www.googleapis.com/upload/chromewebstore/v1.1/items/${CWS_EXTENSION_ID}")"

upload_state="$(printf '%s' "$upload_response" | json_field uploadState)"
if [[ "$upload_state" != "SUCCESS" ]]; then
  echo "error: upload failed (uploadState=${upload_state:-unknown})" >&2
  printf '%s\n' "$upload_response" >&2
  exit 1
fi
echo "    upload succeeded"

if [[ "${PUBLISH:-false}" != "true" ]]; then
  echo "==> PUBLISH is not 'true' — the new version is saved as a draft."
  exit 0
fi

echo "==> Submitting for review"
publish_response="$(curl -sS -X POST \
  -H "Authorization: Bearer ${access_token}" \
  -H 'x-goog-api-version: 2' \
  -H 'Content-Length: 0' \
  "https://www.googleapis.com/chromewebstore/v1.1/items/${CWS_EXTENSION_ID}/publish")"

if printf '%s' "$publish_response" | grep -q '"error'; then
  echo "error: publish failed" >&2
  printf '%s\n' "$publish_response" >&2
  exit 1
fi
printf '%s\n' "$publish_response"
echo "==> Submitted. Google review typically takes a few days."
