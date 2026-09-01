#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="docsetuai-35894"
REGION="us-central1"
IMAGE_TAG=$(git rev-parse --short HEAD 2>/dev/null || echo "latest")
IMAGE_NAME="gcr.io/${PROJECT_ID}/docsetuai-api"

echo "===================================================="
echo "  DocSetuAI — Production GCP Deployment Pipeline"
echo "  Target: Cloud Run + Firestore + Pub/Sub"
echo "  Project: ${PROJECT_ID} | Region: ${REGION}"
echo "===================================================="

# 1. Verification checks
echo "1. Running local validation checks..."
pnpm run typecheck
pnpm test

# 2. Setup Google Cloud APIs
echo "2. Enabling required Google Cloud APIs..."
gcloud services enable \
  run.googleapis.com \
  firestore.googleapis.com \
  pubsub.googleapis.com \
  secretmanager.googleapis.com \
  cloudbuild.googleapis.com \
  --project="${PROJECT_ID}"

# 3. Deploy Firestore Rules and Indexes
echo "3. Deploying Firestore Security Rules & Indexes..."
if command -v firebase &> /dev/null; then
  firebase deploy --only firestore:rules,firestore:indexes --project="${PROJECT_ID}" --non-interactive || true
fi

# 4. Build and Push Container Image
echo "4. Building and pushing Docker container image..."
docker build -t "${IMAGE_NAME}:${IMAGE_TAG}" -t "${IMAGE_NAME}:latest" .
docker push "${IMAGE_NAME}:${IMAGE_TAG}"
docker push "${IMAGE_NAME}:latest"

# 5. Deploy to Google Cloud Run
echo "5. Deploying API to Google Cloud Run..."
gcloud run services replace infrastructure/google-cloud/service.yaml \
  --region="${REGION}" \
  --platform=managed

gcloud run services add-iam-policy-binding docsetuai-api \
  --member=allUsers \
  --role=roles/run.invoker \
  --region="${REGION}"

SERVICE_URL=$(gcloud run services describe docsetuai-api --region="${REGION}" --format="value(status.url)")

echo "===================================================="
echo "  ✅ Deployment Successful!"
echo "  API Endpoint: ${SERVICE_URL}"
echo "  Health Check: ${SERVICE_URL}/health"
echo "===================================================="
