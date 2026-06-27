# Run Hermes on the Steam Deck (Gaming Mode)

This makes the front end launch like any other game — full screen, controller-driven.

## 1. Install a browser (one-time)

In **Desktop Mode**, open **Discover** and install **Google Chrome** or **Chromium**
(Flatpak). The kiosk script auto-detects either.

## 2. Get the app onto the Deck

Either:

- **Run it on the Deck:** copy this repo to the Deck, then in Desktop Mode:
  ```bash
  npm install
  npm run build
  ```
- **Or host it elsewhere** (any static host / `npm run preview` on your PC) and just
  point the shortcut at that URL with `URL=http://<host>:<port>`.

## 3. Make the launch script executable

```bash
chmod +x deck/launch-kiosk.sh
```

## 4. Add as a non-Steam game

1. In **Steam → Library**, click **Add a Game → Add a Non-Steam Game → Browse**.
2. Select `deck/launch-kiosk.sh` (set the file filter to *All Files* if needed).
3. In the shortcut's **Properties**, optionally set **Launch Options**, e.g.
   `URL=http://192.168.1.50:4173 %command%` to point at a remote host.
4. Rename it to **Hermes**.

## 5. Apply the controller layout

Launch the shortcut once in **Gaming Mode**, press the **Steam** button →
**Controller Settings**, and apply the mapping in [`steam-input-layout.md`](./steam-input-layout.md).
This makes the D-pad/stick move focus, A select, B back, etc. — and provides
keyboard fallbacks so the UI is fully usable even before any gamepad polling.

## 6. Connect to your agent

On first launch, go to **Settings** in the app and set the **API base URL** and
**API key** for your Hermes API server (see the main [README](../README.md)).
The default is `http://127.0.0.1:8642` for Hermes running on the Deck itself.

## Notes

- The app also reads the **physical controller** directly via the browser Gamepad
  API, so navigation works even with a minimal Steam Input layout.
- Text entry uses the built-in on-screen keyboard (press **X** or activate any
  field). The Steam OSK (**STEAM + X**) also works when it attaches to a field.

## Troubleshooting

- **"Opening in existing browser session" / no fullscreen window:** Chrome was
  already running, so it opened the app as a tab in that window. The launcher
  now starts a dedicated browser instance (`--user-data-dir`) to avoid this. If
  you still see it, fully quit Chrome and relaunch, or set a different profile:
  `HERMES_KIOSK_PROFILE=$HOME/.hermes-kiosk2 ./deck/launch-kiosk.sh`.
- **`Failed to load module "canberra-gtk-module"` / `Read channel stable`:**
  harmless warnings from Chrome on SteamOS; ignore them.
