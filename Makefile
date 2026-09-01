# ==============================================================================
# DocSetuAI — Master Multi-Cloud Makefile
# Autonomous AI Business Operations Platform
# Powered by Google Gemini 3.6 Flash
# ==============================================================================

SHELL := pwsh
.SHELLFLAGS := -NoProfile -Command
.DEFAULT_GOAL := help

# ── Configuration Variables ──────────────────────────────────────────────────
GCP_PROJECT     ?= docsetuai-35894
GCP_REGION      ?= us-central1
AWS_PROFILE     ?= auth-setu
AWS_REGION      ?= ap-south-1
API_URL         ?= https://docsetuai-api-z5nen6wcxq-uc.a.run.app

# ── Help ─────────────────────────────────────────────────────────────────────
.PHONY: help
help:
	@Write-Host "=================================================================" -ForegroundColor Cyan
	@Write-Host "  DocSetuAI — Multi-Cloud Operations & Deployment Commands" -ForegroundColor Cyan
	@Write-Host "=================================================================" -ForegroundColor Cyan
	@Write-Host "Development & Build:" -ForegroundColor Yellow
	@Write-Host "  make dev             - Start API (4000) and Web (3000) locally"
	@Write-Host "  make build           - Build all shared packages & applications"
	@Write-Host "  make typecheck       - Typecheck all 4 workspace packages"
	@Write-Host "  make test            - Run all unit and integration tests"
	@Write-Host ""
	@Write-Host "Environment Synchronization (Required Before First Deploy):" -ForegroundColor Yellow
	@Write-Host "  make env:sync        - Sync .env to Google Cloud Run, AWS & Vercel"
	@Write-Host "  make env:gcp         - Update environment variables on Google Cloud Run"
	@Write-Host "  make env:aws         - Update environment variables on AWS App Runner"
	@Write-Host "  make env:vercel      - Update environment variables for Vercel Web"
	@Write-Host ""
	@Write-Host "Deployment Pipelines:" -ForegroundColor Yellow
	@Write-Host "  make deploy:gcp      - Build & Deploy API to Google Cloud Run"
	@Write-Host "  make deploy:aws      - Build & Deploy API to AWS App Runner (ECR)"
	@Write-Host "  make deploy:vercel   - Deploy Next.js Web App to Vercel (Production)"
	@Write-Host "  make deploy:all      - Full Multi-Cloud Release (Sync Env + All Clouds)"
	@Write-Host "=================================================================" -ForegroundColor Cyan

# ── Local Development & Testing ──────────────────────────────────────────────
.PHONY: dev
dev:
	pnpm run build:libs
	pwsh -Command "Start-Process pwsh -ArgumentList '-NoExit', '-Command', 'pnpm --filter @docsetuai/api run dev'; pnpm --filter @docsetuai/web run dev"

.PHONY: build
build:
	pnpm run build:libs
	pnpm --filter @docsetuai/api run build
	pnpm --filter @docsetuai/web build

.PHONY: typecheck
typecheck:
	pnpm run typecheck

.PHONY: test
test:
	pnpm test

# ── Environment Variables Synchronization ────────────────────────────────────
.PHONY: env\:sync
env\:sync:
	pwsh -File scripts/sync-env.ps1 -Target All -GcpProject $(GCP_PROJECT) -GcpRegion $(GCP_REGION) -AwsProfile $(AWS_PROFILE) -AwsRegion $(AWS_REGION) -ApiUrl $(API_URL)

.PHONY: env\:gcp
env\:gcp:
	pwsh -File scripts/sync-env.ps1 -Target GCP -GcpProject $(GCP_PROJECT) -GcpRegion $(GCP_REGION)

.PHONY: env\:aws
env\:aws:
	pwsh -File scripts/sync-env.ps1 -Target AWS -AwsProfile $(AWS_PROFILE) -AwsRegion $(AWS_REGION)

.PHONY: env\:vercel
env\:vercel:
	pwsh -File scripts/sync-env.ps1 -Target Vercel -ApiUrl $(API_URL)

# ── Cloud Deployments ────────────────────────────────────────────────────────
.PHONY: deploy\:gcp
deploy\:gcp: env\:gcp
	pwsh -File scripts/deploy-gcp.ps1 -ProjectId $(GCP_PROJECT) -Region $(GCP_REGION)

.PHONY: deploy\:aws
deploy\:aws: env\:aws
	pwsh -File scripts/deploy-aws.ps1 -AwsProfile $(AWS_PROFILE) -AwsRegion $(AWS_REGION)

.PHONY: deploy\:vercel
deploy\:vercel: env\:vercel
	pwsh -File scripts/deploy-vercel.ps1 -Prod -ApiUrl $(API_URL)

.PHONY: deploy\:all
deploy\:all: env\:sync
	pwsh -File scripts/release.ps1 -Target All -Prod

.PHONY: release
release: deploy\:all
