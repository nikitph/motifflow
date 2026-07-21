import type {GateResult,ProposalEnvelope} from "../../../core/src/types.js";
export interface Vendor {vendorId:"vendor-sunrise-equipment";name:"Sunrise Equipment";paymentAccountId:"acct-sunrise-demo"}
export interface Invoice {invoiceId:"INV-2026-041";vendorId:Vendor["vendorId"];grossAmountMinor:number;currency:"INR";issuedAt:string}
export interface LedgerEntry {entryId:string;kind:"INVOICE"|"PAYMENT";amountMinor:number}
export interface LedgerSnapshot {snapshotId:string;vendorId:Vendor["vendorId"];observedAt:string;authoritative:boolean;supersededBy?:string;entries:LedgerEntry[]}
export type ReconciliationPhase="INITIALIZED"|"EVIDENCE_REQUIRED"|"DISCREPANCY_READY"|"APPROVAL_PENDING"|"PAYMENT_PENDING"|"PAYMENT_OUTCOME_UNKNOWN"|"PAYMENT_RECONCILING"|"PAYMENT_CONFIRMED"|"LEDGER_RECONCILING"|"COMPLETION_ELIGIBLE"|"COMPLETED"|"FAILED";
export interface InvoiceReconciliationState {reconciliationId:string;vendorId:Vendor["vendorId"];invoiceId:Invoice["invoiceId"];phase:ReconciliationPhase;availableSnapshots:Record<string,LedgerSnapshot>;activeSnapshotId?:string;calculatedOutstandingMinor?:number;approval?:{approvalId:string;state:"PENDING"|"GRANTED"|"DENIED"|"EXPIRED";actorId?:string;resolvedAt?:string};logicalPayment?:{logicalPaymentId:string;amountMinor:number;idempotencyKey:string;providerReferences:string[];state:"PROPOSED"|"AWAITING_APPROVAL"|"SCHEDULED"|"OUTCOME_UNKNOWN"|"POSTED"|"FAILED"|"COMPENSATING"|"COMPENSATED"};matchedEntries:string[];unresolvedEntries:string[];duplicateSignalsIgnored:number;retryProposalsRejected:number;finalBalanceMinor?:number;reportArtifactId?:string;approvalRecorded:boolean;timeline:string[];gateResults:Record<string,GateResult[]>}
export type InvoiceEvent=
|{type:"RECONCILIATION_INITIALIZED";payload:{reconciliationId:string;snapshots:LedgerSnapshot[]}}
|{type:"LEDGER_EVIDENCE_REJECTED";payload:{snapshotId:string;reason:"STALE"|"SUPERSEDED"|"NON_AUTHORITATIVE";observedAt:string;freshnessLimitMs:number;replacementSnapshotId?:string}}
|{type:"AUTHORITATIVE_EVIDENCE_ACTIVATED";payload:{snapshotId:string}}
|{type:"LEDGER_EVIDENCE_SELECTED";payload:{snapshotId:string}}
|{type:"DISCREPANCY_CALCULATED";payload:{amountMinor:number;snapshotId:string}}
|{type:"PAYMENT_APPROVAL_REQUIRED";payload:{approvalId:string;amountMinor:number}}
|{type:"PAYMENT_EXECUTION_AUTHORIZED";payload:{approvalId:string;actorId:string;resolvedAt:string}}
|{type:"CORRECTIVE_PAYMENT_PROPOSED";payload:{logicalPaymentId:string;amountMinor:number;idempotencyKey:string}}
|{type:"PAYMENT_OUTCOME_MARKED_UNKNOWN";payload:{logicalPaymentId:string;amountMinor:number;providerRequestReference:string}}
|{type:"PAYMENT_STATUS_RECONCILED";payload:{providerPaymentId:string;amountMinor:number}}
|{type:"PAYMENT_CONFIRMED";payload:{providerPaymentId:string;amountMinor:number;providerEventId?:string}}
|{type:"PAYMENT_RETRY_RETIRED";payload:{proposalId:string}}
|{type:"PAYMENT_STATUS_QUERY_RETRY_SCHEDULED";payload:{attempt:number}}
|{type:"PAYMENT_COMPENSATION_STARTED";payload:{providerPaymentIds:string[]}}
|{type:"DUPLICATE_SIGNAL_IGNORED";payload:{providerEventId:string}}
|{type:"LEDGER_ENTRY_MATCHED";payload:{entryId:string}}
|{type:"LEDGER_VERIFICATION_COMPLETED";payload:{matchedEntries:string[];finalBalanceMinor:number}}
|{type:"RECONCILIATION_COMPLETION_REJECTED";payload:{missingPredicateIds:string[]}}
|{type:"RECONCILIATION_REPORT_GENERATED";payload:{reportArtifactId:string}}
|{type:"REPORT_GENERATION_RETRY_SCHEDULED";payload:{attempt:number}}
|{type:"RECONCILIATION_COMPLETED";payload:{reportArtifactId:string}}
|{type:"PROPOSAL_AUDITED";payload:{proposalId:string;accepted:boolean;gateResults:GateResult[];reasons:string[]}};
export interface ProposalTape {tapeId:string;tapeVersion:1;proposals:{sequence:number;proposal:ProposalEnvelope;releaseCondition:string}[]}
export interface DemoChaosPlan {staleEvidenceTrap:true;firstPaymentAttempt:{persistEffect:true;response:"TIMEOUT"};webhookDelivery:{duplicateCount:2;sameProviderEventId:true};completionTrap:{releaseAfterMatchedEntries:1;totalRequiredEntries:3};approvalThresholdMinor:number}
export interface DemoManifest {manifestId:string;manifestVersion:1;scenarioSeed:string;scenarioId:"invoice-reconciliation-v1";initialStateHash:string;proposalTapeHash:string;chaosPlanHash:string;budgetPolicyHash:string;proposalSource:{kind:"RECORDED_MODEL_TRAJECTORY";model:string;promptVersion:string;recordedAt:string};createdAt:string}
export interface PredicateResult {id:string;passed:boolean;evidenceRefs:string[];reason?:string}
export interface VerifiedReconciliationReport {reportId:string;workflowId:string;status:"VERIFIED_COMPLETE";vendorId:string;invoiceId:string;authoritativeSnapshotId:string;calculatedOutstandingMinor:number;providerPaymentId:string;actualTransferredMinor:number;successfulPaymentCount:number;approvalId:string;approverId:string;finalBalanceMinor:0;terminalPredicateResults:PredicateResult[];evidenceRefs:string[];eventRange:{fromSequence:number;toSequence:number};generatedAt:string}
export interface UngovernedCompletionReport {status:"COMPLETE";vendorName:string;statedCorrectivePaymentMinor:number;actualTransferredMinor:number;approvalRecorded:false;reconciliationClaim:string;generatedFromMutableAgentState:true}
