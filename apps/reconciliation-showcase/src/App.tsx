import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity, ArrowRight, BadgeCheck, CircleStop, Gauge, Pause, Play, QrCode, RotateCcw,
  ShieldCheck, Sparkles, StepForward, TriangleAlert, Wifi, WifiOff, X, Zap,
} from "lucide-react";
import { CodexHeader } from "@/components/brainless/codex/codex-header";
import { CodexMessage } from "@/components/brainless/codex/codex-message";
import { CodexExec } from "@/components/brainless/codex/codex-exec";
import { CodexWorking } from "@/components/brainless/codex/codex-working";
import { CodexPrompt } from "@/components/brainless/codex/codex-prompt";
import { ClaudeHeader } from "@/components/brainless/claude/claude-header";
import { ClaudeMessage } from "@/components/brainless/claude/claude-message";
import { ClaudeToolCall } from "@/components/brainless/claude/claude-tool-call";
import { ClaudeThinking } from "@/components/brainless/claude/claude-thinking";
import { ClaudeTodoList, type Todo } from "@/components/brainless/claude/claude-todo-list";
import { ClaudePermission } from "@/components/brainless/claude/claude-permission";
import { ClaudePrompt } from "@/components/brainless/claude/claude-prompt";

type Tone = "neutral" | "danger" | "success" | "warning";
type Event = { command: string; result?: string; detail?: string; status?: "ok" | "error" | "run" };
type AgentSkin = "codex" | "claude";
type Experience = "replay" | "live";
const liveAvailable = import.meta.env.DEV || import.meta.env.VITE_ENABLE_LIVE === "true";
type Scene = {
  kicker: string; title: string; proposition: string; leftLabel: string; rightLabel: string;
  leftAmount: number | null; rightAmount: number | null; leftEvents: Event[]; rightEvents: Event[];
  leftTone: Tone; rightTone: Tone; narration: string;
};

type LiveView = {
  sessionId: string;
  currentScene: string;
  currentProposalSequence: number;
  state: string;
  workerOnline: boolean;
  workerPid?: number;
  currentProposal?: { requestedCommand?: { type?: string } };
  left: { actualTransferredMinor: number; timeline: string[]; paymentIds: string[] };
  right: { timeline: string[]; phase: string; duplicateSignalsIgnored: number; approval?: { state: string }; logicalPayment?: { state: string } };
  comparison: {
    ungoverned: { amountTransferredMinor: number; excessTransferredMinor: number; finalBalanceMinor: number };
    governed: { amountTransferredMinor: number; duplicateEffects: number; finalBalanceMinor?: number; approvalRecorded: boolean };
  };
};

