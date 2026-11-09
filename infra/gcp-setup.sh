#!/usr/bin/env bash
# One-time Google Cloud setup for Darb. Safe to re-run: existing resources are skipped.
#
# Prerequisites: the Firebase project exists, billing (Blaze) is enabled on it, and
# `gcloud auth login` has been run with an account that owns the project.
#
# Usage: bash infra/gcp-setup.sh
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-darb-learn}"
REGION="${REGION:-us-east1}"
GITHUB_REPO="${GITHUB_REPO:-bilalseh/darb}"
AR_REPO="darb"
RUNTIME_SA="darb-api"
DEPLOYER_SA="github-deployer"
POOL="github"
PROVIDER="github-oidc"

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
project_number="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
runtime_email="$RUNTIME_SA@$PROJECT_ID.iam.gserviceaccount.com"
deployer_email="$DEPLOYER_SA@$PROJECT_ID.iam.gserviceaccount.com"

echo "==> Enabling APIs"
gcloud services enable --project "$PROJECT_ID" \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  iamcredentials.googleapis.com \
  sts.googleapis.com \
  firestore.googleapis.com \
  firebasehosting.googleapis.com \
  firebaserules.googleapis.com \
  cloudresourcemanager.googleapis.com

echo "==> Firestore (default) database in $REGION"
if ! gcloud firestore databases describe --database='(default)' --project "$PROJECT_ID" >/dev/null 2>&1; then
  gcloud firestore databases create --location "$REGION" --project "$PROJECT_ID"
fi

echo "==> Artifact Registry repository with an image cleanup policy"
if ! gcloud artifacts repositories describe "$AR_REPO" --location "$REGION" --project "$PROJECT_ID" >/dev/null 2>&1; then
  gcloud artifacts repositories create "$AR_REPO" \
    --repository-format docker --location "$REGION" --project "$PROJECT_ID" \
    --description "Darb API images"
fi
gcloud artifacts repositories set-cleanup-policies "$AR_REPO" \
  --location "$REGION" --project "$PROJECT_ID" \
  --policy "$script_dir/artifact-cleanup-policy.json" --no-dry-run

echo "==> Service accounts"
ensure_sa() {
  if ! gcloud iam service-accounts describe "$1@$PROJECT_ID.iam.gserviceaccount.com" --project "$PROJECT_ID" >/dev/null 2>&1; then
    gcloud iam service-accounts create "$1" --display-name "$2" --project "$PROJECT_ID"
  fi
}
ensure_sa "$RUNTIME_SA" "Darb API runtime"
ensure_sa "$DEPLOYER_SA" "GitHub Actions deployer"

grant() {
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member "serviceAccount:$1" --role "$2" --condition None --quiet >/dev/null
}

# Runtime: read and write Firestore, nothing else.
grant "$runtime_email" roles/datastore.user

# Deployer: push images, deploy Cloud Run, deploy Hosting, rules and indexes.
for role in \
  roles/run.admin \
  roles/artifactregistry.writer \
  roles/firebasehosting.admin \
  roles/firebaserules.admin \
  roles/datastore.indexAdmin \
  roles/serviceusage.serviceUsageConsumer; do
  grant "$deployer_email" "$role"
done
# The deployer may run the service as the runtime account, and only that account.
gcloud iam service-accounts add-iam-policy-binding "$runtime_email" \
  --member "serviceAccount:$deployer_email" --role roles/iam.serviceAccountUser \
  --project "$PROJECT_ID" --quiet >/dev/null

echo "==> Workload Identity Federation for $GITHUB_REPO"
if ! gcloud iam workload-identity-pools describe "$POOL" --location global --project "$PROJECT_ID" >/dev/null 2>&1; then
  gcloud iam workload-identity-pools create "$POOL" \
    --location global --project "$PROJECT_ID" --display-name "GitHub Actions"
fi
if ! gcloud iam workload-identity-pools providers describe "$PROVIDER" \
  --workload-identity-pool "$POOL" --location global --project "$PROJECT_ID" >/dev/null 2>&1; then
  gcloud iam workload-identity-pools providers create-oidc "$PROVIDER" \
    --workload-identity-pool "$POOL" --location global --project "$PROJECT_ID" \
    --display-name "GitHub OIDC" \
    --issuer-uri "https://token.actions.githubusercontent.com" \
    --attribute-mapping "google.subject=assertion.sub,attribute.repository=assertion.repository" \
    --attribute-condition "assertion.repository == '$GITHUB_REPO'"
fi
gcloud iam service-accounts add-iam-policy-binding "$deployer_email" \
  --role roles/iam.workloadIdentityUser \
  --member "principalSet://iam.googleapis.com/projects/$project_number/locations/global/workloadIdentityPools/$POOL/attribute.repository/$GITHUB_REPO" \
  --project "$PROJECT_ID" --quiet >/dev/null

cat <<EOF

Done. Set these GitHub repository variables (Settings > Secrets and variables > Actions > Variables):
  GCP_PROJECT_ID=$PROJECT_ID
  GCP_WIF_PROVIDER=projects/$project_number/locations/global/workloadIdentityPools/$POOL/providers/$PROVIDER
  GCP_DEPLOYER_SA=$deployer_email
EOF
