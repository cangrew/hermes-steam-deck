# Recommended Steam Input layout

The app reads the controller directly (Gamepad API) **and** responds to keyboard
keys. Mapping the controls to keys in Steam Input gives a reliable fallback and
makes the trackpads/triggers behave well. Configure this under
**Steam button → Controller Settings** for the Hermes shortcut.

## Buttons → keyboard (fallback parity)

| Control            | Action in app            | Suggested key binding |
| ------------------ | ------------------------ | --------------------- |
| D-pad / Left stick | Move focus               | Arrow keys ↑ ↓ ← →    |
| A                  | Select / activate        | Enter                 |
| B                  | Back / cancel / close OSK | Escape               |
| X                  | Open on-screen keyboard  | (handled in-app)      |
| Y                  | Context / secondary      | (handled in-app)      |
| L1 / R1 (bumpers)  | Previous / next tab      | (handled in-app)      |
| L2 / R2 (triggers) | Scroll up / down         | Page Up / Page Down   |
| Right trackpad     | Mouse cursor             | As Mouse              |
| Left trackpad      | Scroll                   | As Mouse Scroll       |
| Steam + X          | Steam on-screen keyboard | (system)              |

## Why both?

- **Gamepad API** drives the gold focus cursor, auto-repeat, and the action
  buttons directly — no Steam mapping required for core navigation.
- **Keyboard bindings** ensure the UI still works if the browser doesn't expose
  the pad as a standard gamepad in a given SteamOS/Gamescope build, and make the
  app usable when docked with a keyboard.
- **Trackpad as mouse** lets you tap any control directly, exactly like touch.

Tip: the bottom hint bar in the app always shows the current button actions.
