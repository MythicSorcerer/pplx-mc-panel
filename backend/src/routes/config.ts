import { Router, Request, Response } from "express";
import fs from "fs";
import path from "path";

const router = Router();

router.post("/server-properties", (req: Request, res: Response) => {
  const props = req.body as Record<string, unknown>;
  // Write to a local file — wire to your actual server.properties path
  const out = path.join(process.cwd(), "server.properties.json");
  fs.writeFileSync(out, JSON.stringify(props, null, 2));
  console.log("[config] server.properties updated →", out);
  res.json({ ok: true });
});

export default router;
