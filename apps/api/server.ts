import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { URL } from "node:url";
import type { EventStore } from "../../packages/event-store/src/memory.js";
import type { WorkflowAggregate } from "../../packages/workflow/src/workflow.js";
import type { TypedBlackboard } from "../../packages/blackboard/src/blackboard.js";
import type { ActivityTask, ApprovalState } from "../../packages/runtime/src/types.js";
import { auditProjection, workflowSummary } from "../../packages/projections/src/projections.js";
import { diagnoseDistortions } from "../../packages/atlas/src/distortions.js";

async function body(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  if (!chunks.length) return {};
  const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new Error("JSON object required");
  return parsed as Record<string, unknown>;
}

function json(res: ServerResponse, status: number, value: unknown) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(value));
}

interface ApiRuntime { receiveSignal(signal:{signalId:string;workflowId:string;type:string;payload:unknown;sentAt:string;senderId:string;idempotencyKey:string}):boolean|Promise<boolean>;listApprovals(status?:ApprovalState["status"]):unknown[]|Promise<unknown[]>;resolveApproval(id:string,resolution:"GRANTED"|"DENIED",actor:string,at:string):unknown|Promise<unknown>;getActivity(id:string):ActivityTask|undefined|Promise<ActivityTask|undefined>;pendingWork(id:string):unknown|Promise<unknown> }
export function createMotifFlowServer(deps: { store: EventStore; aggregate: WorkflowAggregate; blackboard: TypedBlackboard; runtime: ApiRuntime }) {
  return createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", "http://localhost");
      const parts = url.pathname.split("/").filter(Boolean);
      if (req.method === "GET" && url.pathname === "/health") return json(res, 200, { ok: true });
      if (req.method === "POST" && url.pathname === "/workflows") {
        const request = await body(req); const id = String(request.workflowId ?? crypto.randomUUID());
        let state = await deps.aggregate.create(id, Array.isArray(request.boundaries) ? request.boundaries as never : [], Array.isArray(request.authorityPolicies) ? request.authorityPolicies as never : [], request.budgets as never);
        if (request.goal) state = await deps.aggregate.registerGoal(id, state.version, request.goal as never);
        return json(res, 201, state);
      }
      if (req.method === "GET" && url.pathname === "/approvals") return json(res, 200, await deps.runtime.listApprovals("PENDING"));
      if (req.method === "POST" && parts[0] === "approvals" && parts[1] && (parts[2] === "grant" || parts[2] === "deny")) {
        const request = await body(req); const resolution = parts[2] === "grant" ? "GRANTED" : "DENIED";
        return json(res, 200, await deps.runtime.resolveApproval(parts[1], resolution, String(request.actorId ?? "human"), new Date().toISOString()));
      }
      if (req.method === "GET" && parts[0] === "activities" && parts[1]) return json(res, 200, await deps.runtime.getActivity(parts[1]) ?? { error: "not_found" });
      if (parts[0] === "workflows" && parts[1]) {
        const id = parts[1];
        const events = await deps.store.load(id);
        if (req.method === "GET" && parts.length === 2) return json(res, 200, workflowSummary(id, events));
        if (req.method === "GET" && parts[2] === "history") return json(res, 200, events);
        if (req.method === "GET" && parts[2] === "blackboard") return json(res, 200, deps.blackboard.get(id));
        if (req.method === "GET" && parts[2] === "diagnosis") return json(res, 200, diagnoseDistortions(id, {}, new Date().toISOString()));
        if (req.method === "GET" && parts[2] === "audit") return json(res, 200, auditProjection(events));
        if (req.method === "GET" && parts[2] === "pending-work") return json(res, 200, await deps.runtime.pendingWork(id));
        if (req.method === "POST" && parts[2] === "suspend") {
          const request = await body(req); const state = await deps.aggregate.load(id);
          return json(res, 200, await deps.aggregate.suspend(id, state.version, String(request.reason ?? "requested")));
        }
        if (req.method === "POST" && parts[2] === "resume") {
          const state = await deps.aggregate.load(id);
          return json(res, 200, await deps.aggregate.resume(id, state.version));
        }
        if (req.method === "POST" && parts[2] === "cancel") {
          const request = await body(req); const state = await deps.aggregate.load(id);
          return json(res, 200, await deps.aggregate.cancel(id, state.version, String(request.reason ?? "requested")));
        }
        if (req.method === "POST" && parts[2] === "signals") {
          const request = await body(req);
          const accepted = await deps.runtime.receiveSignal({ signalId: String(request.signalId), workflowId: id, type: String(request.type), payload: request.payload, sentAt: String(request.sentAt ?? new Date().toISOString()), senderId: String(request.senderId ?? "api"), idempotencyKey: String(request.idempotencyKey) });
          return json(res, accepted ? 202 : 200, { accepted, deduplicated: !accepted });
        }
      }
      return json(res, 404, { error: "not_found" });
    } catch (error) {
      return json(res, 400, { error: error instanceof Error ? error.message : "request_failed" });
    }
  });
}
