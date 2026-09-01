# DocSetuAI — Deployment Guide

---

## 🌐 Live Cloud Deployments

| Component | Platform | URL / Identifier |
|-----------|----------|-----------------|
| **Backend API** | Google Cloud Run (`us-central1`) | [`https://docsetuai-api-z5nen6wcxq-uc.a.run.app`](https://docsetuai-api-z5nen6wcxq-uc.a.run.app/health) |
| **Health Check** | Google Cloud Run | [`https://docsetuai-api-z5nen6wcxq-uc.a.run.app/health`](https://docsetuai-api-z5nen6wcxq-uc.a.run.app/health) |
| **Failover Service** | AWS App Runner (`ap-south-1`) | `arn:aws:apprunner:ap-south-1:915275803099:service/docsetuai-api` |
| **Web UI (Live App)** | Vercel Edge CDN | [`https://docsetuai.vercel.app`](https://docsetuai.vercel.app) |

---

## ⚡ Multi-Cloud Makefile Commands

```bash
# 1. Sync environment variables across all cloud targets
make env:sync

# 2. Deploy to Google Cloud Run
make deploy:gcp

# 3. Deploy to AWS App Runner
make deploy:aws

# 4. Deploy Next.js Web App to Vercel
make deploy:vercel

# 5. Full Multi-Cloud Release
make deploy:all
```

---

## 1. Local Development

### Prerequisites

| Tool | Minimum Version |
|------|----------------|
| Node.js | 18.18.0 |
| pnpm | 9.x |
| Docker (optional) | 24.x |

### Setup

```bash
git clone https://github.com/sonurust/DocSetuAI.git
cd DocSetuAI
pnpm install

cp .env.example .env
# Edit .env — see Environment Variables below
```

### Running in Demo Mode (no cloud account needed)

```bash
# .env: RUNTIME_MODE=demo
pnpm run dev:api   # API on port 4000
pnpm run dev:web   # Web on port 3000
```

Open http://localhost:3000. Create a task and run it — full pipeline executes with mock LLM.

### Running with Live Gemini

```bash
# .env:
# RUNTIME_MODE=cloud
# GOOGLE_API_KEY=your_gemini_api_key
# GEMINI_MODEL=gemini-3.6-flash

pnpm run dev:api
pnpm run dev:web
```

Gemini will generate real execution plans and personalized payment messages.

### Running with Firestore

```bash
# .env:
# RUNTIME_MODE=cloud
# GOOGLE_CLOUD_PROJECT=your-gcp-project-id
# FIRESTORE_DATABASE=(default)

# Authenticate:
gcloud auth application-default login
# or set GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json

pnpm run dev:api
```

All tasks, approvals, activities, and customer memory will persist to Cloud Firestore.

---

## 2. Docker

```bash
# Build and run all services
docker-compose up --build

# API: http://localhost:4000
# Web: http://localhost:3000
```

### docker-compose.yml summary

- `web` service: Next.js on port 3000
- `api` service: Express on port 4000
- Both services read from shared `.env`

---

## 3. Google Cloud Deployment (Cloud Run + Firestore + Pub/Sub)

Google Cloud hosts the backend API, real-time SSE streaming, Firestore state persistence, and Pub/Sub event bus.

### Quick PowerShell One-Liner

```powershell
pwsh -File scripts/deploy-gcp.ps1
# Or via npm script:
pnpm run deploy:gcp
```

### Manual / Makefile Deployment

```bash
cd infrastructure/google-cloud

# Full first-time setup (IAM + Secrets + PubSub + Firestore + Cloud Run)
make all

# Subsequent API deployments:
make deploy

# Deploy Firestore Security Rules & Composite Indexes:
make deploy-firestore
```

---

## 4. AWS App Runner Deployment (API Backend)

DocSetuAI API can run seamlessly on AWS App Runner with Amazon ECR for container image hosting.

### Quick PowerShell One-Liner

```powershell
pwsh -File scripts/deploy-aws.ps1
# Or via npm script:
pnpm run deploy:aws
```

### Configuration: `infrastructure/aws-apprunner.json`

- **Port**: `8080` (container default)
- **CPU/Memory**: 1 vCPU / 2 GB
- **Health Check**: `HTTP /health` (interval: 10s, timeout: 5s)
- **ECR Registry**: Automatically authenticated and pushed via AWS CLI

---

## 5. Vercel Next.js Deployment (Frontend Web App)

The Next.js 14 App Router frontend (`apps/web`) deploys globally on Vercel with automatic edge routing to the API backend.

### Quick PowerShell One-Liner

```powershell
# Preview deployment
pwsh -File scripts/deploy-vercel.ps1

# Production deployment
pwsh -File scripts/deploy-vercel.ps1 -Prod
# Or via npm script:
pnpm run deploy:vercel
```

### Vercel Project Setup

1. Import the Git repository in Vercel.
2. The root `vercel.json` automatically configures the monorepo build:
   - **Build Command**: `pnpm run build:libs && pnpm --filter @docsetuai/web build`
   - **Output Directory**: `apps/web/.next`
3. Set the environment variable in Vercel Project Settings:
   - `NEXT_PUBLIC_API_URL`: URL of your Google Cloud Run or AWS App Runner service.

---

## 6. Unified Multi-Cloud Release Pipeline

Deploy to all targets simultaneously with release gate verification:

```powershell
# Deploy all targets (GCP + AWS + Vercel)
pwsh -File scripts/release.ps1 -Prod
# Or via npm script:
pnpm run release

# Deploy specific target:
pwsh -File scripts/release.ps1 -Target GCP
pwsh -File scripts/release.ps1 -Target AWS
pwsh -File scripts/release.ps1 -Target Vercel
```

## 7. Environment Variables Reference

| Variable | Demo mode | Cloud mode | Description |
|----------|-----------|------------|-------------|
| `RUNTIME_MODE` | `demo` | `cloud` | Controls adapter selection |
| `GOOGLE_API_KEY` | Not needed | **Required** | Gemini API key from Google AI Studio |
| `GEMINI_MODEL` | Not needed | `gemini-3.6-flash` | Model name |
| `GOOGLE_CLOUD_PROJECT` | Not needed | **Required** | GCP project ID for Firestore |
| `GOOGLE_CLOUD_LOCATION` | Not needed | `us-central1` | Region |
| `FIRESTORE_DATABASE` | Not needed | `(default)` | Firestore DB name |
| `PUBSUB_TOPIC` | Not needed | `docsetuai-task-events` | Pub/Sub topic name |
| `API_KEY` | Not needed | **Required** | API authentication secret key |
| `PORT` | `4000` | `8080` (container) | API listen port |
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000` | Cloud Run / App Runner URL | Frontend API base URL |
| `SMTP_HOST` | Optional | Optional | If set, email dispatch is logged via SMTP |
| `SENDGRID_API_KEY` | Optional | Optional | If set, email dispatch is logged via SendGrid |

---

## 8. Secrets Management

**Never commit `.env` to Git.** `.env` is in `.gitignore`.

For Cloud Run, use Google Secret Manager:

```bash
# Create secrets
echo -n "your-gemini-key" | gcloud secrets create google-api-key --data-file=-

# Grant Cloud Run access
gcloud secrets add-iam-policy-binding google-api-key \
  --member=serviceAccount:YOUR_SA@YOUR_PROJECT.iam.gserviceaccount.com \
  --role=roles/secretmanager.secretAccessor
```

---

## 9. Running Tests

```bash
# All tests
pnpm test

# Watch mode
pnpm test -- --watch

# Coverage
pnpm test -- --coverage
```

Tests are in `apps/api/src/__tests__/`:
- `agents.test.ts` — Task store, approval flow, stats
- `tools.test.ts` — Tool validation

---

## 10. Build Verification

```bash
# TypeScript check
pnpm run typecheck

# Production build (web)
cd apps/web && pnpm build

# Production build (api)
cd apps/api && pnpm build
```
