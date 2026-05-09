#!/usr/bin/env bash
set -euo pipefail

# ── Voxel Control — Installer ───────────────────────────────────────────────
# curl -fsSL https://raw.githubusercontent.com/MythicSorcerer/pplx-mc-panel/main/install.sh | bash

REPO="https://github.com/MythicSorcerer/pplx-mc-panel.git"
INSTALL_DIR="${INSTALL_DIR:-$HOME/.voxel-control}"
STEP=0
TOTAL_STEPS=8

# Colors
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; CYAN='\033[0;36m'; NC='\033[0m'

log() { echo -e "$@"; }
step() { STEP=$((STEP+1)); echo ""; echo -e "${CYAN}━━━ Step [${STEP}/${TOTAL_STEPS}] ━━━${NC} $1"; }
yesno() { read -p "  → $1 [y/n]: " yn; [[ "$yn" =~ ^[Yy] ]]; }
ask() { read -p "  → $1: " val; echo "$val"; }
warn() { echo -e "${YELLOW}  ⚠ $*${NC}"; }
error() { echo -e "${RED}  ✗ $*${NC}"; exit 1; }
success() { echo -e "${GREEN}  ✓ $*${NC}"; }
need_pass() { echo -e "${YELLOW}  🔐 $1${NC}"; }

#############################################
# Step 1: Detect OS
#############################################
step "Detecting operating system"
OS="$(uname -s)"
case "$OS" in
  Darwin) PLATFORM="macOS" ;;
  Linux)
    if command -v dnf &>/dev/null; then PLATFORM="Fedora"
    elif command -v apt &>/dev/null; then PLATFORM="Ubuntu"
    elif command -v pacman &>/dev/null; then PLATFORM="Arch"
    else PLATFORM="Linux"; fi ;;
  CYGWIN*|MINGW*|MSYS*) PLATFORM="Windows"; ;;
  *) PLATFORM="Unknown"; ;;
esac

log "Detected: ${PLATFORM} (${OS})"
if yesno "Is this correct?"; then
  :
else
  log "Select your platform:"
  echo "  1) macOS"
  echo "  2) Ubuntu / Debian"
  echo "  3) Fedora / RHEL"
  echo "  4) Arch Linux"
  echo "  5) Windows (WSL)"
  read -p "  → Choice [1-5]: " choice
  case "$choice" in
    1) PLATFORM="macOS" ;;
    2) PLATFORM="Ubuntu" ;;
    3) PLATFORM="Fedora" ;;
    4) PLATFORM="Arch" ;;
    5) PLATFORM="Windows" ;;
  esac
fi
success "Using: ${PLATFORM}"

#############################################
# Step 2: Check/install Node.js
#############################################
step "Checking Node.js and NPM"
if ! command -v node &>/dev/null; then
  warn "Node.js not found"
  if yesno "Install Node.js now?"; then
    case "$PLATFORM" in
      macOS)
        if command -v brew &>/dev/null; then
          need_pass "Installing via Homebrew (requires sudo)"
          brew install node
        else
          error "Homebrew not found. Install from https://brew.sh first"
        fi ;;
      Ubuntu)
        need_pass "Installing Node.js 20.x (requires sudo)"
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y nodejs ;;
      Fedora)
        need_pass "Installing Node.js (requires sudo)"
        sudo dnf module enable nodejs:20 -y
        sudo dnf install -y nodejs npm ;;
      Arch)
        need_pass "Installing Node.js (requires sudo)"
        sudo pacman -Sy --noconfirm nodejs npm ;;
      Windows)
        error "Use WSL or install Node.js manually from nodejs.org" ;;
    esac
  else
    error "Node.js is required"
  fi
else
  success "Node.js $(node -v) found"
fi

if ! command -v npm &>/dev/null; then
  warn "NPM not found"
  if yesno "Install NPM now?"; then
    case "$PLATFORM" in
      Fedora) sudo dnf install -y npm ;;
      *) npm install -g npm ;;
    esac
  fi
