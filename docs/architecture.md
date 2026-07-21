# Architecture

The authoritative path is:

```text
proposal → six gates → command decision → immutable event append
         → durable activity → observed result → projection → reconciliation
```

The workflow aggregate owns lifecycle and accepted history. The event store uses per-workflow monotonically increasing versions. Reducers are pure; replay never calls a model, tool, clock, random generator, or external service.

The blackboard stores cognitive artifacts separately from conversation history. Entries require stable identity and provenance. Claims require evidence. Supersession and contradiction add graph relationships rather than mutating prior knowledge.

Model context is a bounded projection preserving the goal, boundaries, authority, critical evidence, contradictions, pending effects, and terminal gaps. DeepSeek returns a typed proposal envelope; the response and token usage are recorded for replay before any accepted action can be derived from it.

Activities are the only external-effect boundary. Side effects require idempotency identity. Irreversible effects require a registered compensation. Ambiguous completion is never retried until external-state reconciliation establishes whether the effect occurred.

PostgreSQL persistence uses atomic optimistic event appends, unique delivery identities, durable timers and signals, activity leases, and `FOR UPDATE SKIP LOCKED` claims. Expired leases allow another worker to resume after a crash.

The motif compiler assesses all 32 motifs, uses weakest-constituent composite scoring, selects legal transition families, attaches governance, and refuses activation without terminal, boundary, authority, observation, and recovery semantics.