const scenes: Scene[] = [
  {
    kicker: "THE SETUP", title: "Same agent. Same job. Two very different worlds.",
    proposition: "Reconcile INV-2026-0417 and pay the exact remaining balance.",
    leftLabel: "direct execution", rightLabel: "governed execution", leftAmount: 0, rightAmount: 0,
    leftTone: "neutral", rightTone: "neutral", narration: "One recorded proposal tape enters both systems. Only the execution architecture changes.",
    leftEvents: [{ command: "Loaded canonical proposal tape", result: "6 proposals" }],
    rightEvents: [{ command: "Loaded governed workflow", result: "ready" }, { command: "Registered goal + invariants", result: "10 active" }],
  },
  {
    kicker: "01 · EVIDENCE", title: "The agent reaches for the first plausible ledger.",
    proposition: "SELECT_LEDGER_EVIDENCE · ledger-stale", leftLabel: "stale evidence accepted", rightLabel: "authority gate intervened",
    leftAmount: 0, rightAmount: 0, leftTone: "warning", rightTone: "success", narration: "The old snapshot looks valid, but it is superseded. MotifFlow checks authority and freshness before state changes.",
    leftEvents: [{ command: "Read ledger-stale", result: "accepted", status: "run", detail: "Observed 11 Jul · outstanding ₹2,00,000" }],
    rightEvents: [{ command: "Evaluated evidence authority", result: "rejected", status: "error", detail: "LEDGER_EVIDENCE_REJECTED · SUPERSEDED" }, { command: "Activated ledger-fresh", result: "authoritative", detail: "Observed 12 Jul · outstanding ₹1,50,000" }],
  },
  {
    kicker: "02 · REASONING", title: "A small evidence mistake becomes a large financial decision.",
    proposition: "CALCULATE_CURRENT_DISCREPANCY", leftLabel: "₹2,00,000 inferred", rightLabel: "₹1,50,000 verified",
    leftAmount: 0, rightAmount: 0, leftTone: "danger", rightTone: "success", narration: "Both agents reason coherently. Only one reasons over admissible evidence.",
    leftEvents: [{ command: "Calculated discrepancy", result: "₹2,00,000", status: "error" }],
    rightEvents: [{ command: "Calculated discrepancy", result: "₹1,50,000" }, { command: "Bound calculation to snapshot", result: "ledger-fresh" }],
  },
  {
    kicker: "03 · AUTHORITY", title: "Intent is not authority.",
    proposition: "ISSUE_CURRENT_CORRECTIVE_PAYMENT", leftLabel: "payment sent", rightLabel: "approval required",
    leftAmount: 200_000, rightAmount: 0, leftTone: "danger", rightTone: "warning", narration: "The ungoverned path turns a proposal into money movement. MotifFlow pauses at a durable finance boundary.",
    leftEvents: [{ command: "POST /payments", result: "₹2,00,000", status: "error", detail: "No approval artifact · no threshold check" }],
    rightEvents: [{ command: "Checked payment threshold", result: "approval required", status: "run" }, { command: "Created durable approval", result: "PENDING", status: "run" }],
  },
  {
    kicker: "04 · DURABILITY", title: "Now kill the worker.",
    proposition: "SIGTERM · invoice-worker", leftLabel: "context lost", rightLabel: "state reconstructed",
    leftAmount: 200_000, rightAmount: 0, leftTone: "danger", rightTone: "success", narration: "The process disappears. The governed workflow does not: position, evidence, discrepancy, and approval return from the event stream.",
    leftEvents: [{ command: "Worker disconnected", result: "local context lost", status: "error" }],
    rightEvents: [{ command: "Worker process terminated", result: "PID exited", status: "error" }, { command: "Replayed workflow stream", result: "17 events" }, { command: "Recovery assertions", result: "8/8 passed", detail: "approval=PENDING · snapshot=ledger-fresh · payment=not scheduled" }],
  },
  {
    kicker: "05 · AMBIGUITY", title: "The payment succeeds. The request times out.",
    proposition: "PAYMENT PROVIDER · timeout after commit", leftLabel: "retry looks reasonable", rightLabel: "outcome unknown",
    leftAmount: 200_000, rightAmount: null, leftTone: "danger", rightTone: "warning", narration: "This is where reliable-looking agents become dangerous. MotifFlow records ambiguity instead of pretending failure.",
    leftEvents: [{ command: "POST /payments", result: "timeout", status: "error", detail: "Client observed failure · provider committed effect" }],
    rightEvents: [{ command: "Finance approval resolved", result: "GRANTED" }, { command: "Executed stable idempotency key", result: "timeout", status: "error" }, { command: "Marked payment outcome", result: "UNKNOWN", status: "run" }],
  },
  {
    kicker: "06 · IDEMPOTENCY", title: "The same retry proposal enters both worlds.",
    proposition: "RETRY_LAST_PAYMENT", leftLabel: "second payment posted", rightLabel: "retry retired",
    leftAmount: 400_000, rightAmount: 150_000, leftTone: "danger", rightTone: "success", narration: "The direct executor creates a fresh request. MotifFlow blocks the retry and queries authoritative provider state.",
    leftEvents: [{ command: "POST /payments · new request id", result: "+₹2,00,000", status: "error" }, { command: "Total transferred", result: "₹4,00,000", status: "error" }],
    rightEvents: [{ command: "Consistency gate", result: "retry rejected", status: "error" }, { command: "Queried by idempotency key", result: "provider-payment-1" }, { command: "Reconciled provider status", result: "POSTED" }],
  },
  {
    kicker: "07 · COMPLETION", title: "Signals arrive twice. Confidence arrives early.",
    proposition: "COMPLETE_RECONCILIATION", leftLabel: "confidently complete", rightLabel: "verified complete",
    leftAmount: 400_000, rightAmount: 150_000, leftTone: "danger", rightTone: "success", narration: "MotifFlow deduplicates the webhook, rejects premature completion, proves terminal predicates, and emits an evidence-backed report.",
    leftEvents: [{ command: "Processed webhook delivery #1", result: "confirmed" }, { command: "Processed webhook delivery #2", result: "confirmed again", status: "error" }, { command: "Generated report", result: "COMPLETE", status: "error" }],
    rightEvents: [{ command: "Accepted provider signal", result: "payment-event-1" }, { command: "Duplicate signal", result: "ignored" }, { command: "Completion proposal", result: "rejected", status: "error", detail: "2 stable predicates missing" }, { command: "Terminal verification", result: "10/10 passed" }, { command: "Generated evidence report", result: "VERIFIED_COMPLETE" }],
  },
  {
    kicker: "THE RESULT", title: "Governance is the difference between output and outcome.",
    proposition: "CANONICAL RUN · VERIFIED", leftLabel: "₹2,50,000 excess", rightLabel: "₹0 final balance",
    leftAmount: 400_000, rightAmount: 150_000, leftTone: "danger", rightTone: "success", narration: "Same model. Same proposals. Same failures. MotifFlow makes the execution safe, durable, and provable.",
    leftEvents: [{ command: "Transferred", result: "₹4,00,000", status: "error" }, { command: "Overpayment", result: "₹2,50,000", status: "error" }, { command: "Approval record", result: "absent", status: "error" }],
    rightEvents: [{ command: "Transferred", result: "₹1,50,000" }, { command: "Duplicate effects", result: "0" }, { command: "Final balance", result: "₹0" }, { command: "Approval + evidence", result: "recorded" }],
  },
];

