#!/usr/bin/env bash
set -euo pipefail

# ── Voxel Control — installer ─────────────────────────────────────────────────
# curl -fsSL https://raw.githubusercontent.com/YOUR_USERNAME/pplx-mc-panel/main/install.sh | bash

REPO="https://github.com/YOUR_USERNAME/pplx-mc-panel.git"
INSTALL_DIR="${INSTALL_DIR:-$HOME/.voxel-control}"
SERVICE_NAME="voxel-control"
PORT="${PORT:-3000}"
OS="$(uname -s)"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
info()    { echo -e "${BLUE}[voxel]${NC} $*"; }
success() { echo -e "${GREEN}[voxel]${NC} $*"; }
warn()    { echo -e "${YELLOW}[voxel]${NC} $*"; }
error()   { echo -e "${RED}[voxel]${NC} $*"; exit 1; }

# ── Detect OS ─────────────────────────────────────────────────────────────────
case "$OS" in
  Darwin) PLATFORM="macos" ;;
  Linux)
    if   command -v dnf  &>/dev/null; then PLATFORM="fedora"
    elif command -v apt  &>/dev/null; then PLATFORM="ubuntu"
    elif command -v pacman &>/dev/null; then PLATFORM="arch"
    else PLATFORM="linux"; fi ;;
  *) error "Unsupported OS: $OS" ;;
esac
info "Detected platform: $PLATFORM"

# ── Install Node.js if missing ────────────────────────────────────────────────
if ! command -v node &>/dev/null || [[ $(node -e "process.exit(parseInt(process.version.slice(1))<18?1:0)" 2>/dev/null; echo $?) -ne 0 ]]; then
  info "Installing Node.js 20..."
  case "$PLATFORM" in
    macos)
      if command -v brew &>/dev/null; then brew install node@20
      else error "Please install Homebrew first: https://brew.sh"; fi ;;
    fedora)  sudo dnf install -y nodejs npm ;;
    ubuntu)  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs ;;
    arch)    sudo pacman -Sy --noconfirm nodejs npm ;;
    linux)   error "Please install Node.js 20+ manually: https://nodejs.org" ;;
  esac
fi
success "Node $(node --version) ready"

# ── Install Java if missing ───────────────────────────────────────────────────
if ! command -v java &>/dev/null; then
  info "Installing Java 21..."
  case "$PLATFORM" in
    macos)   brew install openjdk@21 && sudo ln -sfn $(brew --prefix)/opt/openjdk@21/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk-21.jdk ;;
    fedora)  sudo dnf install -y java-21-openjdk ;;
    ubuntu)  sudo apt-get install -y openjdk-21-jdk ;;
    arch)    sudo pacman -Sy --noconfirm jdk21-openjdk ;;
    linux)   warn "Please install Java 21+ manually" ;;
  esac
fi
if command -v java &>/dev/null; then success "Java $(java -version 2>&1 | head -1) ready"
else warn "Java not found — server start will fail until Java is installed"; fi

# ── Clone or update repo ──────────────────────────────────────────────────────
if [[ -d "$INSTALL_DIR/.git" ]]; then
  info "Updating existing installation at $INSTALL_DIR..."
  git -C "$INSTALL_DIR" pull --ff-only
else
  info "Cloning to $INSTALL_DIR..."
  git clone "$REPO" "$INSTALL_DIR"
fi

# ── Build ─────────────────────────────────────────────────────────────────────
info "Installing backend dependencies..."
cd "$INSTALL_DIR/backend" && npm install --production=false

info "Installing frontend dependencies..."
cd "$INSTALL_DIR/client" && npm install

info "Building frontend..."
npm run build

info "Building backend..."
cd "$INSTALL_DIR/backend" && npm run build 2>/dev/null || true

# ── Write mcpanel CLI ─────────────────────────────────────────────────────────
CLI_PATH="/usr/local/bin/mcpanel"
sudo tee "$CLI_PATH" > /dev/null << CLISCRIPT
#!/usr/bin/env bash
SERVICE="$SERVICE_NAME"
INSTALL="$INSTALL_DIR"
PORT="$PORT"
PLATFORM="$PLATFORM"

