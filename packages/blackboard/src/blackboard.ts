import type { BlackboardEntry, WorkflowId } from "../../core/src/types.js";
import { CommandRejection } from "../../core/src/types.js";
export class TypedBlackboard {
 private entries=new Map<WorkflowId,Map<string,BlackboardEntry>>();
 commit(entry:BlackboardEntry){const stream=this.entries.get(entry.workflowId)??new Map();if(stream.has(entry.entryId))throw new CommandRejection("DUPLICATE",`Entry ${entry.entryId} exists`);if(entry.validationStatus!=="ACCEPTED"||!entry.source.actorId)throw new CommandRejection("INVALID_TYPE","Only accepted entries with provenance may commit");if((entry.type==="CLAIM"||entry.type==="TERMINAL_EVIDENCE")&&entry.evidenceRefs.length===0)throw new CommandRejection("UNGROUNDED","Grounded entries require evidence");stream.set(entry.entryId,structuredClone(entry));this.entries.set(entry.workflowId,stream)}
 get(workflowId:WorkflowId){return [...(this.entries.get(workflowId)?.values()??[])].map(e=>structuredClone(e));}
 has(workflowId:WorkflowId,id:string){return this.entries.get(workflowId)?.has(id)??false}
 query(workflowId:WorkflowId,predicate:(e:BlackboardEntry)=>boolean){return this.get(workflowId).filter(predicate)}
}
