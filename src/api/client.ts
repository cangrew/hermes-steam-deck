import { normalizeSSE, readSSE } from "./sse";
import type {
  Capabilities,
  ChatMessage,
  ConnectionConfig,
  JobInfo,
  ModelInfo,
  SessionSummary,
  SkillInfo,
  StreamEvent,
  ToolsetInfo,
} from "./types";

export class HermesApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "HermesApiError";
  }
}

export interface RunOptions {
  sessionId?: string;
  instructions?: string;
  signal?: AbortSignal;
  /** Called as soon as the run id is known, so the UI can wire up Stop. */
  onRunId?: (runId: string) => void;
}

/**
 * Typed client for the Hermes Agent API server. One instance per connection
 * config; the store rebuilds it whenever Settings change.
 */
export class HermesClient {
  constructor(private readonly config: ConnectionConfig) {}

  get baseUrl() {
    return this.config.baseUrl.replace(/\/+$/, "");
  }

  private headers(extra?: Record<string, string>): HeadersInit {
    const h: Record<string, string> = {
      Authorization: `Bearer ${this.config.apiKey}`,
      ...extra,
    };
    if (this.config.sessionKey) h["X-Hermes-Session-Key"] = this.config.sessionKey;
    return h;
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    let res: Response;
    try {
      res = await fetch(this.baseUrl + path, {
        ...init,
        headers: this.headers({
          "Content-Type": "application/json",
          ...(init?.headers as Record<string, string> | undefined),
        }),
      });
    } catch (err) {
      throw new HermesApiError(
        `Could not reach ${this.baseUrl} — is the Hermes API server running and CORS allowed? (${(err as Error).message})`,
      );
    }
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new HermesApiError(
        `${res.status} ${res.statusText}${body ? `: ${body.slice(0, 200)}` : ""}`,
        res.status,
      );
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }

  // --- Discovery -----------------------------------------------------------

  async health(): Promise<unknown> {
    return this.request("/health");
  }

  async capabilities(): Promise<Capabilities> {
    return this.request<Capabilities>("/v1/capabilities");
  }

  async models(): Promise<ModelInfo[]> {
    const res = await this.request<{ data?: ModelInfo[] }>("/v1/models");
    return res.data ?? [];
  }

  // --- Sessions ------------------------------------------------------------

  async listSessions(): Promise<SessionSummary[]> {
    const res = await this.request<{ data?: SessionSummary[] } | SessionSummary[]>(
      "/api/sessions",
    );
    return Array.isArray(res) ? res : (res.data ?? []);
  }

  async createSession(title?: string): Promise<SessionSummary> {
    return this.request<SessionSummary>("/api/sessions", {
      method: "POST",
      body: JSON.stringify({ title }),
    });
  }

  async renameSession(id: string, title: string): Promise<void> {
    await this.request(`/api/sessions/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ title }),
    });
  }

  async deleteSession(id: string): Promise<void> {
    await this.request(`/api/sessions/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  }

  async forkSession(id: string): Promise<SessionSummary> {
    return this.request<SessionSummary>(
      `/api/sessions/${encodeURIComponent(id)}/fork`,
      { method: "POST", body: "{}" },
    );
  }

  async sessionMessages(id: string): Promise<ChatMessage[]> {
    const res = await this.request<{ data?: ChatMessage[] } | ChatMessage[]>(
      `/api/sessions/${encodeURIComponent(id)}/messages`,
    );
    const list = Array.isArray(res) ? res : (res.data ?? []);
    return list.map((m) => ({ role: m.role, content: stringifyContent(m.content) }));
  }

  // --- Capability browsers -------------------------------------------------

  async skills(): Promise<SkillInfo[]> {
    const res = await this.request<{ data?: SkillInfo[]; skills?: SkillInfo[] } | SkillInfo[]>(
      "/v1/skills",
    );
    return Array.isArray(res) ? res : (res.data ?? res.skills ?? []);
  }

  async toolsets(): Promise<ToolsetInfo[]> {
    const res = await this.request<
      { data?: ToolsetInfo[]; toolsets?: ToolsetInfo[] } | ToolsetInfo[]
    >("/v1/toolsets");
    return Array.isArray(res) ? res : (res.data ?? res.toolsets ?? []);
  }

  // --- Jobs / cron ---------------------------------------------------------

  async jobs(): Promise<JobInfo[]> {
    const res = await this.request<{ data?: JobInfo[]; jobs?: JobInfo[] } | JobInfo[]>(
      "/api/jobs",
    );
    return Array.isArray(res) ? res : (res.data ?? res.jobs ?? []);
  }

  async createJob(input: { name: string; schedule: string; prompt: string }): Promise<JobInfo> {
    return this.request<JobInfo>("/api/jobs", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async jobAction(id: string, action: "pause" | "resume" | "run"): Promise<void> {
    await this.request(`/api/jobs/${encodeURIComponent(id)}/${action}`, {
      method: "POST",
      body: "{}",
    });
  }

  async deleteJob(id: string): Promise<void> {
    await this.request(`/api/jobs/${encodeURIComponent(id)}`, { method: "DELETE" });
  }

  // --- Agentic chat (runs) -------------------------------------------------

  /**
   * Runs one agent turn and yields normalized streaming events. Uses the Runs
   * API so we get tool progress, interrupt (stopRun) and human approval gates.
   */
  async *run(input: string, opts: RunOptions = {}): AsyncGenerator<StreamEvent> {
    const created = await this.request<{ run_id?: string; id?: string }>("/v1/runs", {
      method: "POST",
      body: JSON.stringify({
        input,
        session_id: opts.sessionId,
        instructions: opts.instructions,
      }),
      signal: opts.signal,
    });
    const runId = created.run_id ?? created.id;
    if (!runId) {
      yield { type: "error", message: "Run create response had no run id" };
      return;
    }
    opts.onRunId?.(runId);
    yield { type: "run_started", runId };

    const res = await fetch(
      `${this.baseUrl}/v1/runs/${encodeURIComponent(runId)}/events`,
      { headers: this.headers({ Accept: "text/event-stream" }), signal: opts.signal },
    );
    if (!res.ok || !res.body) {
      yield {
        type: "error",
        message: `Run event stream failed: ${res.status} ${res.statusText}`,
      };
      return;
    }
    for await (const raw of readSSE(res.body, opts.signal)) {
      const evt = normalizeSSE(raw);
      if (evt) yield evt;
      if (evt?.type === "completed" || evt?.type === "error") return;
    }
  }

  async stopRun(runId: string): Promise<void> {
    await this.request(`/v1/runs/${encodeURIComponent(runId)}/stop`, {
      method: "POST",
      body: "{}",
    });
  }

  async approveRun(
    runId: string,
    decision: "approve" | "deny",
    approvalId?: string,
  ): Promise<void> {
    await this.request(`/v1/runs/${encodeURIComponent(runId)}/approval`, {
      method: "POST",
      body: JSON.stringify({ decision, approval_id: approvalId }),
    });
  }
}

/** Hermes message content can be a string or OpenAI-style content parts. */
function stringifyContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        const p = part as Record<string, unknown>;
        if (typeof p.text === "string") return p.text;
        return "";
      })
      .join("");
  }
  return content == null ? "" : String(content);
}