const formatINR = (value: number | null) => value === null ? "?" : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);

function DecisionGate() {
  const [decision, setDecision] = useState("approve");
  const options = [{ id: "approve", label: "Approve ₹1,50,000", meta: "Finance Manager" }, { id: "reject", label: "Reject and investigate", meta: "No funds move" }];
  return <div className="decision-card">
    <div className="decision-head"><ShieldCheck size={16}/><span>Human authority required</span><b>PAYMENT</b></div>
    <div role="radiogroup" aria-label="Payment approval decision" className="decision-options">
      {options.map(option => <button key={option.id} role="radio" aria-checked={decision === option.id} onClick={() => setDecision(option.id)} className={decision === option.id ? "selected" : ""}>
        <span aria-hidden>{decision === option.id ? "●" : "○"}</span><span>{option.label}<small>{option.meta}</small></span>
      </button>)}
    </div>
    <div className="decision-foot">single-use · evidence attached</div>
  </div>;
}

function CodexTerminal({ side, scene, sceneIndex }: { side: "left" | "right"; scene: Scene; sceneIndex: number }) {
  const governed = side === "right";
  const events = governed ? scene.rightEvents : scene.leftEvents;
  const tone = governed ? scene.rightTone : scene.leftTone;
  const amount = governed ? scene.rightAmount : scene.leftAmount;
  const label = governed ? scene.rightLabel : scene.leftLabel;
  return <section className={`terminal terminal-${side}`} aria-label={`${governed ? "MotifFlow governed" : "Ungoverned"} execution`}>
    <div className="terminal-topline">
      <div><span className={`status-dot ${tone}`}/><b>{governed ? "MOTIFFLOW" : "DIRECT EXECUTOR"}</b></div>
      <span>{governed ? "policy: enforced" : "policy: none"}</span>
    </div>
    <CodexHeader version={governed ? "motifflow/0.1" : "agent/vanilla"} model="deepseek-chat · deterministic tape" directory={governed ? "~/workflows/invoice-reconciliation" : "~/tasks/invoice-reconciliation"} className="agent-header" />
    <div className="amount-strip">
      <div><small>ACTUAL TRANSFERRED</small><strong className={tone}>{formatINR(amount)}</strong></div>
      <div className={`outcome-pill ${tone}`}>{label}</div>
    </div>
    <div className="terminal-body" aria-live="polite">
      <CodexMessage role="user">{scene.proposition.toLowerCase().replaceAll("_", " ")}</CodexMessage>
      <CodexMessage>{governed ? "I’ll evaluate the proposal against current evidence, authority, and workflow invariants." : "I’ll execute the requested action and report the result."}</CodexMessage>
      <div className="exec-list">
        {events.map((event, index) => <CodexExec key={`${sceneIndex}-${index}`} command={event.command} result={event.result} status={event.status} defaultOpen={Boolean(event.detail)}>{event.detail}</CodexExec>)}
      </div>
      {governed && sceneIndex === 3 ? <DecisionGate /> : null}
      {sceneIndex > 0 && sceneIndex < scenes.length - 1 ? <CodexWorking label={governed ? "Enforcing workflow" : "Executing"} /> : null}
    </div>
    <CodexPrompt value="" onChange={() => undefined} placeholder={governed ? "Workflow controlled by MotifFlow" : "Direct executor ready"} model="deepseek-chat" directory={governed ? "governed" : "unrestricted"} className="agent-prompt" />
  </section>;
}

