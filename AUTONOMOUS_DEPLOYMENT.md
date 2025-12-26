# Autonomous Deployment Agent - Complete Guide

## Problem Solved

**Before:** Manual verification required when you're tired/busy → projects stuck at 90%  
**After:** Agent runs verification autonomously → wake up to deployed or detailed error log

---

## What It Does

The Deployment Agent executes your 3-command checklist automatically:

1. ✅ **Build Test** - `npm run build`
2. ✅ **Validation** - Start dev server, hit endpoints, verify responses
3. ✅ **Deploy** - `git push` (only if validation passes)

**Result:** Either:
- ✅ Deployed to production
- ❌ Stopped with detailed error log

---

## 4 Ways to Run It

### **Option 1: Manual (Right Now)**

**Run immediately when you're ready:**

```powershell
cd E:\jit-command-center

# Dry run (validation only)
.\deploy_now.ps1 -DryRun

# Full deployment
.\deploy_now.ps1
```

**Time required:** 5-10 minutes  
**Best for:** Testing the agent, manual deploys

---

### **Option 2: Scheduled (While You Sleep)**

**Run automatically at 2 AM every night:**

#### Setup (one-time):

```powershell
# 1. Open Task Scheduler
taskschd.msc

# 2. Create Basic Task
Name: "Deploy JIT Command Center"
Trigger: Daily at 2:00 AM
Action: Start a program
  Program: powershell.exe
  Arguments: -File "E:\jit-command-center\deploy_scheduled.ps1"
  Start in: E:\jit-command-center

# 3. Optional: Add webhook for notifications
Arguments: -File "E:\jit-command-center\deploy_scheduled.ps1" -WebhookUrl "YOUR_WEBHOOK"
```

#### Configure Webhook (optional):

