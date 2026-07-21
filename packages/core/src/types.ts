/** Stable identifier aliases prevent accidental cross-domain use at API boundaries. */
export type WorkflowId = string;
export type MotifId = string;
export type WorkflowLifecycle = "CREATED"|"ACTIVE"|"SUSPENDED"|"COMPENSATING"|"COMPLETED"|"FAILED"|"CANCELLED";
export type MotifStatus = "ABSENT"|"IMPOVERISHED"|"ADEQUATE"|"COLLISION";
export type MotifRelevance = "REQUIRED"|"SUPPORTING"|"IRRELEVANT";
export type EntryType = "GOAL"|"CONSTRAINT"|"CLAIM"|"EVIDENCE"|"HYPOTHESIS"|"PLAN"|"ACTION_PROPOSAL"|"DECISION"|"COMMITMENT"|"ARTIFACT"|"OBSERVATION"|"DISTORTION_DIAGNOSIS"|"REMEDIATION"|"TERMINAL_EVIDENCE"|"EXPLANATION";
export type ValidationStatus = "PROPOSED"|"ACCEPTED"|"REJECTED"|"SUPERSEDED"|"DISPUTED";
export interface GoalSpec { goalId:string; statement:string; desiredOutcomes:string[]; prohibitedOutcomes:string[]; initialEvidenceRefs:string[]; constraints:string[]; riskClass:"LOW"|"MEDIUM"|"HIGH"|"CRITICAL" }
export interface BoundaryPolicy { policyId:string; read:string[]; write:string[]; forbidden:string[] }
export interface AuthorityPolicy { policyId:string; principalId:string; allowedProposalTypes:string[]; allowedCommandTypes:string[]; allowedActivityTypes:string[]; maxRiskClass:"READ_ONLY"|"REVERSIBLE_WRITE"|"IRREVERSIBLE_WRITE"; revokedAt?:string }
export interface BudgetState { maxModelCalls:number; maxToolCalls:number; consumedModelCalls:number; consumedToolCalls:number; startedAt:string }
export interface MotifAssessment { motifId:MotifId; score:number; status:MotifStatus; relevance:MotifRelevance; distinction:string; substrate:string; consequence:string; evidenceRefs:string[]; collision?:boolean }
export interface BlackboardEntry<T=unknown> { entryId:string; workflowId:WorkflowId; type:EntryType; payload:T; schemaVersion:number; source:{actorId:string;operatorType:"MODEL"|"HUMAN"|"RULE"|"ACTIVITY"|"SYSTEM";activityId?:string;modelCallId?:string}; validationStatus:ValidationStatus; createdAt:string; committedAt?:string; evidenceRefs:string[]; dependsOn:string[]; contradicts:string[]; supersedes:string[]; motifTags:MotifId[]; authorityScope:string[]; boundaryScope:string[]; confidence?:number; freshness?:{observedAt:string;expiresAt?:string} }
export type ProposalType = "CLAIM"|"HYPOTHESIS"|"ACTION"|"PLAN"|"DIAGNOSIS"|"REMEDIATION"|"COMPLETION";
export interface ProposalEnvelope { proposalId:string; workflowId:WorkflowId; proposalType:ProposalType; payload:Record<string,unknown>; rationale:{currentSituation:string;addressedMotifs:MotifId[];expectedOutcome:string;evidenceRefs:string[];risks:string[];alternativesConsidered:string[];distinction?:string;substrate?:string;consequence?:string;restorationTarget?:string}; requestedCommand?:{type:string;payload:Record<string,unknown>} }
export type GateName = "TYPE_CONFORMANCE"|"CONSISTENCY"|"GROUNDING"|"AUTHORITY"|"COMPLETENESS"|"MOTIF_EVALUATION";
export interface GateResult { gate:GateName; passed:boolean; reasons:string[]; evidenceRefs:string[] }
export interface TerminalResult { id:string; description:string; passed:boolean; evidenceRefs:string[]; reason?:string }
export interface TerminalPredicate { id:string; description:string; evaluate(state:WorkflowState, blackboard:readonly BlackboardEntry[]):TerminalResult }
export interface WorkflowState { workflowId:WorkflowId; version:number; lifecycle:WorkflowLifecycle; goal:GoalSpec|null; boundaries:BoundaryPolicy[]; authorityPolicies:AuthorityPolicy[]; budgets:BudgetState; motifAssessments:Record<MotifId,MotifAssessment>; acceptedProposalIds:string[]; rejectedProposalIds:string[]; terminalResults:TerminalResult[]; lastEventAt:string }
export interface EventEnvelope<TType extends string=string,TPayload=Record<string,unknown>> { eventId:string; workflowId:WorkflowId; streamVersion:number; type:TType; payload:TPayload; occurredAt:string; recordedAt:string; causationId?:string; correlationId?:string; actorId:string; schemaVersion:number; metadata:Record<string,unknown> }
export type DomainEvent = EventEnvelope<"WorkflowCreated",{boundaries:BoundaryPolicy[];authorityPolicies:AuthorityPolicy[];budgets:BudgetState}>|EventEnvelope<"GoalRegistered",{goal:GoalSpec}>|EventEnvelope<"ProposalSubmitted",{proposal:ProposalEnvelope}>|EventEnvelope<"ProposalAccepted",{proposalId:string;gateResults:GateResult[]}>|EventEnvelope<"ProposalRejected",{proposalId:string;gateResults:GateResult[];code:RejectionCode}>|EventEnvelope<"BlackboardEntryCommitted",{entry:BlackboardEntry}>|EventEnvelope<"CompletionProposed",{proposalId:string}>|EventEnvelope<"CompletionRejected",{proposalId:string;results:TerminalResult[]}>|EventEnvelope<"WorkflowCompleted",{results:TerminalResult[]}>|EventEnvelope<"WorkflowSuspended",{reason:string}>|EventEnvelope<"WorkflowResumed",Record<string,never>>|EventEnvelope<"WorkflowCancelled",{reason:string}>|EventEnvelope<"WorkflowFailed",{reason:string}>;
export type RejectionCode = "INVALID_TYPE"|"VERSION_CONFLICT"|"LIFECYCLE_CONFLICT"|"UNGROUNDED"|"STALE_EVIDENCE"|"UNAUTHORIZED"|"BOUNDARY_VIOLATION"|"INCOMPLETE"|"MOTIF_THEATER"|"TERMINAL_UNSATISFIED"|"BUDGET_EXHAUSTED"|"DUPLICATE";
export class CommandRejection extends Error { constructor(readonly code:RejectionCode,message:string,readonly details:readonly string[]=[]){super(message);this.name="CommandRejection"} }
export interface Clock { now():string }
export interface IdGenerator { next():string }
