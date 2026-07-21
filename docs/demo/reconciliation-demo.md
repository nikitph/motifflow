# Same Model, Two Worlds

This deterministic demo sends one immutable proposal tape, ledger, chaos plan, tool set, timing sequence, and budget to two execution environments.

The direct executor treats proposals as actions. It selects stale evidence, calculates ₹2,00,000 outstanding, sends an unapproved payment, blindly retries after a timeout, transfers ₹4,00,000, and generates a confident false report with a ₹2,50,000 excess payment.

The MotifFlow driver treats proposals as untrusted input. It rejects superseded evidence, activates the authoritative ledger, calculates ₹1,50,000, parks durably for finance approval, marks the timeout as ambiguous, blocks retry, queries provider state, deduplicates the webhook, rejects premature completion, verifies the remaining ledger, and generates a report from committed state.

Run `npm run demo:verify`, then `npm run demo:start`. Open `http://127.0.0.1:3400` and use the scene controls. The approval panel supplies a QR code and a mobile-friendly one-time approval page.
