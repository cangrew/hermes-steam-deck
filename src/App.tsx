import { useCallback, useEffect } from "react";
import {
  doesFocusableExist,
  getCurrentFocusKey,
  ROOT_FOCUS_KEY,
  setFocus,
} from "@noriginmedia/norigin-spatial-navigation";
import { TopBar, SCREEN_ORDER } from "./components/TopBar";
import { ControllerHints } from "./components/ControllerHints";
import { COMMON_HINTS } from "./components/hints";
import { OnScreenKeyboard } from "./input/OnScreenKeyboard";
import { useGamepad } from "./input/useGamepad";
import { ChatScreen } from "./screens/ChatScreen";
import { SessionsScreen } from "./screens/SessionsScreen";
import { ModelsScreen } from "./screens/ModelsScreen";
import { SkillsScreen } from "./screens/SkillsScreen";
import { ToolsetsScreen } from "./screens/ToolsetsScreen";
import { JobsScreen } from "./screens/JobsScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { useOsk } from "./state/osk";
import { useStore, type Screen } from "./state/store";

function ActiveScreen({ screen }: { screen: Screen }) {
  switch (screen) {
    case "chat":
      return <ChatScreen />;
    case "sessions":
      return <SessionsScreen />;
    case "models":
      return <ModelsScreen />;
    case "skills":
      return <SkillsScreen />;
    case "toolsets":
      return <ToolsetsScreen />;
    case "jobs":
      return <JobsScreen />;
    case "settings":
      return <SettingsScreen />;
  }
}

export default function App() {
  const screen = useStore((s) => s.screen);
  const setScreen = useStore((s) => s.setScreen);
  const connect = useStore((s) => s.connect);

  // Attempt to connect once on launch with whatever settings are stored.
  useEffect(() => {
    void connect();
  }, [connect]);

  // Make sure something is always focused so the D-pad / arrow keys have an
  // anchor to move from. Without this, controller/keyboard input appears dead
  // until you first tap the screen.
  const focusDefault = useCallback(() => {
    const preferred = screen === "chat" ? "composer-input" : `tab-${screen}`;
    if (doesFocusableExist(preferred)) setFocus(preferred);
    else if (doesFocusableExist(`tab-${screen}`)) setFocus(`tab-${screen}`);
  }, [screen]);

  const ensureFocus = useCallback(() => {
    const cur = getCurrentFocusKey();
    if (!cur || cur === ROOT_FOCUS_KEY || !doesFocusableExist(cur)) focusDefault();
  }, [focusDefault]);

  // Re-anchor focus when the screen changes (after the new screen renders).
  useEffect(() => {
    const t = setTimeout(focusDefault, 80);
    return () => clearTimeout(t);
  }, [focusDefault]);

  const cycleScreen = (delta: number) => {
    const i = SCREEN_ORDER.indexOf(screen);
    const next = SCREEN_ORDER[(i + delta + SCREEN_ORDER.length) % SCREEN_ORDER.length];
    setScreen(next);
  };

  const back = () => {
    const osk = useOsk.getState();
    if (osk.open) {
      osk.close();
      return;
    }
    if (screen !== "chat") setScreen("chat");
  };

  const toggleKeyboard = () => {
    const osk = useOsk.getState();
    if (osk.open) {
      osk.close();
      return;
    }
    // Open the keyboard for the currently focused field, if any.
    const el = document.activeElement as HTMLElement | null;
    if (el?.classList.contains("field")) el.click();
  };

  const scroll = (dir: "up" | "down") => {
    const region = document.querySelector<HTMLElement>(".scroll-region");
    if (region) region.scrollBy({ top: dir === "up" ? -300 : 300, behavior: "smooth" });
  };

  useGamepad({
    onBack: back,
    onToggleKeyboard: toggleKeyboard,
    onPrevScreen: () => cycleScreen(-1),
    onNextScreen: () => cycleScreen(1),
    onStart: () => setScreen("settings"),
    onScroll: scroll,
    ensureFocus,
  });

  // Keyboard parity — this is the reliable input path on the Steam Deck, where
  // Steam Input maps the controls to keys. Arrow keys + Enter are handled by the
  // spatial-navigation library; here we cover the rest so a keyboard layout can
  // drive everything: Esc=back, [/]=switch tab, PageUp/PageDown=scroll.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      ensureFocus();
      switch (e.key) {
        case "Escape":
          back();
          break;
        case "[":
          cycleScreen(-1);
          break;
        case "]":
          cycleScreen(1);
          break;
        case "PageUp":
          scroll("up");
          break;
        case "PageDown":
          scroll("down");
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="app">
      <TopBar />
      <main className="content">
        <ActiveScreen screen={screen} />
      </main>
      <ControllerHints hints={COMMON_HINTS} />
      <OnScreenKeyboard />
    </div>
  );
}