function sceneTodos(sceneIndex: number): Todo[] {
  const labels = ["Select authoritative evidence", "Compute current discrepancy", "Obtain payment authority", "Reconcile provider outcome", "Verify terminal predicates"];
  const milestones = [1, 2, 3, 6, 7];
  return labels.map((label, index) => ({ label, status: sceneIndex > milestones[index]! ? "done" : sceneIndex === milestones[index] ? "active" : "todo" }));
}

function ClaudeTerminal({ side, scene, sceneIndex }: { side: "left" | "right"; scene: Scene; sceneIndex: number }) {
  const governed = side === "right";
  const events = governed ? scene.rightEvents : scene.leftEvents;
  const tone = governed ? scene.rightTone : scene.leftTone;
  const amount = governed ? scene.rightAmount : scene.leftAmount;
  const label = governed ? scene.rightLabel : scene.leftLabel;
  return <section className={`terminal terminal-${side} claude-terminal`} aria-label={`${governed ? "MotifFlow governed" : "Ungoverned"} Claude Code execution`}>
    <div className="terminal-topline">
      <div><span className={`status-dot ${tone}`}/><b>{governed ? "MOTIFFLOW" : "DIRECT EXECUTOR"}</b></div>
      <span>{governed ? "policy: enforced" : "policy: none"}</span>
    </div>
    <ClaudeHeader version={governed ? "motifflow/0.1" : "agent/vanilla"} user="Operator" model="DeepSeek Chat · canonical tape" org={governed ? "MotifFlow governed runtime" : "Unrestricted execution"} cwd="~/invoice-reconciliation" tips={[governed ? "Proposals must pass evidence and authority gates" : "Proposals execute as direct actions"]} whatsNew={[governed ? "10 workflow invariants active" : "No execution policy attached"]} className="claude-agent-header" />
    <div className="amount-strip">
      <div><small>ACTUAL TRANSFERRED</small><strong className={tone}>{formatINR(amount)}</strong></div>
      <div className={`outcome-pill ${tone}`}>{label}</div>
    </div>
    <div className="terminal-body" aria-live="polite">
      <ClaudeMessage role="user">{scene.proposition.toLowerCase().replaceAll("_", " ")}</ClaudeMessage>
      <ClaudeMessage>{governed ? "I’ll evaluate the proposal against evidence authority, human approval, and terminal invariants." : "I’ll execute the requested action and report the result."}</ClaudeMessage>
      {governed && sceneIndex > 0 && sceneIndex < scenes.length - 1 ? <ClaudeTodoList todos={sceneTodos(sceneIndex)} className="claude-todos" /> : null}
      <div className="exec-list">
        {events.map((event, eventIndex) => <ClaudeToolCall key={`${sceneIndex}-${eventIndex}`} tool={event.command} result={event.result ?? "complete"} status={event.status === "error" ? "error" : event.status === "run" ? "pending" : "success"} defaultOpen={Boolean(event.detail)}>{event.detail}</ClaudeToolCall>)}
      </div>
      {governed && sceneIndex === 3 ? <ClaudePermission title="Finance authority" command="Pay Sunrise Equipment · ₹1,50,000" question="Authorize this corrective payment?" options={["Approve once with attached evidence", "Reject and investigate", "Pause workflow without resolving"]} className="claude-approval" /> : null}
      {sceneIndex > 0 && sceneIndex < scenes.length - 1 ? <ClaudeThinking verbs={governed ? ["Governing", "Verifying", "Reconciling"] : ["Executing", "Retrying", "Reporting"]} /> : null}
    </div>
    <ClaudePrompt value="" onChange={() => undefined} placeholder={governed ? "Workflow controlled by MotifFlow" : "Direct executor ready"} mode={governed ? "plan" : "auto"} effort="xhigh" className="agent-prompt" />
  </section>;
}

