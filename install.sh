#!/usr/bin/env bash
# Hermes for Steam Deck — installer.
#
# Two ways to use it:
#   1) One-liner (downloads the latest prebuilt bundle):
#        curl -fsSL https://github.com/cangrew/hermes-steam-deck/raw/release/install.sh | bash
#   2) Offline, from inside an extracted bundle:
#        ./install.sh
#
# It installs to ~/Applications/hermes-deck, adds an application-menu entry, and
# prints how to add it to Steam. Re-running upgrades in place.
#
# Options:
#   --uninstall   Remove the install and the menu entry.
#
# Env:
#   HERMES_HOME   Install directory (default ~/Applications/hermes-deck)

set -euo pipefail

REPO_RAW="https://github.com/cangrew/hermes-steam-deck/raw/release"
TARBALL="hermes-deck-latest.tar.gz"
INSTALL_DIR="${HERMES_HOME:-$HOME/Applications/hermes-deck}"
DESKTOP_DIR="$HOME/.local/share/applications"
DESKTOP_FILE="$DESKTOP_DIR/hermes-deck.desktop"

log()  { printf '\033[1;36m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m !!\033[0m %s\n' "$*"; }
die()  { printf '\033[1;31m xx\033[0m %s\n' "$*" >&2; exit 1; }

uninstall() {
  log "Removing $INSTALL_DIR and the menu entry"
  rm -rf "$INSTALL_DIR"
  rm -f "$DESKTOP_FILE"
  command -v update-desktop-database >/dev/null 2>&1 && update-desktop-database "$DESKTOP_DIR" >/dev/null 2>&1 || true
  log "Uninstalled."
  exit 0
}

[ "${1:-}" = "--uninstall" ] && uninstall

# --- Locate the source: local extracted bundle, or download the latest ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-.}")" 2>/dev/null && pwd || echo "$PWD")"
SRC=""
if [ -d "$SCRIPT_DIR/dist" ] && [ -f "$SCRIPT_DIR/deck/launch-kiosk.sh" ]; then
  SRC="$SCRIPT_DIR"
  log "Installing from local bundle: $SRC"
else
  log "Downloading $TARBALL …"
  TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL "$REPO_RAW/$TARBALL" -o "$TMP/bundle.tar.gz" || die "Download failed."
  elif command -v wget >/dev/null 2>&1; then
    wget -qO "$TMP/bundle.tar.gz" "$REPO_RAW/$TARBALL" || die "Download failed."
  else
    die "Need curl or wget to download the bundle."
  fi
  tar xzf "$TMP/bundle.tar.gz" -C "$TMP"
  SRC="$(find "$TMP" -maxdepth 1 -type d -name 'hermes-deck-*' | head -n1)"
  [ -n "$SRC" ] && [ -d "$SRC/dist" ] || die "Extracted bundle looks wrong."
fi

# --- Install files ---
log "Installing to $INSTALL_DIR"
mkdir -p "$INSTALL_DIR"
rm -rf "$INSTALL_DIR/dist" "$INSTALL_DIR/deck"
cp -r "$SRC/dist" "$SRC/deck" "$INSTALL_DIR/"
[ -f "$SRC/README.md" ] && cp "$SRC/README.md" "$INSTALL_DIR/"
[ -f "$SRC/install.sh" ] && cp "$SRC/install.sh" "$INSTALL_DIR/" && chmod +x "$INSTALL_DIR/install.sh"
chmod +x "$INSTALL_DIR/deck/launch-kiosk.sh"

# --- Application-menu entry (KDE / Desktop Mode) ---
log "Creating menu entry"
mkdir -p "$DESKTOP_DIR"
cat > "$DESKTOP_FILE" <<DESK
[Desktop Entry]
Type=Application
Name=Hermes (Steam Deck)
Comment=Controller-first front end for the Nous Research Hermes Agent
Exec=$INSTALL_DIR/deck/launch-kiosk.sh
Icon=$INSTALL_DIR/dist/icon.svg
Terminal=false
Categories=Network;Utility;
DESK
chmod +x "$DESKTOP_FILE" 2>/dev/null || true
command -v update-desktop-database >/dev/null 2>&1 && update-desktop-database "$DESKTOP_DIR" >/dev/null 2>&1 || true

# --- Browser check ---
if command -v flatpak >/dev/null 2>&1 && \
   { flatpak info com.google.Chrome >/dev/null 2>&1 || flatpak info org.chromium.Chromium >/dev/null 2>&1; }; then
  :
elif command -v google-chrome-stable >/dev/null 2>&1 || command -v chromium >/dev/null 2>&1; then
  :
else
  warn "No Chrome/Chromium found — install 'Google Chrome' from Discover (Desktop Mode)."
fi

cat <<DONE

✅ Installed.

  Location:  $INSTALL_DIR
  Launch:    $INSTALL_DIR/deck/launch-kiosk.sh
             (or find "Hermes (Steam Deck)" in your app menu)

Add to Steam for Gaming Mode:
  Steam → Add a Non-Steam Game → Browse →
    $INSTALL_DIR/deck/launch-kiosk.sh
  In its Properties, set Launch Options:  KIOSK=1 %command%

Then open it, go to Settings, set your Hermes API URL + key, and Connect.
Uninstall any time with:  $INSTALL_DIR/install.sh --uninstall
DONE
