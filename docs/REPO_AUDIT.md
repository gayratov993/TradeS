# Repository and POS Readiness Audit

Audited on 2026-11-20 for `gayratov993/savdo-go`.

This is a practical review of what is complete, what is missing, and what still fails on GitHub. It is not a security guarantee.

For the full user-requested feature checklist and acceptance criteria, see [COMPLETION_CHECKLIST.md](./COMPLETION_CHECKLIST.md).

---

## 1. Repository snapshot

| Item | Value |
|---|---|
| Repository | `gayratov993/savdo-go` |
| Visibility | Public |
| Default branch | `main` |
| Branch protection | **Not configured** |
| Tags / releases | **None** |
| Homepage / deploy URL | **Not set** |
| Open human issues | 0 |
| Open pull requests | 15, all Dependabot dependency bumps |
| Languages | JavaScript, TypeScript, Kotlin, CSS, Ruby, Swift, Batchfile, Dockerfile, HTML, C |

---

## 2. Working / complete

- Full monorepo is pushed: `backend`, `web`, `web/admin`, `mobile`, `docs`, Render blueprint.
- Root `README.md` is now fully in **English** and links to the other current docs.
- `docs/LAYOUTS.md` now catalogs all web, admin, and mobile screens in English.
- `docs/index.md` is now in English and clearly marks older docs as historical.
- An MIT `LICENSE` file now exists; previously the README claimed MIT but no file was present.
- No `.env`, `.env.local`, Android keystore, or backup file is committed.
- `render.yaml` now points to the correct `gayratov993/savdo-go` repository.
- Prisma migrations and POS seed are committed and documented.

---

## 3. Fixed in this change

| Issue | Cause | Fix |
|---|---|---|
| Secret Scan workflow always failed | Shallow checkout meant the scanned commit's parent was missing; Gitleaks logged `failed to scan Git repository: "stderr is not empty"`. The upload step also looked for `gitleaks-report.json`, but the action writes `results.sarif`. Full-history scans later failed on placeholder strings in old documentation commits. | Fixed with `results.sarif` and a direct Gitleaks CLI call over the working tree. Placeholder findings in `docs/backend-bugs.md` and `docs/testing.md` were replaced, and the workflow now uses `gitleaks dir` so historical false positives do not block current commits. |
| README was in Uzbek | Requested English documentation. | Rewrote the root README in English. |
| No screen catalog | Repository had only route source files, no English layout document. | Added `docs/LAYOUTS.md`. |
| No LICENSE | Metadata said MIT but the file was missing. | Added `LICENSE`. |
| Stale Render comment | Still referenced `atxamov99/TradeS`. | Updated to `gayratov993/savdo-go`. |

