import { describe, expect, it } from "vitest";
import { diagnoseTemporalDistortions } from "../packages/atlas/src/distortions.js";
import { buildReport, codingAdversarialTask, evaluationEvents, InMemoryEvaluationEventStore, replayEvaluation, runEvaluation } from "../packages/evaluation/src/index.js";

describe("comparative evaluation harness", () => {
  it("runs identical tasks and budgets under all four governance configurations", () => {
    const modes = ["UNCONSTRAINED", "PROMPT_GOVERNED", "TYPED_WORKFLOW", "MOTIFFLOW"] as const;
    const runs = modes.map(mode => runEvaluation(codingAdversarialTask, mode));
    expect(runs.every(r => r.metrics.tokens === runs[0]!.metrics.tokens)).toBe(true);
    expect(runs.every(r => r.records.map(x => x.stepId).join() === runs[0]!.records.map(x => x.stepId).join())).toBe(true);
    const report = buildReport(runs, "now");
    expect(report.ranking[0]?.mode).toBe("MOTIFFLOW");
    expect(runs.find(r => r.mode === "MOTIFFLOW")!.expectedBehaviorsSatisfied).toBeGreaterThan(runs.find(r => r.mode === "TYPED_WORKFLOW")!.expectedBehaviorsSatisfied);
  });
  it("ablation changes legal transitions rather than only labels", () => {
    const full = runEvaluation(codingAdversarialTask, "MOTIFFLOW", { motifsEnabled: true });
    const ablated = runEvaluation(codingAdversarialTask, "MOTIFFLOW", { motifsEnabled: false });
    expect(full.records.find(r => r.stepId === "search-4")?.decision).toBe("REJECTED");
    expect(ablated.records.find(r => r.stepId === "search-4")?.decision).toBe("ACCEPTED");
    expect(full.records.find(r => r.stepId === "patch-2")?.decision).toBe("REJECTED");
    expect(ablated.records.find(r => r.stepId === "patch-2")?.decision).toBe("ACCEPTED");
    expect(full.score).toBeGreaterThan(ablated.score);
  });
  it("exports an immutable deterministic evaluation event stream", () => {
    const run = runEvaluation(codingAdversarialTask, "MOTIFFLOW");
    const events = evaluationEvents(run, "now");
    const store = new InMemoryEvaluationEventStore();
    store.append("run-1", 0, events);
    expect(replayEvaluation(store.load("run-1"))).toEqual(run);
    expect(() => store.append("run-1", 0, events)).toThrow(/concurrency/);
    const copy = store.load("run-1"); copy[1]!.recordedAt = "changed";
    expect(store.load("run-1")[1]!.recordedAt).toBe("now");
  });
});

describe("temporal distortion diagnosis", () => {
  it("warns about search thrash before the hard guard threshold", () => {
    const emerging = diagnoseTemporalDistortions("w", [{ observationId: "o1", at: "2026-01-01T00:00:00Z", metrics: { searches: 0, hypothesesRetired: 0 } }, { observationId: "o2", at: "2026-01-01T00:01:00Z", metrics: { searches: 2, hypothesesRetired: 0 } }], "2026-01-01T00:01:00Z");
    expect(emerging[0]).toMatchObject({ definitionId: "search-thrash", phase: "EMERGING" });
    expect(emerging[0]?.confidence).toBeGreaterThan(.5);
    expect(emerging[0]?.predictedFailure).toMatch(/budget/);
  });
  it("predicts feedback, budget, and completion failures from trends", () => {
    const emerging = diagnoseTemporalDistortions("w", [{ observationId: "o1", at: "2026-01-01T00:00:00Z", metrics: { mutations: 0, verifications: 0, costUnits: 0, progressUnits: 0, completionProposals: 0, terminalPredicatesSatisfied: 0 } }, { observationId: "o2", at: "2026-01-01T00:01:00Z", metrics: { mutations: 2, verifications: 0, costUnits: 4, progressUnits: 0, completionProposals: 1, terminalPredicatesSatisfied: 0 } }], "2026-01-01T00:01:00Z");
    expect(emerging.map(x => x.definitionId)).toEqual(expect.arrayContaining(["feedback-starvation", "budget-leakage", "premature-completion"]));
    expect(emerging.every(x => x.evidenceRefs.length === 2)).toBe(true);
  });
});
