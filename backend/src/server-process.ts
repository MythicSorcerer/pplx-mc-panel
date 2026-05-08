import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import { EventEmitter } from "events";
import path from "path";
import fs from "fs";

// Where the Minecraft server jar lives — set MC_DIR env var or edit this path
const MC_DIR = process.env.MC_DIR ?? path.join(process.env.HOME ?? "", "minecraft");
const JAR    = process.env.MC_JAR ?? "server.jar";
const JAVA   = process.env.JAVA_BIN ?? "/usr/lib/jvm/java-21-openjdk/bin/java";
const JVM_ARGS = (process.env.JVM_ARGS ?? "-Xmx2G -Xms1G -Dterminal.ansi=true").split(" ");

export type ServerStatus = "stopped" | "starting" | "running" | "stopping";

export const events   = new EventEmitter();
export let   status:    ServerStatus = "stopped";
export let   startTime: number | null = null;
let          proc:      ChildProcessWithoutNullStreams | null = null;
const        logBuffer: string[] = [];   // last 200 lines for new WS clients

function emit(line: string) {
  logBuffer.push(line);
  if (logBuffer.length > 200) logBuffer.shift();
  events.emit("line", line);
}

function setStatus(s: ServerStatus) {
  status = s;
  events.emit("status", s);
  emit(`[panel] Server status → ${s}`);
}

export function getBuffer() { return [...logBuffer]; }

export function start() {
  if (proc) { emit("[panel] Server is already running"); return; }

  const jarPath = path.join(MC_DIR, JAR);
  if (!fs.existsSync(jarPath)) {
    emit(`[panel] ERROR: server.jar not found at ${jarPath}`);
    emit(`[panel] Set MC_DIR env var to your server folder`);
    return;
  }

  emit(`[panel] Starting: ${JAVA} ${JVM_ARGS.join(" ")} -jar ${JAR} nogui`);
  setStatus("starting");

  proc = spawn(JAVA, [...JVM_ARGS, "-jar", JAR, "nogui"], {
    cwd: MC_DIR,
    env: { ...process.env },
  });

  proc.stdout.setEncoding("utf8");
  proc.stderr.setEncoding("utf8");

  proc.stdout.on("data", (data: string) => {
    data.split("\n").filter(Boolean).forEach(line => {
      emit(line);
      if (line.includes("Done (") && line.includes("For help")) setStatus("running"); startTime = Date.now();
    });
  });

  proc.stderr.on("data", (data: string) => {
    data.split("\n").filter(Boolean).forEach(line => emit(`[stderr] ${line}`));
  });

  proc.on("exit", (code) => {
    emit(`[panel] Process exited (code ${code})`);
    setStatus("stopped"); startTime = null;
    proc = null;
  });

  proc.on("error", (err) => {
    emit(`[panel] Spawn error: ${err.message}`);
    setStatus("stopped"); startTime = null;
    proc = null;
  });
}

export function stop() {
  if (!proc) { emit("[panel] Server is not running"); return; }
  setStatus("stopping");
  sendCommand("stop");
  // Force kill after 30s if it hasn't exited
  setTimeout(() => { if (proc) { proc.kill(); proc = null; setStatus("stopped"); startTime = null; } }, 30000);
}

export function restart() {
  if (proc) {
    events.once("status", (s: ServerStatus) => { if (s === "stopped") start(); });
    stop();
  } else {
    start();
  }
}

export function sendCommand(cmd: string) {
  if (!proc) { emit("[panel] Cannot send command — server not running"); return; }
  emit(`> ${cmd}`);
  proc.stdin.write(cmd + "\n");
}