**Telegram:**
1. Create bot: [@BotFather](https://t.me/botfather)
2. Get webhook: `https://api.telegram.org/bot<TOKEN>/sendMessage?chat_id=<CHAT_ID>`

**Discord:**
1. Server Settings → Integrations → Webhooks
2. Copy webhook URL

**Then in Task Scheduler arguments:**
```
-File "E:\jit-command-center\deploy_scheduled.ps1" -WebhookUrl "https://api.telegram.org/bot..."
```

**Result:**
- Agent runs at 2 AM
- You wake up to Telegram/Discord message with result
- Check report JSON if failed

**Best for:** Overnight deployments, hands-off operation

---

### **Option 3: GitHub Actions (On Every Push)**

**Runs automatically when you `git push`:**

#### Setup:

```powershell
# 1. Add GitHub secrets (one-time)
# Go to: GitHub repo → Settings → Secrets → Actions

# Add these secrets:
VERCEL_TOKEN=your_vercel_token
VERCEL_PROJECT_ID=prj_xxxxxxxxxxxx
RAILWAY_TOKEN=your_railway_token
REPORT_WEBHOOK=https://api.telegram.org/bot... (optional)

# 2. Commit and push
git add .github/workflows/deploy.yml deployment_agent.py
git commit -m "Add autonomous deployment agent"
git push origin main
```

#### How it works:

```
You: git commit -m "fix bug"
You: git push
GitHub Actions: Triggered
  ├─ Checkout code
  ├─ Run build test
  ├─ Validate endpoints
  ├─ Deploy to Vercel (if clean)
  └─ Comment on commit if failed

You: Check GitHub for status
```

**Best for:** Continuous deployment, team projects

---

### **Option 4: Railway Cron (Cloud-Based)**

**Runs on Railway's servers (no local machine needed):**

#### Setup:

```powershell
# 1. Create Railway project
railway init

# 2. Set environment variables
railway variables set REPORT_WEBHOOK=https://...
railway variables set VERCEL_TOKEN=xxx
railway variables set VERCEL_PROJECT_ID=prj_xxx

# 3. Deploy
railway up
```

**Cron runs at 2 AM UTC daily**

**Best for:** No local machine, cloud-only operation

---

## Validation Rules

The agent checks:

### ✅ Build Test
- `npm run build` exits with code 0
- No TypeScript errors
- No bundling errors

### ✅ Status Endpoint
- Returns HTTP 200
- JSON includes: `vercel`, `railway`, `disk`
- All adapters report (even if degraded)

### ✅ Control Endpoint
- Returns HTTP 403 (policy blocked)
- JSON includes `decision` object with:
  - `allowed: false`
  - `reason: "Authentication required"`
  - `threatDelta: 5`
  - `actions: ["LOGIN_REQUIRED"]`

**If ANY check fails → STOP (no deployment)**

---

## Output Files

### `deployment_report.json`

```json
{
  "status": "SUCCESS",
  "deployed": true,
  "duration_seconds": 47.3,
  "validation": {
    "status_endpoint": true,
    "control_endpoint": true,
    "policy_gate": true
  },
  "logs": [
    {
      "timestamp": "2025-12-26T02:00:15",
      "level": "INFO",
      "message": "Step 1: Running build test..."
    },
    {
      "timestamp": "2025-12-26T02:00:42",
      "level": "SUCCESS",
      "message": "Build succeeded ✓"
    }
    // ... more logs
  ]
}
```

**Saved to:** `E:\jit-command-center\deployment_report.json`

---

## Error Handling

**Agent stops immediately if:**
- Build fails
- Dev server won't start
- Any endpoint validation fails
- Policy gate doesn't work correctly

**You get:**
- Detailed error in `deployment_report.json`
- Exact step where it failed
- Full log output
- No partial/broken deployment

---

## Notification Examples

### Telegram Message (Success)

```
✅ Deployment Succeeded

Project: jit-command-center
Duration: 47s
Deployed: Yes

View: https://jit-command-center.vercel.app
```

### Telegram Message (Failed)

```
❌ Deployment Failed

Reason: VALIDATION_FAILED
Failed checks:
- control_endpoint

Check report:
E:\jit-command-center\deployment_report.json
```

---

## Quick Start (Recommended Order)

**Day 1: Test Manually**
```powershell
.\deploy_now.ps1 -DryRun
```
Verify agent works correctly

**Day 2: Schedule It**
```powershell
# Set up Task Scheduler (2 AM)
```
Let it run overnight, check morning results

**Day 3: GitHub Actions** (optional)
```powershell
git push  # Auto-deploys on every push
```

---

## Troubleshooting

### "Python not found"
```powershell
# Install Python 3.10+
winget install Python.Python.3.10

# Verify
python --version
```

### "requests module not found"
```powershell
pip install requests
```

### "Dev server won't start"
```powershell
# Kill any running Node processes
Get-Process node | Stop-Process -Force

# Remove .next
Remove-Item -Recurse -Force .\.next

# Try again
.\deploy_now.ps1 -DryRun
```

### "Validation failed but looks correct"
Check `deployment_report.json` for exact failure reason

---

## Configuration

### Environment Variables (Optional)

Create `.env` for local runs:

```env
REPORT_WEBHOOK=https://api.telegram.org/bot...
VERCEL_TOKEN=xxx
VERCEL_PROJECT_ID=prj_xxx
RAILWAY_TOKEN=xxx
```

Agent will auto-load these if present.

---

## Security

✅ **Tokens never logged** - Masked in output  
✅ **Webhook URLs encrypted** in Task Scheduler  
✅ **Local validation only** - No external calls until deployment approved  
✅ **Reports stored locally** - Full audit trail

---

## Next Steps

**Right now:**
```powershell
cd E:\jit-command-center
.\deploy_now.ps1 -DryRun
```

**Tonight:**
Set up Task Scheduler → Go to bed → Wake up to deployed app

**Long term:**
GitHub Actions → Every commit auto-deploys if clean

---

**You never have to run the 3 commands manually again.**

The agent runs when you're fresh, tired, or asleep.
