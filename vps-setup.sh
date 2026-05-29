#!/bin/bash

# ==============================================================================
# CryptoEdge AI Bot - VPS Setup and Hardening Script
# ==============================================================================
# Target OS: Ubuntu 22.04 LTS / 24.04 LTS
# Usage: sudo bash vps-setup.sh
# ==============================================================================

set -euo pipefail

# Style Outputs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 1. Root Check
if [ "$EUID" -ne 0 ]; then
  log_error "Please run this script as root (use 'sudo bash vps-setup.sh')"
  exit 1
fi

log_info "Initializing CryptoEdge VPS Migration Preparation..."

# 2. Package updates
log_info "Updating system package repositories..."
apt-get update -y && apt-get upgrade -y

# 3. Installing Essentials
log_info "Installing administrative helpers, firewall, and Fail2ban..."
apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    ufw \
    fail2ban \
    git \
    wget

# 4. Installing official Docker Engine
log_info "Pruning old docker versions if present..."
apt-get remove -y docker docker-engine docker.io containerd runc || true

log_info "Configuring Docker official APT repository..."
if [ ! -f /etc/apt/keyrings/docker.gpg ]; then
  mkdir -p /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
fi

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

log_info "Installing Docker CE, CLI, and Plugins..."
apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Verify docker installation
if docker --version >/dev/null 2>&1; then
  log_success "Docker Engine installed successfully: $(docker --version)"
else
  log_error "Docker installation failed."
  exit 1
fi

# 5. Configuring local UFW (Uncomplicated Firewall)
log_info "Configuring Uncomplicated Firewall (UFW)..."
ufw default deny incoming
ufw default allow outgoing

# Allow SSH (Default 22, update if customized)
log_info "Allowing standard Secure Shell (SSH) port 22..."
ufw allow 22/tcp

# Allow Web Traffic
log_info "Allowing standard web traffic (80 & 443)..."
ufw allow 80/tcp
ufw allow 443/tcp

# Allow local app port if needed for testing (3000)
log_warn "Allowing port 3000 for direct bot connections. In production, wrap this with Nginx."
ufw allow 3000/tcp

# Enable Firewall
log_info "Enabling UFW..."
echo "y" | ufw enable
ufw status verbose

# 6. Fail2ban setup for SSH
log_info "Configuring Fail2ban rules for SSH protection..."
cat <<EOF > /etc/fail2ban/jail.local
[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 5
bantime = 3600
findtime = 600
EOF

systemctl restart fail2ban
log_success "Fail2ban configured and restarted."

# 7. Creating production directory structure
log_info "Setting up local bot directories..."
mkdir -p /opt/cryptoedge-bot
cd /opt/cryptoedge-bot

# 8. Generating environment files template
log_info "Creating production environment file template: /opt/cryptoedge-bot/.env"
cat <<EOF > .env
# ==============================================================================
# CryptoEdge AI Bot - VPS Production Secrets
# ==============================================================================

# Gemini Core AI Keys
GEMINI_API_KEY=""

# General Server Parameters
APP_URL="http://your-vps-static-ip:3000"
PORT=3000

# Firebase Database Project Alignment
FIREBASE_PROJECT_ID=""
FIRESTORE_DATABASE_ID=""
EOF

log_success "VPS Hardening & Prep Complete! Dependencies are deployed."
echo "--------------------------------------------------------"
echo -e "${GREEN}NEXT STEPS:${NC}"
echo "1. Export your CryptoEdge code to /opt/cryptoedge-bot"
echo "2. Populate your secrets inside '/opt/cryptoedge-bot/.env'"
echo "3. Save your Firebase Service Account JSON file as '/opt/cryptoedge-bot/service-account.json'"
echo "4. Launch everything with: docker compose up -d --build"
echo "5. Troubleshoot logs with: docker compose logs -f"
echo "--------------------------------------------------------"
