# MotifFlow v0.1

MotifFlow is a motif-governed durable workflow runtime for adaptive agents. Models may propose actions; only deterministic validation, event commitment, and activity execution can change workflow truth or touch the outside world.

## Implemented

- Strict event-sourced workflow aggregate with optimistic stream versions and pure replay
- Complete 32-motif registry, composite weakest-link scoring, relevance, and collision states
- Complete 32-entry runtime distortion registry with mechanisms, signatures, restoration targets, remediation risks, composition edges, and reflexive-loop detection
- Typed append-only blackboard with provenance, grounding, contradiction, dependency, and supersession fields
- Six proposal gates plus boundary, budget, invariant, concurrency, idempotency, terminal, feedback, and search-progress execution guards
- Deterministic compiler that emits governed workflow IR and rejects missing boundaries, authority, or terminal semantics
- In-memory and PostgreSQL event stores
- PostgreSQL activities, attempts, leases with `SKIP LOCKED`, durable timers, signals, approvals, outbox schema, projections, and compensation registrations
- Retry classification, ambiguous-completion reconciliation guard, reverse-order compensation, and idempotency
- Sandboxed repository read, search, exact patch, and registered-test activities
- DeepSeek structured proposal operator with recorded, replayable model output
- HTTP API, CLI projections, structured telemetry, coding-agent scenario, and PostgreSQL recovery scenario

## Run

```bash
npm install
npm test
npm run build
npm run example
```

PostgreSQL integration tests create their schema in the database named by `DATABASE_URL`:

```bash
createdb motifflow_test
DATABASE_URL=postgresql:///motifflow_test npm run test:postgres
dropdb motifflow_test
```

Start the durable API after applying [the migration](./migrations/001_initial.sql):

```bash
DATABASE_URL=postgresql:///motifflow npm run api
```

Run CLI queries:

```bash
DATABASE_URL=postgresql:///motifflow npm run cli -- workflow inspect <workflow-id>
DATABASE_URL=postgresql:///motifflow npm run cli -- workflow history <workflow-id>
DATABASE_URL=postgresql:///motifflow npm run cli -- workflow replay <workflow-id>
```

Run the DeepSeek smoke test with a temporary environment credential:

```bash
DEEPSEEK_API_KEY=... npm run deepseek:smoke
```

The credential is never persisted by MotifFlow. Model output remains an untrusted proposal and cannot bypass gates or execution guards.

Run the adversarial comparative benchmark:

```bash
npm run evaluate
```

See [architecture.md](./docs/architecture.md), [operations.md](./docs/operations.md), and [evaluation.md](./docs/evaluation.md).

## Invoice reconciliation demo

The “Same Model, Two Worlds” demo runs one recorded proposal tape through an unsafe direct executor and the real governed runtime. It demonstrates stale-evidence rejection, durable approval, timeout-after-effect reconciliation, webhook deduplication, completion rejection, supervised worker-process termination and event-stream reconstruction, and verified reporting.

```bash
npm run demo:verify
npm run demo:start
```

Open `http://127.0.0.1:3400`. See [the demo guide](./docs/demo/reconciliation-demo.md) and [run of show](./docs/demo/run-of-show.md).

For the presentation-first UI, run the deterministic static showcase:

```bash
npm run demo:showcase
```

Open `http://127.0.0.1:3500`. This version replays the verified canonical outcome without invoking the runtime or payment simulator. Its presentation switcher offers complete Codex and Claude Code treatments built from accessible [brainless](https://brainless.swerdlow.dev) components, including semantic messages, disclosures, task lists, live thinking states, composers, and keyboard-operable approval controls.
