import { FocusableButton, FocusSection } from "../input/focusables";
import { useStore, type Screen } from "../state/store";

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
    </header>
  );
}
