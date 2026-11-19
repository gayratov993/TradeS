# TradeS — savdo va professional POS boshqaruv platformasi

TradeS — O‘zbekiston va MDH bozori uchun mo‘ljallangan, oflayn birinchi (offline-first) savdo boshqaruv tizimi. Loyiha bitta monorepo ichida **backend API**, **veb POS**, **admin panel** va **Expo mobil ilova**ni birlashtiradi.

Asosiy maqsad: kichik do‘kondan 10 filialgacha bo‘lgan bizneslar uchun mahsulot, savdo, hisobot, xodim, kassa va obuna boshqaruvini yagona tizimda ta’minlash.

---

## 1. Hozirgi holat

| Soha | Holat |
|---|---|
| Backend API | Ishlayapti: auth, products, sales, orders, reports, sync, AI, admin, audit, support, telegram |
| Database | PostgreSQL + Prisma 6, migratsiyalar qo‘llanilgan |
| subscription / tashkilot / do‘kon / kassa | Schema + migration + seed tayyor |
| Veb POS | Ishlayapti: mahsulotlar, savdo, hisobotlar, oflayn sinxronizatsiya |
| Admin panel | Ishlayapti: foydalanuvchilar, mahsulotlar, buyurtmalar, rollar, hisobotlar |
| Mobil ilova | Ishlayapti: mahsulotlar, savdo, oflayn WatermelonDB, sync engine |
| Telegram OTP | `@trades_otp_bot` orqali ishlaydi |
| Ko‘p mahsulotli POS cart / chek / kassa smenasi | Roadmap bosqichida (schema tayyor) |

> Oxirgi muhim o‘zgarish: POS arxitekturasi uchun `Plan`, `Organization`, `Store`, `Register`, `SaleTransaction`, `Payment`, `RegisterShift`, `Return`, `StoreInventory` modellari qo‘shildi va bazaga qo‘llandi.

---

## 2. Imkoniyatlar

### Authentification
- Telefon + Telegram OTP (bot orqali kod yuborish).
- Email + parol va email OTP (dev rejimda `devCode` ko‘rinadi).
- Google OAuth.
- JWT access/refresh tokenlar, role-based access.

### Mahsulotlar
- Global mahsulot katalogi: barcha foydalanuvchilar bir katalogdan foydalanadi.
- `buyPrice` / `sellPrice` alohida saqlanadi; foyda avtomatik hisoblanadi.
- Qoldiq `stock`, qo‘shimcha o‘lchov birligi `unit`, kategoriya, brend, rasm.
- O‘chirilgan mahsulotlar oflayn klientlarga `deletedProductIds` bilan uzatiladi.

### Savdo
- Tez savdo kiritish (veb va mobil).
- Server tomonidan narx, mahsulot nomi va birlik qayta tekshiriladi — klient narxni soxtalashtira olmaydi.
- Atomik qoldiq kamaytirish: `stock >= quantity` sharti bilan `updateMany`.
- Oflayn savdolar `syncId` bilan idempotent yuboriladi; qayta yuborish takroriy savdo yaratmaydi.
- Oflayn savdolarda vaqtinchalik manfiy qoldiq faqat `allowOffline` bilan ruxsat etiladi.

### Hisobotlar
- Dashboard: daromad, foyda, savdolar soni, mahsulot qoldiqlari.
- Kunlik/oylik hisobotlar, top mahsulotlar.
- Kam qoldiq hisoboti barcha tashkilotlar bo‘yicha filtrsiz ishlaydi.

### Oflayn sinxronizatsiya
- Veb: IndexedDB (`offlineDB.js`) + `webSyncService`.
- Mobil: WatermelonDB + `syncEngine`.
- `/sync/push` va `/sync/pull`; `clientUpdatedAt` soniya yoki ISO datetime qabul qiladi.
- Mahsulot pull global; savdo/hisobot ma’lumotlari ham global.

### Admin va xavfsizlik
- Super Admin / Admin / User rollari.
- Audit loglar, rate limiting, Helmet, CORS whitelist.
- Foydalanuvchi massivlariga qarshi Joi validatsiyasi.
- Test foydalanuvchilari uchun muddatli tozalash mexanizmi bor.

---

## 3. Obuna tariflari

`npm run seed:pos` bilan 3 ta tarif yaratiladi:

| Tarif | Do‘kon | Har do‘konda kassa | Foydalanuvchi | Oylik narx |
|---|---:|---:|---:|---:|
| `BASIC` — Oddiy | 1 | 3 | 3 | 0 UZS |
| `STANDARD` — O‘rta | 3 | 5 | 10 | 99 000 UZS |
| `PRO` — Katta | 10 | 10 | 50 | 299 000 UZS |

Seed shuningdek quyidagilarni yaratadi:
- `TradeS` tashkiloti (`slug: trades-main`),
- `Asosiy do‘kon` (`MAIN-001`),
- `Kassa 1`, `Kassa 2`, `Kassa 3`,
- admin foydalanuvchini tashkilotga `OWNER` sifatida bog‘laydi,
- barcha aktiv mahsulotlar uchun `StoreInventory` qoldiqlarini ko‘chiradi.

---

## 4. Texnologiyalar

| Qatlam | Texnologiya |
|---|---|
| Backend | Node.js 18+, Express 4, Joi, Winston, Morgan, Helmet, JWT, bcryptjs |
| DB / ORM | PostgreSQL 17, Prisma 6 |
| Veb | React 18, Vite 4, Tailwind CSS, TanStack Query, Zustand, React Router, i18next, IndexedDB |
| Admin | React 18, Vite 4, Tailwind CSS, Recharts, React Router |
| Mobil | Expo 54, React Native 0.81, Expo Router, NativeWind, WatermelonDB, MMKV, Zustand |
| Email | Resend (`RESEND_API_KEY`) |
| OTP | Telegram bot long-polling / webhook |
| Deploy | Render Blueprint (`render.yaml`), Vercel (veb uchun mos) |

