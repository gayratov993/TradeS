# TradeS — Sales and Professional POS Management Platform

TradeS is an offline-first sales management system built for the Uzbekistan and CIS retail market. One monorepo contains the **backend API**, **web POS**, **admin panel**, and **Expo mobile app**.

The goal is to give businesses from a single shop to 10 branches one system for products, sales, reports, staff, cash registers, and subscriptions.

---

## 1. Current status

| Area | Status |
|---|---|
| Backend API | Working: auth, products, sales, orders, reports, sync, AI, admin, audit, support, Telegram |
| Database | PostgreSQL + Prisma 6, migrations applied |
| Subscription / organization / store / register | Schema + migration + seed ready |
| Web POS | Working: products, sales, reports, offline sync |
| Admin panel | Working: users, products, orders, roles, reports |
| Mobile app | Working: products, sales, offline WatermelonDB, sync engine |
| Telegram OTP | Working through `@trades_otp_bot` |
| Multi-item POS cart / receipt / cashier shift | On the roadmap (database schema is ready) |

> Latest major change: `Plan`, `Organization`, `Store`, `Register`, `SaleTransaction`, `Payment`, `RegisterShift`, `Return`, and `StoreInventory` models were added to the Prisma schema and applied to the database.

See [docs/REPO_AUDIT.md](./docs/REPO_AUDIT.md) for the current GitHub repository audit, including known gaps and failing checks.

---

## 2. Features

### Authentication
- Phone number + Telegram OTP (code sent by the bot).
- Email + password and email OTP (the `devCode` is visible in development mode).
- Google OAuth.
- JWT access/refresh tokens and role-based access control.

### Products
- Global product catalog: every user works from the same catalog.
- Separate `buyPrice` / `sellPrice`; profit is calculated automatically.
- Stock, additional unit of measure, category, brand, and image.
- Deleted products are sent to offline clients through `deletedProductIds`.

### Sales
- Fast sale entry in the web and mobile apps.
- The server revalidates price, product name, and unit — clients cannot fake prices.
- Atomic stock decrement with `stock >= quantity` using `updateMany`.
- Offline sales are sent idempotently with `syncId`; retries do not create duplicates.
- Temporary negative stock in offline sales is allowed only with `allowOffline`.

### Reports
- Dashboard: revenue, profit, number of sales, product stock.
- Daily/monthly reports and top products.
- Low-stock report works globally without organization filters.

### Offline synchronization
- Web: IndexedDB (`offlineDB.js`) + `webSyncService`.
- Mobile: WatermelonDB + `syncEngine`.
- `/sync/push` and `/sync/pull`; `clientUpdatedAt` accepts seconds or ISO datetime.
- Product pulls are global; sales and report data are global as well.

### Admin and security
- Super Admin / Admin / User roles.
- Audit logs, rate limiting, Helmet, CORS whitelist.
- Joi validation against malformed user input.
- Temporary cleanup mechanism for test users.

---

## 3. Subscription plans

`npm run seed:pos` creates three plans:

| Plan | Stores | Registers per store | Users | Monthly price |
|---|---:|---:|---:|---:|
| `BASIC` | 1 | 3 | 3 | 0 UZS |
| `STANDARD` | 3 | 5 | 10 | 99,000 UZS |
| `PRO` | 10 | 10 | 50 | 299,000 UZS |

The seed also creates:
- the `TradeS` organization (`slug: trades-main`),
- the main store (`MAIN-001`),
- `Register 1`, `Register 2`, `Register 3`,
- the admin user as `OWNER` of the organization,
- `StoreInventory` records copied from all active products.

---

## 4. Tech stack

| Layer | Technology |
|---|---|
| Backend | Node.js 18+, Express 4, Joi, Winston, Morgan, Helmet, JWT, bcryptjs |
| Database / ORM | PostgreSQL 17, Prisma 6 |
| Web | React 18, Vite 4, Tailwind CSS, TanStack Query, Zustand, React Router, i18next, IndexedDB |
| Admin panel | React 18, Vite 4, Tailwind CSS, Recharts, React Router |
| Mobile | Expo 54, React Native 0.81, Expo Router, NativeWind, WatermelonDB, MMKV, Zustand |
| Email | Resend (`RESEND_API_KEY`) |
| OTP | Telegram bot long-polling / webhook |
| Deployment | Render Blueprint (`render.yaml`), Vercel suitable for the web app |

---

## 5. Repository structure

```text
TradeS/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   │   ├── 20261119000000_init_baseline/
│   │   │   └── 20261120000000_pos_pro/
│   │   └── migration_lock.toml
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middlewares/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   └── server.js
│   ├── seed_products.js
│   ├── seed_pos.js
│   ├── .env.example
│   └── package.json
├── web/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── pages/pos/
│   │   ├── services/
│   │   └── i18n/
│   ├── .env.example
│   └── package.json
├── web/admin/
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── layouts/
│   │   └── router/
│   └── package.json
├── mobile/
│   ├── app/
│   ├── components/
│   ├── db/
│   ├── services/
│   ├── hooks/
│   ├── store/
│   ├── .env.example
│   └── package.json
├── docs/
│   ├── LAYOUTS.md
│   └── REPO_AUDIT.md
├── render.yaml
└── README.md
```

---

## 6. Core data model

```text
User ──< OrganizationMember >── Organization ──< Store ──< Register
                                       │             │
                                       │             └──< StoreInventory >── Product
                                       ├──< Customer
                                       ├──< SaleTransaction ──< Sale ──< ReturnItem
                                       │          ├──< Payment
                                       │          └──< RegisterShift
                                       └──< Return ──< ReturnItem

Organization ──> Plan
User ──< Sale (cashier) ──> Product
```