function Terminal({ side, scene, sceneIndex, skin }: { side: "left" | "right"; scene: Scene; sceneIndex: number; skin: AgentSkin }) {
  return skin === "claude" ? <ClaudeTerminal side={side} scene={scene} sceneIndex={sceneIndex}/> : <CodexTerminal side={side} scene={scene} sceneIndex={sceneIndex}/>;
}

const liveSceneIndexes: Record<string, number> = {
  INTRO: 0, STALE_EVIDENCE: 1, DISCREPANCY: 2, AUTHORITY: 3, WORKER_KILL: 4,
  PAYMENT_TIMEOUT: 5, AMBIGUOUS_RETRY: 6, DUPLICATE_WEBHOOK: 7,
  PREMATURE_COMPLETION: 7, FINAL_COMPARISON: 8,
};

function timelineEvents(values: string[], governed: boolean): Event[] {
  return values.slice(-6).map(value => ({
    command: value.replaceAll("_", " ").toLowerCase(),
    result: governed ? "event committed" : "executed",
    status: /REJECTED|UNKNOWN|DUPLICATE|TIMEOUT/.test(value) ? "error" : "ok",
  }));
}

function sceneFromLive(view: LiveView): { scene: Scene; index: number } {
  const index = liveSceneIndexes[view.currentScene] ?? 0;
  const base = scenes[index]!;
  const outcomeUnknown = view.right.logicalPayment?.state === "OUTCOME_UNKNOWN";
  return {
    index,
    scene: {
      ...base,
      proposition: view.currentScene === "WORKER_KILL" ? base.proposition : view.currentProposal?.requestedCommand?.type ?? base.proposition,
      leftAmount: view.comparison.ungoverned.amountTransferredMinor / 100,
      rightAmount: outcomeUnknown ? null : view.comparison.governed.amountTransferredMinor / 100,
      leftEvents: timelineEvents(view.left.timeline, false).length ? timelineEvents(view.left.timeline, false) : [{ command: "Live session connected", result: "waiting" }],
      rightEvents: timelineEvents(view.right.timeline, true),
      rightLabel: !view.workerOnline ? "worker offline · state durable" : base.rightLabel,
      rightTone: !view.workerOnline ? "danger" : base.rightTone,
    },
  };
}

function LiveAuditLog({ view }: { view: LiveView }) {
  return <details className="audit-log" open={view.currentScene === "FINAL_COMPARISON"}>
    <summary><span><Activity size={15}/>Live event timeline</span><b>{view.left.timeline.length + view.right.timeline.length} events</b></summary>
    <div className="audit-columns">
      <div><h3>Direct executor</h3><ol>{view.left.timeline.map((event, index) => <li key={`${event}-${index}`}><span>{String(index + 1).padStart(2,"0")}</span>{event}</li>)}</ol></div>
      <div><h3>MotifFlow event stream</h3><ol>{view.right.timeline.map((event, index) => <li key={`${event}-${index}`}><span>{String(index + 1).padStart(2,"0")}</span>{event.replaceAll("_", " ")}</li>)}</ol></div>
    </div>
  </details>;
}

function ReplayAuditLog() {
  const left = scenes.flatMap(scene => scene.leftEvents.map(event => event.command));
  const right = scenes.flatMap(scene => scene.rightEvents.map(event => event.command));
  return <details className="audit-log replay-audit">
    <summary><span><Activity size={15}/>Inspectable trajectory</span><b>{left.length + right.length} recorded steps</b></summary>
    <div className="audit-columns">
      <div><h3>Direct executor</h3><ol>{left.map((event, index) => <li key={`${event}-${index}`}><span>{String(index + 1).padStart(2,"0")}</span>{event}</li>)}</ol></div>
      <div><h3>MotifFlow</h3><ol>{right.map((event, index) => <li key={`${event}-${index}`}><span>{String(index + 1).padStart(2,"0")}</span>{event}</li>)}</ol></div>
    </div>
  </details>;
}

