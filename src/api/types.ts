// Types describing the Hermes Agent API Server surface that this front end uses.
// Reference: hermes-agent API server (default http://127.0.0.1:8642), auth via
// `Authorization: Bearer <API_SERVER_KEY>`.

export interface ConnectionConfig {
  /** Base URL of the Hermes API server, e.g. http://127.0.0.1:8642 */
  baseUrl: string;
  /** Value sent as `Authorization: Bearer <apiKey>`. */
  apiKey: string;
  /** Optional stable memory scope sent as `X-Hermes-Session-Key`. */
  sessionKey?: string;
}

export interface ModelInfo {
  id: string;
  /** Provider or owner, when advertised. */
  owned_by?: string;
}

/** /v1/capabilities is intentionally loose — we read a few known fields. */
export interface Capabilities {
  endpoints?: Record<string, unknown>;
  features?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface SessionSummary {
  id: string;
  title?: string | null;
  created_at?: string;
  updated_at?: string;
  end_reason?: string | null;
  message_count?: number;
}

export type ChatRole = "system" | "user" | "assistant" | "tool";

export interface ChatMessage {
  role: ChatRole;
  content: string;
  /** Data URLs (data:image/...) attached to a user message. */
  images?: string[];
  /** Local id for React keys / streaming updates. */
  id?: string;
}

export interface SkillInfo {
  id?: string;
  name: string;
  description?: string;
  tags?: string[];
  [key: string]: unknown;
}

export interface ToolsetInfo {
  name: string;
  description?: string;
  /** Concrete tools this toolset expands to. */
  tools?: string[];
  enabled?: boolean;
  [key: string]: unknown;
}

export interface JobInfo {
  id: string;
  name?: string;
  schedule?: string;
  prompt?: string;
  status?: string;
  paused?: boolean;
  next_run?: string;
  [key: string]: unknown;
}

/**
 * Normalized streaming events. The raw SSE shapes differ across the chat
 * completions / responses / runs / session-stream endpoints, so the client
 * maps all of them onto this single union (see normalizeSSE).
 */
export type StreamEvent =
  | { type: "run_started"; runId?: string }
  | { type: "delta"; text: string }
  | { type: "tool_started"; name?: string; toolId?: string; detail?: string }
  | { type: "tool_progress"; name?: string; toolId?: string; detail?: string }
  | { type: "tool_completed"; name?: string; toolId?: string; detail?: string }
  | {
      type: "approval_required";
      approvalId?: string;
      toolName?: string;
      detail?: string;
    }
  | { type: "completed" }
  | { type: "error"; message: string };

export interface RunHandle {
  runId: string;
}
