import type { DomainEvent, EventEnvelope, WorkflowId } from "../../core/src/types.js";
import { CommandRejection } from "../../core/src/types.js";
export interface EventStore { load(id:WorkflowId):Promise<readonly DomainEvent[]>; append(id:WorkflowId,expectedVersion:number,events:readonly DomainEvent[]):Promise<void> }
export class InMemoryEventStore implements EventStore {
 private streams=new Map<WorkflowId,DomainEvent[]>();
 async load(id:WorkflowId){return [...(this.streams.get(id)??[])];}
 async append(id:WorkflowId,expectedVersion:number,events:readonly DomainEvent[]){const current=this.streams.get(id)??[];if(current.length!==expectedVersion)throw new CommandRejection("VERSION_CONFLICT",`Expected ${expectedVersion}, found ${current.length}`);const ids=new Set(current.map(e=>e.eventId));for(const [i,e] of events.entries()){if(ids.has(e.eventId))throw new CommandRejection("DUPLICATE",`Duplicate event ${e.eventId}`);if(e.workflowId!==id||e.streamVersion!==expectedVersion+i+1)throw new CommandRejection("VERSION_CONFLICT","Invalid event stream position");ids.add(e.eventId)}this.streams.set(id,[...current,...events]);}
}
