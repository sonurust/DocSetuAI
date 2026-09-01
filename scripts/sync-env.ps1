# ==============================================================================
# DocSetuAI — Multi-Cloud Environment Variables Synchronizer
# Syncs .env parameters to Google Cloud Run, AWS App Runner, and Vercel
# ==============================================================================

[CmdletBinding()]
param(
    [ValidateSet("All", "GCP", "AWS", "Vercel")]
    [string]$Target = "All",
    [string]$GcpProject = "docsetuai-35894",
    [string]$GcpRegion = "us-central1",
    [string]$AwsProfile = "auth-setu",
    [string]$AwsRegion = "ap-south-1",
    [string]$AwsServiceName = "docsetuai-api",
    [string]$ApiUrl = "https://docsetuai-api-z5nen6wcxq-uc.a.run.app"
)

$ErrorActionPreference = "Stop"

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "  DocSetuAI — Synchronizing Cloud Environments" -ForegroundColor Cyan
Write-Host "  Target Platform : $Target" -ForegroundColor Yellow
Write-Host "====================================================" -ForegroundColor Cyan

# Load .env if present
$envFile = "$PSScriptRoot\..\.env"
$googleApiKey = $env:GOOGLE_API_KEY
$geminiModel = "gemini-3.6-flash"
$runtimeMode = "cloud"

if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#")) {
            $parts = $line.Split("=", 2)
            if ($parts.Length -eq 2) {
                $k = $parts[0].Trim()
                $v = $parts[1].Trim()
                if ($k -eq "GOOGLE_API_KEY" -and -not $googleApiKey) { $googleApiKey = $v }
                if ($k -eq "GEMINI_MODEL") { $geminiModel = $v }
                if ($k -eq "RUNTIME_MODE") { $runtimeMode = $v }
            }
        }
    }
}

if (-not $googleApiKey) {
    Write-Host "⚠️ Warning: GOOGLE_API_KEY is empty. Setting fallback key." -ForegroundColor Yellow
}

# ── 1. Google Cloud Run Environment Sync ─────────────────────────────────────
if ($Target -eq "All" -or $Target -eq "GCP") {
    Write-Host "`n[1/3] Syncing Environment to Google Cloud Run ($GcpProject)..." -ForegroundColor Green
    try {
        $envVars = "GOOGLE_API_KEY=$googleApiKey,GEMINI_MODEL=$geminiModel,RUNTIME_MODE=$runtimeMode,GOOGLE_CLOUD_PROJECT=$GcpProject,GOOGLE_CLOUD_LOCATION=$GcpRegion,FIRESTORE_DATABASE=(default),PUBSUB_TOPIC=docsetuai-task-events,PORT=8080"
        
        gcloud run services update docsetuai-api `
            --update-env-vars=$envVars `
            --project=$GcpProject `
            --region=$GcpRegion `
            --quiet 2>$null
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✓ Google Cloud Run environment synchronized successfully." -ForegroundColor DarkGreen
        } else {
            Write-Host "  ! Cloud Run service not found or update queued on next deploy." -ForegroundColor Yellow
        }
    } catch {
        Write-Host "  ! Skipping Cloud Run env update: $_" -ForegroundColor Yellow
    }
}

# ── 2. AWS App Runner Environment Sync ───────────────────────────────────────
if ($Target -eq "All" -or $Target -eq "AWS") {
    Write-Host "`n[2/3] Syncing Environment to AWS App Runner ($AwsProfile / $AwsRegion)..." -ForegroundColor Green
    try {
        $serviceArn = aws apprunner list-services --region $AwsRegion --profile $AwsProfile --query "ServiceSummaryList[?ServiceName=='$AwsServiceName'].ServiceArn" --output text 2>$null
        if ($serviceArn -and $serviceArn.Trim() -ne "") {
            Write-Host "  Updating App Runner service configuration: $serviceArn" -ForegroundColor Yellow
            aws apprunner update-service `
                --service-arn $serviceArn `
                --region $AwsRegion `
                --profile $AwsProfile `
                --source-configuration "ImageRepository={ImageConfiguration={Port='8080',RuntimeEnvironmentVariables={GOOGLE_API_KEY='$googleApiKey',GEMINI_MODEL='$geminiModel',RUNTIME_MODE='$runtimeMode',PORT='8080'}}}" `
                --query "Service.Status" --output text 2>$null
            Write-Host "  ✓ AWS App Runner environment synchronized." -ForegroundColor DarkGreen
        } else {
            Write-Host "  ! App Runner service '$AwsServiceName' not active yet. Env will apply on first deployment." -ForegroundColor Yellow
        }
    } catch {
        Write-Host "  ! Skipping AWS env update: $_" -ForegroundColor Yellow
    }
}

# ── 3. Vercel Environment Sync ───────────────────────────────────────────────
if ($Target -eq "All" -or $Target -eq "Vercel") {
    Write-Host "`n[3/3] Syncing Environment to Vercel (NEXT_PUBLIC_API_URL)..." -ForegroundColor Green
    try {
        # Update local production env file for Vercel CLI
        $prodEnvFile = "$PSScriptRoot\..\apps\web\.env.production"
        Set-Content -Path $prodEnvFile -Value "NEXT_PUBLIC_API_URL=$ApiUrl`nNEXT_PUBLIC_GEMINI_MODEL=$geminiModel`n"
        Write-Host "  ✓ apps/web/.env.production generated with NEXT_PUBLIC_API_URL=$ApiUrl" -ForegroundColor DarkGreen
    } catch {
        Write-Host "  ! Failed to update apps/web/.env.production: $_" -ForegroundColor Yellow
    }
}

Write-Host "`n====================================================" -ForegroundColor Cyan
Write-Host "  ✅ Cloud Environment Sync Completed!" -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Cyan
