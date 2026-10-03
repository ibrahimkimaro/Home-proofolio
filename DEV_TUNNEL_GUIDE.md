# Microsoft Dev Tunnel Setup & Startup Guide

This document describes the persistent **Microsoft Dev Tunnel** configured for **Home Proofolio** so your application can be accessed publicly by testers without requiring ngrok, domain purchases, or manual reconfiguration after restarts.

---

## 1. Active Persistent Tunnel Details

| Setting | Value |
| :--- | :--- |
| **Tunnel Name** | `homeproofolio` |
| **Persistent Tunnel ID** | `homeproofolio.uks1` |
| **Tester Public URL (HTTPS)** | [https://rl4whc7r-3000.uks1.devtunnels.ms](https://rl4whc7r-3000.uks1.devtunnels.ms) |
| **Alternative Port URL** | [https://rl4whc7r.uks1.devtunnels.ms:3000](https://rl4whc7r.uks1.devtunnels.ms:3000) |
| **Live Traffic Inspector** | [https://rl4whc7r-3000-inspect.uks1.devtunnels.ms](https://rl4whc7r-3000-inspect.uks1.devtunnels.ms) |
| **Forwarding Port** | `3000` (Frontend, auto-proxying `/api` to 8000 and `/socket` to 4000) |
| **Access Control** | Anonymous (No Microsoft Account required for testers) |

---

## 2. Architecture Overview

```text
Testers (No Microsoft Account Needed)
   ↓
Stable HTTPS URL: https://rl4whc7r-3000.uks1.devtunnels.ms
   ↓
Microsoft Dev Tunnel Host (`devtunnel host homeproofolio`)
   ↓
Local Machine Port 3000 (Docker Frontend)
   ├── Next.js Frontend (HTML, CSS, JS)
   ├── /api/*  ──(proxied)──> FastAPI Backend (port 8000)
   └── /socket ──(proxied)──> Phoenix Realtime Chat & WebRTC (port 4000)
```

Because Next.js on port 3000 already proxies `/api/*` to the FastAPI backend and `/socket` to the Phoenix realtime chat server, **exposing port 3000 provides testers with full access to the entire application** (frontend, backend API, live messaging, and call signaling).

---

## 3. How to Start / Stop the Tunnel

### Option A: One-Click Launcher (Recommended)
Double-click:
```bat
scripts\start-devtunnel.bat
```
This batch script connects to your persistent `homeproofolio` tunnel and begins hosting port 3000 immediately.

### Option B: Command Line (CLI)
From your project root:
```bash
tools\devtunnel host homeproofolio
```

---

## 4. Key Notes for Testers
1. When testers open the link in their browser for the first time, Microsoft may display a security disclaimer:  
   *"You are about to connect to a developer tunnel... Click Continue to proceed."*  
   They only need to click **"Continue"** once to enter the site.
2. Testers **do not need a Microsoft or GitHub account**. Access is public and anonymous.
3. Even if your Docker containers restart or your PC reboots, the tunnel identity and URL remain the same. Just run `scripts\start-devtunnel.bat` whenever you want to open public access.
