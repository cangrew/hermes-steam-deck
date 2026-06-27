import { useEffect } from "react";
import { ListState } from "../components/ListState";
import { FocusableButton, FocusSection } from "../input/focusables";
import { useOsk } from "../state/osk";
import { useStore } from "../state/store";

export function SessionsScreen() {
  const connected = useStore((s) => s.connection.status === "connected");
  const sessions = useStore((s) => s.sessions);
  const refresh = useStore((s) => s.refreshSessions);
  const open = useStore((s) => s.openSession);
  const rename = useStore((s) => s.renameSession);
  const fork = useStore((s) => s.forkSession);
  const remove = useStore((s) => s.deleteSession);
  const newChat = useStore((s) => s.newChat);
  const setScreen = useStore((s) => s.setScreen);
  const openKeyboard = useOsk((s) => s.openKeyboard);

  useEffect(() => {
    if (connected) void refresh();
  }, [connected, refresh]);

  const startNew = () => {
    newChat();
    setScreen("chat");
  };

  const startRename = (id: string, current: string) =>
    openKeyboard({
      value: current,
      label: "Rename conversation",
      onSubmit: (v) => void rename(id, v || current),
    });

  return (
    <div className="screen list-screen scroll-region">
      <div className="list-head">
        <h2>History</h2>
        <FocusableButton className="chip" onPress={startNew}>
          ＋ New chat
        </FocusableButton>
      </div>
      <ListState
        loading={false}
        empty={sessions.length === 0}
        emptyText="No saved conversations yet."
      >
        <FocusSection className="rows" focusKey="sessions-list">
          {sessions.map((s, i) => (
            <div className="session-row" key={s.id}>
              <FocusableButton
                autoFocus={i === 0}
                className="session-main"
                onPress={() => void open(s.id)}
              >
                <div className="card-title">{s.title || "Untitled"}</div>
                <div className="card-sub">
                  {s.updated_at ? new Date(s.updated_at).toLocaleString() : s.id}
                  {s.message_count != null ? ` · ${s.message_count} msgs` : ""}
                </div>
              </FocusableButton>
              <div className="session-actions">
                <FocusableButton
                  className="mini"
                  onPress={() => startRename(s.id, s.title || "")}
                >
                  Rename
                </FocusableButton>
                <FocusableButton className="mini" onPress={() => void fork(s.id)}>
                  Fork
                </FocusableButton>
                <FocusableButton
                  className="mini danger"
                  onPress={() => void remove(s.id)}
                >
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
