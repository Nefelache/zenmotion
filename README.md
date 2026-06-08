# ZenMotion

Trust-led e-commerce site for a beginner Tai Chi video course plus physical
goods. Two parts:

- **`zenmotion_front/`** — static frontend (no build step).
- **`zenmotion_backed/`** — Node.js + Express API (server-authoritative pricing,
  Airwallex payments, auth, orders, contact). See its own `README.md` for the
  full API reference.

Both are containerized and orchestrated with Docker Compose: an nginx container
serves the static site and reverse-proxies `/api` to the backend, so the whole
site runs behind a single origin.

## Deploy on your server (Docker)

Requirements: Docker + the Docker Compose plugin.

```bash
# 1. Clone
git clone <your-repo-url> zenmotion
cd zenmotion

# 2. Configure backend secrets
cp zenmotion_backed/.env.example zenmotion_backed/.env
nano zenmotion_backed/.env        # set JWT secrets, Airwallex keys, SMTP, FRONTEND_BASE_URL

# 3. Build & start
docker compose up -d --build

# 4. Check
docker compose ps
curl http://localhost:8080/api/health
```

Open `http://<server-ip>:8080`.

### Important `.env` values for production
- `NODE_ENV=production`
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — strong random values
  (`node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`)
- `FRONTEND_BASE_URL` — the public URL users hit (e.g. `https://zenmotionpeace.com`),
  used for checkout redirects and the course access link.
- `AIRWALLEX_CLIENT_ID` / `AIRWALLEX_API_KEY` / `AIRWALLEX_WEBHOOK_SECRET` — real keys.
  Without them, checkout runs in clearly-marked DEMO mode.
- `SMTP_*` — without them, emails are logged to the container console.

### Common operations

```bash
docker compose logs -f backend      # tail backend logs
docker compose logs -f frontend     # tail nginx logs
docker compose up -d --build        # redeploy after changes
docker compose down                 # stop (keeps the data volume)
docker compose down -v              # stop AND delete the SQLite volume
```

The SQLite database persists in the named volume `backend_data`.

## Ports

| Service  | Container | Host  | Purpose                          |
|----------|-----------|-------|----------------------------------|
| frontend | 80        | 8080  | Website + `/api` proxy           |
| backend  | 4000      | —     | API (internal; expose if needed) |

Put a TLS-terminating reverse proxy (Caddy, Traefik, or nginx) or a load
balancer in front for HTTPS, and point it at host port `8080`.

## Going fully live (frontend)

The static checkout currently runs in DEMO mode. To take real payments, in
`zenmotion_front/assets/app.js` → `startCheckout()`, set `DEMO = false` and use
the real `fetch(CONFIG.checkoutEndpoint, ...)` block (already stubbed there).
Because nginx proxies `/api`, no URL changes are needed.
