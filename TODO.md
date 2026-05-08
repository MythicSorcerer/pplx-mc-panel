Voxel Control deploy/debug TODO

CONVERT THIS INTO A TODO LIST AND KEEP UP TO DATE WITH [X] or [ ]

Context
- Host has a process already using port 3000.
- PM2 process `mc-panel-backend` fails with `EADDRINUSE: address already in use :::3000`.
- PM2 log also shows:
  - `✅ Voxel Control running at http://localhost:3000`
  - `🔧 Dev mode — frontend on http://localhost:5173`
- Browser currently returns `Cannot GET /`.
- Console auto-send code exists in source, but live panel behavior is inconsistent.
- ANSI color JVM flag is still missing in backend/src/server-process.ts.

Goals
1. Identify what owns port 3000 and whether it is:
   - an old systemd service,
   - an old Node process,
   - another mc-panel instance,
   - or a reverse-proxy/backend mismatch.
2. Decide one canonical runtime path:
   - either PM2 owns the panel process,
   - or systemd owns it,
   - but not both.
3. Make production mode actually serve the built frontend from `client/dist`.
4. Reapply pending source fixes cleanly:
   - add `-Dterminal.ansi=true` to Java launch path,
   - confirm console preset auto-send UI works live,
   - keep/review other UI fixes only after deploy path is stable.

Immediate diagnostic steps
- Run:
  - `sudo ss -ltnp | grep :3000`
  - `sudo lsof -iTCP:3000 -sTCP:LISTEN -P -n`
  - `systemctl list-units --type=service | grep -Ei 'voxel|panel|node|pm2'`
  - `systemctl status <service-name>` for any suspicious service
  - `pm2 status`
  - `pm2 show mc-panel-backend`
- Determine whether a systemd service is launching another copy from a different folder.

Deployment cleanup
- If systemd service is the real owner:
  - stop PM2 copy,
  - inspect the systemd unit ExecStart, WorkingDirectory, EnvironmentFile,
  - fix that service instead.
- If PM2 should be canonical:
  - stop/disable the conflicting systemd service,
  - ensure PM2 cwd is `~/.voxel-control/backend`,
  - ensure environment is loaded correctly,
  - ensure port 3000 is free before restart.

Production serving fix
- In backend, verify `NODE_ENV=production` at runtime.
- Confirm `client/dist/index.html` exists after build.
- Confirm backend resolves static path correctly:
  - `../../client/dist` from backend/dist/index.js
- If `Cannot GET /` persists:
  - inspect whether `express.static(STATIC)` is skipped because `IS_DEV` is true,
  - fix env loading so production mode is respected.

Source fixes to apply after runtime cleanup
- backend/src/server-process.ts
  - update default JVM args:
    `const JVM_ARGS = (process.env.JVM_ARGS ?? "-Xmx2G -Xms1G -Dterminal.ansi=true").split(" ");`
- client/src/views/ConsoleView.tsx
  - verify Auto-send checkbox is present in built app
  - verify preset click sends immediately when enabled
- only after stable deploy, revisit:
  - Files view layout
  - dead settings toggles
  - uptime card

Validation
- `curl http://localhost:3000/api/health`
- open `/` and confirm frontend loads, not `Cannot GET /`
- open Console view and verify Auto-send checkbox exists
- start MC server and confirm ANSI-colored log output appears
- confirm only one service owns port 3000

Important
- Do not keep both PM2 and systemd fighting over the same port.
- Do not patch more UI until runtime ownership and production/static serving are fixed.
