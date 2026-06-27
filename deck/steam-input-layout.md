# Recommended Steam Input layout

**Important:** on the Steam Deck, the most reliable way to drive a web app is a
**keyboard + mouse** controller layout — *not* the default "Gamepad" template.
Under Gamescope the emulated gamepad usually isn't visible to the browser, so the
app sees nothing from the controller and only the touchscreen works. Mapping the
controls to keyboard keys and a mouse fixes that.

Configure this under **Steam button → Controller Settings** for the Hermes
shortcut (or the game's gear icon → **Controller Layout** in Gaming Mode).

## Recommended mapping (keyboard + mouse)

| Control            | Bind to                | Does in app                  |
| ------------------ | ---------------------- | ---------------------------- |
| **Right trackpad** | **Mouse**              | Move the cursor (tap = touch)|
| **Right trigger R2** | **Left Mouse Click** | Click / select               |
| Left trigger L2    | Right Mouse Click      | —                            |
| **D-pad**          | **Arrow keys** ↑↓←→    | Move focus                   |
| Left stick         | Arrow keys (or Mouse)  | Move focus                   |
| **A**              | **Enter / Return**     | Select / activate            |
| **B**              | **Escape**             | Back / close keyboard        |
| L1 (left bumper)   | `[`                    | Previous tab                 |
| R1 (right bumper)  | `]`                    | Next tab                     |
| L4/R4 or triggers  | Page Up / Page Down    | Scroll                       |
| Steam + X          | (system on-screen kbd) | Type into a field            |

The quickest path: in the layout editor, start from the **"Web Browser"** or
**"Keyboard (WASD) Mouse"** template, then set **D-pad → Arrow keys**, **A →
Enter**, **B → Escape**. That alone makes the whole UI usable. Add the trackpad
mouse + R2 click for point-and-tap.

## Why keyboard + mouse, not gamepad

- The app navigates by **focus**: Arrow keys move the highlight, Enter activates.
  Steam Input emits real key events that the app reads reliably.
- The **right trackpad as mouse** lets you click any control directly, exactly
  like the touchscreen.
- The raw browser Gamepad API is unreliable under SteamOS/Gamescope (and the
  flatpak browser may not see the device), so we don't depend on it.

The app always keeps something focused, and the bottom hint bar shows the
current actions. If nothing highlights at first, tap the screen once or move the
D-pad — focus will anchor.
