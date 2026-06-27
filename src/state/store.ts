import { create } from "zustand";
import { HermesApiError, HermesClient } from "../api/client";
import type {
  Capabilities,
  ChatMessage,
  ConnectionConfig,
  ModelInfo,
  SessionSummary,
} from "../api/types";

export type Screen =
  | "chat"
  | "sessions"
  | "models"
  | "skills"
  | "toolsets"
  | "jobs"
  | "settings";

export type ConnectionStatus = "idle" | "connecting" | "connected" | "error";

export interface ToolActivity {
  id: string;
  name: string;
  detail?: string;
  status: "started" | "progress" | "completed";
}

export interface UiMessage extends ChatMessage {
  id: string;
  tools?: ToolActivity[];
  streaming?: boolean;
}

export interface PendingApproval {
  approvalId?: string;
  toolName?: string;
  detail?: string;
}

export interface Settings extends ConnectionConfig {
  model?: string;
}

interface AppState {
  // settings + connection
  settings: Settings;
  client: HermesClient;
  connection: { status: ConnectionStatus; error?: string };
  capabilities?: Capabilities;
  models: ModelInfo[];

  // navigation
  screen: Screen;

  // chat
  sessions: SessionSummary[];
  currentSessionId?: string;
  messages: UiMessage[];
  isStreaming: boolean;
  currentRunId?: string;
  pendingApproval?: PendingApproval;

  // actions
  setScreen: (screen: Screen) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  setModel: (model: string) => void;
  connect: () => Promise<void>;

  refreshSessions: () => Promise<void>;
  newChat: () => void;
  openSession: (id: string) => Promise<void>;
  renameSession: (id: string, title: string) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  forkSession: (id: string) => Promise<void>;

  sendMessage: (text: string, images?: string[]) => Promise<void>;
  stopStreaming: () => Promise<void>;
  resolveApproval: (decision: "approve" | "deny") => Promise<void>;
}

const STORAGE_KEY = "hermes-deck-settings";

const DEFAULT_SETTINGS: Settings = {
  baseUrl: "http://127.0.0.1:8642",
  apiKey: "",
  sessionKey: "",
  model: "",
};

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Settings) };
  } catch {
    /* ignore corrupt storage */
  }
  return DEFAULT_SETTINGS;
}

function saveSettings(s: Settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* ignore quota / private mode */
  }
}

const uid = () => Math.random().toString(36).slice(2, 10);

// AbortController for the in-flight turn is kept out of React state to avoid
// re-renders; only one turn streams at a time.
let activeController: AbortController | null = null;

