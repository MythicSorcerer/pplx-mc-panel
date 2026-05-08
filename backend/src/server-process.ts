import * as path from "path";
import * as fs from "fs";
import { exec } from "child_process";
import { EventEmitter } from "events";
import { promisify } from "util";

const execAsync = promisify(exec);

const copyFile = (src: string, dest: string): Promise<void> =>
  new Promise((resolve, reject) => fs.copyFile(src, dest, err => err ? reject(err) : resolve()));

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

export async function dockerIsRunning(): Promise<boolean> {
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

async function dockerBuildImage(): Promise<boolean> {
  const repoRoot = process.env.INSTALL_DIR || path.join(__dirname, "../..");
  const dockerfilePath = path.join(repoRoot, "Dockerfile.mcserver");
  const mcDir = process.env.MC_DIR || path.join(process.env.HOME || "", "minecraft");
  const sourceJar = path.join(mcDir, "server.jar");
  
  if (!fs.existsSync(dockerfilePath)) {
    emit(`[panel] Dockerfile.mcserver not found at ${dockerfilePath}`);
    return false;
  }
  
  if (!fs.existsSync(sourceJar)) {
    emit(`[panel] server.jar not found at ${sourceJar}`);
    return false;
  }

  const targetJar = path.join(repoRoot, "server.jar");
  if (!fs.existsSync(targetJar)) {
    emit(`[panel] Copying server.jar to repo root...`);
    await copyFile(sourceJar, targetJar);
  }

  emit(`[panel] Building ${MC_IMAGE}...`);
  try {
    await execCmd(`docker build -f Dockerfile.mcserver -t ${MC_IMAGE} ${repoRoot}`);
    emit(`[panel] Built ${MC_IMAGE}`);
    return true;
  } catch (e: any) {
    emit(`[panel] Build failed: ${e.message}`);
    return false;
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
    await dockerPullImage().catch(() => {});

    const cpus = process.env.MC_CPUS ?? "2";
    const mem = process.env.MC_MEM ?? "3G";

    const runCmd = `docker run -d --name ${MC_CONTAINER} \
      --cpus ${cpus} \
      --memory ${mem} \
      -p 25565:25565 \
      -v mc-data:/data \
      --restart unless-stopped \
      ${MC_IMAGE}`;

    try {
      await execCmd(runCmd);
    } catch {
      emit("[panel] Image not found, trying to build...");
      const built = await dockerBuildImage();
      if (built) {
        await execCmd(runCmd);
      } else {
        throw new Error("Could not build or find image");
      }
    }

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
  emit("[panel] Commands via console - stdin not exposed in Docker. Use RCON or console directly.");
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

    const memLimit = process.env.MC_MEM 
      ? parseFloat(process.env.MC_MEM) * 1024 
      : 3072;

    return { cpu, ram: Math.round((usedMB / memLimit) * 100), disk: 0, uptime: startTime ? Math.floor((Date.now() - startTime) / 1000) : 0 };
  } catch {
    return null;
  }
};