fi
success "NPM $(npm -v) ready"

#############################################
# Step 3: Select process manager
#############################################
step "Selecting process manager"
PM=""
case "$PLATFORM" in
  macOS|Fedora|Arch)
    if command -v pm2 &>/dev/null; then
      success "PM2 $(pm2 --version | head -1) found"
      if yesno "Use PM2?"; then PM="pm2"; else PM=""; fi
    else
      warn "PM2 not found"
      if yesno "Install PM2 now?"; then
        need_pass "Installing PM2 globally (requires sudo)"
        sudo npm install -g pm2
        PM="pm2"
      else
        error "PM2 required"
      fi
    fi ;;
  Ubuntu)
    echo "Select process manager:"
    echo "  1) PM2 (recommended for Node.js)"
    echo "  2) systemd (systemctl)"
    read -p "  → Choice [1-2]: " pm_choice
    case "$pm_choice" in
      1)
        if command -v pm2 &>/dev/null; then
          success "PM2 found"
          PM="pm2"
        else
          need_pass "Installing PM2 (requires sudo)"
          sudo npm install -g pm2
          PM="pm2"
        fi ;;
      2)
        if command -v systemctl &>/dev/null; then
          success "systemd found"
          PM="systemd"
        else
          error "systemd not available"
        fi ;;
    esac ;;
  Windows)
    if command -v pm2 &>/dev/null; then
      success "PM2 found"
      PM="pm2"
    else
      need_pass "Installing PM2"
      npm install -g pm2
      PM="pm2"
    fi ;;
esac
[[ -n "$PM" ]] && success "Using: ${PM}" || warn "No process manager selected"

#############################################
# Step 4: Check Docker
#############################################
step "Checking Docker"
if ! command -v docker &>/dev/null; then
  warn "Docker not found"
  if yesno "Install Docker now?"; then
    case "$PLATFORM" in
      macOS)
        error "Install Docker Desktop: https://docker.com/products/docker-desktop" ;;
      Ubuntu)
        need_pass "Installing Docker (requires sudo)"
        sudo apt-get update
        sudo apt-get install -y docker.io docker-compose ;;
      Fedora)
        need_pass "Installing Docker (requires sudo)"
        sudo dnf install -y docker docker-compose ;;
      Arch)
        need_pass "Installing Docker (requires sudo)"
        sudo pacman -Sy --noconfirm docker docker-compose ;;
      Windows)
        error "Install Docker Desktop for Windows with WSL2" ;;
    esac
    [[ "$PLATFORM" != "macOS" ]] && sudo systemctl enable --now docker 2>/dev/null || true
  else
    warn "Docker is optional but required for containerized MC server"
  fi
fi
command -v docker &>/dev/null && success "Docker ready" || warn "Docker not available - MC server will run natively"

#############################################
# Step 5: Clone/install panel
#############################################
step "Installing Voxel Control panel"
if [[ -d "$INSTALL_DIR/.git" ]]; then
  log "Updating existing installation..."
  git -C "$INSTALL_DIR" pull --ff-only 2>/dev/null || warn "Update failed, using existing"
  success "Panel directory ready: $INSTALL_DIR"
else
  log "Cloning repository..."
  git clone "$REPO" "$INSTALL_DIR"
  success "Cloned to: $INSTALL_DIR"
fi

#############################################
# Step 6: Setup credentials
#############################################
step "Setting up admin credentials"
CREDS_FILE="$INSTALL_DIR/backend/.env"
if [[ -f "$CREDS_FILE" ]]; then
  source "$CREDS_FILE"
  success "Using existing credentials"
