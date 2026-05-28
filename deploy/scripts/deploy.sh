#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DEPLOY_DIR="$(dirname "$SCRIPT_DIR")"

cd "$DEPLOY_DIR"

if [ ! -f .env.production ]; then
  cp .env.production.example .env.production
  echo "ERROR: .env.production created from template."
  echo "Edit .env.production with real secrets before continuing."
  exit 1
fi

echo "Building and starting services..."
docker compose up -d --build --remove-orphans

echo "Waiting for services to be ready..."
sleep 15

echo ""
echo "=== Backend health ==="
curl -sf http://localhost:8000/api/v1/health && echo " [OK]" || echo " [FAIL]"

echo "=== Frontend health ==="
curl -sf http://localhost:3000/api/health && echo " [OK]" || echo " [FAIL]"

echo "=== Nginx health ==="
curl -sf -o /dev/null -w "%{http_code}" http://localhost/ && echo " [OK]" || echo " [FAIL]"

echo ""
echo "Deploy complete."
