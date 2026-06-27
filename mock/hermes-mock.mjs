#!/usr/bin/env node
// A tiny stand-in for the Hermes Agent API server, implementing the subset of
// endpoints this front end uses. It streams a fake agentic turn (tool progress,
// an approval gate, then token deltas) so the whole UI can be exercised without
// a real agent installed.
//
//   node mock/hermes-mock.mjs            # listens on http://127.0.0.1:8642
//   PORT=9000 node mock/hermes-mock.mjs
//
// Any non-empty Bearer token is accepted. CORS is wide open for local dev.

import { createServer } from "node:http";
import { randomUUID } from "node:crypto";

const PORT = Number(process.env.PORT ?? 8642);

/** @type {Map<string, any>} */
const sessions = new Map();
/** @type {Map<string, any>} */
const runs = new Map();
/** @type {Map<string, any>} */
const jobs = new Map();
/** @type {Map<string, () => void>} */
const pendingApprovals = new Map();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
}

function json(res, status, body) {
  cors(res);
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function sse(res) {
  cors(res);
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  return (event, data) =>
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

async function streamRun(res, run) {
  const send = sse(res);
  send("run.created", { run_id: run.id });
  await sleep(250);

  send("tool.started", { tool: "web_search", id: "t1", detail: run.input.slice(0, 40) });
  await sleep(500);
  send("hermes.tool.progress", { tool: "web_search", id: "t1", detail: "reading results…" });
  await sleep(500);
  send("tool.completed", { tool: "web_search", id: "t1", detail: "3 sources" });

  // Demonstrate the human approval gate when asked.
  if (/approve|delete|deploy/i.test(run.input)) {
    send("approval.required", {
      approval_id: "a1",
      tool: "shell",
      detail: "rm -rf ./build && deploy",
    });
    await new Promise((resolve) => pendingApprovals.set(run.id, resolve));
    await sleep(200);
    send("tool.completed", { tool: "shell", id: "t2", detail: "done" });
  }

  const reply =
    "Here's what I found for **" +
    run.input.trim() +
    "**:\n\n- Point one\n- Point two\n\n```js\nconsole.log('hello from Hermes');\n```\n";
  for (const tok of reply.match(/\S+\s*|\s+/g) ?? []) {
    if (run.stopped) break;
    send("response.output_text.delta", { delta: tok });
    await sleep(40);
  }
  send("response.completed", { run_id: run.id });
  res.end();
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  const p = url.pathname;
  const m = req.method ?? "GET";

  if (m === "OPTIONS") {
    cors(res);
    res.writeHead(204);
    return res.end();
  }

  // Discovery / health
  if (p === "/health" || p === "/v1/health") return json(res, 200, { status: "ok" });
  if (p === "/v1/capabilities")
    return json(res, 200, {
      endpoints: { "/v1/chat/completions": true, "/v1/runs": true },
      features: { streaming: true, tool_progress: true, approvals: true, images: true },
    });
  if (p === "/v1/models")
    return json(res, 200, {
      data: [
        { id: "Hermes-4-405B", owned_by: "nousresearch" },
        { id: "Hermes-3-70B", owned_by: "nousresearch" },
        { id: "Hermes-3-8B", owned_by: "nousresearch" },
      ],
    });

  // Sessions
  if (p === "/api/sessions" && m === "GET")
    return json(res, 200, { data: [...sessions.values()] });
  if (p === "/api/sessions" && m === "POST") {
    const body = await readBody(req);
    const s = {
      id: randomUUID(),
      title: body.title ?? "New chat",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      message_count: 0,
      messages: [],
    };
    sessions.set(s.id, s);
    return json(res, 200, s);
  }
  const sessMatch = p.match(/^\/api\/sessions\/([^/]+)(\/(messages|fork))?$/);
  if (sessMatch) {
    const id = decodeURIComponent(sessMatch[1]);
    const sub = sessMatch[3];
    const s = sessions.get(id);
    if (sub === "messages") return json(res, 200, { data: s?.messages ?? [] });
    if (sub === "fork" && m === "POST") {
      const copy = { ...(s ?? {}), id: randomUUID(), title: (s?.title ?? "") + " (fork)" };
      sessions.set(copy.id, copy);
      return json(res, 200, copy);
    }
    if (m === "PATCH") {
      const body = await readBody(req);
      if (s) {
        s.title = body.title ?? s.title;
        s.updated_at = new Date().toISOString();
      }
      return json(res, 200, s ?? {});
    }
    if (m === "DELETE") {
      sessions.delete(id);
      return json(res, 204, {});
    }
  }

  // Runs
  if (p === "/v1/runs" && m === "POST") {
    const body = await readBody(req);
    const run = { id: randomUUID(), input: String(body.input ?? ""), stopped: false };
    runs.set(run.id, run);
    // persist a couple of messages on the session for history
    const s = body.session_id && sessions.get(body.session_id);
    if (s) {
      s.messages.push({ role: "user", content: run.input });
      s.message_count = s.messages.length;
    }
    return json(res, 200, { run_id: run.id });
  }
  const runMatch = p.match(/^\/v1\/runs\/([^/]+)(\/(events|stop|approval))?$/);
  if (runMatch) {
    const id = decodeURIComponent(runMatch[1]);
    const sub = runMatch[3];
    const run = runs.get(id);
    if (sub === "events") return streamRun(res, run ?? { id, input: "" });
    if (sub === "stop") {
      if (run) run.stopped = true;
      return json(res, 200, { status: "stopping" });
    }
    if (sub === "approval") {
      const resolve = pendingApprovals.get(id);
      if (resolve) {
        pendingApprovals.delete(id);
        resolve();
      }
      return json(res, 200, { status: "resolved" });
    }
  }

  // Capability browsers
  if (p === "/v1/skills")
    return json(res, 200, {
      data: [
        { name: "summarize-pdf", description: "Extract and summarize a PDF", tags: ["docs"] },
        { name: "deploy-site", description: "Build and deploy a static site", tags: ["dev"] },
      ],
    });
  if (p === "/v1/toolsets")
    return json(res, 200, {
      data: [
        { name: "web", description: "Search and browse", tools: ["web_search", "browse"] },
        { name: "shell", description: "Run commands", tools: ["bash"], enabled: true },
        { name: "media", description: "Generate media", tools: ["image_gen", "tts"] },
      ],
    });

  // Jobs
  if (p === "/api/jobs" && m === "GET") return json(res, 200, { data: [...jobs.values()] });
  if (p === "/api/jobs" && m === "POST") {
    const body = await readBody(req);
    const j = {
      id: randomUUID(),
      name: body.name,
      schedule: body.schedule,
      prompt: body.prompt,
      paused: false,
    };
    jobs.set(j.id, j);
    return json(res, 200, j);
  }
  const jobMatch = p.match(/^\/api\/jobs\/([^/]+)(\/(pause|resume|run))?$/);
  if (jobMatch) {
    const id = decodeURIComponent(jobMatch[1]);
    const sub = jobMatch[3];
    const j = jobs.get(id);
    if (sub === "pause" && j) j.paused = true;
    if (sub === "resume" && j) j.paused = false;
    if (m === "DELETE") jobs.delete(id);
    return json(res, 200, j ?? { status: "ok" });
  }

  json(res, 404, { error: "not found", path: p });
});

server.listen(PORT, () => {
  console.log(`Hermes mock API listening on http://127.0.0.1:${PORT}`);
  console.log("Use any non-empty API key. Try sending a message containing 'approve'.");
});