else
  ADMIN_EMAIL="$(ask "Admin email")"
  ADMIN_EMAIL="${ADMIN_EMAIL:-admin@voxel.local}"
  
  while true; do
    ADMIN_PASSWORD="$(ask "Admin password (min 8 chars)")"
    if [[ ${#ADMIN_PASSWORD} -ge 8 ]]; then
      break
    fi
    warn "Password must be at least 8 characters"
  done
  
  SESSION_SECRET="$(openssl rand -base64 32 2>/dev/null || echo "change-me-$(date +%s)${RANDOM}")"
  
  cat > "$CREDS_FILE" << EOF
ADMIN_EMAIL=$ADMIN_EMAIL
ADMIN_PASSWORD=$ADMIN_PASSWORD
SESSION_SECRET=$SESSION_SECRET
PORT=3000
NODE_ENV=production
MC_DIR=$HOME/minecraft
MC_CPUS=2
MC_MEM=3G
EOF
  chmod 600 "$CREDS_FILE"
  success "Credentials saved"
fi

#############################################
# Step 7: Build panel
#############################################
step "Building Voxel Control"
cd "$INSTALL_DIR/backend"
log "Installing backend dependencies..."
npm install --production=false >/dev/null 2>&1
log "Building backend..."
npm run build >/dev/null 2>&1
success "Backend built"

cd "$INSTALL_DIR/client"
log "Installing frontend dependencies..."
npm install >/dev/null 2>&1
log "Building frontend..."
npm run build >/dev/null 2>&1
success "Frontend built"

#############################################
# Step 8: Start panel
#############################################
step "Starting panel"
case "$PM" in
  pm2)
    cd "$INSTALL_DIR/backend"
    pm2 start dist/index.js --name mc-panel-backend
    pm2 save
    success "Panel started with PM2" ;;
  systemd)
    need_pass "Creating systemd service (requires sudo)"
    sudo tee /etc/systemd/system/mc-panel.service >/dev/null << EOF
[Unit]
Description=Voxel Control Panel
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$INSTALL_DIR/backend
ExecStart=$(command -v node) dist/index.js
Restart=always

[Install]
WantedBy=multi-user.target
EOF
    sudo systemctl daemon-reload
    sudo systemctl enable --now mc-panel
    success "Panel started with systemd" ;;
  *)
    cd "$INSTALL_DIR/backend"
    node dist/index.js &
    success "Panel started in background"
    log "Warning: No process manager. Use 'node dist/index.js' to restart manually."
    ;;
esac

#############################################
# Final: Ask about MC server
#############################################
log ""
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "  Installation complete!"
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log ""

if yesno "Install and start a Minecraft server?"; then
  log ""
  log "Select server software:"
  echo "  1) Paper (recommended)"
  echo "  2) Purpur"
  echo "  3) Fabric"
  read -p "  → Choice [1-3]: " srv_choice
  
  case "$srv_choice" in
    1) SERVER_TYPE="paper" ;;
    2) SERVER_TYPE="purpur" ;;
    3) SERVER_TYPE="fabric" ;;
    *) SERVER_TYPE="paper" ;;
  esac
  
  MC_DIR="$HOME/minecraft"
  mkdir -p "$MC_DIR"
  
  log ""
  log "Downloading ${SERVER_TYPE^} server..."
  # This would typically use the panel's API to fetch version list and download
  # For now, just a placeholder
  log "Open http://localhost:3000 → Software → Install to download server"
fi

echo ""
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log ""
log "  Panel URL:    ${CYAN}http://localhost:3000${NC}"
log "  Login:       ${CYAN}$ADMIN_EMAIL${NC}"
log ""
log "Useful commands:"
case "$PM" in
  pm2)
    log "  pm2 status            - Check status"
    log "  pm2 logs             - View logs"
    log "  pm2 restart mc-panel-backend - Restart" ;;
  systemd)
    log "  systemctl status mc-panel  - Check status"
    log "  journalctl -u mc-panel - View logs"
    log "  systemctl restart mc-panel - Restart" ;;
esac
log ""
log "Next: Open http://localhost:3000"
log ""