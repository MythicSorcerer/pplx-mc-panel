import { Router, Request, Response } from "express";

const router = Router();

router.post("/install", (req: Request, res: Response) => {
  const { id } = req.body as { id?: string };
  console.log(`[software] queued install: ${id}`);
  // Wire to actual jar download + restart logic here
  res.json({ ok: true, message: `${id} queued for install on next restart` });
});

export default router;
