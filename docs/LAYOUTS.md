# TradeS Screen and Layout Catalog

This document lists every application screen in the repository, grouped by client. It is generated from the current router and page files (source reviewed on 2026-11-20). No Figma file or exported mockup images are stored in the repository, so this Markdown file is the canonical text catalog of the current layouts.

Legend:
- **Working** — route exists and is part of the current app.
- **Alias** — route exists only as a redirect.
- **Gap** — route exists but the intended workflow is not complete yet.

---

## 1. Web POS app (`web`, port 5173)

### Layout shells

| Shell | Source | Purpose |
|---|---|---|
| `Landing` public shell | `web/src/pages/Landing.jsx` | Marketing landing page, no app chrome |
| `Layout` storefront shell | `web/src/components/layout/Layout.jsx` | Customer-facing shop wrapper |
| `AppLayout` dashboard shell | `web/src/components/layout/AppLayout.jsx` | Authenticated user dashboard wrapper |
| `PosLayout` POS shell | `web/src/components/layout/PosLayout.jsx` | Cashier workspace with POS navigation and mobile padding |

### Public and storefront screens

| Route | Screen | Source | Status | Notes |
|---|---|---|---|---|
| `/` | Landing | `pages/Landing.jsx` | Working | Public entry point |
| `/login` | Login | `pages/Login.jsx` | Working | Guest-only |
| `/register` | Register | `pages/Register.jsx` | Working | Guest-only |
| `/forgot-password` | Forgot password | `pages/auth/ForgotPasswordPage.jsx` | Working | Email/phone recovery entry |
| `/reset-password` | Reset password | `pages/auth/ResetPasswordPage.jsx` | Alias | Redirects to `/forgot-password`; actual reset screen is not routed |
| `/shop` | Shop alias | `App.jsx` | Alias | Redirects to `/products` |
| `/products` | Product list | `pages/Home.jsx` | Working | Customer catalog |
| `/products/:slug` | Product detail | `pages/ProductDetail.jsx` | Working | Uses catalog slug |
| `/cart` | Cart | `pages/Cart.jsx` | Working | Customer cart |
| `/checkout` | Checkout | `pages/Checkout.jsx` | Working | Customer order flow |
| `/wishlist` | Wishlist | `pages/Wishlist.jsx` | Working | Saved products |

### Authenticated dashboard screens

| Route | Screen | Source | Status | Notes |
|---|---|---|---|---|
| `/dashboard` | Dashboard | `pages/Dashboard.jsx` | Working | Revenue, profit, sales, stock |
| `/dashboard/products` | Products | `pages/Products.jsx` | Working | Product management |
| `/dashboard/sales` | Sales | `pages/Sales.jsx` | Working | Sales history |
| `/dashboard/reports` | Reports | `pages/Reports.jsx` | Working | Daily/monthly reports |
| `/dashboard/settings` | Settings | `pages/Settings.jsx` | Working | Account/app settings |
| `/dashboard/profile` | Profile | `pages/Profile.jsx` | Working | User profile |

### Web admin screens (inside the web app)

| Route | Screen | Source | Status | Notes |
|---|---|---|---|---|
| `/dashboard/admin` | Admin dashboard | `pages/admin/AdminDashboard.jsx` | Working | `ADMIN` / `SUPER_ADMIN` only |
| `/dashboard/admin/users` | Admin users | `pages/admin/AdminUsers.jsx` | Working | User management |
| `/dashboard/admin/orders` | Admin orders | `pages/admin/AdminOrders.jsx` | Working | Order management |
| `/dashboard/admin/products` | Admin products | `pages/admin/AdminProducts.jsx` | Working | Product moderation |

### POS workspace screens

| Route | Screen | Source | Status | Notes |
|---|---|---|---|---|
| `/pos` | POS dashboard | `pages/pos/PosDashboard.jsx` | Working | Cashier home |
| `/pos/products` | POS products | `pages/pos/PosProducts.jsx` | Working | Shows buy/sell prices; still global catalog, not per-store stock |
| `/pos/sales` | POS sales | `pages/pos/PosSales.jsx` | Working | Sale history |
| `/pos/sales/new` | New sale | `pages/pos/PosNewSale.jsx` | **Gap** | Single-item checkout; multi-item cart, payment screen, receipt and register shift not wired yet |
| `/pos/reports` | POS reports | `pages/pos/PosReports.jsx` | Working | POS-specific reporting |

Catch-all: `*` redirects to `/`.

---

## 2. Standalone admin panel (`web/admin`, port 5174)

### Layout shells

| Shell | Source | Purpose |
|---|---|---|
| `AdminLayout` | `src/layouts/AdminLayout.jsx` | Authenticated admin wrapper with sidebar/topbar |
| `RequireAuth` guard | `src/router/index.jsx` | Allows only `ADMIN` / `SUPER_ADMIN` |
| `GuestOnly` guard | `src/router/index.jsx` | Keeps authenticated users away from login |

### Screens