export const useStore = create<AppState>((set, get) => {
  const initial = loadSettings();
  return {
    settings: initial,
    client: new HermesClient(initial),
    connection: { status: "idle" },
    models: [],
    screen: "chat",
    sessions: [],
    messages: [],
    isStreaming: false,

    setScreen: (screen) => set({ screen }),

    updateSettings: (patch) => {
      const settings = { ...get().settings, ...patch };
      saveSettings(settings);
      set({ settings, client: new HermesClient(settings) });
    },

    setModel: (model) => get().updateSettings({ model }),

    connect: async () => {
      set({ connection: { status: "connecting" } });
      const client = get().client;
      try {
        await client.health();
        const [capabilities, models] = await Promise.all([
          client.capabilities().catch(() => undefined),
          client.models().catch(() => []),
        ]);
        set({
          connection: { status: "connected" },
          capabilities,
          models,
        });
        if (!get().settings.model && models[0]) get().setModel(models[0].id);
        await get().refreshSessions();
      } catch (err) {
        set({
          connection: {
            status: "error",
            error: err instanceof HermesApiError ? err.message : String(err),
          },
        });
      }
    },

    refreshSessions: async () => {
      try {
        const sessions = await get().client.listSessions();
        set({ sessions });
      } catch {
        /* surfaced on the sessions screen */
      }
    },

    newChat: () => set({ currentSessionId: undefined, messages: [] }),

    openSession: async (id) => {
      set({ currentSessionId: id, messages: [], screen: "chat" });
      try {
        const history = await get().client.sessionMessages(id);
        set({
          messages: history.map((m) => ({ ...m, id: uid() })),
        });
      } catch {
        /* empty / unreadable session */
      }
    },

    renameSession: async (id, title) => {
      await get().client.renameSession(id, title);
      await get().refreshSessions();
    },

    deleteSession: async (id) => {
      await get().client.deleteSession(id);
      if (get().currentSessionId === id) get().newChat();
      await get().refreshSessions();
    },

    forkSession: async (id) => {
      const forked = await get().client.forkSession(id);
      await get().refreshSessions();
      if (forked?.id) await get().openSession(forked.id);
    },

    sendMessage: async (text, images) => {
      const trimmed = text.trim();
      if (!trimmed || get().isStreaming) return;
      const client = get().client;

      // Ensure a session exists so history persists server-side.
      let sessionId = get().currentSessionId;
      if (!sessionId) {
        try {
          const created = await client.createSession(trimmed.slice(0, 48));
          sessionId = created.id;
          set({ currentSessionId: sessionId });
          get().refreshSessions();
        } catch {
          /* fall back to a stateless run if session create is unavailable */
        }
      }

      const userMsg: UiMessage = { id: uid(), role: "user", content: trimmed, images };
      const assistant: UiMessage = {
        id: uid(),
        role: "assistant",
        content: "",
        tools: [],
        streaming: true,
      };
      set({
        messages: [...get().messages, userMsg, assistant],
        isStreaming: true,
        pendingApproval: undefined,
      });

      const patchAssistant = (fn: (m: UiMessage) => UiMessage) =>
        set((s) => ({
          messages: s.messages.map((m) => (m.id === assistant.id ? fn(m) : m)),
        }));

      activeController = new AbortController();
      try {
        for await (const evt of client.run(trimmed, {
          sessionId,
          model: get().settings.model || undefined,
          images,
          signal: activeController.signal,
          onRunId: (runId) => set({ currentRunId: runId }),
        })) {
          switch (evt.type) {
            case "delta":
              patchAssistant((m) => ({ ...m, content: m.content + evt.text }));
              break;
            case "tool_started":
            case "tool_progress":
            case "tool_completed":
              patchAssistant((m) => ({ ...m, tools: upsertTool(m.tools, evt) }));
              break;
            case "approval_required":
              set({
                pendingApproval: {
                  approvalId: evt.approvalId,
                  toolName: evt.toolName,
                  detail: evt.detail,
                },
              });
              break;
            case "error":
              patchAssistant((m) => ({
                ...m,
                content: m.content + `\n\n_⚠️ ${evt.message}_`,
              }));
              break;
            case "completed":
            case "run_started":
              break;
          }
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          patchAssistant((m) => ({
            ...m,
            content: m.content + `\n\n_⚠️ ${(err as Error).message}_`,
          }));
        }
      } finally {
        patchAssistant((m) => ({ ...m, streaming: false }));
        set({ isStreaming: false, currentRunId: undefined, pendingApproval: undefined });
        activeController = null;
      }
    },

    stopStreaming: async () => {
      const runId = get().currentRunId;
      if (runId) await get().client.stopRun(runId).catch(() => {});
      activeController?.abort();
    },

    resolveApproval: async (decision) => {
      const { currentRunId, pendingApproval } = get();
      set({ pendingApproval: undefined });
      if (currentRunId) {
        await get()
          .client.approveRun(currentRunId, decision, pendingApproval?.approvalId)
          .catch(() => {});
      }
    },
  };
});

function upsertTool(
  tools: ToolActivity[] | undefined,
  evt: { type: string; name?: string; toolId?: string; detail?: string },
): ToolActivity[] {
  const list = tools ? [...tools] : [];
  const key = evt.toolId ?? evt.name ?? uid();
  const status =
    evt.type === "tool_started"
      ? "started"
      : evt.type === "tool_completed"
        ? "completed"
        : "progress";
  const idx = list.findIndex((t) => t.id === key);
  const next: ToolActivity = {
    id: key,
    name: evt.name ?? "tool",
    detail: evt.detail,
    status,
  };
  if (idx === -1) list.push(next);
  else list[idx] = { ...list[idx], ...next };
  return list;
}
