#!/usr/bin/env bash
set -euo pipefail

repo="YonatanAriel/timer"
api="https://api.github.com/repos/${repo}/releases/latest"

url="$(
  curl -fsSL -H "Accept: application/vnd.github+json" "$api" | python3 -c '
import json, sys
release = json.load(sys.stdin)
for asset in release.get("assets", []):
    name = asset.get("name") or ""
    if name.endswith(".zip") and "mac" in name.lower():
        print(asset["browser_download_url"])
        break
else:
    sys.exit("No macOS .zip on the latest GitHub release. Tag a version so CI can publish one.")
'
)"

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
curl -fsSL -o "$tmp/timer.zip" "$url"
ditto -x -k "$tmp/timer.zip" "$tmp"

app="$(find "$tmp" -name '20 20 20 Timer.app' -type d | head -n 1)"
if [ -z "$app" ]; then
  echo "The downloaded zip did not contain 20 20 20 Timer.app" >&2
  exit 1
fi

dest="/Applications/20 20 20 Timer.app"
rm -rf "$dest"
ditto "$app" "$dest"
xattr -cr "$dest" 2>/dev/null || true
open "$dest"
echo "Installed to $dest"