| Route | Screen | Source | Status | Notes |
|---|---|---|---|---|
| `/login` | Admin login | `pages/auth/LoginPage.jsx` | Working | Guest-only |
| `/sso` | SSO callback | `pages/auth/SsoPage.jsx` | Working | Token-based entry from the web app |
| `/dashboard` | Dashboard | `pages/dashboard/DashboardPage.jsx` | Working | Default admin landing |
| `/notifications` | Notifications | `pages/notifications/NotificationsPage.jsx` | Working | Admin notifications |
| `/users` | Users | `pages/users/UsersPage.jsx` | Working | User list |
| `/users/:id` | User detail | `pages/users/UserDetailPage.jsx` | Working | User profile/edit |
| `/admins` | Admins alias | `pages/users/UsersPage.jsx` | Alias | Same screen as `/users` |
| `/customers` | Customers alias | `router/index.jsx` | Alias | Redirects to `/users` |
| `/products` | Products | `pages/products/ProductsPage.jsx` | Working | Product administration |
| `/orders` | Orders | `pages/orders/OrdersPage.jsx` | Working | Order administration |
| `/support` | Support | `pages/support/SupportPage.jsx` | Working | Support requests |
| `/content` | Content | `pages/content/ContentPage.jsx` | Working | Content management |
| `/reports` | Reports | `pages/reports/ReportsPage.jsx` | Working | Admin reports |
| `/roles` | Roles | `pages/roles/RolesPage.jsx` | Working | Role management |
| `/permissions` | Permissions | `pages/permissions/PermissionsPage.jsx` | Working | Permission matrix |
| `/settings` | Settings | `pages/settings/SettingsPage.jsx` | Working | Admin settings |
| `/forgot-password` | Forgot password | `pages/auth/ForgotPasswordPage.jsx` | Working | Exists in source |
| `/reset-password` | Reset password | `pages/auth/ResetPasswordPage.jsx` | Working | Exists in source |
| `*` | Not found | `pages/not-found/NotFoundPage.jsx` | Working | 404 screen |

---

## 3. Mobile app (`mobile`, Expo Router)

### Navigation shells

| Shell | Source | Purpose |
|---|---|---|
| `RootLayout` | `app/_layout.tsx` | Loads token/user/lang/theme/role, starts background sync, redirects to `(app)` or `(auth)` |
| `AuthLayout` | `app/(auth)/_layout.tsx` | Stack for authentication screens |
| `AppLayout` | `app/(app)/_layout.tsx` | Bottom tabs: Home, Sales, Products, Profile |

Hidden from the tab bar but still routable: Reports, Customers, Suppliers.

### Authentication screens

| Route | Screen | Source | Status | Notes |
|---|---|---|---|---|
| `/(auth)` | Auth entry | `app/(auth)/index.tsx` | Working | Initial auth screen |
| `/(auth)/login` | Login | `app/(auth)/login.tsx` | Working | Phone/password entry |
| `/(auth)/register` | Register | `app/(auth)/register.tsx` | Working | New account |
| `/(auth)/verify` | Phone OTP verify | `app/(auth)/verify.tsx` | Working | Telegram OTP |
| `/(auth)/verify-email` | Email OTP verify | `app/(auth)/verify-email.tsx` | Working | Email confirmation |
| `/(auth)/pin` | PIN screen | `app/(auth)/pin.tsx` | Working | PIN unlock/setup |
| `/(auth)/forgot-password` | Forgot password | `app/(auth)/forgot-password.tsx` | Working | Recovery entry |

### Main tabs and nested screens

| Route | Screen | Source | Status | Notes |
|---|---|---|---|---|
| `/(app)` | Home | `app/(app)/index.tsx` | Working | Dashboard/home tab |
| `/(app)/sales` | Sales list | `app/(app)/sales/index.tsx` | Working | Sales tab |
| `/(app)/sales/add` | New sale | `app/(app)/sales/add.tsx` | **Gap** | Single-item checkout; cart, payment method, change and receipt are missing |
| `/(app)/products` | Products | `app/(app)/products/index.tsx` | Working | Products tab with low-stock badge |
| `/(app)/products/add` | Add product | `app/(app)/products/add.tsx` | Working | Create product |
| `/(app)/products/[id]` | Product detail | `app/(app)/products/[id].tsx` | Working | View/edit product |
| `/(app)/reports` | Reports | `app/(app)/reports/index.tsx` | Working | Hidden tab route |
| `/(app)/customers` | Customers | `app/(app)/customers/index.tsx` | Working | Hidden tab route |
| `/(app)/customers/add` | Add customer | `app/(app)/customers/add.tsx` | Working | Create customer |
| `/(app)/customers/[id]` | Customer detail | `app/(app)/customers/[id].tsx` | Working | View/edit customer |
| `/(app)/suppliers` | Suppliers | `app/(app)/suppliers/index.tsx` | Working | Hidden tab route |
| `/(app)/suppliers/add` | Add supplier | `app/(app)/suppliers/add.tsx` | Working | Create supplier |
| `/(app)/suppliers/[id]` | Supplier detail | `app/(app)/suppliers/[id].tsx` | Working | View/edit supplier |
| `/(app)/settings` | Settings | `app/(app)/settings/index.tsx` | Working | Profile tab target |
| `/(app)/settings/subscription` | Subscription | `app/(app)/settings/subscription.tsx` | Working | Current plan view |
| `/(app)/settings/employees` | Employees | `app/(app)/settings/employees/index.tsx` | Working | Staff list |
| `/(app)/settings/employees/add` | Add employee | `app/(app)/settings/employees/add.tsx` | Working | Invite/create staff |

---

## 4. Screens still missing from every client

These are present in the database schema but have no dedicated layout yet:

| Missing screen / flow | Needed in | Priority |
|---|---|---|
| Multi-item cart with line discounts and tax | Web POS + mobile | High |
| Payment dialog: cash / card / mixed + change | Web POS + mobile | High |
| Receipt preview, print, PDF/share | Web POS + mobile | High |
| Register shift open/close and cash drawer | Web POS + mobile | High |
| Sale return / refund flow | Web POS + mobile | High |
| Plan limit UI (stores, registers, users) | Web POS + admin + mobile | High |
| Per-store stock transfer/count (`StoreInventory`) | Web POS + mobile | Medium |
| Purchase / supplier order flow | Web POS + admin + mobile | Medium |
| Reset-password routed screen in web | Web | Low |
| Visual mockup exports / Figma link | Repository docs | Low |
