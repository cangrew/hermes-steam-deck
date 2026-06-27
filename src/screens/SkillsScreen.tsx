import { ListState } from "../components/ListState";
import { useResource } from "../hooks/useResource";
import { FocusSection } from "../input/focusables";
import { useStore } from "../state/store";

export function SkillsScreen() {
  const client = useStore((s) => s.client);
  const connected = useStore((s) => s.connection.status === "connected");

  const { data, loading, error, reload } = useResource(
    () => (connected ? client.skills() : Promise.resolve([])),
    [client, connected],
  );
  const skills = data ?? [];

  return (
    <div className="screen list-screen scroll-region">
      <h2>Skills</h2>
      <p className="muted">
        Reusable procedures Hermes has learned and can apply automatically.
      </p>
      <ListState
        loading={loading}
        error={error}
        empty={skills.length === 0}
        emptyText="No skills yet. Hermes writes skills as it solves new problems."
        reload={reload}
      >
        <FocusSection className="cards" focusKey="skills-list">
          {skills.map((s, i) => (
            <div className="card card-static" key={s.id ?? s.name ?? i}>
              <div className="card-title">{s.name}</div>
              {s.description && <div className="card-sub">{s.description}</div>}
              {s.tags && s.tags.length > 0 && (
                <div className="tagrow">
                  {s.tags.map((t) => (
                    <span className="tag" key={t}>
                      {t}
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
