# ==============================================================================
# DocSetuAI — Multi-Cloud Unified Release Orchestrator (PowerShell)
# Supports: Google Cloud (Cloud Run), AWS (App Runner), Vercel (Next.js)
# ==============================================================================

[CmdletBinding()]
param(
    [ValidateSet("GCP", "AWS", "Vercel", "All")]
    [string]$Target = "All",
    [switch]$Prod,
    [switch]$SkipTests
)

$ErrorActionPreference = "Stop"

Write-Host "====================================================" -ForegroundColor Magenta
Write-Host "  DocSetuAI — Multi-Cloud Release Orchestrator" -ForegroundColor Magenta
Write-Host "  Target : $Target" -ForegroundColor Yellow
Write-Host "  Mode   : $(if ($Prod) { 'Production' } else { 'Standard/Preview' })" -ForegroundColor Yellow
Write-Host "====================================================" -ForegroundColor Magenta

# Step 0: Monorepo validation
if (-not $SkipTests) {
    Write-Host "`n[Release Gate] Running Monorepo Typecheck & Tests..." -ForegroundColor Cyan
    pnpm run typecheck
    if ($LASTEXITCODE -ne 0) { throw "Monorepo typecheck failed. Release aborted." }

    pnpm test
    if ($LASTEXITCODE -ne 0) { throw "Unit tests failed. Release aborted." }
    Write-Host "✓ Release Gate Passed: 0 TypeScript errors, all unit tests green." -ForegroundColor Green
}

# Target 1: Google Cloud
if ($Target -eq "GCP" -or $Target -eq "All") {
    Write-Host "`n>>> [1/3] Triggering Google Cloud Deploy..." -ForegroundColor Cyan
    & "$PSScriptRoot\deploy-gcp.ps1" -SkipTests
}

# Target 2: AWS App Runner
if ($Target -eq "AWS" -or $Target -eq "All") {
    Write-Host "`n>>> [2/3] Triggering AWS Deploy..." -ForegroundColor Cyan
    & "$PSScriptRoot\deploy-aws.ps1" -SkipTests
}

# Target 3: Vercel
if ($Target -eq "Vercel" -or $Target -eq "All") {
    Write-Host "`n>>> [3/3] Triggering Vercel Deploy..." -ForegroundColor Cyan
    if ($Prod) {
        & "$PSScriptRoot\deploy-vercel.ps1" -Prod
    } else {
        & "$PSScriptRoot\deploy-vercel.ps1"
    }
}

Write-Host "`n====================================================" -ForegroundColor Magenta
Write-Host "  🎉 All Selected Releases Deployed Successfully!" -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Magenta
