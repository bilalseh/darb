#!/usr/bin/env bash
# Stores the AI provider keys in Secret Manager and lets only the API's runtime account read them.
# Safe to re-run: each run adds a new secret version. Keys are read without echoing them.
#
# Create the keys first (both free tiers):
#   Gemini: https://aistudio.google.com/apikey  (use a separate project with billing OFF)
#   Groq:   https://console.groq.com/keys
#
# Usage: bash infra/set-ai-keys.sh
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-darb-learn}"
runtime_email="darb-api@$PROJECT_ID.iam.gserviceaccount.com"
mounts=()

gcloud services enable secretmanager.googleapis.com --project "$PROJECT_ID"

store_secret() {
  local secret="$1" env_name="$2" label="$3" value
  read -r -s -p "$label key (leave empty to skip): " value
  echo
  if [ -z "$value" ]; then
    echo "  skipped $label"
    return
  fi
  if ! gcloud secrets describe "$secret" --project "$PROJECT_ID" >/dev/null 2>&1; then
    gcloud secrets create "$secret" --replication-policy automatic --project "$PROJECT_ID"
  fi
  printf '%s' "$value" | gcloud secrets versions add "$secret" --data-file=- --project "$PROJECT_ID" >/dev/null
  gcloud secrets add-iam-policy-binding "$secret" --project "$PROJECT_ID" \
    --member "serviceAccount:$runtime_email" --role roles/secretmanager.secretAccessor >/dev/null
  mounts+=("$env_name=$secret:latest")
  echo "  stored $label"
}

store_secret gemini-api-key GEMINI_API_KEY "Gemini"
store_secret groq-api-key GROQ_API_KEY "Groq"

if [ ${#mounts[@]} -eq 0 ]; then
  echo "No keys stored."
  exit 0
fi

cat <<EOF

Done. Set this GitHub repository variable, then re-run the Deploy workflow:
  AI_SECRETS=$(IFS=,; echo "${mounts[*]}")
EOF
