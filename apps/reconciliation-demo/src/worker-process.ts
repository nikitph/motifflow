let shuttingDown = false;

function send(message: object) {
  if (process.send) process.send(message);
}

send({ type: "READY", pid: process.pid });
const heartbeat = setInterval(() => send({ type: "HEARTBEAT", pid: process.pid }), 1_000);

function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  clearInterval(heartbeat);
  send({ type: "STOPPED", pid: process.pid });
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
process.on("disconnect", shutdown);
