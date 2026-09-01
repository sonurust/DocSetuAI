#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="docsetuai-35894"
REGION="us-central1"

echo "===================================================="
echo "  DocSetuAI — Google Cloud Firestore Setup & Deploy"
echo "  Project: ${PROJECT_ID} (${REGION})"
echo "===================================================="

# Check for gcloud CLI
if ! command -v gcloud &> /dev/null; then
  echo "❌ Error: gcloud CLI is not installed or not in PATH."
  exit 1
fi

echo "1. Ensuring Firestore API is enabled..."
gcloud services enable firestore.googleapis.com --project="${PROJECT_ID}"

echo "2. Checking/Creating Firestore database..."
gcloud firestore databases create --location="${REGION}" --project="${PROJECT_ID}" 2>/dev/null || {
  echo "   (Database already exists or created)"
}

echo "3. Deploying Firestore Security Rules and Composite Indexes..."
if command -v firebase &> /dev/null; then
  firebase deploy --only firestore:rules,firestore:indexes --project="${PROJECT_ID}" --non-interactive
  echo "✅ Firestore rules and indexes successfully deployed."
else
  echo "⚠️ firebase CLI not found. Install via 'npm install -g firebase-tools' or deploy via Firebase Console."
fi

echo "===================================================="
echo "  Firestore Configuration Complete"
echo "===================================================="
