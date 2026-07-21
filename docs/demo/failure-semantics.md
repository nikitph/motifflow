# Failure semantics

- Stale evidence is rejected using observation time, authority, and supersession metadata. The runtime deterministically activates `ledger-fresh`.
- The first payment call commits at the provider and then times out. MotifFlow records `PAYMENT_OUTCOME_MARKED_UNKNOWN` and forbids retry.
- Status reconciliation queries by the stable logical-payment idempotency key and discovers the original posted effect.
- The same webhook event ID is delivered twice. The durable signal identity allows only the first delivery to affect state.
- Completion after one matched entry is rejected with the stable missing requirements `previous-payment-entry-independently-verified` and `final-vendor-balance-recomputed`.
- The verified report is generated only after terminal predicates pass and contains committed event-range and evidence references.
