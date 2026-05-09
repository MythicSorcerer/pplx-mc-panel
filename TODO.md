# Voxel Control - Known Issues & Status

## Current Status (2025-05-08)

### Working
- Docker-based MC server container with resource limits (2 CPU, 3GB RAM)
- Panel serves from backend
- Authentication works
- Basic CRUD for files
- Server start/stop via Docker

### Issues to Fix

#### High Priority
1. **Files not loading on initial visit** - Files show empty until user clicks "+ File" button, then all files appear. Likely a React useEffect dependency issue.

2. **Console commands not working** - Sending commands via panel shows "stdin not exposed in Docker". Need rcon-cli installed in container or alternative approach.

3. **Server logs not showing in Console** - Panel doesn't fetch/display Docker container logs in real-time. Only shows panel status messages.

4. **Console duplicates prompts** - Each command appears twice in console output.

5. **No color in logs** - Server logs lack ANSI color codes.

6. **Software install shows old version** - Installing Purpur 1.21.11 shows "Docker 1.21+" instead of actual version.

#### Medium Priority
7. **Offline mode** - Need to verify `online-mode=false` is actually being read by the Docker container.

8. **RCON** - Container doesn't have rcon-cli. Need to either install it or use Docker exec differently.

9. **Status detection race** - Multiple "Server status: running" messages due to async status checks.

10. **Files page height** - Not scrolling properly within page layout.

#### Low Priority
11. **Search in files** - Command-F search overlay exists but barely functional.

12. **Version dropdown truncates** - 1.21.11 shows as 1.21.1 in some places.

### Docker Configuration
- Image: `mcserver:latest` (built from Dockerfile.mcserver)
- Port: 25565 (host) → 25565 (container)
- Volume: `/home/xt/minecraft` → `/data` (host directory mount)
- Resources: 2 CPU, 3GB RAM

### Files Structure
```
/home/xt/.voxel-control/
├── backend/          # Express API server
├── client/          # React frontend  
├── Dockerfile.mcserver
├── docker-compose.yml
└── install.sh       # Installation script
```

### Environment Variables
- `MC_DIR` - Minecraft directory (default: ~/minecraft)
- `MC_CPUS` - CPU limit (default: 2)
- `MC_MEM` - Memory limit (default: 3G)
- `INSTALL_DIR` - Panel installation directory

### Next Steps
1. Fix Files loading on mount
2. Implement proper log streaming from Docker
3. Add rcon support or stdin pipe to container
4. Fix console duplicate messages
5. Verify offline mode works
