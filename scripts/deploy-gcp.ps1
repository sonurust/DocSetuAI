# ==============================================================================
# DocSetuAI — Google Cloud Deployment Pipeline (PowerShell)
# Target: Cloud Run + Firestore + Cloud Pub/Sub
# ==============================================================================

[CmdletBinding()]
param(
    [string]$ProjectId = "docsetuai-35894",
    [string]$Region = "us-central1",
    [switch]$SkipTests,
    [switch]$SkipFirestore
)

$ErrorActionPreference = "Stop"

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "  DocSetuAI — Google Cloud Deployment Pipeline" -ForegroundColor Cyan
Write-Host "  Project : $ProjectId" -ForegroundColor Yellow
Write-Host "  Region  : $Region" -ForegroundColor Yellow
Write-Host "====================================================" -ForegroundColor Cyan

# 1. Prerequisites Check
Write-Host "`n[1/6] Checking required CLI tools..." -ForegroundColor Green
$requiredTools = @("gcloud", "docker")
foreach ($tool in $requiredTools) {
    if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) {
        throw "Required CLI tool '$tool' is not installed or not in PATH."
    }
}
Write-Host "  ✓ All required tools detected." -ForegroundColor DarkGreen

# 2. Local Validation (Typecheck & Unit Tests)
if (-not $SkipTests) {
    Write-Host "`n[2/6] Running validation checks..." -ForegroundColor Green
    pnpm run typecheck
    if ($LASTEXITCODE -ne 0) { throw "Typecheck failed." }
    
    pnpm test
    if ($LASTEXITCODE -ne 0) { throw "Unit tests failed." }
    Write-Host "  ✓ Code validation passed." -ForegroundColor DarkGreen
} else {
    Write-Host "`n[2/6] Skipping tests (-SkipTests requested)." -ForegroundColor Yellow
}

# 3. Google Cloud APIs
Write-Host "`n[3/6] Ensuring Google Cloud APIs are enabled on $ProjectId..." -ForegroundColor Green
gcloud services enable `
    run.googleapis.com `
    firestore.googleapis.com `
    pubsub.googleapis.com `
    secretmanager.googleapis.com `
    cloudbuild.googleapis.com `
    --project=$ProjectId

# 4. Firestore Rules and Indexes
if (-not $SkipFirestore) {
    Write-Host "`n[4/6] Deploying Firestore Security Rules and Composite Indexes..." -ForegroundColor Green
    if (Get-Command firebase -ErrorAction SilentlyContinue) {
        firebase deploy --only firestore:rules,firestore:indexes --project=$ProjectId --non-interactive
        Write-Host "  ✓ Firestore rules & indexes deployed." -ForegroundColor DarkGreen
    } else {
        Write-Host "  ! firebase CLI not found. Skipping firestore rules deploy." -ForegroundColor Yellow
    }
} else {
    Write-Host "`n[4/6] Skipping Firestore deploy (-SkipFirestore requested)." -ForegroundColor Yellow
}

# 5. Build and Push Container Image
$gitSha = $(git rev-parse --short HEAD 2>$null)
if (-not $gitSha) { $gitSha = "latest" }
$imageName = "gcr.io/$ProjectId/docsetuai-api"

Write-Host "`n[5/6] Building Docker container image ($imageName)..." -ForegroundColor Green
docker build -t "$imageName`:$gitSha" -t "$imageName`:latest" .
if ($LASTEXITCODE -ne 0) { throw "Docker build failed." }

Write-Host "  Pushing images to Google Container Registry..." -ForegroundColor Green
gcloud auth configure-docker --quiet
docker push "$imageName`:$gitSha"
docker push "$imageName`:latest"
if ($LASTEXITCODE -ne 0) { throw "Docker push failed." }

# 6. Deploy to Google Cloud Run
Write-Host "`n[6/6] Deploying API service to Google Cloud Run..." -ForegroundColor Green
gcloud run services replace infrastructure/google-cloud/service.yaml `
    --region=$Region `
    --platform=managed

gcloud run services add-iam-policy-binding docsetuai-api `
    --member="allUsers" `
    --role="roles/run.invoker" `
    --region=$Region

$serviceUrl = gcloud run services describe docsetuai-api --region=$Region --format="value(status.url)"

Write-Host "`n====================================================" -ForegroundColor Cyan
Write-Host "  ✅ Google Cloud Deployment Successful!" -ForegroundColor Green
Write-Host "  Service URL : $serviceUrl" -ForegroundColor Cyan
Write-Host "  Health Check: $serviceUrl/health" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan
