import { useState } from "react";
import { ListState } from "../components/ListState";
import { useResource } from "../hooks/useResource";
import { FocusableButton, FocusableField, FocusSection } from "../input/focusables";
import { useStore } from "../state/store";

export function JobsScreen() {
  const client = useStore((s) => s.client);
  const connected = useStore((s) => s.connection.status === "connected");

  const { data, loading, error, reload } = useResource(
    () => (connected ? client.jobs() : Promise.resolve([])),
    [client, connected],
  );
  const jobs = data ?? [];

  const [name, setName] = useState("");
  const [schedule, setSchedule] = useState("");
  const [prompt, setPrompt] = useState("");

  const create = async () => {
    if (!name.trim() || !prompt.trim()) return;
    await client.createJob({ name, schedule, prompt }).catch(() => {});
    setName("");
    setSchedule("");
    setPrompt("");
    reload();
  };

  const act = async (id: string, action: "pause" | "resume" | "run") => {
    await client.jobAction(id, action).catch(() => {});
    reload();
  };

  const del = async (id: string) => {
    await client.deleteJob(id).catch(() => {});
    reload();
  };

  return (
    <div className="screen list-screen scroll-region">
      <h2>Scheduled jobs</h2>
      <p className="muted">Recurring tasks Hermes runs unattended (natural-language cron).</p>

      <FocusSection className="form job-form" focusKey="job-form">
        <FocusableField label="Name" value={name} onChange={setName} placeholder="Daily digest" />
        <FocusableField
          label="Schedule"
          value={schedule}
          onChange={setSchedule}
          placeholder="every day at 8am"
        />
        <FocusableField
          label="Prompt"
          value={prompt}
          onChange={setPrompt}
          placeholder="Summarize my unread email"
          multiline
        />
        <FocusableButton
          className="primary"
          onPress={() => void create()}
          disabled={!connected || !name.trim() || !prompt.trim()}
        >
          ＋ Create job
        </FocusableButton>
      </FocusSection>

      <ListState
        loading={loading}
        error={error}
        empty={jobs.length === 0}
        emptyText="No scheduled jobs."
        reload={reload}
      >
        <FocusSection className="rows" focusKey="jobs-list">
          {jobs.map((j) => (
            <div className="session-row" key={j.id}>
              <div className="session-main card-static">
                <div className="card-title">{j.name || j.id}</div>
                <div className="card-sub">
                  {j.schedule ?? "—"}
                  {j.paused ? " · paused" : j.next_run ? ` · next ${j.next_run}` : ""}
                </div>
              </div>
              <div className="session-actions">
                <FocusableButton className="mini" onPress={() => void act(j.id, "run")}>
                  Run now
                </FocusableButton>
                <FocusableButton
                  className="mini"
                  onPress={() => void act(j.id, j.paused ? "resume" : "pause")}
                >
                  {j.paused ? "Resume" : "Pause"}
                </FocusableButton>
                <FocusableButton className="mini danger" onPress={() => void del(j.id)}>
                  Delete
                </FocusableButton>
              </div>
            </div>
          ))}
        </FocusSection>
      </ListState>
    </div>
  );
}