Important new fields:
- `Sale.transactionId` → `SaleTransaction`;
- `Sale.lineDiscount`, `Sale.taxAmount`;
- `SaleTransaction`: `saleNumber`, `receiptNumber`, `subtotal`, `discountAmount`, `taxAmount`, `totalAmount`, `paidAmount`, `changeAmount`, `paymentMethod`, `paymentStatus`, `status`, `syncId`;
- `Payment.method`: `CASH | CARD | MIXED`;
- `RegisterShift.status`: `OPEN | CLOSED`;
- `Return.status`: `PENDING | COMPLETED | CANCELLED`.

---

## 7. API

Base URL: `http://localhost:5000/api/v1`  
Health: `GET http://localhost:5000/health`

### Route groups

| Prefix | Description |
|---|---|
| `/auth` | register, login, OTP, refresh, logout, Google |
| `/users` | profile and user data |
| `/products` | product CRUD, stock, categories |
| `/cart`, `/wishlist` | customer features |
| `/orders` | orders |
| `/sales` | sales, created through offline sync |
| `/reports` | dashboard, daily/monthly reports |
| `/sync` | `push` / `pull` |
| `/ai` | AI assistant and analytics |
| `/admin` | admin management |
| `/audit-logs` | audit log |
| `/content`, `/settings`, `/support` | content, settings, support |
| `/telegram` | OTP and bot-related endpoints |

### Example: login

```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"+998901234567","password":"Test1234!"}'
```

The token is returned in `data.accessToken`.

### Example: create a sale

```bash
curl -X POST http://localhost:5000/api/v1/sales \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "productId": "<PRODUCT_ID>",
    "quantity": 2,
    "paymentMethod": "CASH",
    "syncId": "demo-sale-001"
  }'
```

The server does not trust client-sent `productName`, `sellPrice`, or `buyPrice` values — it reloads them from the catalog.

---

## 8. Local development

### Requirements
- Node.js 18+
- PostgreSQL 14+ (local: `localhost:5432/trades`)
- Telegram bot token (for OTP)
- Resend API key (for production email)

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
# Fill in DATABASE_URL, JWT secrets, TELEGRAM_BOT_TOKEN in .env

npx prisma migrate deploy
npx prisma generate
npm run seed:admin
npm run seed:products
npm run seed:pos
npm run dev
```

Server: `http://localhost:5000`, health: `/health`.

### 2. Web POS

```bash
cd web
npm install
cp .env.example .env
npm run dev
```

App: `http://localhost:5173`

### 3. Admin panel

```bash
cd web/admin
npm install
npm run dev
```

App: `http://localhost:5174`

### 4. Mobile app

```bash
cd mobile
npm install
cp .env.example .env
# Replace EXPO_PUBLIC_API_URL with your LAN IP or tunnel address
npm start
```

---

## 9. Verification commands

```bash
# Backend syntax
node --check backend/src/services/sale.service.js
node --check backend/src/services/sync.service.js
node --check backend/src/validators/sync.validator.js

# Prisma
cd backend && npx prisma validate

# Web build
cd web && npm run build

# Health
curl http://localhost:5000/health
```

Check that migrations were applied:

```bash
cd backend
npx prisma migrate status
```

---

## 10. Deployment

`render.yaml` describes the backend service:
- `buildCommand`: `npm install && npx prisma generate && npx prisma migrate deploy`
- `startCommand`: `node src/server.js`
- `healthCheckPath`: `/health`
- all secret values are entered in the Render dashboard (`sync: false` / `generateValue`).

Required production environment variables:
- `DATABASE_URL`
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `ADMIN_SETUP_KEY`, `ADMIN_SEED_PASSWORD`
- `CORS_ORIGIN`, `CLIENT_URL`
- `TELEGRAM_BOT_TOKEN`, `ADMIN_SUPPORT_CHAT_IDS`
- `RESEND_API_KEY`, `RESEND_FROM`

---

## 11. Security

- `.env`, `.env.local`, and other secret files are excluded from Git.
- `.env.example` contains placeholders only.
- No API keys are stored in source code.
- JWT, bcrypt, Helmet, CORS, rate limiting, and Joi validation are used.
- Sale prices and product names are revalidated on the server.
- Offline sales are protected from duplicates with `syncId`.

---

## 12. Roadmap

### Next POS milestone
- [ ] Multi-item cart (`SaleTransaction` + `Sale` line items).
- [ ] Payment screen: cash / card / mixed, change calculation.
- [ ] Receipt printing: printer + PDF / share sheet.
- [ ] Customer selection, discounts, and tax settings.
- [ ] Register shifts: open/close, cash drawer check.
- [ ] Returns flow (`Return` / `ReturnItem`).
- [ ] Enforce plan limits in services and UI.
- [ ] Supplier and purchase modules.
- [ ] Per-store inventory operations (`StoreInventory`).

### Integrations
- [ ] Payme / Click payment gateways.
- [ ] Full KZ / TJ / KG languages and currencies.
- [ ] QR code and barcode scanning.
- [ ] Real-time notifications.

---

## 13. Documentation

- [Completion checklist](./docs/COMPLETION_CHECKLIST.md) — all user-stated requirements, remaining work and acceptance criteria.
- [Screen and layout catalog](./docs/LAYOUTS.md) — every web, admin, and mobile screen in English.
- [Repository audit](./docs/REPO_AUDIT.md) — GitHub status, missing items, failing checks.
- [Docs index](./docs/index.md) — technical documentation index.

---

## 14. License

MIT — free to use and modify. See [LICENSE](./LICENSE).

**TradeS — simple, fast, and reliable sales management.**
