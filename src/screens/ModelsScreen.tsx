import { ListState } from "../components/ListState";
import { useResource } from "../hooks/useResource";
import { FocusableButton, FocusSection } from "../input/focusables";
import { useStore } from "../state/store";

export function ModelsScreen() {
  const client = useStore((s) => s.client);
  const connected = useStore((s) => s.connection.status === "connected");
  const activeModel = useStore((s) => s.settings.model);
  const setModel = useStore((s) => s.setModel);

  const { data, loading, error, reload } = useResource(
    () => (connected ? client.models() : Promise.resolve([])),
    [client, connected],
  );
  const models = data ?? [];

  return (
    <div className="screen list-screen scroll-region">
      <h2>Models</h2>
      <p className="muted">Pick the model Hermes uses for new turns.</p>
      <ListState
        loading={loading}
        error={error}
        empty={models.length === 0}
        emptyText="No models advertised by this server."
        reload={reload}
      >
        <FocusSection className="cards" focusKey="models-list">
          {models.map((m, i) => (
            <FocusableButton
              key={m.id}
              autoFocus={i === 0}
              className={m.id === activeModel ? "card card-active" : "card"}
              onPress={() => setModel(m.id)}
            >
              <div className="card-title">{m.id}</div>
              <div className="card-sub">
                {m.owned_by ?? ""} {m.id === activeModel ? " · active" : ""}
              </div>
            </FocusableButton>
          ))}
        </FocusSection>
      </ListState>
    </div>
  );
}
