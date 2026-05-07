import { Router, Request, Response } from "express";

const router = Router();

// Loaded via node --env-file flag in systemd unit
const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    ?? "admin@voxel.local";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_PASSWORD) {
  console.error("FATAL: ADMIN_PASSWORD not set in backend/.env");
  process.exit(1);
}

declare module "express-session" {
  interface SessionData { userId: string; }
}

router.post("/login", (req: Request, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    req.session.userId = "admin";
    return res.json({ ok: true });
  }
  return res.status(401).json({ ok: false, message: "Invalid credentials" });
});

router.post("/logout", (req: Request, res: Response) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ ok: true });
  });
});

router.delete("/sessions", (req: Request, res: Response) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ ok: true, message: "All sessions revoked" });
  });
});

router.get("/me", (req: Request, res: Response) => {
  if (req.session.userId) return res.json({ ok: true, user: req.session.userId });
  return res.status(401).json({ ok: false });
});

export default router;