start_service() {
  export MC_DIR="\${MC_DIR:-\$HOME/minecraft}"
  export PORT="\$PORT"
  export NODE_ENV="production"
  if [[ "\$PLATFORM" == "macos" ]]; then
    launchctl load "\$HOME/Library/LaunchAgents/com.voxelcontrol.plist" 2>/dev/null
    echo "Panel started → http://localhost:\$PORT"
  else
    sudo systemctl start "\$SERVICE"
    echo "Panel started → http://localhost:\$PORT"
  fi
}

stop_service() {
  if [[ "\$PLATFORM" == "macos" ]]; then
    launchctl unload "\$HOME/Library/LaunchAgents/com.voxelcontrol.plist" 2>/dev/null
  else
    sudo systemctl stop "\$SERVICE"
  fi
  echo "Panel stopped"
}

case "\${1:-help}" in
  start)   start_service ;;
  stop)    stop_service ;;
  restart) stop_service; sleep 1; start_service ;;
  logs)    if [[ "\$PLATFORM" == "macos" ]]; then tail -f /tmp/voxel-control.log; else sudo journalctl -u "\$SERVICE" -f; fi ;;
  status)  curl -s "http://localhost:\$PORT/api/health" | python3 -m json.tool 2>/dev/null || echo "Panel not responding" ;;
  update)  git -C "\$INSTALL" pull && cd "\$INSTALL/client" && npm run build && cd "\$INSTALL/backend" && npm run build; stop_service; start_service ;;
  *)       echo "Usage: mcpanel [start|stop|restart|logs|status|update]" ;;
esac
CLISCRIPT
sudo chmod +x "$CLI_PATH"

# ── Install service ───────────────────────────────────────────────────────────
if [[ "$PLATFORM" == "macos" ]]; then
  PLIST="$HOME/Library/LaunchAgents/com.voxelcontrol.plist"
  cat > "$PLIST" << PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"\>
<plist version="1.0"><dict>
  <key>Label</key><string>com.voxelcontrol</string>
  <key>ProgramArguments</key>
  <array>
    <string>$(which node)</string>
    <string>$INSTALL_DIR/backend/dist/index.js</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>NODE_ENV</key><string>production</string>
    <key>PORT</key><string>$PORT</string>
  </dict>
  <key>RunAtLoad</key><false/>
  <key>KeepAlive</key><false/>
  <key>StandardOutPath</key><string>/tmp/voxel-control.log</string>
  <key>StandardErrorPath</key><string>/tmp/voxel-control.log</string>
  <key>WorkingDirectory</key><string>$INSTALL_DIR/backend</string>
</dict></plist>
PLIST
  launchctl load "$PLIST"
  success "Service registered with launchd"

else
  # systemd (Fedora, Ubuntu, Arch, RHEL)
  sudo tee "/etc/systemd/system/$SERVICE_NAME.service" > /dev/null << UNIT
[Unit]
Description=Voxel Control Minecraft Panel
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$INSTALL_DIR/backend
ExecStart=$(which node) $INSTALL_DIR/backend/dist/index.js
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=$PORT

[Install]
WantedBy=multi-user.target
UNIT
  sudo systemctl daemon-reload
  sudo systemctl enable "$SERVICE_NAME"
  sudo systemctl start "$SERVICE_NAME"
  success "Service registered with systemd"
fi

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
success "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
success " Voxel Control installed!"
success " Panel → http://localhost:$PORT"
success " Login → admin@voxel.local / admin"
success "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
info "Commands:"
info "  mcpanel start    — start the panel"
info "  mcpanel stop     — stop the panel"
info "  mcpanel logs     — tail logs"
info "  mcpanel status   — check health"
info "  mcpanel update   — pull + rebuild"
echo ""
info "Put your server.jar in ~/minecraft/ then hit Start in the panel."
