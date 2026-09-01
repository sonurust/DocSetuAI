PROJECT_ID   := docsetuai-35894
REGION       := us-central1
API_IMAGE    := gcr.io/$(PROJECT_ID)/docsetuai-api
SERVICE_NAME := docsetuai-api

.PHONY: help setup-iam setup-secrets setup-pubsub deploy-firestore build push deploy all logs

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-22s\033[0m %s\n", $$1, $$2}'

# ── IAM & Service Account ────────────────────────────────────────────────────

setup-iam: ## Create service account and grant required roles
	gcloud iam service-accounts create docsetuai-api \
	  --display-name="DocSetuAI API Service Account" \
	  --project=$(PROJECT_ID) || true

	@echo "Granting Firestore roles..."
	gcloud projects add-iam-policy-binding $(PROJECT_ID) \
	  --member="serviceAccount:docsetuai-api@$(PROJECT_ID).iam.gserviceaccount.com" \
	  --role="roles/datastore.user"

	@echo "Granting Pub/Sub roles..."
	gcloud projects add-iam-policy-binding $(PROJECT_ID) \
	  --member="serviceAccount:docsetuai-api@$(PROJECT_ID).iam.gserviceaccount.com" \
	  --role="roles/pubsub.publisher"
	gcloud projects add-iam-policy-binding $(PROJECT_ID) \
	  --member="serviceAccount:docsetuai-api@$(PROJECT_ID).iam.gserviceaccount.com" \
	  --role="roles/pubsub.subscriber"

	@echo "Granting Secret Manager roles..."
	gcloud projects add-iam-policy-binding $(PROJECT_ID) \
	  --member="serviceAccount:docsetuai-api@$(PROJECT_ID).iam.gserviceaccount.com" \
	  --role="roles/secretmanager.secretAccessor"

	@echo "✅ IAM setup complete"

# ── Secret Manager ───────────────────────────────────────────────────────────

setup-secrets: ## Create secrets in Secret Manager (prompts for values)
	@echo "Creating google-api-key secret..."
	@read -p "Enter GOOGLE_API_KEY: " key; \
	  echo -n "$$key" | gcloud secrets create google-api-key \
	    --data-file=- --project=$(PROJECT_ID) 2>/dev/null || \
	  echo -n "$$key" | gcloud secrets versions add google-api-key \
	    --data-file=- --project=$(PROJECT_ID)

	@echo "Creating docsetuai-api-key secret..."
	@read -p "Enter API_KEY (your own secure key): " apikey; \
	  echo -n "$$apikey" | gcloud secrets create docsetuai-api-key \
	    --data-file=- --project=$(PROJECT_ID) 2>/dev/null || \
	  echo -n "$$apikey" | gcloud secrets versions add docsetuai-api-key \
	    --data-file=- --project=$(PROJECT_ID)

	@echo "✅ Secrets configured"

# ── Pub/Sub ──────────────────────────────────────────────────────────────────

setup-pubsub: ## Create Pub/Sub topic and push subscription
	gcloud pubsub topics create docsetuai-task-events \
	  --project=$(PROJECT_ID) || true

	gcloud pubsub subscriptions create docsetuai-task-worker \
	  --topic=docsetuai-task-events \
	  --ack-deadline=600 \
	  --message-retention-duration=7d \
	  --project=$(PROJECT_ID) || true

	@echo "✅ Pub/Sub topic and subscription ready"

# ── Firestore ────────────────────────────────────────────────────────────────

setup-firestore: ## Create Firestore database (once only)
	gcloud firestore databases create \
	  --location=$(REGION) \
	  --project=$(PROJECT_ID) || true
	@echo "✅ Firestore database ready"

deploy-firestore: ## Deploy Firestore security rules and indexes
	firebase deploy \
	  --only firestore:rules,firestore:indexes \
	  --project=$(PROJECT_ID) \
	  --non-interactive
	@echo "✅ Firestore rules and indexes deployed"

# ── Docker ───────────────────────────────────────────────────────────────────

build: ## Build Docker image
	docker build -t $(API_IMAGE):latest -t $(API_IMAGE):$(shell git rev-parse --short HEAD) .
	@echo "✅ Image built: $(API_IMAGE):latest"

push: build ## Build and push image to Container Registry
	docker push $(API_IMAGE):latest
	docker push $(API_IMAGE):$(shell git rev-parse --short HEAD)
	@echo "✅ Image pushed"

# ── Cloud Run ────────────────────────────────────────────────────────────────

deploy: push ## Push image and deploy to Cloud Run
	gcloud run services replace infrastructure/google-cloud/service.yaml \
	  --region=$(REGION) \
	  --platform=managed

	gcloud run services add-iam-policy-binding $(SERVICE_NAME) \
	  --member=allUsers \
	  --role=roles/run.invoker \
	  --region=$(REGION)

	@echo ""
	@echo "✅ Deployed! Service URL:"
	@gcloud run services describe $(SERVICE_NAME) \
	  --region=$(REGION) \
	  --format="value(status.url)"

# ── Logs ─────────────────────────────────────────────────────────────────────

logs: ## Tail Cloud Run logs
	gcloud logging read \
	  'resource.type="cloud_run_revision" AND resource.labels.service_name="$(SERVICE_NAME)"' \
	  --project=$(PROJECT_ID) \
	  --limit=50 \
	  --format="table(timestamp, textPayload)" \
	  --freshness=10m

# ── Full setup ───────────────────────────────────────────────────────────────

all: setup-iam setup-pubsub setup-firestore setup-secrets deploy-firestore deploy ## Full first-time GCP setup + deploy
	@echo ""
	@echo "🚀 DocSetuAI fully deployed to Google Cloud"
