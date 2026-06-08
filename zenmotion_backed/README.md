# ZenMotion Backend

Backend API for the ZenMotion trust-led e-commerce site (a beginner Tai Chi
video **course** + physical goods: **t-shirt**, **mat**). It is the server-side
counterpart to `zenmotion_front`.

Built to satisfy the integration points the frontend already marks with
`TODO` / `INTEGRATION POINT` in `zenmotion_front/assets/app.js`:

- `POST /api/checkout` — recompute the cart **server-side** and create an
  Airwallex payment (hosted page URL **or** client secret). Client prices are
  never trusted.
- `POST /api/contact` — store + email the contact form.
- Auth (`/api/auth/*`) — email + password with JWT access tokens and rotating,
  httpOnly refresh-token cookies.
- Orders & digital entitlements — course access is granted after payment.

## Tech stack

- **Node.js (>=18.17)** + **Express** (ESM)
- **SQLite** via `better-sqlite3` (zero-config, file-based — swap for Postgres later)
- **JWT** auth (`jsonwebtoken`) + **bcryptjs** password hashing
- **Zod** request validation
- **Airwallex** payments (native `fetch`)
- **Nodemailer** email (falls back to console logging when SMTP is unset)
- `helmet`, `cors`, `express-rate-limit`, `morgan`

## Quick start

```bash
cd zenmotion_backed
cp .env.example .env          # then edit secrets
npm install
npm run migrate               # create the SQLite schema
npm run seed                  # (optional) demo user: demo@zenmotionpeace.com / demopass123
npm run dev                   # http://localhost:4000  (auto-reload)
# or: npm start
```

Health check: `curl http://localhost:4000/api/health`

> **Runs without payment keys.** If `AIRWALLEX_*` is not set, `/api/checkout`
> returns a clearly-marked **DEMO** response whose `url` points at
> `/api/checkout/demo-complete`, which marks the order paid so you can test the
> full fulfillment flow (entitlements + receipt email) end to end locally.
> Likewise, if SMTP is unset, emails are printed to the server console.

## Money

All amounts are stored and compared in **minor units (cents)** as integers,
matching the frontend `PRODUCTS` table. The server catalog in
`src/data/products.js` is the **source of truth** for pricing.

## API reference

Base path: `/api`

### Meta
| Method | Path | Notes |
|---|---|---|
| GET | `/health` | Liveness check |
| GET | `/` | API info |

### Products
| Method | Path | Notes |
|---|---|---|
| GET | `/products` | List catalog (prices in cents) |
| GET | `/products/:id` | Single product (`course`, `tshirt`, `mat`) |

### Auth
| Method | Path | Body |
|---|---|---|
| POST | `/auth/register` | `{ name, email, password }` → `{ user, accessToken }` (+ refresh cookie) |
| POST | `/auth/login` | `{ email, password }` |
| POST | `/auth/refresh` | uses refresh cookie → new `accessToken` (rotates) |
| POST | `/auth/logout` | revokes refresh token |
| GET | `/auth/me` | `Authorization: Bearer <accessToken>` |

### Checkout
| Method | Path | Body |
|---|---|---|
| POST | `/checkout/quote` | `{ items:[{id,opts?,qty?}] }` → authoritative totals |
| POST | `/checkout` | `{ email, items, method?, shipping? }` → `{ orderId, url? , clientSecret?, mode, demo }` |
| GET | `/checkout/demo-complete?order_id=` | DEMO only (disabled in production) |

`items` example: `[{ "id": "course", "qty": 1 }, { "id": "tshirt", "opts": { "Size": "L" }, "qty": 2 }]`

Shipping address is **required** when the cart contains a physical item.

### Orders & entitlements (auth required)
| Method | Path | Notes |
|---|---|---|
| GET | `/orders` | Current user's orders |
| GET | `/orders/:id` | Single order (must own it) |
| GET | `/entitlements` | Products the user can access |
| GET | `/entitlements/check/:productId` | `{ access: true|false }` |

### Contact
| Method | Path | Body |
|---|---|---|
| POST | `/contact` | `{ name, email, subject?, message }` |

### Webhooks
| Method | Path | Notes |
|---|---|---|
| POST | `/webhooks/airwallex` | Signature-verified, raw body, idempotent |

## Wiring the frontend

In `zenmotion_front/assets/app.js`:

1. Point `CONFIG.checkoutEndpoint` / `CONFIG.contactEndpoint` at this API
   (e.g. `http://localhost:4000/api/checkout`), or serve the frontend behind the
   same origin / a reverse proxy so `/api/...` resolves here.
2. In `startCheckout()`, set `DEMO = false` and use the real `fetch` block. On
   `{ url }` redirect the browser; on `{ clientSecret }` mount the Airwallex.js
   drop-in.
3. Set `FRONTEND_BASE_URL` in `.env` so success/cancel redirects and the course
   access link point back to the site.

## Airwallex notes

- Set `AIRWALLEX_MODE=hosted` (Payment Link → redirect to `url`) or
  `intent` (Payment Intent → confirm `clientSecret` with Airwallex.js).
- Add a webhook in the Airwallex dashboard pointing at
  `${API_BASE_URL}/api/webhooks/airwallex` and copy the signing secret into
  `AIRWALLEX_WEBHOOK_SECRET`. Payment success marks the order paid, grants
  digital entitlements, and emails the receipt.
- **Apple Pay** rides on card acquiring — it only works once Airwallex approves
  your acquiring capability. No backend change enables it before that.

## Project layout

```
src/
├── server.js            # entry: migrate + listen + graceful shutdown
├── app.js               # express app, middleware, route mounting
├── config/              # env-driven config
├── db/                  # sqlite connection, schema.sql, migrate, seed
├── data/products.js     # SERVER source-of-truth catalog
├── validation/          # zod schemas
├── middleware/          # auth, validate, error, rate limit
├── models/              # DB access (users, orders, entitlements, ...)
├── services/            # airwallex, mailer, fulfillment
├── controllers/         # request handlers
├── routes/              # route definitions
└── utils/               # pricing, jwt, errors, logger
```

## Production checklist

- Set strong `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`.
- Set real `AIRWALLEX_*` + `AIRWALLEX_WEBHOOK_SECRET`; use the live base URL.
- Configure SMTP.
- Put behind HTTPS (refresh cookie is `Secure`+`SameSite=None` in production).
- Consider migrating SQLite → Postgres for multi-instance deployments.
