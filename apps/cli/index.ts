import { readFile } from "node:fs/promises";
import { Pool } from "pg";
import { PostgresEventStore } from "../../packages/event-store/src/postgres.js";
import { PostgresRuntimeRepository } from "../../packages/runtime/src/postgres.js";
import { WorkflowAggregate, replay } from "../../packages/workflow/src/workflow.js";
import { TypedBlackboard } from "../../packages/blackboard/src/blackboard.js";
import { SystemClock, UuidIds } from "../../packages/core/src/deterministic.js";
import { auditProjection, rebuildBlackboard, workflowSummary } from "../../packages/projections/src/projections.js";
import { diagnoseDistortions } from "../../packages/atlas/src/distortions.js";
import type { AuthorityPolicy, BoundaryPolicy, BudgetState, GoalSpec } from "../../packages/core/src/types.js";

interface CreateSpec { workflowId?:string;goal:GoalSpec;boundaries:BoundaryPolicy[];authorityPolicies:AuthorityPolicy[];budgets:BudgetState }
const args=process.argv.slice(2),url=process.env.DATABASE_URL;
if(!url)throw new Error("DATABASE_URL is required for durable CLI commands");
const pool=new Pool({connectionString:url}),store=new PostgresEventStore(pool),runtime=new PostgresRuntimeRepository(pool),aggregate=new WorkflowAggregate(store,new TypedBlackboard(),new SystemClock(),new UuidIds());
const output=(value:unknown)=>console.log(JSON.stringify(value,null,2));
try {
  const [group,command,id,extra]=args;
  if(group==="workflow"&&command==="create"){
    if(!id)throw new Error("workflow create requires a JSON spec path");const spec=JSON.parse(await readFile(id,"utf8")) as CreateSpec;const workflowId=spec.workflowId??crypto.randomUUID();let state=await aggregate.create(workflowId,spec.boundaries,spec.authorityPolicies,spec.budgets);state=await aggregate.registerGoal(workflowId,state.version,spec.goal);output(state);
  } else if(group==="workflow"&&id){
    const events=await store.load(id);
    if(command==="inspect")output(workflowSummary(id,events));
    else if(command==="history")output(events);
    else if(command==="replay")output(replay(id,events));
    else if(command==="suspend"){const s=replay(id,events);output(await aggregate.suspend(id,s.version,extra??"CLI request"));}
    else if(command==="resume"){const s=replay(id,events);output(await aggregate.resume(id,s.version));}
    else if(command==="cancel"){const s=replay(id,events);output(await aggregate.cancel(id,s.version,extra??"CLI request"));}
    else if(command==="signal"){if(!extra)throw new Error("workflow signal requires a type");output({accepted:await runtime.receiveSignal({signalId:crypto.randomUUID(),workflowId:id,type:extra,payload:{},sentAt:new Date().toISOString(),senderId:"cli",idempotencyKey:args[4]??crypto.randomUUID()})});}
    else throw new Error("Unknown workflow command");
  } else if(group==="blackboard"&&command==="show"&&id)output(rebuildBlackboard(await store.load(id)));
  else if(group==="diagnose"&&command){output(diagnoseDistortions(command,{},new Date().toISOString()));}
  else if(group==="distortions"&&command){const r=await pool.query("SELECT instance FROM distortion_instances WHERE workflow_id=$1 AND active=true",[command]);output(r.rows.map(x=>(x as {instance:unknown}).instance));}
  else if(group==="approvals"&&command==="list")output(await runtime.listApprovals("PENDING"));
  else if(group==="audit"&&command)output(auditProjection(await store.load(command)));
  else throw new Error("Usage: motifflow workflow create <spec.json> | workflow inspect|history|replay|suspend|resume|cancel <id> | workflow signal <id> <type> [key] | blackboard show <id> | diagnose <id> | distortions <id> | approvals list");
} finally { await pool.end(); }
