import { useEffect } from "react";
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
  });

  // Keyboard parity for dev / docked use: Escape acts as B (back).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") back();
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
