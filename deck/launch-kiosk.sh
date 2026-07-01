#!/usr/bin/env bash
# Launch the Hermes front end in a browser on the Steam Deck.
#
# By default this opens a normal MAXIMIZED window (with a close button and an
# in-app Quit button) so you can always get out — even without a keyboard.
# Set KIOSK=1 for true fullscreen kiosk; only do that in Gaming Mode, where the
# STEAM button -> Exit Game always works.
#
# Add this script as a non-Steam game to launch it from Gaming Mode. See
# add-non-steam-shortcut.md.
#
# Usage:
#   ./launch-kiosk.sh                 # serve ./dist and open a maximized window
#   KIOSK=1 ./launch-kiosk.sh         # fullscreen kiosk (Gaming Mode)
#   URL=http://host:1234 ./launch-kiosk.sh   # open an already-running URL
#
# Environment:
#   URL    Front-end URL to open. If unset, ./dist is served locally.
#   PORT   Port for the built-in static server (default 4173).
#   KIOSK  Set to 1 for fullscreen kiosk instead of a maximized window.

set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${PORT:-4173}"
URL="${URL:-http://127.0.0.1:${PORT}}"

# If pointing at the local default, serve the production build ourselves using
# the small control server (it powers the in-app Quit button via /__exit__).
SERVER_PID=""
if [[ "$URL" == "http://127.0.0.1:${PORT}" ]]; then
  if [ ! -d "$ROOT/dist" ]; then
    echo "No build found at $ROOT/dist. Use the prebuilt bundle or run 'npm run build'." >&2
    exit 1
  fi
  echo "Serving $ROOT/dist on :$PORT"
  PORT="$PORT" SERVE_DIR="$ROOT/dist" python3 "$ROOT/deck/serve.py" &
  SERVER_PID=$!
  trap '[ -n "$SERVER_PID" ] && kill "$SERVER_PID" 2>/dev/null || true' EXIT
  sleep 1
fi

# Find a Chromium-class browser. SteamOS ships Flatpak Chrome/Chromium commonly.
launch_browser() {
  local url="$1"
  # A dedicated profile dir forces a NEW browser instance that honors our window
  # flags. Without it, an already-running Chrome would just open the URL as a tab
  # in the existing session and ignore them. The path is stable so the app's
  # settings persist between launches.
  local profile="${HERMES_KIOSK_PROFILE:-$HOME/.hermes-kiosk}"
  local mode=(--start-maximized)
  [ "${KIOSK:-0}" = "1" ] && mode=(--kiosk --start-fullscreen)
  local args=(
    --user-data-dir="$profile"
    --no-first-run --noerrdialogs
    --disable-pinch --overscroll-history-navigation=0
    --autoplay-policy=no-user-gesture-required
    "${mode[@]}"
    "--app=${url}"
  )
  # Foreground (no `exec`) so the EXIT trap fires and stops the static server.
  # Flatpak sandbox holes needed for the browser Gamepad API:
  #   --device=all              access to the /dev/input device nodes
  #   --filesystem=/run/udev:ro Chromium enumerates gamepads via the udev
  #                             database; without it the browser sees no pads at
  #                             all — this is why Steam Input's virtual X360 pad
  #                             was invisible in Gaming Mode.
  local fp_args=(--device=all --filesystem=/run/udev:ro)
  if command -v flatpak >/dev/null && flatpak info com.google.Chrome >/dev/null 2>&1; then
    flatpak run "${fp_args[@]}" com.google.Chrome "${args[@]}"
  elif command -v flatpak >/dev/null && flatpak info org.chromium.Chromium >/dev/null 2>&1; then
    flatpak run "${fp_args[@]}" org.chromium.Chromium "${args[@]}"
  elif command -v google-chrome-stable >/dev/null; then
    google-chrome-stable "${args[@]}"
  elif command -v chromium >/dev/null; then
    chromium "${args[@]}"
  else
    echo "No Chromium/Chrome found. Install Chrome via Discover (flatpak) first." >&2
    exit 1
  fi
}

echo "Opening $URL ${KIOSK:+(kiosk) }— close with the in-app Quit button, the window's X, or Alt+F4"
launch_browser "$URL"
