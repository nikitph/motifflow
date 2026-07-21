import { createServer, type ServerResponse } from "node:http";
import { URL } from "node:url";
import QRCode from "qrcode";
import { DemoSessionManager } from "../../../packages/demo-orchestrator/src/session.js";
import { approvalHtml, demoHtml } from "./client.js";

const manager = new DemoSessionManager(true);
const tokenSessions = new Map<string, string>();
function json(res: ServerResponse, status: number, data: unknown) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", "http://localhost");
    const p = url.pathname.split("/").filter(Boolean);
    if (req.method === "GET" && url.pathname === "/") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" }); return res.end(demoHtml);
    }
    if (req.method === "POST" && url.pathname === "/demo/sessions") {
      const session = await manager.create(); tokenSessions.set(session.token()!, session.sessionId); return json(res, 201, session.view());
    }
    if (p[0] === "demo" && p[1] === "sessions" && p[2]) {
      const session = manager.get(p[2]);
      if (req.method === "GET" && p.length === 3) return json(res, 200, session.view());
      if (req.method === "GET" && p[3] === "events") return json(res, 200, { left: session.ungoverned.state.timeline, right: session.governed.events() });
      if (req.method === "GET" && p[3] === "comparison") return json(res, 200, session.comparison());
      if (req.method === "GET" && p[3] === "approval-qr") { const approvalUrl = session.approvalUrl(`http://${req.headers.host}`)!; return json(res, 200, { url: approvalUrl, qr: await QRCode.toDataURL(approvalUrl, { width: 420, margin: 2 }) }); }
      if (req.method === "GET" && p[3] === "stream") { res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" }); const unsubscribe = session.subscribe(x => res.write(`data: ${JSON.stringify(x)}\n\n`)); req.on("close", unsubscribe); return; }
      if (req.method === "POST") {
        const action = p[3];
        let value: unknown;
        if (action === "reset") {
          const replacement = await manager.reset(session.sessionId);
          tokenSessions.set(replacement.token()!, replacement.sessionId);
          value = replacement.view();
        } else {
          value = action === "start" ? await session.start() : action === "pause" ? session.pause() : action === "next" ? await session.next() : action === "kill-worker" ? await session.killWorker() : action === "restart-worker" ? await session.restartWorker() : undefined;
        }
        if (value) return json(res, 200, value);
      }
    }
    if (req.method === "GET" && p[0] === "approval" && p[1]) { res.writeHead(200, { "content-type": "text/html; charset=utf-8" }); return res.end(approvalHtml(p[1])); }
    if (req.method === "POST" && p[0] === "demo" && p[1] === "approvals" && p[2] && p[3]) { const sessionId = tokenSessions.get(p[2]); if (!sessionId) throw new Error("Invalid approval token"); const session = manager.get(sessionId); return json(res, 200, p[3] === "approve" ? await session.approve(p[2]) : session.reject(p[2])); }
    return json(res, 404, { error: "not_found" });
  } catch (error) { return json(res, 400, { error: error instanceof Error ? error.message : "request_failed" }); }
});

const port = Number(process.env.DEMO_PORT ?? 3400);
server.listen(port, "127.0.0.1", () => console.log(JSON.stringify({ service: "motifflow-reconciliation-demo", url: `http://127.0.0.1:${port}` })));
