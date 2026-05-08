import { exec } from "child_process";
import { EventEmitter } from "events";
import { promisify } from "util";

const execAsync = promisify(exec);

const execCmd = (cmd: string): Promise<string> =>
  new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => err ? reject(err) : resolve(stdout + stderr));
  });

const MC_CONTAINER = process.env.MC_CONTAINER ?? "mcserver";
const MC_IMAGE = process.env.MC_IMAGE ?? "mcserver:latest";

export type ServerStatus = "stopped" | "starting" | "running" | "stopping";

export const events = new EventEmitter();
export let status: ServerStatus = "stopped";
export let startTime: number | null = null;

let logBuffer: string[] = [];

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

async function dockerIsRunning(): Promise<boolean> {
  try {
    const out = await execCmd(`docker ps -a --filter name=^${MC_CONTAINER}$ --format {{.Status}}`);
    return out.includes("Up");
  } catch { return false; }
}

async function dockerPullImage(): Promise<void> {
  try {
    await execCmd(`docker pull ${MC_IMAGE}`);
    emit(`[panel] Pulled ${MC_IMAGE}`);
  } catch (e: any) {
    emit(`[panel] Pull warning: ${e.message}`);
  }
}

export async function start() {
  if (await dockerIsRunning()) {
    emit("[panel] Server is already running");
    return;
  }

  setStatus("starting");
  emit(`[panel] Starting container ${MC_CONTAINER}...`);
  emit(`[panel] Using image: ${MC_IMAGE}`);

  try {
    await dockerPullImage();

    const cpus = process.env.MC_CPUS ?? "2";
    const mem = process.env.MC_MEM ?? "3G";

    await execCmd(`docker run -d --name ${MC_CONTAINER} \
      --cpus ${cpus} \
      --memory ${mem} \
      -p 25565:25565 \
      -v mc-data:/data \
      --restart unless-stopped \
      ${MC_IMAGE}`);

    setStatus("running");
    startTime = Date.now();
    emit("[panel] Container started");
    emit("[panel] Server status → running");
  } catch (e: any) {
    emit(`[panel] Failed to start: ${e.message}`);
    setStatus("stopped");
  }
}

export async function stop() {
  if (!await dockerIsRunning()) {
    emit("[panel] Server is not running");
    return;
  }

  setStatus("stopping");
  emit("[panel] Stopping container...");

  try {
    await execCmd(`docker stop -t 60 ${MC_CONTAINER}`);
    setStatus("stopped");
    startTime = null;
    emit("[panel] Container stopped");
  } catch (e: any) {
    emit(`[panel] Stop failed: ${e.message}`);
    setStatus("stopped");
  }
}

export async function restart() {
  await stop();
  await new Promise(r => setTimeout(r, 2000));
  await start();
}

export async function sendCommand(cmd: string) {
  if (!await dockerIsRunning()) {
    emit("[panel] Cannot send command — server not running");
    return;
  }

  emit(`> ${cmd}`);
  try {
    await execCmd(`docker exec ${MC_CONTAINER} rcon-cli ${cmd}`);
  } catch (e: any) {
    emit(`[stderr] ${e.message}`);
  }
}

export async function getContainerId(): Promise<string | null> {
  try {
    return (await execCmd(`docker ps --filter name=^${MC_CONTAINER}$ --format {{.ID}}`)).trim();
  } catch { return null; }
}

export const getContainerStats = async (): Promise<{cpu: number; ram: number; disk: number; uptime: number} | null> => {
  const id = await getContainerId();
  if (!id) return null;

  try {
    const stats = await execCmd(`docker stats ${id} --no-stream --format "{{.CPUPerc}} {{.MemUsage}}"`);
    const [cpuPct, memUse] = stats.trim().split(" ");
    const cpu = parseFloat(cpuPct.replace("%", ""));

    const memParts = memUse.split("/");
    const used = memParts[0];
    const usedNum = parseFloat(used);
    const isGiB = used.includes("GiB");
    const usedMB = isGiB ? usedNum * 1024 : usedNum;

    return { cpu, ram: Math.round((usedMB / 3072) * 100), disk: 0, uptime: startTime ? Math.floor((Date.now() - startTime) / 1000) : 0 };
  } catch {
    return null;
  }
};