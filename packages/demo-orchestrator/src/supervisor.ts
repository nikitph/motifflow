import { fork, type ChildProcess } from "node:child_process";
import { fileURLToPath } from "node:url";

export class DemoWorkerSupervisor {
  private child: ChildProcess | undefined;
  private ready = false;

  async start(): Promise<number> {
    if (this.child?.connected && this.ready) return this.child.pid!;
    const workerPath = fileURLToPath(new URL("../../../apps/reconciliation-demo/src/worker-process.ts", import.meta.url));
    const child = fork(workerPath, [], {
      execArgv: ["--import", "tsx"],
      stdio: ["ignore", "ignore", "inherit", "ipc"],
    });
    this.child = child;
    return await new Promise<number>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Demo worker failed to become ready")), 5_000);
      child.once("error", error => { clearTimeout(timer); reject(error); });
      child.on("message", message => {
        if (typeof message === "object" && message && "type" in message && message.type === "READY") {
          clearTimeout(timer);
          this.ready = true;
          resolve(child.pid!);
        }
      });
      child.once("exit", code => {
        this.ready = false;
        if (code !== 0) { clearTimeout(timer); reject(new Error(`Demo worker exited with code ${code}`)); }
      });
    });
  }

  async stop(): Promise<void> {
    const child = this.child;
    if (!child) return;
    if (child.exitCode !== null || child.signalCode !== null) {
      this.child = undefined;
      this.ready = false;
      return;
    }
    await new Promise<void>(resolve => {
      const timer = setTimeout(() => { child.kill("SIGKILL"); resolve(); }, 2_000);
      child.once("exit", () => { clearTimeout(timer); resolve(); });
      child.kill("SIGTERM");
    });
    this.child = undefined;
    this.ready = false;
  }

  isOnline() { return Boolean(this.child?.connected && this.ready); }
  pid() { return this.child?.pid; }
}
