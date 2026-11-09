#!/usr/bin/env bash
# Erases demo accounts a week after they were started, every day at 03:00 UTC.
# Lets the API's runtime account delete sign-in accounts, then creates a Cloud Scheduler job that
# calls the API signed as that account (the API accepts no other caller).
#
# Needs gcloud signed in as a project owner. Usage: bash infra/set-demo-cleanup.sh
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-darb-learn}"
REGION="${REGION:-us-east1}"
runtime_email="darb-api@$PROJECT_ID.iam.gserviceaccount.com"
url="https://$PROJECT_ID.web.app/api/internal/cleanup-demo-accounts"

gcloud services enable cloudscheduler.googleapis.com --project "$PROJECT_ID"
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member "serviceAccount:$runtime_email" --role roles/firebaseauth.admin --condition None >/dev/null

if gcloud scheduler jobs describe demo-cleanup --location "$REGION" --project "$PROJECT_ID" >/dev/null 2>&1; then
  action=update
else
  action=create
fi
gcloud scheduler jobs "$action" http demo-cleanup \
  --project "$PROJECT_ID" \
  --location "$REGION" \
  --schedule "0 3 * * *" \
  --time-zone "Etc/UTC" \
  --uri "$url" \
  --http-method POST \
  --oidc-service-account-email "$runtime_email" \
  --oidc-token-audience "$url" \
  --attempt-deadline 120s

echo "Done. Run it once now with:"
echo "  gcloud scheduler jobs run demo-cleanup --location $REGION --project $PROJECT_ID"
