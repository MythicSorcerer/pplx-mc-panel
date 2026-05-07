import { Router, Request, Response } from "express";
import fs from "fs";
import path from "path";

const router = Router();

// Root is MC_DIR — never let requests escape it
const ROOT = path.resolve(process.env.MC_DIR ?? path.join(process.env.HOME ?? "", "minecraft"));

function safe(reqPath: string): string | null {
  const resolved = path.resolve(ROOT, reqPath.replace(/^\//, ""));
  return resolved.startsWith(ROOT) ? resolved : null;
}

// List directory
router.get("/", (req: Request, res: Response) => {
  const dir = safe((req.query.path as string) ?? "");
  if (!dir) return res.status(400).json({ ok: false, message: "Invalid path" });
  if (!fs.existsSync(dir)) return res.status(404).json({ ok: false, message: "Not found" });
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true }).map(e => ({
      name: e.name,
      type: e.isDirectory() ? "dir" : "file",
      size: e.isFile() ? fs.statSync(path.join(dir, e.name)).size : null,
      modified: fs.statSync(path.join(dir, e.name)).mtime.toISOString(),
    }));
    res.json({ ok: true, path: dir.replace(ROOT, ""), entries });
  } catch (err) {
    res.status(500).json({ ok: false, message: String(err) });
  }
});

// Read file
router.get("/read", (req: Request, res: Response) => {
  const file = safe((req.query.path as string) ?? "");
  if (!file) return res.status(400).json({ ok: false, message: "Invalid path" });
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory())
    return res.status(404).json({ ok: false, message: "Not a file" });
  // Block files over 2MB
  if (fs.statSync(file).size > 2 * 1024 * 1024)
    return res.status(413).json({ ok: false, message: "File too large to edit in browser (>2MB)" });
  try {
    res.json({ ok: true, content: fs.readFileSync(file, "utf8") });
  } catch {
    res.status(500).json({ ok: false, message: "Could not read file" });
  }
});

// Write file
router.post("/write", (req: Request, res: Response) => {
  const { path: reqPath, content } = req.body as { path: string; content: string };
  const file = safe(reqPath);
  if (!file) return res.status(400).json({ ok: false, message: "Invalid path" });
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content, "utf8");
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, message: String(err) });
  }
});

// Delete file or empty dir
router.delete("/", (req: Request, res: Response) => {
  const file = safe((req.query.path as string) ?? "");
  if (!file) return res.status(400).json({ ok: false, message: "Invalid path" });
  if (!fs.existsSync(file)) return res.status(404).json({ ok: false, message: "Not found" });
  try {
    fs.rmSync(file, { recursive: true });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, message: String(err) });
  }
});

// Rename / move
router.post("/rename", (req: Request, res: Response) => {
  const { from, to } = req.body as { from: string; to: string };
  const src = safe(from), dst = safe(to);
  if (!src || !dst) return res.status(400).json({ ok: false, message: "Invalid path" });
  try {
    fs.renameSync(src, dst);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, message: String(err) });
  }
});

// Create directory
router.post("/mkdir", (req: Request, res: Response) => {
  const { path: reqPath } = req.body as { path: string };
  const dir = safe(reqPath);
  if (!dir) return res.status(400).json({ ok: false, message: "Invalid path" });
  try {
    fs.mkdirSync(dir, { recursive: true });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, message: String(err) });
  }
});

export default router;
