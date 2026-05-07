import express from "express";
import session from "express-session";
import cors from "cors";
import http from "http";
import path from "path";
import fs from "fs";
import { WebSocketServer, WebSocket } from "ws";

import authRouter     from "./routes/auth";
import playersRouter  from "./routes/players";
import configRouter   from "./routes/config";
import softwareRouter from "./routes/software";
import { start, stop, restart, sendCommand, status, getBuffer, events } from "./server-process";

const app    = express();
const server = http.createServer(app);
const PORT   = Number(process.env.PORT ?? 3000);
const IS_DEV = process.env.NODE_ENV !== "production";

app.use(cors({ origin: IS_DEV ? "http://localhost:5173" : false, credentials: true }));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET ?? "voxel-secret-change-me",
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: "lax", maxAge: 7 * 24 * 60 * 60 * 1000 },
}));

function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (req.session.userId) return next();
  res.status(401).json({ ok: false, message: "Not authenticated" });
}

app.use("/api/auth",     authRouter);
app.use("/api/players",  requireAuth, playersRouter);
app.use("/api/config",   requireAuth, configRouter);
app.use("/api/software", requireAuth, softwareRouter);
app.get("/api/health",   (_req, res) => res.json({ ok: true, uptime: process.uptime(), status }));

app.post("/api/server/start",   requireAuth, (_req, res) => { start();   res.json({ ok: true }); });
app.post("/api/server/stop",    requireAuth, (_req, res) => { stop();    res.json({ ok: true }); });
app.post("/api/server/restart", requireAuth, (_req, res) => { restart(); res.json({ ok: true }); });
app.get( "/api/server/status",  requireAuth, (_req, res) => res.json({ ok: true, status }));

// ── WebSocket console ──────────────────────────────────────────────────────
const wss = new WebSocketServer({ server, path: "/api/console-ws" });
wss.on("connection", (ws: WebSocket) => {
  getBuffer().forEach(line => ws.send(line));
  ws.send(`[panel] Server status: ${status}`);
  const onLine = (line: string) => { if (ws.readyState === WebSocket.OPEN) ws.send(line); };
  events.on("line", onLine);
  ws.on("message", (raw) => {
    try { const { command } = JSON.parse(raw.toString()) as { command: string }; sendCommand(command.replace(/^\//, "")); }
    catch { /* ignore */ }
  });
  ws.on("close", () => events.off("line", onLine));
});

// ── Serve built frontend in production ────────────────────────────────────
const STATIC = path.resolve(__dirname, "../../client/dist");
if (!IS_DEV && fs.existsSync(STATIC)) {
  app.use(express.static(STATIC));
  app.get("*", (_req, res) => res.sendFile(path.join(STATIC, "index.html")));
  console.log(`🌐  Serving frontend from ${STATIC}`);
} else if (!IS_DEV) {
  console.warn(`⚠️   No frontend build found at ${STATIC} — run: cd client && npm run build`);
}

server.listen(PORT, () => {
  console.log(`✅  Voxel Control running at http://localhost:${PORT}`);
  if (IS_DEV) console.log(`🔧  Dev mode — frontend on http://localhost:5173`);
});
