import { afterEach, describe, expect, it, vi } from "vitest";
import { HermesClient } from "./client";
import type { StreamEvent } from "./types";

function sseResponse(text: string): Response {
  const enc = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(c) {
      c.enqueue(enc.encode(text));
      c.close();
    },
  });
  return new Response(body, {
    status: 200,
    headers: { "Content-Type": "text/event-stream" },
  });
}

afterEach(() => vi.restoreAllMocks());

describe("HermesClient", () => {
  const client = new HermesClient({ baseUrl: "http://h:8642/", apiKey: "k" });

  it("normalizes trailing slash and sends Bearer auth", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ data: [{ id: "m1" }] }), { status: 200 }));
    const models = await client.models();
    expect(models).toEqual([{ id: "m1" }]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://h:8642/v1/models");
    expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer k");
  });

  it("streams a run: creates it, opens events, yields normalized events", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.endsWith("/v1/runs"))
        return Promise.resolve(new Response(JSON.stringify({ run_id: "r1" }), { status: 200 }));
      if (url.endsWith("/v1/runs/r1/events"))
        return Promise.resolve(
          sseResponse(
            "event: tool.started\ndata: {\"tool\":\"web\"}\n\n" +
              "data: {\"choices\":[{\"delta\":{\"content\":\"hi\"}}]}\n\n" +
              "event: response.completed\ndata: {}\n\n",
          ),
        );
      return Promise.reject(new Error("unexpected " + url));
    });

    const got: StreamEvent[] = [];
    let runId: string | undefined;
    for await (const e of client.run("hello", { onRunId: (id) => (runId = id) })) {
      got.push(e);
    }

    expect(runId).toBe("r1");
    expect(got).toContainEqual({ type: "run_started", runId: "r1" });
    expect(got.find((e) => e.type === "tool_started")).toBeTruthy();
    expect(got).toContainEqual({ type: "delta", text: "hi" });
    expect(got[got.length - 1]).toEqual({ type: "completed" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("includes the selected model and inline images in the run body", async () => {
    let runBody: Record<string, unknown> = {};
    vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);
      if (url.endsWith("/v1/runs")) {
        runBody = JSON.parse(String(init?.body));
        return Promise.resolve(new Response(JSON.stringify({ run_id: "r1" }), { status: 200 }));
      }
      return Promise.resolve(sseResponse("event: response.completed\ndata: {}\n\n"));
    });

    const img = "data:image/png;base64,AAAA";
    for await (const _ of client.run("look", { model: "Hermes-4-405B", images: [img] })) {
      /* drain */
    }

    expect(runBody.model).toBe("Hermes-4-405B");
    expect(Array.isArray(runBody.input)).toBe(true);
    expect(runBody.input).toEqual([
      { type: "text", text: "look" },
      { type: "image_url", image_url: { url: img } },
    ]);
  });

  it("sends a plain string input and omits model when none is set", async () => {
    let runBody: Record<string, unknown> = {};
    vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);
      if (url.endsWith("/v1/runs")) {
        runBody = JSON.parse(String(init?.body));
        return Promise.resolve(new Response(JSON.stringify({ run_id: "r1" }), { status: 200 }));
      }
      return Promise.resolve(sseResponse("event: response.completed\ndata: {}\n\n"));
    });
    for await (const _ of client.run("hi")) {
      /* drain */
    }
    expect(runBody.input).toBe("hi");
    expect("model" in runBody).toBe(false);
  });

  it("surfaces a friendly error when the server is unreachable", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("ECONNREFUSED"));
    await expect(client.health()).rejects.toThrow(/Could not reach/);
  });
});
