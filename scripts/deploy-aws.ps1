# ==============================================================================
# DocSetuAI — AWS App Runner API Deployment Pipeline (PowerShell)
# Target: AWS ECR + AWS App Runner
# ==============================================================================

[CmdletBinding()]
param(
    [string]$AwsRegion = "ap-south-1",
    [string]$AccountId = "915275803099",
    [string]$ServiceName = "docsetuai-api",
    [string]$EcrRepo = "docsetuai-api",
    [switch]$SkipTests
)

$ErrorActionPreference = "Stop"

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "  DocSetuAI — AWS App Runner Deployment Pipeline" -ForegroundColor Cyan
Write-Host "  Region     : $AwsRegion" -ForegroundColor Yellow
Write-Host "  AWS Account: $AccountId" -ForegroundColor Yellow
Write-Host "  Service    : $ServiceName" -ForegroundColor Yellow
Write-Host "====================================================" -ForegroundColor Cyan

# 1. Prerequisites Check
Write-Host "`n[1/5] Checking required CLI tools..." -ForegroundColor Green
$requiredTools = @("aws", "docker")
foreach ($tool in $requiredTools) {
    if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) {
        throw "Required CLI tool '$tool' is not installed or not in PATH."
    }
}
Write-Host "  ✓ All required tools detected." -ForegroundColor DarkGreen

# 2. Local Validation (Typecheck & Unit Tests)
if (-not $SkipTests) {
    Write-Host "`n[2/5] Running validation checks..." -ForegroundColor Green
    pnpm run typecheck
    if ($LASTEXITCODE -ne 0) { throw "Typecheck failed." }
    
    pnpm test
    if ($LASTEXITCODE -ne 0) { throw "Unit tests failed." }
    Write-Host "  ✓ Code validation passed." -ForegroundColor DarkGreen
} else {
    Write-Host "`n[2/5] Skipping tests (-SkipTests requested)." -ForegroundColor Yellow
}

# 3. AWS ECR Login & Repository Setup
Write-Host "`n[3/5] Authenticating with AWS ECR ($AwsRegion)..." -ForegroundColor Green
$ecrRegistry = "$AccountId.dkr.ecr.$AwsRegion.amazonaws.com"
aws ecr get-login-password --region $AwsRegion | docker login --username AWS --password-stdin $ecrRegistry
if ($LASTEXITCODE -ne 0) { throw "AWS ECR authentication failed." }

# Create ECR repo if it doesn't exist
aws ecr describe-repositories --repository-names $EcrRepo --region $AwsRegion 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "  Creating new ECR repository '$EcrRepo'..." -ForegroundColor Yellow
    aws ecr create-repository --repository-name $EcrRepo --region $AwsRegion
}

# 4. Build and Push Container Image to ECR
$gitSha = $(git rev-parse --short HEAD 2>$null)
if (-not $gitSha) { $gitSha = "latest" }
$fullImageName = "$ecrRegistry/$EcrRepo"

Write-Host "`n[4/5] Building & Pushing Docker image ($fullImageName)..." -ForegroundColor Green
docker build -t "$fullImageName`:$gitSha" -t "$fullImageName`:latest" .
if ($LASTEXITCODE -ne 0) { throw "Docker build failed." }

docker push "$fullImageName`:$gitSha"
docker push "$fullImageName`:latest"
if ($LASTEXITCODE -ne 0) { throw "Docker push to ECR failed." }
Write-Host "  ✓ Image pushed to AWS ECR successfully." -ForegroundColor DarkGreen

# 5. Deploy / Update AWS App Runner Service
Write-Host "`n[5/5] Deploying to AWS App Runner ($ServiceName)..." -ForegroundColor Green

# Check if App Runner service already exists
$existingServiceArn = aws apprunner list-services --region $AwsRegion --query "ServiceSummaryList[?ServiceName=='$ServiceName'].ServiceArn" --output text

if ($existingServiceArn -and $existingServiceArn.Trim() -ne "") {
    Write-Host "  Updating existing App Runner service: $existingServiceArn" -ForegroundColor Yellow
    aws apprunner start-deployment --service-arn $existingServiceArn --region $AwsRegion
    Write-Host "  ✓ Deployment triggered on App Runner." -ForegroundColor DarkGreen
} else {
    Write-Host "  Creating new App Runner service from infrastructure/aws-apprunner.json..." -ForegroundColor Yellow
    if (Test-Path "infrastructure/aws-apprunner.json") {
        aws apprunner create-service --cli-input-json file://infrastructure/aws-apprunner.json --region $AwsRegion
        Write-Host "  ✓ App Runner service creation initiated." -ForegroundColor DarkGreen
    } else {
        Write-Host "  ! infrastructure/aws-apprunner.json not found." -ForegroundColor Red
    }
}

Write-Host "`n====================================================" -ForegroundColor Cyan
Write-Host "  ✅ AWS Deployment Process Completed!" -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Cyan
