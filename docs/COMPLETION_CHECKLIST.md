# Savdo Go Completion Checklist

Status: **IN PROGRESS — not complete yet.**

This is the single source of truth for what the user asked for, what is already done, and what still has to be finished before Savdo Go can be called a complete professional POS platform. It is intentionally written in English, matching the current GitHub documentation.

Last updated: 2026-11-20. For the code-level audit behind this checklist, see [REPO_AUDIT.md §6](./REPO_AUDIT.md#6-full-professional-pos-readiness-audit-2026-11-20).

---

## 1. Quick answer

| Area | State |
|---|---|
| Backend API, auth, products, sales, reports, offline sync | Done and smoke-tested |
| PostgreSQL schema, migrations, POS seed | Done |
| Organizations, stores, registers, plans in the database | Done |
| Web POS, admin panel, mobile app basic screens | Working |
| English README, layouts catalog, repository audit | Done |
| Multi-item POS checkout in web + mobile | Done in web; mobile wired |
| Payment screen, change calculation, receipt print/share | Payment/receipt screens done; print/share pending |
| Register shifts, returns, per-store inventory operations | Backend runtime done; dedicated UI pending |
| Plan limits enforced in code/UI | Backend + web/admin + customer subscription UI done |
| Production email OTP, real Telegram phone link, live deploy | **Not done** |
| CI build/test, branch protection, release/tag | **Not done** |

---

## 2. Things explicitly requested by the user

### 2.1 Subscription and POS decisions

- [x] `BASIC` / Starter: 1 store, 3 registers, 249,000 so‘m/oy.
- [x] `STANDARD` / Growth: up to 3 stores, 10 cashiers, 449,000 so‘m/oy.
- [x] `PRO` / Pro: effectively unlimited branches/cashiers, 799,000 so‘m/oy.
- [x] Cash and card payments must produce a receipt.
- [x] Build the data model for a professional POS.
- [x] Create Prisma schema and migrations.
- [x] Enforce the plan limits in backend services, admin onboarding UI and customer subscription screen.
- [x] Make the cash/card receipt flow reachable from the actual checkout screen.

Acceptance criteria:
- Creating a 2nd store on `BASIC` returns a clear API error and is shown in the admin UI.
- Creating a 4th register in one store on `BASIC` is blocked by the API.
- Choosing cash or card in the POS creates a `Payment` and a receipt screen; print/share is still pending.
- Live owner-flow smoke verified `OWNER` + 3 registers + 3 cashiers on BASIC, with 2nd store / 4th register / 4th cashier blocked by `409`.

### 2.2 GitHub and documentation requests

- [x] Push the whole project to GitHub.
- [x] Rewrite the GitHub README in English.
- [x] Review the GitHub repository.
- [x] Add all web/admin/mobile layouts as an English Markdown catalog.
- [x] Report what is missing on GitHub.
- [x] Add the user-stated requirements to a single completion checklist.
- [ ] Translate the remaining older `docs/*` and client README files into English.
- [ ] Add screenshots or visual mockup exports to the layout catalog.
- [ ] Add a live deployment URL / homepage to the GitHub repository.

Acceptance criteria:
- Every current document linked from `docs/index.md` is English or clearly marked historical.
- `docs/LAYOUTS.md` contains at least one screenshot/mockup reference per major flow when visual assets are available.
- The repository homepage points to a working deployed web POS or API health page.

---

## 3. Remaining product work

### 3.1 Multi-item POS checkout — HIGH

- [ ] Add/remove line items in the web POS cart.
- [ ] Change quantity per line item.
- [ ] Per-line discount and tax.
- [ ] Server creates one `SaleTransaction` with multiple `Sale` rows atomically.
- [ ] Stock is decremented atomically for every line item.
- [ ] Idempotent offline replay using `syncId`.
- [ ] Mirror the same flow in the mobile app.

Acceptance criteria:
- A 3-product sale creates 1 transaction, 3 sale lines, and 3 correct stock decrements.
- Retrying the same `syncId` does not duplicate the sale or decrement stock twice.
- Insufficient stock for any line rejects the entire transaction with `INSUFFICIENT_STOCK`.

### 3.2 Payment and change — HIGH

- [ ] Payment screen: cash / card / mixed.
- [ ] Cash amount entered by cashier; change calculated automatically.
- [ ] Card reference / last digits field where applicable.
- [ ] Save `Payment.method`, `amount`, `paidAmount`, `changeAmount`.
- [ ] Update `SaleTransaction.paymentStatus` correctly.

Acceptance criteria:
- `paidAmount >= totalAmount` is required for completed cash sales.
- Mixed payment totals equal the transaction total.
- Change is never negative.

### 3.3 Receipt — HIGH

- [ ] Receipt preview after successful sale.
- [ ] Print via browser/thermal printer.
- [ ] PDF download or share sheet on mobile.
- [ ] Receipt number, date, store, register, cashier, items, totals, payment, change.
- [ ] Optional QR code on receipt.

Acceptance criteria:
- A completed sale can produce a receipt without reloading the page/app.
- Receipt data matches the stored `SaleTransaction`.

### 3.4 Customer, discount, tax — MEDIUM

- [ ] Select or create a customer during checkout.
- [ ] Link `SaleTransaction.customerId`.
- [ ] Transaction-level discount.
- [ ] Configurable tax rate per organization/store.
- [ ] Recalculate totals on the server, never trust client totals.

Acceptance criteria:
- Customer appears in sale history and reports.
- Discount and tax are persisted and reflected in revenue/profit reports.

### 3.5 Register shifts — HIGH

- [ ] Open shift with starting cash.
- [ ] Assign cashier and register.
- [ ] Link transactions to `RegisterShift`.
- [ ] Close shift with expected vs actual cash.
- [ ] Shift summary report.

Acceptance criteria:
- A register cannot record sales while no shift is open.
- Closing a shift produces a cash difference report.

### 3.6 Returns and refunds — HIGH

- [ ] Return screen from a sale/transaction.
- [ ] Select returned items and quantities.
- [ ] Prevent returning more than sold.
- [ ] Restore stock atomically.
- [ ] Refund method: cash/card/mixed.
- [ ] `Return` / `ReturnItem` status lifecycle.

Acceptance criteria:
- Returning an already-returned quantity is rejected.
- Stock is restored exactly once.
- Reports subtract returned amounts.

### 3.7 Per-store inventory operations — MEDIUM

- [ ] Use `StoreInventory` in POS product lists instead of global `stock`.
- [ ] Stock transfer between stores.
- [ ] Stock count / adjustment with reason.
- [ ] Low-stock alert per store and globally.

Acceptance criteria:
- Selling from Store A decrements Store A inventory only.
- Transfer updates both stores in one database transaction.

### 3.8 Supplier and purchase flow — MEDIUM

- [ ] Supplier list/detail already exists on mobile; add it to web/admin.
- [ ] Purchase order creation.
- [ ] Receive goods into a store.
- [ ] Update `buyPrice` and `StoreInventory`.

Acceptance criteria:
- Receiving a purchase increases stock and updates average cost.

---

## 4. Integrations still missing

- [ ] Payme payment gateway.
- [ ] Click payment gateway.
- [ ] Full KZ / TJ / KG languages and currencies.
- [ ] QR code and barcode scanning.
- [ ] Real-time notifications (WebSocket/SSE/push).

Priority: do these only after the core POS checkout, receipt, shift, and return flows are complete.

---

## 5. Production readiness

- [ ] Obtain and configure `RESEND_API_KEY` for production email OTP.
- [ ] Link the real user's Telegram phone number to the bot.
- [ ] Deploy the backend through `render.yaml`.
- [ ] Deploy web POS and admin panel.
- [ ] Set GitHub homepage to the live URL.
- [ ] Add production environment variables to Render/Vercel dashboards.
- [ ] Run `npx prisma migrate deploy` in the release pipeline.
- [ ] Smoke-test login, OTP, product sync, sale, receipt, and reports in production.

Acceptance criteria:
- A new real user can register, verify OTP, create a sale, and print a receipt in production.

---

## 6. GitHub engineering gaps

- [ ] Fix high/critical `npm audit` findings.
- [ ] Review and merge safe Dependabot PRs one at a time.
- [ ] Treat major upgrades separately: Prisma 7, Vite 8, Expo 58 / Expo Router 58.
- [ ] Add CI that runs syntax checks, `prisma validate`, web build, admin build, and tests.
- [ ] Protect `main` with required checks and review.
- [ ] Add tags/releases for versions.
- [ ] Add `CHANGELOG.md`, root `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, issue and PR templates.
- [ ] Add badges to README once CI and deploy are live.

Current audit details: [REPO_AUDIT.md](./REPO_AUDIT.md)

---

## 7. Recommended execution order

1. Multi-item checkout in backend + web + mobile.
2. Payment screen and change calculation.
3. Receipt preview / print / PDF / share.
4. Register shifts.
5. Returns and refunds.
6. Plan-limit enforcement.
7. Per-store inventory operations.
8. Production OTP, real Telegram number, deploy.
9. CI, branch protection, releases.
10. Optional integrations: Payme/Click, languages/currencies, QR/barcode, real-time notifications.
11. Documentation translation and screenshots.

---

## 8. Definition of "project complete"

Savdo Go can be called complete only when:

- A cashier can open a shift, sell multiple items, take cash/card/mixed payment, give change, print/share a receipt, and close the shift.
- A manager can return items, see correct reports, manage per-store stock, and stay within the subscription limits.
- An admin can manage users, roles, stores, registers, and plans from the UI.
- Offline sales sync idempotently without duplicating stock movements.
- Production OTP, deploy, CI, and monitoring all work with real users.
- All current documentation is English and linked from `docs/index.md`.
