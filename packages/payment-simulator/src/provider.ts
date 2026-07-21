export interface PaymentRequest {requestId:string;logicalPaymentId?:string;idempotencyKey?:string;vendorAccountId:string;amountMinor:number;currency:"INR"}
export interface PaymentRecord {providerPaymentId:string;requestId:string;logicalPaymentId?:string;idempotencyKey?:string;amountMinor:number;status:"POSTED"|"REVERSED";createdAt:string}
export interface ProviderWebhook {providerEventId:string;providerPaymentId:string;type:"PAYMENT_POSTED"|"PAYMENT_REVERSED";deliveryAttempt:number}
export class PaymentTimeoutError extends Error {readonly providerRequestReference:string;constructor(requestId:string){super("Payment provider timed out after committing the effect");this.name="PaymentTimeoutError";this.providerRequestReference=requestId}}
export class ProviderConflictError extends Error {constructor(){super("Idempotency key was reused with a different payload");this.name="ProviderConflictError"}}
export class TransientProviderError extends Error {constructor(){super("Payment provider status query temporarily unavailable");this.name="TransientProviderError"}}
export class PaymentSimulator {
 private records:PaymentRecord[]=[];private webhooks:ProviderWebhook[]=[];private firstAttempt=true;private n=0;
 constructor(private options:{timeoutAfterFirstPost:boolean;duplicateWebhookCount:number;statusQueryFailures?:number;clock?:()=>string}={timeoutAfterFirstPost:true,duplicateWebhookCount:2}){}
 async createPayment(request:PaymentRequest):Promise<PaymentRecord>{if(request.idempotencyKey){const prior=this.records.find(x=>x.idempotencyKey===request.idempotencyKey);if(prior){if(prior.amountMinor!==request.amountMinor||prior.logicalPaymentId!==request.logicalPaymentId)throw new ProviderConflictError();return structuredClone(prior)}}const record:PaymentRecord={providerPaymentId:`provider-payment-${++this.n}`,requestId:request.requestId,amountMinor:request.amountMinor,status:"POSTED",createdAt:this.options.clock?.()??"2026-07-12T10:00:00+05:30",...(request.logicalPaymentId?{logicalPaymentId:request.logicalPaymentId}:{}),...(request.idempotencyKey?{idempotencyKey:request.idempotencyKey}:{})};this.records.push(record);const eventId=`payment-event-${this.n}`;for(let i=1;i<=this.options.duplicateWebhookCount;i++)this.webhooks.push({providerEventId:eventId,providerPaymentId:record.providerPaymentId,type:"PAYMENT_POSTED",deliveryAttempt:i});if(this.firstAttempt&&this.options.timeoutAfterFirstPost){this.firstAttempt=false;throw new PaymentTimeoutError(request.requestId)}this.firstAttempt=false;return structuredClone(record)}
 queryByPaymentId(id:string){const x=this.records.find(r=>r.providerPaymentId===id);return x?structuredClone(x):undefined}
 queryByClientReference(reference:string){const x=this.records.find(r=>r.requestId===reference||r.logicalPaymentId===reference);return x?structuredClone(x):undefined}
 queryByIdempotencyKey(key:string){if((this.options.statusQueryFailures??0)>0){this.options.statusQueryFailures!--;throw new TransientProviderError()}const x=this.records.find(r=>r.idempotencyKey===key);return x?structuredClone(x):undefined}
 listVendorPayments(_accountId:string){return this.records.map(x=>structuredClone(x))}
 drainWebhooks(){const x=this.webhooks.map(e=>structuredClone(e));this.webhooks=[];return x}
 reversePayment(id:string){const record=this.records.find(r=>r.providerPaymentId===id);if(!record)throw new Error("Unknown payment");record.status="REVERSED";return structuredClone(record)}
 reset(){this.records=[];this.webhooks=[];this.firstAttempt=true;this.n=0}
}
