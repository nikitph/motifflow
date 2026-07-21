import type { ActivityResult, ActivityTask } from "./types.js";
export interface ActivityExecutor { readonly activityType:string; execute(input:unknown,task:ActivityTask):Promise<unknown> }
export interface ActivityQueue { claimActivities(worker:string,now:string,leaseMs:number,limit?:number):ActivityTask[];start(activityId:string,worker:string,now:string):ActivityTask;complete(result:ActivityResult):ActivityResult }
/** Executes only registered activity types and always records the observed result. */
export class ActivityWorker {
 private executors=new Map<string,ActivityExecutor>();
 constructor(private queue:ActivityQueue,executors:readonly ActivityExecutor[]){for(const e of executors){if(this.executors.has(e.activityType))throw new Error(`Duplicate executor ${e.activityType}`);this.executors.set(e.activityType,e)}}
 async runOnce(workerId:string,now:string,leaseMs=30000){const task=this.queue.claimActivities(workerId,now,leaseMs,1)[0];if(!task)return undefined;this.queue.start(task.activityId,workerId,now);const executor=this.executors.get(task.activityType);if(!executor)return this.queue.complete({activityId:task.activityId,failureClass:"PERMANENT",error:`Unregistered activity ${task.activityType}`});try{const output=await executor.execute(task.input,task);return this.queue.complete({activityId:task.activityId,output})}catch(error){return this.queue.complete({activityId:task.activityId,failureClass:"PERMANENT",error:error instanceof Error?error.message:"Activity failed"})}}
}
export interface AsyncActivityQueue { claimActivities(worker:string,leaseMs:number,limit?:number):Promise<ActivityTask[]>;start(activityId:string,worker:string):Promise<ActivityTask>;complete(result:ActivityResult):Promise<unknown> }
/** PostgreSQL-compatible worker; a crash leaves a lease that another process may reclaim. */
export class AsyncActivityWorker {
 private executors=new Map<string,ActivityExecutor>();
 constructor(private queue:AsyncActivityQueue,executors:readonly ActivityExecutor[]){for(const e of executors)this.executors.set(e.activityType,e)}
 async runOnce(workerId:string,leaseMs=30000){const task=(await this.queue.claimActivities(workerId,leaseMs,1))[0];if(!task)return undefined;await this.queue.start(task.activityId,workerId);const executor=this.executors.get(task.activityType);if(!executor)return await this.queue.complete({activityId:task.activityId,failureClass:"PERMANENT",error:`Unregistered activity ${task.activityType}`});try{return await this.queue.complete({activityId:task.activityId,output:await executor.execute(task.input,task)})}catch(error){return await this.queue.complete({activityId:task.activityId,failureClass:"PERMANENT",error:error instanceof Error?error.message:"Activity failed"})}}
}
