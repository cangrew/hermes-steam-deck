import type { StreamEvent } from "./types";

export interface RawSSE {
  event?: string;
  data: string;
}

/**
 * Reads a `text/event-stream` body and yields one record per SSE message.
 * We use fetch + ReadableStream (not EventSource) because the Hermes API
 * requires an `Authorization` header, which EventSource cannot set.
 */
export async function* readSSE(
  body: ReadableStream<Uint8Array>,
  signal?: AbortSignal,
): AsyncGenerator<RawSSE> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      if (signal?.aborted) return;
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE messages are separated by a blank line. Tolerate \r\n.
      let sep = indexOfDelimiter(buffer);
      while (sep !== -1) {
        const chunk = buffer.slice(0, sep);
        buffer = buffer.slice(sep).replace(/^(\r?\n){1,2}/, "");
        const parsed = parseChunk(chunk);
        if (parsed) yield parsed;
        sep = indexOfDelimiter(buffer);
      }
    }
    // Flush any trailing message without a terminating blank line.
    const tail = parseChunk(buffer);
    if (tail) yield tail;
  } finally {
    reader.releaseLock();
  }
}

function indexOfDelimiter(s: string): number {
  const a = s.indexOf("\n\n");
  const b = s.indexOf("\r\n\r\n");
  if (a === -1) return b;
  if (b === -1) return a;
  return Math.min(a, b);
}

function parseChunk(chunk: string): RawSSE | null {
  const lines = chunk.split(/\r?\n/);
  let event: string | undefined;
  const dataLines: string[] = [];
  for (const line of lines) {
    if (!line || line.startsWith(":")) continue; // comment / keep-alive
    if (line.startsWith("event:")) {
      event = line.slice("event:".length).trim();
    } else if (line.startsWith("data:")) {
      dataLines.push(line.slice("data:".length).replace(/^ /, ""));
    }
  }
  if (dataLines.length === 0 && !event) return null;
  return { event, data: dataLines.join("\n") };
}

/**
 * Maps a raw SSE record onto our normalized StreamEvent union. This is
 * intentionally tolerant: the chat-completions, responses, runs, and
 * session-stream endpoints each use slightly different event names/shapes,
 * and some are not fully enumerated in the docs. Unknown records are ignored.
 */
export function normalizeSSE(raw: RawSSE): StreamEvent | null {
  const name = (raw.event ?? "").toLowerCase();
  const trimmed = raw.data.trim();

  // OpenAI-style terminator.
  if (trimmed === "[DONE]") return { type: "completed" };

  let data: Record<string, unknown> = {};
  if (trimmed && trimmed !== "[DONE]") {
    try {
      data = JSON.parse(trimmed) as Record<string, unknown>;
    } catch {
      // Non-JSON data: treat as a plain text delta if there's no event name.
      if (!name) return { type: "delta", text: raw.data };
      return null;
    }
  }

  // Lifecycle: completion. Exclude tool.* events, which also contain
  // "completed" but are handled as tool lifecycle below.
  if (
    !name.includes("tool") &&
    (name.includes("completed") || name === "done" || data["finish_reason"] != null)
  ) {
    // chat.completion.chunk also carries deltas alongside finish_reason; emit
    // the delta below if present, otherwise complete.
    const delta = extractDelta(data);
    if (delta) return { type: "delta", text: delta };
    return { type: "completed" };
  }

  // Tool approval gate.
  if (name.includes("approval") || data["approval_required"] === true) {
    return {
      type: "approval_required",
      approvalId: str(data["approval_id"] ?? data["id"]),
      toolName: str(data["tool"] ?? data["tool_name"] ?? data["name"]),
      detail: str(data["detail"] ?? data["message"] ?? data["arguments"]),
    };
  }

  // Tool lifecycle.
  if (name.includes("tool.started") || name === "tool_started") {
    return { type: "tool_started", ...toolFields(data) };
  }
  if (
    name.includes("tool.progress") ||
    name === "hermes.tool.progress" ||
    name.includes("tool_progress")
  ) {
    return { type: "tool_progress", ...toolFields(data) };
  }
  if (name.includes("tool.completed") || name === "tool_completed") {
    return { type: "tool_completed", ...toolFields(data) };
  }

  if (name.includes("created") || name.includes("run_started")) {
    return { type: "run_started", runId: str(data["run_id"] ?? data["id"]) };
  }

  if (name.includes("error") || data["error"] != null) {
    return {
      type: "error",
      message:
        str(data["error"]) ?? str(data["message"]) ?? "Unknown stream error",
    };
  }

  // Default: any text delta we can find.
  const delta = extractDelta(data);
  if (delta) return { type: "delta", text: delta };

  return null;
}

function toolFields(data: Record<string, unknown>) {
  return {
    name: str(data["tool"] ?? data["tool_name"] ?? data["name"]),
    toolId: str(data["tool_id"] ?? data["id"]),
    detail: str(data["detail"] ?? data["status"] ?? data["arguments"]),
  };
}

/** Pulls a text delta out of the many shapes the endpoints use. */
function extractDelta(data: Record<string, unknown>): string | null {
  // chat.completion.chunk: { choices: [{ delta: { content } }] }
  const choices = data["choices"];
  if (Array.isArray(choices) && choices[0]) {
    const choice = choices[0] as Record<string, unknown>;
    const delta = choice["delta"] as Record<string, unknown> | undefined;
    const content = delta?.["content"];
    if (typeof content === "string") return content;
  }
  // responses: { delta: "..." } / session stream assistant.delta: { text } | { content }
  for (const key of ["delta", "text", "content", "token"]) {
    const v = data[key];
    if (typeof v === "string") return v;
  }
  return null;
}

function str(v: unknown): string | undefined {
  if (v == null) return undefined;
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}
