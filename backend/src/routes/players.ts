import { Router, Request, Response } from "express";
import { sendCommand } from "../server-process";

const router = Router();

router.get("/", (_req: Request, res: Response) => {
  // Wire to real player list by parsing stdout or a plugin API later
  res.json({ ok: true, players: [] });
});

router.post("/:name/kick", async (req: Request, res: Response) => {
  const { name } = req.params;
  const { reason } = req.body as { reason?: string };
  sendCommand(`kick ${name}${reason ? " " + reason : ""}`);
  res.json({ ok: true });
});

router.post("/:name/ban", async (req: Request, res: Response) => {
  const { name } = req.params;
  const { reason } = req.body as { reason?: string };
  sendCommand(`ban ${name}${reason ? " " + reason : ""}`);
  res.json({ ok: true });
});

router.post("/:name/message", async (req: Request, res: Response) => {
  const { name } = req.params;
  const { message } = req.body as { message?: string };
  sendCommand(`msg ${name} ${message}`);
  res.json({ ok: true });
});

router.post("/:name/teleport", async (req: Request, res: Response) => {
  const { name } = req.params;
  sendCommand(`tp @p ${name}`);
  res.json({ ok: true });
});

export default router;
