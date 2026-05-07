import { Router, Request, Response } from "express";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import https from "https";

const execAsync = promisify(exec);
const router = Router();

const MC_DIR = process.env.MC_DIR ?? path.join(process.env.HOME!, "minecraft");
const JAR_PATH = path.join(MC_DIR, "server.jar");

// ── helpers ───────────────────────────────────────────────────────────────────

function httpsGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "voxel-control/1.0" } }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve(data));
      res.on("error", reject);
    }).on("error", reject);
  });
}

async function downloadFile(url: string, dest: string): Promise<void> {
  await fs.mkdir(path.dirname(dest), { recursive: true });
  return new Promise((resolve, reject) => {
    const follow = (u: string) => {
      https.get(u, { headers: { "User-Agent": "voxel-control/1.0" } }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          return follow(res.headers.location!);
        }
        const file = require("fs").createWriteStream(dest);
        res.pipe(file);
        file.on("finish", () => file.close(() => resolve()));
        file.on("error", reject);
      }).on("error", reject);
    };
    follow(url);
  });
}

// ── GET /api/software/versions?type=paper|purpur ──────────────────────────────

router.get("/versions", async (req: Request, res: Response) => {
  const type = (req.query.type as string) ?? "paper";
  try {
    if (type === "paper") {
      const data = JSON.parse(await httpsGet("https://api.papermc.io/v2/projects/paper"));
      // reverse so newest first, take last 10
      const versions: string[] = (data.versions as string[]).reverse().slice(0, 10);
      return res.json({ ok: true, versions });
    }
    if (type === "purpur") {
      const data = JSON.parse(await httpsGet("https://api.purpurmc.org/v2/purpur"));
      const versions: string[] = (data.versions as string[]).reverse().slice(0, 10);
      return res.json({ ok: true, versions });
    }
    if (type === "fabric") {
      const data = JSON.parse(await httpsGet("https://meta.fabricmc.net/v2/versions/game"));
      const versions = (data as { version: string; stable: boolean }[])
        .filter((v) => v.stable)
        .slice(0, 10)
        .map((v) => v.version);
      return res.json({ ok: true, versions });
    }
    return res.status(400).json({ ok: false, message: "Unknown type" });
  } catch (e: any) {
    return res.status(500).json({ ok: false, message: e.message });
  }
});

// ── POST /api/software/install ────────────────────────────────────────────────

router.post("/install", async (req: Request, res: Response) => {
  const { type, version, eulaAccepted } = req.body as {
    type: string;
    version: string;
    eulaAccepted: boolean;
  };

  if (!eulaAccepted) {
    return res.status(400).json({ ok: false, message: "EULA must be accepted" });
  }
  if (!type || !version) {
    return res.status(400).json({ ok: false, message: "type and version required" });
  }

  // Respond immediately — download happens async, progress via console WS
  res.json({ ok: true, message: `Installing ${type} ${version}...` });

  try {
    await fs.mkdir(MC_DIR, { recursive: true });

    // Write eula.txt
    await fs.writeFile(path.join(MC_DIR, "eula.txt"), "eula=true\n");

    let downloadUrl: string;

    if (type === "paper") {
      const buildsData = JSON.parse(
        await httpsGet(`https://api.papermc.io/v2/projects/paper/versions/${version}/builds`)
      );
      const builds = buildsData.builds as { build: number; channel: string; downloads: { application: { name: string } } }[];
      const stable = builds.filter((b) => b.channel === "default").pop() ?? builds[builds.length - 1];
      const fileName = stable.downloads.application.name;
      downloadUrl = `https://api.papermc.io/v2/projects/paper/versions/${version}/builds/${stable.build}/downloads/${fileName}`;
    } else if (type === "purpur") {
      downloadUrl = `https://api.purpurmc.org/v2/purpur/${version}/latest/download`;
    } else if (type === "fabric") {
      // Fabric needs installer approach — download installer jar
      const installerData = JSON.parse(await httpsGet("https://meta.fabricmc.net/v2/versions/installer"));
      const installerUrl = `https://maven.fabricmc.net/net/fabricmc/fabric-installer/${installerData[0].version}/fabric-installer-${installerData[0].version}.jar`;
      const installerPath = path.join(MC_DIR, "fabric-installer.jar");
      await downloadFile(installerUrl, installerPath);
      await execAsync(`java -jar ${installerPath} server -mcversion ${version} -downloadMinecraft`, { cwd: MC_DIR });
      await fs.rename(path.join(MC_DIR, "fabric-server-launch.jar"), JAR_PATH).catch(() => {});
      return;
    } else {
      return;
    }

    const tmpJar = path.join(MC_DIR, `server-${type}-${version}.jar`);
    await downloadFile(downloadUrl, tmpJar);
    // Atomic swap
    await fs.rename(tmpJar, JAR_PATH);
  } catch (e: any) {
    console.error("Install failed:", e.message);
  }
});

// ── GET /api/software/current ─────────────────────────────────────────────────

router.get("/current", async (_req: Request, res: Response) => {
  try {
    const manifestPath = path.join(MC_DIR, "manifest.json");
    const manifestExists = await fs.access(manifestPath).then(() => true).catch(() => false);
    if (manifestExists) {
      const manifest = JSON.parse(await fs.readFile(manifestPath, "utf-8"));
      return res.json({ ok: true, type: manifest.type, version: manifest.version });
    }
    const jarExists = await fs.access(JAR_PATH).then(() => true).catch(() => false);
    if (jarExists) {
      return res.json({ ok: true, type: "unknown", version: "installed" });
    }
    return res.json({ ok: true, type: "none", version: "" });
  } catch {
    return res.json({ ok: true, type: "none", version: "" });
  }
});

export default router;
