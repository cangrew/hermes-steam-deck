import { useEffect, useState } from "react";
import { FocusableButton, FocusSection } from "../input/focusables";
import { quitApp } from "../lib/quit";
import { useStore, type Screen } from "../state/store";

/** Power button with a two-press confirm so it can't quit by accident. */
function QuitButton() {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <FocusableButton
      className={armed ? "quit quit-armed" : "quit"}
      title="Quit Hermes"
      onPress={() => (armed ? void quitApp() : setArmed(true))}
    >
      {armed ? "Confirm exit" : "⏻"}
    </FocusableButton>
  );
}

const TABS: { id: Screen; label: string }[] = [
  { id: "chat", label: "Chat" },
  { id: "sessions", label: "History" },
  { id: "models", label: "Models" },
  { id: "skills", label: "Skills" },
  { id: "toolsets", label: "Tools" },
  { id: "jobs", label: "Jobs" },
  { id: "settings", label: "Settings" },
];

export const SCREEN_ORDER: Screen[] = TABS.map((t) => t.id);

export function TopBar() {
  const screen = useStore((s) => s.screen);
  const setScreen = useStore((s) => s.setScreen);
  const status = useStore((s) => s.connection.status);
  const model = useStore((s) => s.settings.model);

  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark">⬡</span> Hermes
      </div>
      <FocusSection className="tabs" focusKey="tabs">
        {TABS.map((t) => (
          <FocusableButton
            key={t.id}
            focusKey={`tab-${t.id}`}
            className={screen === t.id ? "tab tab-active" : "tab"}
            onPress={() => setScreen(t.id)}
          >
            {t.label}
          </FocusableButton>
        ))}
      </FocusSection>
      <div className="status">
        <span className={`dot dot-${status}`} />
        <span className="status-text">
          {status === "connected"
            ? (model || "connected")
            : status === "connecting"
              ? "connecting…"
              : status === "error"
                ? "offline"
                : "not connected"}
        </span>
      </div>
      <QuitButton />
    </header>
  );
}
