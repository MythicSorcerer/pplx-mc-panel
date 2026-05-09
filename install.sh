#!/usr/bin/env bash
set -euo pipefail

# ── Voxel Control — installer ─────────────────────────────────────────────────
# curl -fsSL https://raw.githubusercontent.com/MythicSorcerer/pplx-mc-panel/main/install.sh | bash

REPO="https://github.com/MythicSorcerer/pplx-mc-panel.git"
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

# ── Install Docker ───────────────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
  info "Installing Docker..."
  case "$PLATFORM" in
    macos)
      error "Install Docker Desktop: https://docker.com/products/docker-desktop" ;;
    fedora)
      sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin ;;
    ubuntu)
      sudo apt-get update && sudo apt-get install -y docker.io docker-compose ;;
    arch)
      sudo pacman -Sy --noconfirm docker docker-compose ;;
    linux)
      error "Please install Docker manually: https://docs.docker.com/engine/install" ;;
  esac
  case "$PLATFORM" in
    fedora|ubuntu|arch) sudo systemctl enable --now docker ;;
  esac
fi
if command -v docker &>/dev/null; then success "Docker $(docker --version | cut -d' ' -f3 | cut -d',' -f1) ready"; fi

# ── Clone or update repo ──────────────────────────────────────────────────────
if [[ -d "$INSTALL_DIR/.git" ]]; then
  info "Updating existing installation at $INSTALL_DIR..."
  git -C "$INSTALL_DIR" pull --ff-only
else
  info "Cloning to $INSTALL_DIR..."
  git clone "$REPO" "$INSTALL_DIR"
fi


# ── Credentials ───────────────────────────────────────────────────────────────
if [[ -f "$INSTALL_DIR/backend/.env" ]]; then
  info "Using existing credentials from $INSTALL_DIR/backend/.env"
  source <(grep -E "^(ADMIN_EMAIL|ADMIN_PASSWORD|SESSION_SECRET)=" "$INSTALL_DIR/backend/.env")
else
  echo ""
  warn "Set your login credentials (stored locally, never committed)"
  read -rp "  Admin email   [admin@voxel.local]: " ADMIN_EMAIL
  ADMIN_EMAIL="${ADMIN_EMAIL:-admin@voxel.local}"
  read -rsp "  Admin password: " ADMIN_PASSWORD; echo
  while [[ ${#ADMIN_PASSWORD} -lt 8 ]]; do
    warn "Password must be at least 8 characters"
    read -rsp "  Admin password: " ADMIN_PASSWORD; echo
  done
  SESSION_SECRET=$(openssl rand -base64 32)
  cat > "$INSTALL_DIR/backend/.env" << ENVEOF
ADMIN_EMAIL=$ADMIN_EMAIL
ADMIN_PASSWORD=$ADMIN_PASSWORD
SESSION_SECRET=$SESSION_SECRET
ENVEOF
  chmod 600 "$INSTALL_DIR/backend/.env"
  success "Credentials saved to $INSTALL_DIR/backend/.env"
fi

# ── Build ─────────────────────────────────────────────────────────────────────
info "Installing backend dependencies..."
cd "$INSTALL_DIR/backend" && npm install --production=false

# ── Install Docker image ───────────────────────────────────────────────────
MC_DIR="${MC_DIR:-$HOME/minecraft}"
if [[ -f "$MC_DIR/server.jar" ]]; then
  info "Building MC server Docker image..."
  cd "$INSTALL_DIR"
  docker build -f Dockerfile.mcserver -t mcserver:latest . || warn "Docker build failed"
  docker volume create mc-data 2>/dev/null || true
  success "MC Docker image ready"
else
  warn "No server.jar found in $MC_DIR"
  info "Download from papermc.io or purpurmc.org and put in $MC_DIR/"
fi

# ── Install PM2 ───────────────────────────────────────────────────────────────
if ! command -v pm2 &>/dev/null; then
  info "Installing PM2..."
  sudo npm install -g pm2
fi
success "PM2 ready"

# ── Build ─────────────────────────────────────────────────────────────────────
info "Installing backend dependencies..."
cd "$INSTALL_DIR/backend" && npm install --production=false

info "Installing frontend dependencies..."
cd "$INSTALL_DIR/client" && npm install

info "Building frontend..."
npm run build

info "Building backend..."
cd "$INSTALL_DIR/backend" && npm run build

# ── Start with PM2 ───────────────────────────────────────────────────────
cd "$INSTALL_DIR/backend"
export NODE_ENV=production
export PORT=$PORT
pm2 start dist/index.js --name mc-panel-backend || pm2 restart mc-panel-backend
pm2 save

# ── Done ──────────────────────────────────────────────────────────────────
echo ""
success "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
success " Voxel Control installed!"
success " Panel → http://localhost:$PORT"
success " Login → admin@voxel.local / [your password]"
success " MC Server → localhost:25565"
success "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
info "Commands:"
info "  pm2 status           — check panel status"
info "  pm2 logs            — view logs"
info "  pm2 restart mc-panel-backend — restart panel"
echo ""
info "Next: Open panel → Software → Install server → Start"