function LiveDemo({ skin }: { skin: AgentSkin }) {
  const [view, setView] = useState<LiveView>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [qr, setQr] = useState<{ url: string; qr: string }>();
  const started = useRef(false);

  async function connect() {
    setBusy(true); setError(undefined);
    try {
      const response = await fetch("/demo/sessions", { method: "POST" });
      const payload = await response.json() as LiveView & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not start the live session");
      setView(payload);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Live runtime unavailable"); }
    finally { setBusy(false); }
  }

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void connect();
  }, []);

  useEffect(() => {
    if (!view?.sessionId) return;
    const stream = new EventSource(`/demo/sessions/${view.sessionId}/stream`);
    stream.onmessage = event => setView(JSON.parse(event.data) as LiveView);
    stream.onerror = () => setError("Live event stream disconnected. The runtime may still be running.");
    return () => stream.close();
  }, [view?.sessionId]);

  async function action(name: string) {
    if (!view) return;
    setBusy(true); setError(undefined);
    try {
      const response = await fetch(`/demo/sessions/${view.sessionId}/${name}`, { method: "POST" });
      const payload = await response.json() as (LiveView & { error?: string }) | { view: LiveView; error?: string };
      if (!response.ok) throw new Error("error" in payload && payload.error ? payload.error : "Runtime action failed");
      setView("view" in payload ? payload.view : payload);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Runtime action failed"); }
    finally { setBusy(false); }
  }

  async function openApproval() {
    if (!view) return;
    setBusy(true);
    try {
      const response = await fetch(`/demo/sessions/${view.sessionId}/approval-qr`);
      const payload = await response.json() as { url: string; qr: string; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not create approval link");
      setQr(payload);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not create approval link"); }
    finally { setBusy(false); }
  }

  if (!view) return <section className="live-shell live-empty">
    <div className="live-pulse"><Activity size={22}/></div><h2>{busy ? "Starting a real MotifFlow session…" : "Live runtime unavailable"}</h2>
    {error ? <p>{error}</p> : <p>Creating workflow, activity worker, and event stream.</p>}
    {!busy ? <button className="primary-button" onClick={() => void connect()}>Try again</button> : null}
  </section>;

  const live = sceneFromLive(view);
  const approvalPending = view.right.approval?.state === "PENDING";
  const approvalGranted = view.right.approval?.state === "GRANTED";
  const atAuthority = view.currentScene === "AUTHORITY";
  const complete = view.currentScene === "FINAL_COMPARISON";
  return <section className="live-shell" aria-label="Live MotifFlow session">
    <div className="live-banner">
      <div><span className="live-beacon"/><strong>NOW LIVE</strong><code>{view.sessionId.slice(0, 18)}…</code></div>
      <div className={view.workerOnline ? "online" : "offline"}>{view.workerOnline ? <Wifi size={14}/> : <WifiOff size={14}/>}worker {view.workerOnline ? `online · pid ${view.workerPid ?? "—"}` : "terminated"}</div>
    </div>
    <div className="story-bar">
      <div className="story-copy"><span>{live.scene.kicker}</span><h2>{live.scene.title}</h2><p>{live.scene.narration}</p></div>
      <div className="runtime-state"><small>WORKFLOW STATE</small><b>{view.state.replaceAll("_", " ")}</b><span>{view.right.phase?.replaceAll("_", " ")}</span></div>
    </div>
    <div className="proposal-rail"><span>LIVE MODEL PROPOSAL</span><code>{live.scene.proposition}</code><div><Activity size={14}/><b>SSE CONNECTED</b></div></div>
    <div className="terminal-grid"><Terminal key={`live-left-${live.index}`} side="left" scene={live.scene} sceneIndex={live.index} skin={skin}/><Terminal key={`live-right-${live.index}`} side="right" scene={live.scene} sceneIndex={live.index} skin={skin}/></div>
    <div className="live-controls" aria-label="Live demo controls">
      <div className="control-primary">
        {view.state === "READY" ? <button className="primary-button" disabled={busy} onClick={() => void action("start")}><Play size={16}/>Start live flow</button> : null}
        {view.state === "WORKER_OFFLINE" ? <button className="primary-button" disabled={busy} onClick={() => void action("restart-worker")}><RotateCcw size={16}/>Restart worker + recover</button> : null}
        {atAuthority && approvalPending ? <button className="primary-button" disabled={busy} onClick={() => void openApproval()}><QrCode size={16}/>Approve from phone</button> : null}
        {view.state !== "READY" && view.state !== "WORKER_OFFLINE" && (!atAuthority || approvalGranted) && !complete ? <button className="primary-button" disabled={busy} onClick={() => void action("next")}><StepForward size={16}/>Next live step</button> : null}
        {complete ? <button className="primary-button" disabled={busy} onClick={() => void action("reset")}><RotateCcw size={16}/>New live session</button> : null}
      </div>
      <div className="control-secondary">
        <button disabled={busy || !view.workerOnline || !atAuthority} onClick={() => void action("kill-worker")} className="danger-control"><CircleStop size={15}/>Kill governed worker</button>
        <button disabled={busy} onClick={() => void action("reset")}><RotateCcw size={15}/>Reset</button>
      </div>
      {error ? <p role="alert">{error}</p> : null}
    </div>
    <LiveAuditLog view={view}/>
    {qr ? <div className="modal-backdrop" role="presentation"><section className="approval-modal" role="dialog" aria-modal="true" aria-labelledby="approval-title">
      <button className="modal-close" aria-label="Close approval dialog" onClick={() => setQr(undefined)}><X size={18}/></button>
      <span className="modal-kicker">DURABLE AUTHORITY</span><h2 id="approval-title">Approve from your phone</h2><p>Scan this code. The approval is single-use and the live screen updates over SSE.</p>
      <img src={qr.qr} alt="QR code for the payment approval page"/><a href={qr.url} target="_blank" rel="noreferrer">Open approval page</a>
    </section></div> : null}
  </section>;
}

function Metric({ label, value, note, good }: { label: string; value: string; note: string; good?: boolean }) {
  return <div className={`metric ${good ? "metric-good" : ""}`}><small>{label}</small><strong>{value}</strong><span>{note}</span></div>;
}

export function App() {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [skin, setSkin] = useState<AgentSkin>("codex");
  const [experience, setExperience] = useState<Experience>("replay");
  const [presenter, setPresenter] = useState(false);
  const scene = scenes[index]!;
  useEffect(() => {
    if (!playing) return;
    if (index === scenes.length - 1) { setPlaying(false); return; }
    const timer = window.setTimeout(() => setIndex(value => Math.min(value + 1, scenes.length - 1)), 4300);
    return () => window.clearTimeout(timer);
  }, [playing, index]);
  const progress = useMemo(() => (index / (scenes.length - 1)) * 100, [index]);
  const restart = () => { setIndex(0); setPlaying(true); };
  const togglePlayback = () => {
    if (presenter) { setIndex(value => Math.min(value + 1, scenes.length - 1)); return; }
    if (index === scenes.length - 1) restart(); else setPlaying(value => !value);
  };
  function chooseExperience(value: Experience) { setPlaying(false); setExperience(value); }
  function togglePresenter() { setPlaying(false); setPresenter(value => !value); }

  return <main className={presenter ? "presenter" : undefined}>
    <header className="site-header">
      <a className="brand" href="#top" aria-label="MotifFlow home"><span className="brand-mark"><Sparkles size={16}/></span><span>Motif<span>Flow</span></span></a>
      {liveAvailable ? <div className="experience-switch" role="radiogroup" aria-label="Demo experience">
        <button role="radio" aria-checked={experience === "replay"} onClick={() => chooseExperience("replay")}>Guided replay</button>
        <button role="radio" aria-checked={experience === "live"} onClick={() => chooseExperience("live")}><span className="mini-beacon"/>Now live</button>
      </div> : <div className="hosted-label"><BadgeCheck size={14}/>Hosted guided replay</div>}
      <div className="skin-switch" role="radiogroup" aria-label="Agent interface">
        <button role="radio" aria-checked={skin === "codex"} onClick={() => setSkin("codex")}>Codex</button>
        <button role="radio" aria-checked={skin === "claude"} onClick={() => setSkin("claude")}>Claude Code</button>
      </div>
      <button className={`quiet-button ${presenter ? "active" : ""}`} aria-pressed={presenter} onClick={togglePresenter}><Gauge size={14}/>Presenter</button>
    </header>

    <section className="hero" id="top">
      <div className="eyebrow"><span>AGENTIC EXECUTION, GOVERNED</span><i/></div>
      <h1>Same intelligence.<br/><em>Safer reality.</em></h1>
      <p>Watch one AI agent reconcile a real-world invoice in two execution environments—and see where reliability actually comes from.</p>
      <div className="hero-actions">
        {experience === "replay" ? <button className="primary-button" onClick={togglePlayback}>{presenter ? <StepForward size={17}/> : playing ? <Pause size={17}/> : <Play size={17} fill="currentColor"/>}{presenter ? "Next scene" : playing ? "Pause story" : index === scenes.length - 1 ? "Replay story" : "Play the story"}</button> : <button className="primary-button" onClick={() => document.querySelector(".live-shell")?.scrollIntoView({ behavior: "smooth" })}><Activity size={17}/>Go to live session</button>}
        <span>{experience === "replay" ? <><Zap size={15}/>{presenter ? " manual presenter pacing" : " 38 second guided demo"}</> : <><span className="mini-beacon"/>real runtime · real worker · real approval</>}</span>
      </div>
    </section>

    {experience === "live" ? <LiveDemo skin={skin}/> : <section className="stage" aria-label="Invoice reconciliation comparison">
      <div className="story-bar">
        <div className="story-copy"><span>{scene.kicker}</span><h2>{scene.title}</h2><p>{scene.narration}</p></div>
        <div className="story-controls">
          {!presenter ? <button onClick={() => setPlaying(value => !value)} aria-label={playing ? "Pause automatic playback" : "Start automatic playback"}>{playing ? <Pause/> : <Play/>}</button> : null}
          <button onClick={() => { setPlaying(false); setIndex(value => Math.min(value + 1, scenes.length - 1)); }} aria-label="Next scene"><StepForward/></button>
          <span>{String(index + 1).padStart(2,"0")} / {String(scenes.length).padStart(2,"0")}</span>
        </div>
      </div>
      <div className="proposal-rail"><span>SAME MODEL PROPOSAL</span><code>{scene.proposition}</code><div><BadgeCheck size={14}/><b>TESTED SCENARIO</b></div></div>
      <div className="terminal-grid"><Terminal key={`replay-left-${index}`} side="left" scene={scene} sceneIndex={index} skin={skin}/><Terminal key={`replay-right-${index}`} side="right" scene={scene} sceneIndex={index} skin={skin}/></div>
      <div className="scene-nav" aria-label="Demo scenes">
        <div className="progress-track"><i style={{width:`${progress}%`}}/></div>
        <div className="scene-buttons">{scenes.map((item, sceneIndex) => <button key={item.kicker} aria-label={`Show ${item.kicker}`} aria-current={sceneIndex === index ? "step" : undefined} onClick={() => {setPlaying(false);setIndex(sceneIndex);}}><span>{sceneIndex}</span><small>{item.kicker.replace(/^\d+ · /, "")}</small></button>)}</div>
      </div>
      {index === scenes.length - 1 ? <ReplayAuditLog/> : null}
    </section>}

    {experience === "replay" ? <section className={`outcome ${index === scenes.length - 1 ? "outcome-visible" : ""}`} aria-hidden={index !== scenes.length - 1}>
      <div className="outcome-intro"><div className="eyebrow"><span>THE BUSINESS CASE</span><i/></div><h2>The model wasn’t the control.<br/>The runtime was.</h2><p>MotifFlow turns probabilistic intent into deterministic, auditable execution.</p></div>
      <div className="metric-grid">
        <Metric label="UNGOVERNED TRANSFER" value="₹4,00,000" note="₹2,50,000 excess" />
        <Metric label="MOTIFFLOW TRANSFER" value="₹1,50,000" note="exact amount owed" good />
        <Metric label="DUPLICATE EFFECTS" value="0" note="stable idempotency" good />
        <Metric label="FINAL BALANCE" value="₹0" note="10/10 predicates verified" good />
      </div>
    </section> : null}

    <footer><div><Gauge size={16}/><span>Not a model demo. An execution architecture demo.</span></div><div className="footer-signals"><span><TriangleAlert size={14}/>ambiguity contained</span><span><CircleStop size={14}/>authority enforced</span><span><ShieldCheck size={14}/>outcomes verified</span><ArrowRight size={15}/></div></footer>
  </main>;
}
