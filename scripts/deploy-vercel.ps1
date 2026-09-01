# ==============================================================================
# DocSetuAI — Vercel Deployment Pipeline (PowerShell)
# Target: Next.js 14 App (apps/web)
# ==============================================================================

[CmdletBinding()]
param(
    [switch]$Prod,
    [string]$ApiUrl = "https://docsetuai-api-915275803099.us-central1.run.app"
)

$ErrorActionPreference = "Stop"

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "  DocSetuAI — Vercel Next.js Web Deployment" -ForegroundColor Cyan
Write-Host "  Environment : $(if ($Prod) { 'PRODUCTION (--prod)' } else { 'PREVIEW' })" -ForegroundColor Yellow
Write-Host "  Target API  : $ApiUrl" -ForegroundColor Yellow
Write-Host "====================================================" -ForegroundColor Cyan

# 1. Prerequisites Check
Write-Host "`n[1/3] Checking vercel CLI..." -ForegroundColor Green
if (-not (Get-Command vercel -ErrorAction SilentlyContinue)) {
    throw "Vercel CLI ('vercel') is not installed or not in PATH. Install via 'npm install -g vercel'."
}
Write-Host "  ✓ vercel CLI detected." -ForegroundColor DarkGreen

# 2. Build local libs & verify
Write-Host "`n[2/3] Building local packages & testing build..." -ForegroundColor Green
pnpm run build:libs
if ($LASTEXITCODE -ne 0) { throw "Package build failed." }

pnpm --filter @docsetuai/web typecheck
if ($LASTEXITCODE -ne 0) { throw "Web typecheck failed." }

# 3. Deploy to Vercel
Write-Host "`n[3/3] Deploying to Vercel (Project: docsetuai)..." -ForegroundColor Green
$vercelArgs = @("--name", "docsetuai", "--yes")
if ($Prod) {
    $vercelArgs += "--prod"
}
$vercelArgs += "--env"
$vercelArgs += "NEXT_PUBLIC_API_URL=$ApiUrl"

vercel @vercelArgs

Write-Host "`n====================================================" -ForegroundColor Cyan
Write-Host "  ✅ Vercel Deployment Complete!" -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Cyan
