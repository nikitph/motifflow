import type { Clock, IdGenerator } from "./types.js";
export class FixedClock implements Clock { constructor(private value:string){}now(){return this.value}set(value:string){this.value=value} }
export class SequenceIds implements IdGenerator { private n=0;constructor(private prefix="id"){}next(){return `${this.prefix}-${++this.n}`} }
export class SystemClock implements Clock { now(){return new Date().toISOString()} }
export class UuidIds implements IdGenerator { next(){return crypto.randomUUID()} }
