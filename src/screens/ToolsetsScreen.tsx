import { ListState } from "../components/ListState";
import { useResource } from "../hooks/useResource";
import { FocusSection } from "../input/focusables";
import { useStore } from "../state/store";

export function ToolsetsScreen() {
  const client = useStore((s) => s.client);
  const connected = useStore((s) => s.connection.status === "connected");

  const { data, loading, error, reload } = useResource(
    () => (connected ? client.toolsets() : Promise.resolve([])),
    [client, connected],
  );
  const toolsets = data ?? [];

  return (
    <div className="screen list-screen scroll-region">
      <h2>Toolsets</h2>
      <p className="muted">The tools available to the agent during a run.</p>
      <ListState
        loading={loading}
        error={error}
        empty={toolsets.length === 0}
        emptyText="No toolsets advertised."
        reload={reload}
      >
        <FocusSection className="cards" focusKey="toolsets-list">
          {toolsets.map((t, i) => (
            <div className="card card-static" key={t.name ?? i}>
              <div className="card-title">
                {t.name}
                {t.enabled === false && <span className="badge-off">off</span>}
              </div>
              {t.description && <div className="card-sub">{t.description}</div>}
              {t.tools && t.tools.length > 0 && (
                <div className="tagrow">
                  {t.tools.map((tool) => (
                    <span className="tag" key={tool}>
                      {tool}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </FocusSection>
      </ListState>
    </div>
  );
}
