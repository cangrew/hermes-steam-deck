# Hermes for Steam Deck — v0.1.5 (prebuilt)

Ready-to-run build — no Node, no `npm install`, no compiling. You only need a
Chromium-class browser and Python 3 (both easy on SteamOS).

## What's new in v0.1.5

- **Gaming Mode controller input fixed.** The launcher now grants the flatpak
  browser udev access (`--filesystem=/run/udev:ro`), which is what Chromium
  needs to see Steam Input's virtual gamepad. The standard **"Gamepad with
  Mouse Trackpad"** controller template now works out of the box — no custom
  keyboard layout required.
- Smarter gamepad selection: the app prefers the standard-mapping pad (Steam
  Input's virtual Xbox 360 pad) over phantom or raw devices.
- The **Input diagnostics** panel (Settings) now lists every gamepad the
  browser sees — id, mapping, and which one the app uses.
- Docs updated: gamepad template is the primary layout; keyboard+mouse remains
  a documented fallback (see deck/steam-input-layout.md).
- Tip: the browser hides gamepads until the **first button press** — press any
  button once if nothing reacts right after launch.

## Easiest install (one-liner)

In **Desktop Mode**, open Konsole and run:

```bash
curl -fsSL https://github.com/cangrew/hermes-steam-deck/raw/release/install.sh | bash
```

Installs to `~/Applications/hermes-deck`, adds a **Hermes (Steam Deck)** app-menu
entry, and prints how to add it to Steam. Uninstall:
`~/Applications/hermes-deck/install.sh --uninstall`.

## Or install from this archive (offline)

```bash
tar xzf hermes-deck-v0.1.5.tar.gz
cd hermes-deck-v0.1.5
./install.sh                 # installs + creates the menu entry
# …or just run it in place:
chmod +x deck/launch-kiosk.sh && ./deck/launch-kiosk.sh
```

## What's inside

```
install.sh                installer (also supports --uninstall)
dist/                     the compiled app
deck/launch-kiosk.sh      launcher (maximized window by default; KIOSK=1 = fullscreen)
deck/serve.py             static server + /__exit__ shutdown hook
deck/add-non-steam-shortcut.md
deck/steam-input-layout.md
```

## Closing it

The app opens a normal **maximized window** by default. Close it with the
window's **X**, **Alt+F4**, or the in-app **⏻ Quit** button (top-right and in
Settings). In Gaming Mode (`KIOSK=1`), the STEAM button → Exit Game also works.

## First run

Install Google Chrome/Chromium from **Discover** if you haven't. Launch the app,
open **Settings**, set your Hermes **API base URL** + **API key** (default
`http://127.0.0.1:8642`), and **Connect**.

## Gaming Mode (controller)

Add `deck/launch-kiosk.sh` as a **non-Steam game**; set its Launch Options to
`KIOSK=1 %command%`. Details: `deck/add-non-steam-shortcut.md`.

## Controls

D-pad/stick = move focus · A = select · B = back · X = keyboard ·
L1/R1 = switch tab · L2/R2 = scroll · touch/trackpad = tap anything.