---

## 5. Papka tuzilishi

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
├── render.yaml
└── README.md
```

---

## 6. Asosiy ma’lumotlar modeli

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

Muhim yangi maydonlar:
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

### Route guruhlari

| Prefix | Tavsif |
|---|---|
| `/auth` | register, login, OTP, refresh, logout, Google |
| `/users` | profil va foydalanuvchi ma’lumotlari |
| `/products` | mahsulot CRUD, qoldiq, kategoriyalar |
| `/cart`, `/wishlist` | mijoz funksiyalari |
| `/orders` | buyurtmalar |
| `/sales` | savdolar, offline sync orqali yaratish |
| `/reports` | dashboard, kunlik/oylik hisobotlar |
| `/sync` | `push` / `pull` |
| `/ai` | AI yordamchi va tahlil |
| `/admin` | admin boshqaruvi |
| `/audit-logs` | audit jurnali |
| `/content`, `/settings`, `/support` | kontent, sozlamalar, yordam |
| `/telegram` | OTP va bot bilan bog‘liq endpointlar |

### Misol: login

```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"+998901234567","password":"Test1234!"}'
```

Javobda token `data.accessToken` ichida bo‘ladi.

### Misol: savdo yaratish

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

Server klient yuborgan `productName`, `sellPrice`, `buyPrice` qiymatlariga ishonmaydi — katalogdan qayta oladi.

---

## 8. Mahalliy ishga tushirish

### Talablar
- Node.js 18+
- PostgreSQL 14+ (lokal: `localhost:5432/trades`)
- Telegram bot token (OTP uchun)
- Resend API key (production email uchun)

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
# .env ichida DATABASE_URL, JWT secretlar, TELEGRAM_BOT_TOKEN ni to‘ldiring

npx prisma migrate deploy
npx prisma generate
npm run seed:admin
npm run seed:products
npm run seed:pos
npm run dev
```

Server: `http://localhost:5000`, health: `/health`.

### 2. Veb POS

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

### 4. Mobil

```bash
cd mobile
npm install
cp .env.example .env
# EXPO_PUBLIC_API_URL ni LAN IP yoki tunnel manziliga o‘zgartiring
npm start
```

---

## 9. Tekshiruv buyruqlari

```bash
# Backend sintaksis
node --check backend/src/services/sale.service.js
node --check backend/src/services/sync.service.js
node --check backend/src/validators/sync.validator.js

# Prisma
cd backend && npx prisma validate

# Veb build
cd web && npm run build

# Health
curl http://localhost:5000/health
```

Migratsiyalar bazaga qo‘llanganligini tekshirish:

```bash
cd backend
npx prisma migrate status
```

---

## 10. Deploy

`render.yaml` backend xizmatini tavsiflaydi:
- `buildCommand`: `npm install && npx prisma generate && npx prisma migrate deploy`
- `startCommand`: `node src/server.js`
- `healthCheckPath`: `/health`
- barcha maxfiy qiymatlar Render dashboard’ida kiritiladi (`sync: false` / `generateValue`).

Production uchun zarur env:
- `DATABASE_URL`
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `ADMIN_SETUP_KEY`, `ADMIN_SEED_PASSWORD`
- `CORS_ORIGIN`, `CLIENT_URL`
- `TELEGRAM_BOT_TOKEN`, `ADMIN_SUPPORT_CHAT_IDS`
- `RESEND_API_KEY`, `RESEND_FROM`

---

## 11. Xavfsizlik

- `.env`, `.env.local` va boshqa maxfiy fayllar git’ga kirmaydi.
- `.env.example` faqat shablon.
- Source kodda API kalitlari yo‘q.
- JWT, bcrypt, Helmet, CORS, rate limiting, Joi validatsiyasi ishlatiladi.
- Savdo narxlari va mahsulot nomi server tomonidan qayta tekshiriladi.
- Oflayn savdolar `syncId` bilan takrorlanishdan himoyalangan.

---

## 12. Roadmap

### Keyingi POS bosqich
- [ ] Ko‘p mahsulotli savat (`SaleTransaction` + `Sale` itemlar).
- [ ] To‘lov oynasi: naqd / karta / aralash, qaytim hisoblash.
- [ ] Chek chiqarish: printer + PDF / PWM orqali ulashish.
- [ ] Mijoz tanlash, chegirma va soliq sozlamalari.
- [ ] Kassa smenasi: ochish/yopish, naqd qoldiq tekshiruvi.
- [ ] Qaytarish (Return / ReturnItem) oqimi.
- [ ] Tarif limitlarini servis va UI da majburiy qilish.
- [ ] Ta’minotchi va xarid (purchase) modullari.
- [ ] Har do‘kon bo‘yicha qoldiq (`StoreInventory`) operatsiyalari.

### Integratsiyalar
- [ ] Payme / Click to‘lov shlyuzlari.
- [ ] To‘liq KZ / TJ / KG tillari va valyutalari.
- [ ] QR kod va shtrix-kod skanerlash.
- [ ] Real-time bildirishnomalar.

---

## 13. Litsenziya

MIT — foydalanish va o‘zgartirish erkin.

**TradeS — savdo boshqaruvi oddiy, tez va ishonchli.**
