import { InputDebug } from "../components/InputDebug";
import { FocusableButton, FocusableField, FocusSection } from "../input/focusables";
import { quitApp } from "../lib/quit";
import { useStore } from "../state/store";

export function SettingsScreen() {
  const settings = useStore((s) => s.settings);
  const update = useStore((s) => s.updateSettings);
  const connect = useStore((s) => s.connect);
  const connection = useStore((s) => s.connection);
  const models = useStore((s) => s.models);

  return (
    <div className="screen settings-screen scroll-region">
      <h2>Connection</h2>
      <p className="muted">
        Point this at the Hermes Agent API server (start it with{" "}
        <code>API_SERVER_ENABLED=true</code> and an <code>API_SERVER_KEY</code>; allow this
        app's origin via <code>API_SERVER_CORS_ORIGINS</code>).
      </p>

      <FocusSection className="form" focusKey="settings-form">
        <FocusableField
          label="API base URL"
          value={settings.baseUrl}
          onChange={(v) => update({ baseUrl: v })}
          placeholder="http://127.0.0.1:8642"
        />
        <FocusableField
          label="API key (Bearer)"
          value={settings.apiKey}
          onChange={(v) => update({ apiKey: v })}
          placeholder="API_SERVER_KEY"
          password
        />
        <FocusableField
          label="Memory session key (optional)"
          value={settings.sessionKey ?? ""}
          onChange={(v) => update({ sessionKey: v })}
          placeholder="X-Hermes-Session-Key"
        />

        <div className="preset-row">
          <span className="muted">Presets:</span>
          <FocusableButton
            className="chip"
            onPress={() => update({ baseUrl: "http://127.0.0.1:8642" })}
          >
            Local on Deck
          </FocusableButton>
          <FocusableButton
            className="chip"
            onPress={() => update({ baseUrl: "http://192.168.1.50:8642" })}
          >
            Remote (edit IP)
          </FocusableButton>
        </div>

        <div className="connect-row">
          <FocusableButton className="primary" autoFocus onPress={() => void connect()}>
            {connection.status === "connecting" ? "Connecting…" : "Connect / Test"}
          </FocusableButton>
          <span className={`pill pill-${connection.status}`}>{connection.status}</span>
        </div>

        {connection.error && <div className="error-box">{connection.error}</div>}
        {connection.status === "connected" && (
          <div className="ok-box">
            Connected — {models.length} model{models.length === 1 ? "" : "s"} available.
            {settings.model ? ` Active: ${settings.model}.` : ""}
          </div>
        )}
      </FocusSection>

      <h2>About</h2>
      <p className="muted">
        Hermes for Steam Deck — a controller- and touch-first front end for the Nous
        Research Hermes Agent. Navigate with the D-pad/stick, A to select, B to go back, X
        for the keyboard, LB/RB to switch tabs.
      </p>

      <h2>Input diagnostics</h2>
      <p className="muted">
        Use this to check what the Deck's controls are sending to the app.
      </p>
      <InputDebug />

      <h2>Quit</h2>
      <p className="muted">
        Closes the app (and the local server when launched on the Deck). In Gaming Mode you
        can also use the STEAM button → Exit Game.
      </p>
      <FocusSection className="form" focusKey="settings-quit">
        <FocusableButton className="danger-btn" onPress={() => void quitApp()}>
          ⏻ Quit Hermes
        </FocusableButton>
      </FocusSection>
    </div>
  );
}
