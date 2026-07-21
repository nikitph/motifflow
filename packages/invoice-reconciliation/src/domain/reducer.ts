import type { InvoiceEvent, InvoiceReconciliationState, LedgerSnapshot } from "./types.js";
import { invoice, vendor } from "../fixtures/scenario.js";

export const initialInvoiceState = (id = "invoice-reconciliation-demo"): InvoiceReconciliationState => ({ reconciliationId: id, vendorId: vendor.vendorId, invoiceId: invoice.invoiceId, phase: "INITIALIZED", availableSnapshots: {}, matchedEntries: [], unresolvedEntries: ["invoice-entry", "previous-payment-entry", "corrective-payment-entry"], duplicateSignalsIgnored: 0, retryProposalsRejected: 0, approvalRecorded: false, timeline: [], gateResults: {} });
const snapshots = (items: LedgerSnapshot[]) => Object.fromEntries(items.map(x => [x.snapshotId, structuredClone(x)]));

export function evolveInvoice(state: InvoiceReconciliationState, event: InvoiceEvent): InvoiceReconciliationState {
  const s = structuredClone(state); s.timeline.push(event.type);
  switch (event.type) {
    case "RECONCILIATION_INITIALIZED": s.availableSnapshots = snapshots(event.payload.snapshots); s.phase = "EVIDENCE_REQUIRED"; break;
    case "LEDGER_EVIDENCE_SELECTED": s.activeSnapshotId = event.payload.snapshotId; break;
    case "LEDGER_EVIDENCE_REJECTED": break;
    case "AUTHORITATIVE_EVIDENCE_ACTIVATED": s.activeSnapshotId = event.payload.snapshotId; break;
    case "DISCREPANCY_CALCULATED": s.calculatedOutstandingMinor = event.payload.amountMinor; s.phase = "DISCREPANCY_READY"; break;
    case "PAYMENT_APPROVAL_REQUIRED": s.approval = { approvalId: event.payload.approvalId, state: "PENDING" }; s.logicalPayment = { logicalPaymentId: `payment-${s.reconciliationId}`, amountMinor: event.payload.amountMinor, idempotencyKey: `reconciliation:${s.reconciliationId}:corrective-payment`, providerReferences: [], state: "AWAITING_APPROVAL" }; s.phase = "APPROVAL_PENDING"; break;
    case "PAYMENT_EXECUTION_AUTHORIZED": if (s.approval) { s.approval.state = "GRANTED"; s.approval.actorId = event.payload.actorId; s.approval.resolvedAt = event.payload.resolvedAt; } s.approvalRecorded = true; if (s.logicalPayment) s.logicalPayment.state = "SCHEDULED"; s.phase = "PAYMENT_PENDING"; break;
    case "CORRECTIVE_PAYMENT_PROPOSED": s.logicalPayment = { logicalPaymentId: event.payload.logicalPaymentId, amountMinor: event.payload.amountMinor, idempotencyKey: event.payload.idempotencyKey, providerReferences: [], state: "PROPOSED" }; break;
    case "PAYMENT_OUTCOME_MARKED_UNKNOWN": if (s.logicalPayment) { s.logicalPayment.state = "OUTCOME_UNKNOWN"; s.logicalPayment.providerReferences.push(event.payload.providerRequestReference); } s.phase = "PAYMENT_OUTCOME_UNKNOWN"; break;
    case "PAYMENT_STATUS_QUERY_RETRY_SCHEDULED": s.phase = "PAYMENT_RECONCILING"; break;
    case "PAYMENT_STATUS_RECONCILED": if (s.logicalPayment && !s.logicalPayment.providerReferences.includes(event.payload.providerPaymentId)) s.logicalPayment.providerReferences.push(event.payload.providerPaymentId); s.phase = "PAYMENT_RECONCILING"; break;
    case "PAYMENT_CONFIRMED": if (s.logicalPayment) { s.logicalPayment.state = "POSTED"; if (!s.logicalPayment.providerReferences.includes(event.payload.providerPaymentId)) s.logicalPayment.providerReferences.push(event.payload.providerPaymentId); } s.phase = "PAYMENT_CONFIRMED"; break;
    case "PAYMENT_RETRY_RETIRED": s.retryProposalsRejected++; break;
    case "PAYMENT_COMPENSATION_STARTED": if (s.logicalPayment) s.logicalPayment.state = "COMPENSATING"; s.phase = "FAILED"; break;
    case "DUPLICATE_SIGNAL_IGNORED": s.duplicateSignalsIgnored++; break;
    case "LEDGER_ENTRY_MATCHED": if (!s.matchedEntries.includes(event.payload.entryId)) s.matchedEntries.push(event.payload.entryId); s.unresolvedEntries = s.unresolvedEntries.filter(x => x !== event.payload.entryId); s.phase = "LEDGER_RECONCILING"; break;
    case "LEDGER_VERIFICATION_COMPLETED": s.matchedEntries = [...new Set([...s.matchedEntries, ...event.payload.matchedEntries])]; s.unresolvedEntries = []; s.finalBalanceMinor = event.payload.finalBalanceMinor; s.phase = "COMPLETION_ELIGIBLE"; break;
    case "RECONCILIATION_COMPLETION_REJECTED": break;
    case "REPORT_GENERATION_RETRY_SCHEDULED": break;
    case "RECONCILIATION_REPORT_GENERATED": s.reportArtifactId = event.payload.reportArtifactId; break;
    case "RECONCILIATION_COMPLETED": s.reportArtifactId = event.payload.reportArtifactId; s.phase = "COMPLETED"; break;
    case "PROPOSAL_AUDITED": s.gateResults[event.payload.proposalId] = event.payload.gateResults; break;
  }
  return s;
}
export const replayInvoice = (events: readonly InvoiceEvent[], id?: string) => events.reduce(evolveInvoice, initialInvoiceState(id));
