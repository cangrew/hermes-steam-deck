import { describe, expect, it } from "vitest";
import { normalizeSSE, readSSE } from "./sse";

function streamFrom(text: string): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      controller.enqueue(enc.encode(text));
      controller.close();
    },
  });
}

describe("readSSE", () => {
  it("splits messages on blank lines and parses event + data", async () => {
    const body = streamFrom(
      "event: tool.started\ndata: {\"tool\":\"web\"}\n\n" +
        "data: {\"delta\":\"hi\"}\n\n" +
        ": keep-alive comment\n\n",
    );
    const out = [];
    for await (const r of readSSE(body)) out.push(r);
    expect(out).toHaveLength(2);
    expect(out[0]).toEqual({ event: "tool.started", data: '{"tool":"web"}' });
    expect(out[1]).toEqual({ event: undefined, data: '{"delta":"hi"}' });
  });

  it("handles CRLF and multi-line data, and flushes a trailing message", async () => {
    const body = streamFrom("data: a\r\ndata: b\r\n\r\nevent: x\r\ndata: 1");
    const out = [];
    for await (const r of readSSE(body)) out.push(r);
    expect(out[0].data).toBe("a\nb");
    expect(out[1]).toEqual({ event: "x", data: "1" });
  });
});

describe("normalizeSSE", () => {
  it("maps OpenAI chat.completion.chunk deltas", () => {
    expect(
      normalizeSSE({ data: '{"choices":[{"delta":{"content":"Hel"}}]}' }),
    ).toEqual({ type: "delta", text: "Hel" });
  });

  it("maps responses output_text delta", () => {
    expect(
      normalizeSSE({ event: "response.output_text.delta", data: '{"delta":"lo"}' }),
    ).toEqual({ type: "delta", text: "lo" });
  });

  it("maps session-stream assistant.delta", () => {
    expect(normalizeSSE({ event: "assistant.delta", data: '{"text":"x"}' })).toEqual({
      type: "delta",
      text: "x",
    });
  });

  it("maps tool lifecycle events", () => {
    expect(
      normalizeSSE({ event: "tool.started", data: '{"tool":"web","id":"t1"}' }),
    ).toMatchObject({ type: "tool_started", name: "web", toolId: "t1" });
    expect(
      normalizeSSE({ event: "hermes.tool.progress", data: '{"tool":"web"}' }),
    ).toMatchObject({ type: "tool_progress", name: "web" });
    expect(normalizeSSE({ event: "tool.completed", data: "{}" })).toMatchObject({
      type: "tool_completed",
    });
  });

  it("maps approval gates", () => {
    expect(
      normalizeSSE({
        event: "approval.required",
        data: '{"approval_id":"a1","tool":"shell","detail":"rm"}',
      }),
    ).toEqual({
      type: "approval_required",
      approvalId: "a1",
      toolName: "shell",
      detail: "rm",
    });
  });

  it("maps completion and [DONE]", () => {
    expect(normalizeSSE({ event: "response.completed", data: "{}" })).toEqual({
      type: "completed",
    });
    expect(normalizeSSE({ data: "[DONE]" })).toEqual({ type: "completed" });
  });

  it("maps errors and ignores unknown empty records", () => {
    expect(normalizeSSE({ event: "error", data: '{"error":"boom"}' })).toEqual({
      type: "error",
      message: "boom",
    });
    expect(normalizeSSE({ event: "ping", data: "{}" })).toBeNull();
  });
});
