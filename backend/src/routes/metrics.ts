import { Router } from "express";
import { startTime } from "../server-process";
import os from "os";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
const router = Router();

let lastCpuTimes: number[]|null = null;

router.get("/", async (req, res) => {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const ram = Math.round((usedMem / totalMem) * 100);

  let cpu = 0;
  try {
    const { user, nice, system, idle } = await getCpuTimes();
    if (lastCpuTimes) {
      const [pu, pn, ps, pi] = lastCpuTimes;
      const totalDelta = (user - pu) + (nice - pn) + (system - ps) + (idle - pi);
      const idleDelta = idle - pi;
      cpu = totalDelta > 0 ? Math.round((1 - idleDelta / totalDelta) * 100) : 0;
      cpu = Math.max(0, Math.min(100, cpu));
    }
    lastCpuTimes = [user, nice, system, idle];
  } catch {}

  const MC_DIR = process.env.MC_DIR ?? path.join(os.homedir(), "minecraft");
  let disk = 0;
  try {
    const stats = fs.statfsSync(MC_DIR);
    const total = stats.blocks * stats.bsize;
    const free = stats.bfree * stats.bsize;
    disk = Math.round(((total - free) / total) * 100);
  } catch {}

  const uptime = startTime ? Math.floor((Date.now() - startTime) / 1000) : null;
  res.json({ cpu, ram, disk, uptime });
});

async function getCpuTimes() {
  const stat = await fs.promises.readFile("/proc/stat", "utf-8");
  const line = stat.split("\n").find(l => l.startsWith("cpu ")) || "cpu 0 0 0 0 0 0 0 0 0 0";
  const parts = line.split(/\s+/);
  return [
    parseInt(parts[1] || "0"),
    parseInt(parts[2] || "0"),
    parseInt(parts[3] || "0"),
    parseInt(parts[4] || "0")
  ];
}
