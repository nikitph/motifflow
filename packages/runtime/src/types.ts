export type ActivityFailureClass="TRANSIENT"|"PERMANENT"|"VALIDATION"|"AUTHORIZATION"|"BUSINESS_REJECTION"|"AMBIGUOUS_COMPLETION";
export interface Postcondition { description:string;kind:"STATE"|"EVIDENCE"|"EXTERNAL" }
export interface ActivityTask { activityId:string;workflowId:string;activityType:string;input:unknown;idempotencyKey:string;attempt:number;maxAttempts:number;state:"SCHEDULED"|"LEASED"|"STARTED"|"COMPLETED"|"FAILED"|"AMBIGUOUS";availableAt:string;leaseOwner?:string;leaseExpiresAt?:string;expectedPostconditions:Postcondition[];riskClass:"READ_ONLY"|"REVERSIBLE_WRITE"|"IRREVERSIBLE_WRITE";compensationId?:string }
export interface ActivityResult { activityId:string;output?:unknown;failureClass?:ActivityFailureClass;error?:string;externalEffectObserved?:boolean }
export interface TimerState { timerId:string;workflowId:string;type:string;fireAt:string;status:"SCHEDULED"|"FIRED"|"CANCELLED";payload:unknown;idempotencyKey:string }
export interface WorkflowSignal { signalId:string;workflowId:string;type:string;payload:unknown;sentAt:string;senderId:string;idempotencyKey:string }
export interface CompensationRegistration { compensationId:string;workflowId:string;forwardActivityId:string;activityType:string;input:unknown;requiredAuthority:string[];verificationPolicy:string;restorationTarget:string;state:"REGISTERED"|"STARTED"|"COMPLETED"|"FAILED"|"WAIVED";dependencyOrder:number }
export interface ApprovalState { approvalId:string;workflowId:string;type:string;status:"PENDING"|"GRANTED"|"DENIED"|"EXPIRED";requestedAt:string;resolvedAt?:string;resolvedBy?:string;payload:unknown;idempotencyKey:string }
export function retryDelayMs(attempt:number,baseMs=1000,maxMs=60000){return Math.min(maxMs,baseMs*2**Math.max(0,attempt-1))}
export function shouldRetry(failure:ActivityFailureClass){return failure==="TRANSIENT"}
