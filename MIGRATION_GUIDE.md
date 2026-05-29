# CryptoEdge AI Bot: Ubuntu VPS High-Performance Migration Guide

This guide details the end-to-end process of migrating the **CryptoEdge AI Bot** trading engine from a serverless Google Cloud Run environment (our sandbox preview) to a dedicated, low-latency **Ubuntu Virtual Private Server (VPS)** with a static public IP.

Migrating to a VPS ensures **24/7 continuous uptime**, **sub-millisecond local network connections** to cryptocurrency exchange API gateways, and **persistent active websocket channels** that never scale to zero or drop execution triggers.

---

## Direct Deployment Files Included
We have bootstrapped and saved the following production files in your workspace root:
1. `Dockerfile`: A multi-stage Docker build optimizing both Vite visual output and the Node/Express backend on Alpine base layers.
2. `docker-compose.yml`: Coordinates services, environment parameters, resource bounds, and automated API healthchecks.
3. `vps-setup.sh`: An automated Bash utility to harden Ubuntu, set up UFW firewalls, configure Bruteforce limits (Fail2ban), and install the latest Docker engine from upstream repositories.

---

## Step 1: Provisioning and Aligning the VPS
Choose a reputable cloud provider (DigitalOcean, Linode/Akamai, Vultr, AWS, or GCP Compute Engine) matching these recommended specs:

*   **Virtual CPUs**: 2 vCPUs minimum (handles concurrent real-time candle analyses and active websocket parsing).
*   **Memory**: 4GB RAM (provides head-room for compiling build pipelines and memory-bound bot operations).
*   **Operating System**: **Ubuntu 22.04 LTS** or **Ubuntu 24.04 LTS**.
*   **Static IPv4 Allocation**: Crucial point. Ensure the provider assigns a **Static, Dedicated IP** that will never cycle on reboot.

---

## Step 2: System Hardening and SSH Key Authentication

The foremost risk of a self-managed VPS is network intrusions. Secure your VPS immediately on acquisition:

### A. Disable SSH Password Authentication (Keys Only)
1. On your local machine, generate a modern cryptographic key matching ed25519 standard:
   ```bash
   ssh-keygen -t ed25519 -C "admin@cryptoedge-trader"
   ```
2. Export your custom public key to your new server:
   ```bash
   ssh-copy-id -i ~/.ssh/id_ed25519.pub root@<YOUR_VPS_STATIC_IP>
   ```
3. Establish a standard SSH terminal session:
   ```bash
   ssh root@<YOUR_VPS_STATIC_IP>
   ```
4. Edit the master secure shell config:
   ```bash
   sudo nano /etc/ssh/sshd_config
   ```
5. Modify or assert the following rules to completely shut out brute password bots:
   ```text
   PubkeyAuthentication yes
   PasswordAuthentication no
   PermitRootLogin no
   # Optional: Change default SSH port from 22 to a random high port (e.g. 54222)
   # Port 54222
   ```
6. Force SSH service reload to apply modifications safely:
   ```bash
   sudo systemctl restart sshd
   ```

### B. Run the Setup & Hardening Automation
Copy down the pre-built script `vps-setup.sh` or clone your workspace into `/opt/cryptoedge-bot` on the VPS. Make the script executable and execute it under privilege:
```bash
sudo chmod +x vps-setup.sh
sudo ./vps-setup.sh
```
This utility automatically:
*   Installs dependencies and core libraries.
*   Deploys **UFW (Uncomplicated Firewall)**, denying all ports, then whitelisting only SSH, HTTPS, HTTP, and port 3000.
*   Provisions **Fail2ban** daemon to catch and block brute-force scanners on active ports.
*   Installs authentic **Docker CE** engines.

---

## Step 3: Firebase authentication & Real-time Sync Setup

When running client-side inside Google Cloud Run, app instances inherit default IAM credentials of the environment. Running on a VPS requires manual declaration of a **Firebase Service Account JSON** configuration.

### A. Download Service Account Credentials
1. Navigate to your **Firebase Console**.
2. Click the gear icon next to **Project Overview** -> **Project Settings**.
3. Move to the **Service accounts** tab.
4. Select **Node.js** and click **Generate new private key**.
5. Save the resulting file securely on your computer as `service-account.json`.

### B. Configure Firebase Client Metadata
Ensure that you copy your existing `firebase-applet-config.json` (which links Firestore database parameters and Auth endpoints) and place it directly into the directory `/opt/cryptoedge-bot/` on the VPS alongside your source files.

---

## Step 4: Whitelisting VPS Static IP on Binance API Dashboard

One of the largest benefits of this migration is that we can now **totally restrict** your custom Exchange API Keys to execute solely from your VPS's secure static IP. Even if someone gains access to your keys, they will be powerless to execute orders or withdraw funds from unauthorized IPs.

1. Authenticate to your **Binance Account / Exchange Developer Portal**.
2. Navigate to **API Management**.
3. Locate your active API keys or create new ones for bot execution.
4. Find the section titled **IP Access Restrictions** (often defaults to "Unrestricted" - a massive security risk for live capital).
5. Switch the flag to **Restrict access to trusted IPs only (Recommended)**.
6. Copy your VPS's public IPv4 Address and paste/input it in the whitelisted fields.
7. Under API Permissions: Check **Enable Reading** and **Enable Spot & Margin Trading**. **NEVER check "Enable Withdrawals"** (this blocks any withdrawal attempts, securing your core wallets).
8. Save changes and confirm with your Two-Factor Authentication.

---

## Step 5: Setting Up Environment Variables
Inside the root directory `/opt/cryptoedge-bot/`, prepare a production `.env` file containing:

```env
# ==============================================================================
# CryptoEdge AI Bot - Hardened Production Environments
# ==============================================================================

# Core Gemini AI Key
GEMINI_API_KEY="AIzaSyYourGeminiProKeyHere"

# Server Parameters
APP_URL="https://your-domain.com" # Or Use "http://YOUR_VPS_STATIC_IP:3000"
PORT=3000

# Firebase Database Identifiers
FIREBASE_PROJECT_ID="your-firebase-project-id"
FIRESTORE_DATABASE_ID="your-firestore-db-id"
```

---

## Step 6: Deploying the Container Stack
With files placed in `/opt/cryptoedge-bot/`, you can launch the container orchestration stack built by our preconfigured files:

```bash
# 1. Clean build and download dependencies inside the multi-stage layer
docker compose build --no-cache

# 2. Spin up containers in background detached daemon mode
docker compose up -d
```

### Checking Bot Stability and Streaming Output
You can inspect the system output and verify the bot is correctly talking to Firebase, parsing real-time candle indexes, and evaluating strategies on Binance using CCXT:
```bash
# View active live logs from trading backend server container
docker compose logs -f --tail=100
```

---

## Step 7: Continuous Process Monitoring & High-Availability

An auto-restart system is critical to prevent trading blackouts:
1. **Container Auto-Restart**: The `restart: unless-stopped` directive in `docker-compose.yml` ensures that the Docker daemon will automatically spin up the bot on system reboots or runtime errors.
2. **Health Check Probes**: The mapped `healthcheck` segment queries the app's Express port `/api/health` every 30 seconds. If the application freezes or the websocket streams lock up, Docker identifies it as "unhealthy" and forcefully recreates the execution environment.
3. **Log Rotation**: We configured standard `json-file` logging limits directly inside the compose block (`max-size: "20m"`, `max-file: "5"`). This prevents trading streams from filling up the partition disk space on the VPS over months of activity.
