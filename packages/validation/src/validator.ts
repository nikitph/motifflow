import type { BlackboardEntry, BoundaryPolicy, GateName, GateResult, ProposalEnvelope, WorkflowState } from "../../core/src/types.js";
const gates:GateName[]=["TYPE_CONFORMANCE","CONSISTENCY","GROUNDING","AUTHORITY","COMPLETENESS","MOTIF_EVALUATION"];
function pathAllowed(path:string,boundaries:BoundaryPolicy[]):boolean { const match=(pattern:string)=>path===pattern||path.startsWith(pattern.replace(/\*\*$/,""));return !boundaries.some(b=>b.forbidden.some(match))&&boundaries.some(b=>b.write.some(match)) }
/** Deterministic six-gate validator; rationale text never overrides a failed check. */
export function validateProposal(proposal:ProposalEnvelope,state:WorkflowState,entries:readonly BlackboardEntry[],now:string):GateResult[]{
 const evidence=new Set(entries.filter(e=>e.validationStatus==="ACCEPTED").map(e=>e.entryId));
 const results:Record<GateName,string[]>={TYPE_CONFORMANCE:[],CONSISTENCY:[],GROUNDING:[],AUTHORITY:[],COMPLETENESS:[],MOTIF_EVALUATION:[]};
 if(!proposal.proposalId||proposal.workflowId!==state.workflowId||!(["CLAIM","HYPOTHESIS","ACTION","PLAN","DIAGNOSIS","REMEDIATION","COMPLETION"] as string[]).includes(proposal.proposalType))results.TYPE_CONFORMANCE.push("Proposal envelope is invalid");
 if(state.lifecycle!=="ACTIVE")results.CONSISTENCY.push(`Workflow is ${state.lifecycle}`);if(state.acceptedProposalIds.includes(proposal.proposalId)||state.rejectedProposalIds.includes(proposal.proposalId))results.CONSISTENCY.push("Proposal ID was already processed");
 const missing=proposal.rationale.evidenceRefs.filter(id=>!evidence.has(id));if(missing.length)results.GROUNDING.push(`Unknown evidence: ${missing.join(", ")}`);
 for(const id of proposal.rationale.evidenceRefs){const e=entries.find(x=>x.entryId===id);if(e?.freshness?.expiresAt&&e.freshness.expiresAt<now)results.GROUNDING.push(`Stale evidence: ${id}`)}
 if(["CLAIM","HYPOTHESIS","DIAGNOSIS","COMPLETION"].includes(proposal.proposalType)&&proposal.rationale.evidenceRefs.length===0)results.GROUNDING.push("Proposal requires independent evidence");
 const actor=String(proposal.payload.actorId??"");const command=proposal.requestedCommand?.type;const policy=state.authorityPolicies.find(p=>p.principalId===actor&&!p.revokedAt);if(!policy||!policy.allowedProposalTypes.includes(proposal.proposalType)||(command&&!policy.allowedCommandTypes.includes(command)))results.AUTHORITY.push("Actor lacks current authority");
 const paths=Array.isArray(proposal.payload.paths)?proposal.payload.paths.filter((x):x is string=>typeof x==="string"):[];for(const path of paths)if(!pathAllowed(path,state.boundaries))results.AUTHORITY.push(`Boundary violation: ${path}`);
 if(!proposal.rationale.currentSituation||!proposal.rationale.expectedOutcome)results.COMPLETENESS.push("Situation and expected outcome are required");if(proposal.proposalType==="ACTION"&&(!command||!proposal.payload.expectedPostcondition))results.COMPLETENESS.push("Actions require command and expected postcondition");
 if(proposal.rationale.addressedMotifs.length){if(!proposal.rationale.distinction||!proposal.rationale.substrate||!proposal.rationale.consequence)results.MOTIF_EVALUATION.push("Motif claim lacks distinction, substrate, or consequence");if(proposal.proposalType==="REMEDIATION"&&!proposal.rationale.restorationTarget)results.MOTIF_EVALUATION.push("Remediation lacks restoration target")}
 return gates.map(g=>({gate:g,passed:results[g].length===0,reasons:results[g],evidenceRefs:proposal.rationale.evidenceRefs}));
}
