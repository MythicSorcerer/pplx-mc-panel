import { Router } from "express";
import { getContainerStats, getContainerId } from "../server-process";
import os from "os";
import fs from "fs";
import path from "path";

const router = Router();

router.get("/", async (req, res) => {
  const dockerStats = await getContainerStats();

  if (dockerStats) {
    return res.json(dockerStats);
  }

  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const ram = Math.round((usedMem / totalMem) * 100);

  const MC_DIR = process.env.MC_DIR ?? path.join(os.homedir(), "minecraft");
  let disk = 0;
  try {
    const stats = fs.statfsSync(MC_DIR);
    const total = stats.blocks * stats.bsize;
    const free = stats.bfree * stats.bsize;
    disk = Math.round(((total - free) / total) * 100);
  } catch {}

  res.json({ cpu: 0, ram, disk, uptime: 0 });
});

export default router;
