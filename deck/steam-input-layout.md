# Recommended Steam Input layout

**Use the official "Gamepad with Mouse Trackpad" template.** In Gaming Mode,
Steam Input presents the Deck's controls to the app as a standard Xbox 360
gamepad, and the launcher gives the browser the sandbox access it needs to read
it (`--device=all` plus `--filesystem=/run/udev:ro` — Chromium enumerates
gamepads through udev). The buttons and sticks drive the app directly through
the Gamepad API; the right trackpad stays a mouse so you can also tap anything.

Configure this under **Steam button → Controller Settings** for the Hermes
shortcut (or the game's gear icon → **Controller Layout** in Gaming Mode). The
default template usually works out of the box.

## What the controls do in the app

| Control            | Does in app                     |
| ------------------ | ------------------------------- |
| D-pad / Left stick | Move focus                      |
| A                  | Select / activate               |
| B                  | Back / cancel / close keyboard  |
| X                  | Open the keyboard               |
| Y                  | Context menu / secondary action |
| L1 / R1            | Previous / next tab             |
| L2 / R2            | Scroll                          |
| Start              | Open Settings                   |
| Right trackpad     | Mouse cursor (tap = click)      |

Note: the browser hides gamepads until the **first button press** — if nothing
reacts right away, press any button once. You can verify what the app sees under
**Settings → Input diagnostics**.

### While the daisywheel keyboard is open

The keyboard takes over the controller, so the mappings above do **not** apply
until it closes — the on-screen hints show the live layout:

| Control      | Does while typing                         |
| ------------ | ----------------------------------------- |
| Left stick   | Aim one of 8 petals                       |
| Y / X / B / A| Type the petal's top / left / right / bottom char |
| RT           | Space                                     |
| LT           | Backspace (hold to repeat)                |
| LB           | Shift (double-tap = caps lock)            |
| RB           | Symbols layer                             |
| D-pad ←/→    | Move word suggestion; ↑ accept, ↓ clear   |
| Select       | Cancel (close without submitting)         |
| Start        | Done (submit)                             |
| R3           | Newline (multi-line fields)               |

Because **B types a character** here, cancel moves to **Select**. Switch to the
classic grid keyboard (where every key is a focusable button) with the on-screen
**Grid keyboard** toggle; the choice is remembered. The grid keyboard keeps the
usual mapping — D-pad moves between keys, A presses, B closes.

## Fallback: keyboard + mouse layout

If the gamepad still isn't detected (check the diagnostics panel first), a
keyboard + mouse layout drives the whole app too — it navigates by focus, and
Steam Input's synthetic key events are always visible to the browser:

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
Enter**, **B → Escape**.

The app always keeps something focused, and the bottom hint bar shows the
current actions. If nothing highlights at first, tap the screen once or move the
D-pad — focus will anchor.
