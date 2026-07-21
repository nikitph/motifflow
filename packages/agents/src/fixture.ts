import type { ProposalEnvelope } from "../../core/src/types.js";
export interface ProposalOperator { readonly operatorId:string; propose():Promise<ProposalEnvelope> }
export class FixtureProposalOperator implements ProposalOperator { readonly operatorId="fixture";constructor(private proposals:readonly ProposalEnvelope[],private index=0){}async propose(){const p=this.proposals[this.index++];if(!p)throw new Error("Fixture proposals exhausted");return structuredClone(p)} }
