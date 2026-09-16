#!/usr/bin/env bash
#
# Prints the next CalVer version: YYYY.M.D.BUILD
#
# The Chrome Web Store accepts 1-4 dot-separated integers, each 0-65535, with no
# leading zeros — so months and days are printed unpadded (2026.9.16.0).
# BUILD counts how many releases already exist for today, so several releases
# can be cut on the same day.
set -euo pipefail

base="$(date -u +%Y).$(date -u +%-m).$(date -u +%-d)"

build=0
if git rev-parse --git-dir >/dev/null 2>&1; then
  build="$(git tag --list "v${base}.*" | wc -l | tr -d '[:space:]')"
fi

echo "${base}.${build}"
