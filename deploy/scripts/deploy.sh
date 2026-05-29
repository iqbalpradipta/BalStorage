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

ensure_jwt_secret() {
  local current_secret
  current_secret="$(grep -E '^JWT_SECRET=' .env.production | tail -n 1 | cut -d= -f2- || true)"

  if [ "${#current_secret}" -ge 32 ] && [ "${current_secret#<}" = "${current_secret}" ]; then
    return
  fi

  local new_secret
  if command -v openssl >/dev/null 2>&1; then
    new_secret="$(openssl rand -hex 32)"
  else
    new_secret="$(dd if=/dev/urandom bs=48 count=1 2>/dev/null | base64 | tr -dc 'A-Za-z0-9' | cut -c1-64)"
  fi

  if grep -qE '^JWT_SECRET=' .env.production; then
    sed -i "s|^JWT_SECRET=.*|JWT_SECRET=${new_secret}|" .env.production
  else
    printf '\nJWT_SECRET=%s\n' "$new_secret" >> .env.production
  fi

  chmod 600 .env.production || true
  echo "Generated a secure JWT_SECRET in .env.production"
}

ensure_jwt_secret

echo "Building and starting services..."
docker compose up -d --build --remove-orphans

echo "Reloading nginx..."
sudo ln -sf "$DEPLOY_DIR/nginx/cloud-storage.conf" /etc/nginx/sites-enabled/cloud-storage
sudo nginx -t && sudo systemctl reload nginx

echo "Waiting for services to be ready..."
sleep 10

echo ""
echo "=== Backend health ==="
curl -sf http://localhost:8000/api/v1/health && echo " [OK]" || echo " [FAIL]"

echo "=== Frontend health ==="
curl -sf http://localhost:3000/api/health && echo " [OK]" || echo " [FAIL]"

echo "=== Nginx ==="
curl -sf -o /dev/null -w "%{http_code}" http://localhost/ && echo " [OK]" || echo " [FAIL]"

echo ""
echo "Deploy complete."
