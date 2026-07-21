# Evaluation harness

MotifFlow now includes a deterministic comparative harness for testing one task under four governance configurations:

1. `UNCONSTRAINED`: tool requests are executed without runtime admission.
2. `PROMPT_GOVERNED`: governance exists only as model instruction; the runtime still accepts the same adversarial outputs.
3. `TYPED_WORKFLOW`: schemas, evidence identities, boundaries, terminal predicates, deduplication, and reconciliation are enforced.
4. `MOTIFFLOW`: the typed workflow plus motif-driven feedback, search, freshness, and representation policies.

The motif ablation runs the fourth configuration with the same task, proposals, tools, validators, and budgets while disabling only motif-sensitive transition adaptation. This tests whether motifs change legal behavior rather than labels.

## Coding benchmark

The current fixture stays deliberately within the coding domain. It injects:

- timeout after a side effect;
- duplicate signal delivery;
- misleading tool output;
- stale evidence;
- invented evidence identity;
- forbidden migration mutation;
- repeated non-discriminating search;
- premature completion;
- conflicting conclusions;
- late approval.

Every run records decisions, reasons, distortion identities, tool calls, tokens, latency, cost, structural adequacy, recovery, evidence quality, boundary preservation, human intervention, and harmful transitions.

Run it with:

```bash
npm run evaluate
```

Current deterministic baseline:

| Configuration | Composite score | Expected behaviors | Harmful transitions |
|---|---:|---:|---:|
| MotifFlow, motifs enabled | 74.55 | 11/11 | 0 |
| MotifFlow ablation | 59.09 | 7/11 | 1 |
| Typed workflow | 59.09 | 7/11 | 1 |
| Prompt governed | -23.25 | 0/11 | multiple |
| Unconstrained | -23.25 | 0/11 | multiple |

These are deterministic fixture results, not yet a statistically meaningful model-performance study. Their purpose is to validate experimental plumbing, metric definitions, failure injection, and the behavioral effect of motif ablation. Repeated live-model trials and confidence intervals are the next evaluation step. A second application domain is intentionally deferred.