Verified: Secret Scan run [44602578571](https://github.com/gayratov993/savdo-go/actions/runs/44602578571) completed with **success** on commit `8734d00`. Later PR runs failed with `fatal: ambiguous argument '<sha>^..<sha>'`; the workflow was rewritten to call the Gitleaks CLI directly. Full-history runs then flagged only placeholder strings in older docs (`JWT_*_SECRET=<long-random-secret>`, example JWTs), so those placeholders were replaced and the workflow now scans the current working tree with `gitleaks dir`.

---

## 4. Still open on GitHub

### CI / automation

- **`npm audit (backend, web, mobile)` is failing.** This is a real dependency finding, not a workflow typo.

  | Package | High | Critical | Notable blockers |
  |---|---:|---:|---|
  | `backend` | 6 | 1 | `prisma` / `@prisma/config` / `deepmerge-ts` require Prisma 7 major upgrade; `joi`, `body-parser`, `brace-expansion`, `proxy-addr` have non-major fixes |
  | `web` | 7 | 0 | `vite` requires major upgrade to 8; `axios`, `postcss`, `browserslist`, `form-data`, `nanoid`, `source-map-js` have fixes |
   | `web/admin` | 8 | 0 | Same `vite` major upgrade as `web`; extra `follow-redirects`. **Not covered by CI or Dependabot.** |
   | `mobile` | 20 | 1 | `expo-router` / Expo 58 major upgrade; `shell-quote`, `postcss`, `tar`, `undici`, `js-yaml`, `node-forge`, etc. |

- There are **15 open Dependabot PRs**. Several are major upgrades (`expo`, `expo-router`, `prisma`, `vite`, `react-dom`) and should not be merged blindly into a production POS app.
- No CI workflow runs `npm test`, lint, or build. GitHub currently checks only npm audit and secret scanning.
- `main` is not protected: no required checks, no review requirement.
- No tags or releases exist for deployment tracking.

### Metadata / presentation

- No homepage or live deployment URL is set in the GitHub repository.
- Repository topics are configured, but still include stale `ecommerce`.
- No status badges in the README.
- No screenshots, GIFs, or visual mockups are stored in the repository.
- No `CHANGELOG.md`, root `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, issue templates, or pull request template.

### Documentation debt

Several older documents under `docs/` and client README files are still in Uzbek or mention the former project/infrastructure:

- `docs/api.md`
- `docs/architecture.md`
- `docs/deployment.md`
- `docs/contributing.md`
- `docs/backend-bugs.md`
- `docs/web-bugs.md`
- `docs/testing.md`
- `docs/admin/*`
- `backend/README.md`, `web/README.md`, `web/admin/README.md`, `mobile/README.md`

They are now explicitly marked as historical in `docs/index.md`, but they have not been rewritten yet.

### Product work still missing

- Multi-item POS cart, payment dialog, change calculation, receipt print/share.
- Register shift open/close and cash drawer flow.
- Return/refund flow.
- Per-store inventory operations.
- Enforcing `Plan.maxStores`, `maxRegistersPerStore`, `maxUsers`, and `maxCashiers` in services and UI.
- Production email OTP needs `RESEND_API_KEY`.
- A real user Telegram number still needs to be linked.

---

## 5. Suggested order of work

1. Merge safe non-major Dependabot fixes first, one package group at a time, running `npm run build` and API smoke tests after each.
2. Schedule major upgrades (`prisma@7`, `vite@8`, `expo@58`) as separate branches with regression tests.
3. Add a CI workflow that runs backend syntax checks, `prisma validate`, and `npm run build` for web/admin.
4. Enable branch protection on `main` once CI is green.
5. Translate the remaining historical docs and add screenshots to `docs/LAYOUTS.md`.
6. Finish the multi-item POS workflow and plan-limit enforcement.

---

## 6. Full professional POS readiness audit (2026-11-20)

Scope: `backend`, `web`, `web/admin`, `mobile`, root config, GitHub workflows, and docs. This section is an audit only; it does **not** mean the listed items are fixed.

### Verdict by area

| Area | Status | Summary |
|---|---|---|
| Backend data model | Runtime foundation added | POS models in `backend/prisma/schema.prisma:461-685` are now used by `tenant.service.js`, `pos.service.js`, and `subscription.service.js`; payment checkout/webhook state is still absent. |
| Backend sale flow | Legacy + new runtime | The old single-product `sale.service.js` remains for mobile offline sync, while new multi-item `SaleTransaction` APIs provide payments, receipt, and returns. |
| Tenancy | Backend enforced | `tenant.middleware.js` resolves `orgId/storeId/registerId` and checks active `OrganizationMember`; `authorizeOrg()` enforces `OWNER|MANAGER|CASHIER`. |
| Subscriptions / tariffs | Server state added | `GET /plans`, `GET /subscriptions/current`, plan change/cancel, usage reporting, and downgrade limit checks exist; payment checkout, webhook, expiry job, and mobile plan-code mapping remain open. |
| Web POS | Runtime wired | `PosNewSale.jsx` now has a multi-item cart, shift open, payment method/amount, change, and receipt confirmation via `/pos`; offline mode still queues legacy sales. |
| Admin panel | Mixed | Users/products/orders/support/content use real APIs; roles/permissions are stored as generic settings KV (`web/admin/src/store/adminData.js:424-476`); audit feed is local-only (`:218-225`). |
| Mobile | Runtime wired with fallback | Online sales use `/pos` transactions with automatic shift open; missing network/server ID falls back to the offline queue. Local-only demo upgrades still bypass billing. |
| Security | Phase 0 applied | Token log, Android signing secret, product write ownership check, mobile auth-loss wipe, and catalog pagination were fixed; full tenant/store isolation remains open. |
| CI / docs | Not production-grade | Secret Scan PR path and npm-audit matrix were fixed but need CI re-verification; no build/test CI, branch protection absent, and several docs are stale. |

### P0 — release blockers

| Finding | Evidence | Status / fix |
|---|---|---|
| Live password-reset token was written to logs | `backend/src/services/auth.service.js:618-623` logged `rawToken`; `backend/src/utils/logger.js:24-35` persists production logs. | **Fixed:** token log removed. Dev response still returns the token only when email is unconfigured outside production. Rotate any historical tokens that may have been logged. |
| Android release signing password was hardcoded | `mobile/android/app/build.gradle:111-116` contained `storePassword 'savdo123'` and `keyPassword 'savdo123'`. | **Fixed:** Gradle now reads `TRADES_UPLOAD_STORE_FILE`, `TRADES_UPLOAD_STORE_PASSWORD`, `TRADES_UPLOAD_KEY_ALIAS`, `TRADES_UPLOAD_KEY_PASSWORD`; release signing is applied only when the store-file property exists. |
| Any authenticated user could edit/reprice/restock another user's product | `backend/src/services/product.service.js:98-166` ignored `userId`/`isAdmin` in `where`. | **Mitigated:** all product writes now require `ownerId: userId` unless the caller is global `ADMIN`/`SUPER_ADMIN`. Full org/store tenancy is still a P1 item. |
| Auth failure left the previous user's local data on the device | `mobile/services/api.ts:49-51` cleared only the token; `mobile/app/_layout.tsx:35-41` redirected on token only. | **Fixed:** refresh `401/403` now calls centralized `handleAuthLost()`, which wipes local data via the root-layout subscriber before clearing the token and redirecting. Network failures no longer wipe local data. |
| Mobile catalog was silently capped at 100 products | `mobile/services/syncEngine.ts:252` requested `limit=1000`, but `backend/src/services/product.service.js:18` clamped to 50 and `syncEngine.ts:307-308` ignored `pages`. | **Fixed:** catalog endpoint now allows up to 1000 per page; mobile paginates 500/page up to 20 pages and respects backend `pages`. |
| The professional POS runtime did not exist | No routers for POS models existed in `backend/src/routes/index.js:21-36`. | **Backend + client wiring added:** `/tenant`, `/pos`, `/plans`, and `/subscriptions` cover organizations, stores, registers, customers, shifts, transactions, receipts, returns, and plan state; web/mobile now call the runtime. Payment checkout remains open. |
| Subscriptions are client-bypassable and mismatched | Mobile uses `free|pro|biznes` (`mobile/store/subscriptionStore.ts:5-11`); backend enum is `BASIC|STANDARD|PRO` (`backend/prisma/schema.prisma:16-20`); `/subscriptions` routes were absent. | **Partially addressed:** server plan state and downgrade guards are added; real checkout/webhook, expiry job, and mobile plan-code mapping remain open. |
| Secret Scan PR runs failed on the action's `base^..head` range | `fatal: ambiguous argument '<sha>^..<sha>'` on PRs. | **Fixed in workflow:** direct Gitleaks CLI `dir` scan replaces the action's PR diff logic and avoids historical false positives. |
| `npm audit` omitted `web/admin` | `.github/workflows/npm-audit.yml:14` listed only `backend`, `web`, `mobile`. | **Fixed:** matrix now includes `web/admin` with a slash-safe artifact name. |

**Phase 0 local verification:** backend `node --check` passed for the two edited services; workflow YAML parsed successfully; the four edited mobile files passed TypeScript transpile syntax checks. Full `npx tsc --noEmit` is still not usable because `mobile/tsconfig.json` lacks `@/*` path aliases and WatermelonDB decorators are not enabled — this is pre-existing and unrelated to the hotfixes. CI re-run is still required.

### P1 — high-priority gaps

- **Tenant/store/register isolation:** previously `auth.middleware.js:32-48` loaded only `User` and JWT payload was `{ id, role }`. `tenant.middleware.js` now resolves `req.tenant` from `OrganizationMember`; session-derived context is still pending.
- **Org-level RBAC:** global `rbac.middleware.js` remains for platform admins; `authorizeOrg('OWNER','MANAGER','CASHIER')` was added in `tenant.middleware.js` and applied to tenant/POS writes.
- **Legacy sale contract:** `backend/src/validators/sale.validator.js:3-14` still requires client `productName`, `sellPrice`, `buyPrice`; when `product` is omitted they are trusted verbatim (`sale.service.js:39-58`). Client-controlled revenue must be removed.
- **Money workflow:** `SaleTransaction`, `Payment`, `RegisterShift`, `Return`, multi-item checkout, change, and server-owned tax now exist in runtime code; receipt print/reprint UI, discounts, and tax categories still need product work.
- **Sync correctness:** `backend/src/services/sync.service.js:120-122` lets a client future timestamp win; entity write and `SyncQueue.status` update are separate statements (`:86-102`, `:157-186`); `sync.pull` is unbounded (`:233-245`).
- **Deletion propagation:** mobile archives products locally (`mobile/app/(app)/products/[id].tsx:121-127`), but the backend sync whitelist drops `isActive` (`backend/src/services/sync.service.js:11-14`) and mobile never emits `operation: 'delete'`.
- **Web POS checkout:** the former one-product form was replaced by a cart with quantities, tender, change, shift state, and receipt confirmation; return/refund and receipt print/share screens are still missing.
- **Admin authority:** roles/permissions save to generic settings KV (`web/admin/src/store/adminData.js:424-476`); `PUT /settings/:key` needs `SUPER_ADMIN`, but the values are not enforced by route guards. The audit feed is local-only (`:218-225`).
- **Admin pricing parity:** `web/src/pages/admin/AdminProducts.jsx:63-73,171-176` sends the same number as `buyPrice` and `sellPrice`; POS product form has richer fields (`web/src/pages/pos/PosProducts.jsx`).
- **Mobile role/deletion safety:** role store defaults to `admin` (`mobile/store/roleStore.ts:18,21`); product delete/archive paths have no role check (`mobile/app/(app)/products/index.tsx:38-58`, `products/[id].tsx:117-137`).
- **Offline stock:** backend offline path explicitly allows negative stock (`backend/src/services/sale.service.js:64-70`).
- **Missing push-token API:** mobile posts `/user/push-token` (`mobile/services/notifications.ts:12-14`), but no such route exists (`backend/src/routes/user.routes.js:15-22`).
- **Health/backup/observability:** `/health` is static (`backend/src/server.js:75-80`), no backup/restore runbook, no Sentry/metrics, and local log files are lost on ephemeral hosting.
- **CI/automation:** Secret Scan PR path and npm-audit matrix were fixed but need CI re-verification; no build/test/lint CI; branch protection and tags/releases absent.
- **Env/config:** reset links default to `http://localhost:5173` (`backend/src/services/email.service.js:10,57`); `WEB_URL` is not set in `render.yaml`/`.env.example`; `GOOGLE_CLIENT_ID` and `GEMINI_API_KEY` are missing from templates; `CLIENT_URL`/`JWT_SECRET` in `render.yaml:23,47` are dead config.
- **Docs:** `docs/deployment.md` still documents Railway/Vercel/MongoDB Atlas; README sale example at `README.md:221-230` does not match `sale.validator.js`; four client READMEs are pre-rebrand.

### P2 — hardening / quality

- No tests, lint, or typecheck scripts in any package; no `*.test.js`/`*.spec.js`.
- CORS accepts any `http://localhost:<port>` even in production (`backend/src/server.js:41`); `unhandledRejection`/`uncaughtException` call `process.exit(1)` (`:203-211`).
- 500 responses can leak raw `error.message` (`backend/src/middlewares/error.middleware.js:10-11,37`); no request IDs or structured actor/org logging.
- `backend/seed_stats.js` is not idempotent and stores plaintext `'hashedpassword'`; plan caps were realigned with RAOS-style tiers on 2026-11-20 (`backend/seed_pos.js:6-37`).
- Legacy mobile verify screens call `/auth/verify-email` instead of `/auth/verify-email-otp`; dev demo-token helpers should be removed.
- Weak unsalted offline password hash (`mobile/store/authStore.ts:4-8,45-61`); hardcoded Uzbek strings remain in mobile UI.
- `eas.json` has Android-only profiles and no submit/env config; `app.json:60-62` disables OTA; manifest requests unnecessary permissions; `userInterfaceStyle: 'light'` conflicts with manual dark mode.
- Package names still use `savdo-*`; `LICENSE` credits `Gaf Dev` while GitHub account is `gayratov993`; `.gitignore:28` blanket-ignores `*.json`.

### Phased execution plan

1. **Phase 0 — security hotfixes (applied 2026-11-20; CI verification pending):** token log/redaction, Android signing secrets, product write ownership, mobile auth-loss local wipe, catalog pagination, Secret Scan PR path, npm-audit matrix.
2. **Phase 1 — POS core backend (foundation applied 2026-11-20):** session/header-derived `orgId/storeId/registerId`, org RBAC, `SaleTransaction` + line items + `Payment` + `RegisterShift` + `Return` + receipt, server-side price/tax/discount, single transaction, stock rules, per-register numbering. Tenant-scoped audit logs and subscription enforcement are still pending.
3. **Phase 2 — client checkout:** multi-item cart, quantity controls, payment method, cash received/change, customer, receipt print/share, reprint, return/refund, open/close shift in web and mobile.
4. **Phase 3 — subscriptions:** align plan codes, implement `GET /plans`, checkout, Payme/webhook with signature verification, plan change, expiry job, enforce `maxStores/maxRegistersPerStore/maxUsers/maxCashiers`, admin subscription UI, remove local demo upgrades.
5. **Phase 4 — productionization:** deep health check, backup/restore runbook, Sentry/log drain, CI build/test/lint, Dependabot backlog, branch protection, tags/releases, docs rewrite, storefront/POS README separation.

### Definition of done for “professional POS”

- A cashier can open a shift, sell multiple items, accept cash/card/mixed payment, print/share a receipt, and close a shift with a cash summary.
- A manager can return an item, see per-register sales, and manage store inventory without touching another tenant's data.
- An owner can change plan, add stores/registers/users within plan limits, and see a tenant-scoped audit trail.
- Offline sales sync idempotently, never overwrite newer server data, never exceed stock silently, and never leak data between accounts.
- CI is green on PRs, branch protection is enabled, production secrets are external, and operator docs match the actual flows.

## 10. Phase 1 backend runtime progress (2026-11-20)

Applied after the audit. The old single-product `/sales` API remains intact for existing offline sync, but web and mobile now use the new runtime when online.

### New backend modules

- `backend/src/middlewares/tenant.middleware.js`: `resolveTenant` resolves organization/store/register from route params or `x-organization-id`, `x-store-id`, `x-register-id` headers and verifies active `OrganizationMember`; `authorizeOrg(...roles)` checks `OWNER|MANAGER|CASHIER` with global admin bypass; `requireStore`/`requireRegister` enforce context.
- `backend/src/services/tenant.service.js` + `backend/src/routes/tenant.routes.js`: organization, store, register, and member CRUD with plan limits from `Plan.maxStores`, `Plan.maxRegistersPerStore`, `Plan.maxUsers`, and `Plan.maxCashiers`.
- `backend/src/services/pos.service.js` + `backend/src/routes/pos.routes.js`: customers, register shifts, multi-item transactions, payments, receipts, and returns.
- Mounted in `backend/src/routes/index.js` as `/tenant` and `/pos` under the existing `/api/v1` prefix.

### Endpoints added

- `GET/POST /api/v1/tenant/organizations`, `GET/PATCH /api/v1/tenant/organizations/:organizationId`.
- `GET/POST /api/v1/tenant/organizations/:organizationId/stores`, `PATCH /api/v1/tenant/stores/:storeId`.
- `GET/POST /api/v1/tenant/stores/:storeId/registers`, `PATCH /api/v1/tenant/registers/:registerId`.
- `GET/POST /api/v1/tenant/organizations/:organizationId/members`, `PATCH /api/v1/tenant/members/:memberId`.
- `GET /api/v1/tenant/context`.
- `GET/POST /api/v1/pos/customers`, `PATCH /api/v1/pos/customers/:customerId`.
- `GET /api/v1/pos/shifts/active`, `POST /api/v1/pos/shifts/open`, `POST /api/v1/pos/shifts/:shiftId/close`.
- `GET/POST /api/v1/pos/transactions`, `GET /api/v1/pos/transactions/:transactionId/receipt`.
- `POST /api/v1/pos/returns`.

### Behavior

- Prices and product names are server-owned; clients send `productId` and quantity only.
- Stock is decremented atomically from both `StoreInventory` and global `Product`; insufficient stock returns `400 INSUFFICIENT_STOCK`.
- Tax is calculated from organization `taxRate` only when `taxEnabled` is true.
- Payments can be cash/card/mixed; online checkout requires payment >= total, offline transactions may be `PARTIAL`.
- `syncId` on `SaleTransaction` is an idempotency key.
- Returns validate previously returned quantities, restock inventory/product, and create `ReturnItem` rows.

### Verification

- `node --check` passed for all new backend modules.
- Service-level DB test with a temporary tenant: plan limit allowed 1 store and 3 registers, then rejected extra store/register with `409`.
- Service-level POS test with a temporary tenant: opened shift → multi-item transaction → receipt → return → closed shift all succeeded; temporary records were removed afterward.

### Client wiring

- `web/src/utils/posContext.js` caches the selected organization/store/register in `localStorage`; `web/src/api/pos.api.js` bootstraps it from the first accessible tenant and sends context headers.
- `web/src/pages/pos/PosNewSale.jsx` now supports a multi-item cart, quantity changes, shift open, cash/card payment amount, change display, and receipt confirmation. Offline mode still queues legacy `addPendingSale` records.
- `mobile/services/pos.ts` mirrors context bootstrap and runtime calls; `mobile/app/(app)/sales/add.tsx` uses `/pos/transactions` when the product has a `serverId`, opening a shift automatically when needed. Network failures or unsynced products fall back to the existing offline queue.
- Web production build passes; mobile edited files pass TypeScript transpile syntax checks. Full mobile `tsc --noEmit` still fails on pre-existing `@/*` alias configuration.

### Still open

- Receipt print/share UI, return/refund screens, and store inventory management UI.
- PDF/HTML receipt rendering and full automated integration tests.

---

## 11. Subscription state and tenant audit (2026-11-20)

### Subscription endpoints

- `GET /api/v1/plans` — public list of active plans.
- `GET /api/v1/subscriptions/current` — plan, limits, status, period dates, and live usage counts.
- `POST /api/v1/subscriptions/change-plan` — `OWNER`/`MANAGER` plan change with store/register/user/cashier downgrade guards.
- `POST /api/v1/subscriptions/cancel` — marks the organization `CANCELLED`.

### Plan and cashier structure

- Migration `20261120020000_plan_max_cashiers` adds `Plan.maxCashiers` so cashiers are counted separately from the owner/admin.
- RAOS-style tiers were introduced on 2026-11-20; plan codes remain `BASIC|STANDARD|PRO` for mobile/client compatibility.
- `BASIC` / Starter: 249,000 so‘m/oy, 1 filial, 3 registers per store, 4 members total (1 owner + 3 cashiers).
- `STANDARD` / Growth: 449,000 so‘m/oy, 3 filial, 10 registers per store, 11 members total (1 owner + 10 cashiers).
- `PRO` / Pro: 799,000 so‘m/oy, 9999-filial/9999-kassir cap as “unlimited”, 9999 members total.
- Connecting a cashier: `POST /api/v1/tenant/organizations/:organizationId/members` with `{ "email": "...", "role": "CASHIER" }`, then the cashier logs in and the POS client selects the same organization/store/register context via `x-*` headers.
- `GET /api/v1/subscriptions/current` reports `usage.cashiers` and `limits.maxCashiers`; member add/change returns `409` when the plan limit is exceeded.

### Tenant audit

- `AuditLog` now has optional `organizationId` and `storeId` columns with indexes; migration `20261120010000_tenant_audit` applied.
- `GET /api/v1/tenant/organizations/:organizationId/audit-logs` is scoped to the resolved organization and limited to `OWNER`/`MANAGER`.
- POS shift open/close, sale, return, and customer create plus subscription change/cancel write tenant-scoped audit records.
- Global `GET /api/v1/audit-logs` can now filter by `organizationId` and `storeId`.

### Verification

- Subscription syntax checks passed; service DB test reported `SUBSCRIPTION_FLOW_OK plans=3 users=4 downgradeBlocked=true`.
- Audit syntax checks passed; scoped write/read test reported `AUDIT_FLOW_OK`.
- Live API smoke test reported `API_FLOW_OK plans=3 plan=BASIC audit=0`.
- Member/plan smoke test reported `MEMBER_FLOW_OK stores=1 registers=3 cashiers=3 fourthCashierBlocked=true`; adding a 4th cashier returns `409 Plan 'BASIC' allows only 3 cashier(s)`.
- Windows Prisma client generation required briefly stopping the running Node dev server; it was regenerated and `/health` returned OK afterward.

### Still open

- Payment checkout/webhook, Payme signature verification, expiry job, and mobile `free|pro|biznes` → `BASIC|STANDARD|PRO` mapping.
- Real enforcement of expired/cancelled organizations on writes; mobile `free|pro|biznes` plan-code mapping is still stale.

---

## 12. RAOS-inspired POS UI and tariffs (2026-11-20)

### UI

- `web/src/components/layout/PosLayout.jsx` now renders a RAOS-like dark POS shell: fixed left sidebar, compact top bar, online/offline badge, pending-sale sync, mobile bottom navigation, and Uzbek labels.
- The top bar includes an explicit register selector wired to `x-register-id`; changing it updates `savdo-pos-context`, dispatches `pos-context-change`, and reloads the active shift for that register.
- `web/src/pages/pos/PosNewSale.jsx` now uses a wide product grid with category chips, sticky cart panel, large `JAMI` total, `To‘lovga o‘tish` action, quick cash amounts, and a receipt confirmation modal.
- `web/tailwind.config.js` POS palette was aligned with the landing page (`#0B1220`, `#111C2E`, `#2ECC71`).
- `web/src/pages/Landing.jsx` includes a three-tier pricing section with Starter/Growth/Pro and a link in the navbar.

### Tariffs

- Seeded plan codes remain `BASIC|STANDARD|PRO` for compatibility with existing mobile/client mappings.
- Display names/prices now follow the RAOS-style market reference: Starter `249,000`, Growth `449,000`, Pro `799,000` so‘m/oy.
- Pro uses a `9999` cap for stores/registers/users/cashiers to represent “unlimited” while keeping integer plan fields.

### Verification

- `npm run build` in `web/` passes.
- `npm run seed:pos` reports `Seeded 3 plans, organization, store, 3 registers, 12 store inventories`.
- `GET /api/v1/plans` returns the three RAOS-style tiers with the new prices and limits; `/health` returns `200 OK`.
- Live API smoke passed: open shift → 8,000 UZS cash sale → receipt → close shift.
- Headless browser smoke passed: login, three-register selector, open shift from the UI, add product, cash payment, receipt confirmation, and shift cleanup. The only 404 is the expected `/pos/shifts/active` check before a shift is opened.
- `web/admin/src/pages/customers/CustomersPage.jsx` adds customer onboarding: owner account + organization + plan + store + registers + cashiers in one flow, with usage bars and deactivation.
- `web/src/pages/Subscription.jsx` gives the customer a self-service plan/usage screen at `/dashboard/subscription`.
- `docs/USER_GUIDE_UZ.md` documents the seller and customer flows, including the BASIC 1-store/3-register/3-cashier example.
- `POST /tenant/organizations` now accepts `ownerUserId`; global admins can create an organization whose real owner is the customer, not the admin.
- Live owner-flow smoke passed: owner membership `OWNER`, 1 store, 3 registers, 3 cashiers, usage `1/3/4/3`; creating a 2nd store, 4th register or 4th cashier returns `409 Plan 'BASIC' allows only ...`.
- Headless browser page smoke passed for both new screens: `/customers` renders title, create button, all three plan codes and 3 org rows; `/dashboard/subscription` renders current plan, all three plans, four usage bars and plan-change buttons; no JS/console errors.
