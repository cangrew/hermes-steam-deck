#!/usr/bin/env bash
# Launch the Hermes front end full-screen in a kiosk browser on the Steam Deck.
#
# Add this script as a non-Steam game so it opens in Gaming Mode with Steam
# Input controller support. See add-non-steam-shortcut.md.
#
# Usage:
#   ./launch-kiosk.sh                 # serves the built ./dist and opens it
#   URL=http://127.0.0.1:4173 ./launch-kiosk.sh   # open an already-running URL
#
# Environment:
#   URL    Front-end URL to open. If unset, a static server is started for ./dist.
#   PORT   Port for the built-in static server (default 4173).

set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${PORT:-4173}"
URL="${URL:-http://127.0.0.1:${PORT}}"

# If no external URL was given, serve the production build locally.
SERVER_PID=""
if [ -z "${URL_EXTERNAL:-}" ] && [[ "$URL" == "http://127.0.0.1:${PORT}" ]]; then
  if [ ! -d "$ROOT/dist" ]; then
    echo "No build found. Run 'npm run build' first." >&2
    exit 1
  fi
  echo "Serving $ROOT/dist on :$PORT"
  ( cd "$ROOT/dist" && python3 -m http.server "$PORT" --bind 127.0.0.1 ) &
  SERVER_PID=$!
  trap '[ -n "$SERVER_PID" ] && kill "$SERVER_PID" 2>/dev/null || true' EXIT
  sleep 1
fi

# Find a Chromium-class browser. SteamOS ships Flatpak Chrome/Chromium commonly.
launch_browser() {
  local url="$1"
  local args=(
    --kiosk --start-fullscreen --no-first-run --noerrdialogs
    --disable-pinch --overscroll-history-navigation=0
    --autoplay-policy=no-user-gesture-required
    "--app=${url}"
  )
  # Run in the foreground (no `exec`) so the EXIT trap still fires and stops the
  # static server we may have started — otherwise port 4173 stays occupied.
  if command -v flatpak >/dev/null && flatpak info com.google.Chrome >/dev/null 2>&1; then
    flatpak run com.google.Chrome "${args[@]}"
  elif command -v flatpak >/dev/null && flatpak info org.chromium.Chromium >/dev/null 2>&1; then
    flatpak run org.chromium.Chromium "${args[@]}"
  elif command -v google-chrome-stable >/dev/null; then
    google-chrome-stable "${args[@]}"
  elif command -v chromium >/dev/null; then
    chromium "${args[@]}"
  else
    echo "No Chromium/Chrome found. Install via Discover (flatpak) first." >&2
    exit 1
  fi
}

echo "Opening $URL"
launch_browser "$URL"
