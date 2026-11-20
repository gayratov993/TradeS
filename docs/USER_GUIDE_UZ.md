# Savdo Go foydalanish yo‘riqnomasi (O‘zbekcha)

Bu hujjat ikki tomonga mo‘ljallangan:

1. **Siz (sotuvchi / administrator)** — mijoz yaratish, tarif tanlash, do‘kon/kassa/kassir berish.
2. **Siz sotgan mijoz (tashkilot egasi yoki kassir)** — tizimga kirib POS dan foydalanish.

---

## 1. Tariflar

| Tarif kodi | Ko‘rinadigan nom | Narx | Do‘kon | Har do‘kondagi kassa | Jami foydalanuvchi | Kassir |
|---|---|---:|---:|---:|---:|---:|
| `BASIC` | Starter | 249 000 so‘m/oy | 1 | 3 | 4 | 3 |
| `STANDARD` | Growth | 449 000 so‘m/oy | 3 | 10 | 11 | 10 |
| `PRO` | Pro | 799 000 so‘m/oy | Cheksiz | Cheksiz | Cheksiz | Cheksiz |

“Cheksiz” texnik jihatdan `9999` chegarasi bilan ifodalanadi.

### “3 kassagacha” nimani anglatadi

BASIC tarifida ikkita alohida limit bor:

- **3 ta kassa (register)** — alohida ish nuqtasi/qurilma. Masalan: Kassa 1, Kassa 2, Kassa 3. Har birining o‘z smenasi, o‘z savdolari va `x-register-id` konteksti bor.
- **3 ta kassir** — tizimga kiradigan ishchilar. Ular `CASHIER` rolida tashkilotga biriktiriladi.

BASIC da jami 4 foydalanuvchi bo‘ladi: **1 tashkilot egasi + 3 kassir**.

---

## 2. Sotuvchi: mijozni qanday yarataysiz

### 2.1. Admin panelga kiring

`http://localhost:5174/login`

Admin yoki super admin hisobi bilan kiring. Masalan demo admin:

- Login: `admin@savdo.uz`
- Parol: `Admin123!ChangeMe`

### 2.2. “Mijozlar va tariflar” bo‘limini oching

Chap menyudan **Mijozlar va tariflar** ni bosing (`/customers`).

Bu yerda:

- 3 ta tarif kartasi ko‘rinadi;
- mavjud mijoz tashkilotlari ro‘yxati;
- har bir mijozning tarifi, holati va foydalanish ko‘rsatkichlari ko‘rinadi.

### 2.3. “Yangi mijoz” tugmasini bosing

Formani to‘ldiring:

**Tashkilot**

- `Tashkilot nomi` — masalan: `O‘zbek Savdo MChJ`.
- `Slug` — ixtiyoriy, lotincha: `ozbek-savdo`. Bo‘sh qoldsa nomdan avtomatik yaratiladi.
- `Telefon`, `Manzil` — ixtiyoriy.

**Tarif**

- `Starter (BASIC)` — 1 do‘kon, 3 kassa, 3 kassir.
- `Growth (STANDARD)` — 3 do‘kon, har birida 10 kassagacha, 10 kassir.
- `Pro (PRO)` — cheksiz.

**Tashkilot egasi**

- Ism, telefon yoki email yozing.
- Parol avtomatik yaratiladi va oxirida ko‘rsatiladi.

**Do‘kon va kassalar**

- Do‘kon nomi: masalan `Asosiy do‘kon`.
- Do‘kon kodi: masalan `MAIN`.
- Kassalar soni: BASIC uchun `1..3`.

**Kassirlar**

- Kassir ismi va telefonini yozing.
- BASIC da eng ko‘pi bilan 3 kassir.
- Bo‘sh qoldirilgan kassir qatorlari o‘tkazib yuboriladi.

### 2.4. “Mijozni yaratish” ni bosing

Tizim bu tartibda ishlaydi:

1. Ega uchun alohida foydalanuvchi yaratiladi (`USER` global roli).
2. Tashkilot yaratiladi va **ega `OWNER` sifatida biriktiriladi**.
3. Tanlangan tarif qo‘llanadi (`BASIC` bo‘lsa qo‘shimcha amal yo‘q).
4. Do‘kon yaratiladi.
5. `Kassa 1`, `Kassa 2`, ... nomli kassalar yaratiladi.
6. Kassir foydalanuvchilari yaratilib, tashkilotga `CASHIER` sifatida qo‘shiladi.
7. Ekranda barcha login va vaqtinchalik parollar chiqadi.

Parollarni mijozga xavfsiz kanal orqali yuboring. Ular keyin qayta ko‘rsatilmaydi.

### 2.5. Mavjud mijozni boshqarish

Ro‘yxatdagi mijoz qatorida:

- **Boshqarish** — do‘kon, kassa, kassir va foydalanishni ko‘rsatadi.
- **Tarif** — tarifni o‘zgartiradi.

Boshqarish oynasida:

- yangi do‘kon qo‘shish;
- tanlangan do‘konga kassa qo‘shish;
- kassir qo‘shish;
- kerakmas resurslarni `Faolsizlantirish`.

Eslatma: o‘chirish yo‘q, faqat faolsizlantirish bor. Bu tarixiy savdolarni saqlab qolish uchun qilingan.

### 2.6. Tarif o‘zgartirish qoidalari

Yuqoriga ko‘tarish (upgrade) har doim ruxsat etiladi.

Pastga tushirish (downgrade) faqat joriy foydalanish yangi limitlarga sig‘ganda ruxsat etiladi. Masalan: 2 do‘kon bor bo‘lsa, BASIC ga o‘tib bo‘lmaydi; xatolik chiqadi:

```text
Plan limits exceeded: stores 2/1
```

---

## 3. Mijoz: tizimga qanday kiradi va ishlatadi

### 3.1. Kirish

Web POS: `http://localhost:5173/login`

Ega yoki kassir sifatida kirish mumkin.

- Ega: tashkilotni boshqaradi, tarifni ko‘radi, kassir qo‘sha oladi.
- Kassir: faqat kassa ishini qiladi — smena ochadi, sotadi, chek chiqaradi.

### 3.2. Birinchi kirishda nima bo‘ladi

Tizim avtomatik ravishda:

1. Siz biriktirilgan birinchi tashkilotni topadi.
2. Uning birinchi do‘konini tanlaydi.
3. O‘sha do‘konning birinchi kassasini tanlaydi.
4. Bu tanlovni brauzerda saqlaydi (`savdo-pos-context`).

Keyin `Kassa tanlash` menyusidan Kerakli kassani almashtirish mumkin. Masalan BASIC da `Kassa 1`, `Kassa 2`, `Kassa 3` ko‘rinadi.

### 3.3. Tarif va foydalanishni ko‘rish

`http://localhost:5173/dashboard/subscription` yoki chap menyudan **Mening tarifim**.

Bu yerda:

- joriy tarif;
- narx;
- foydalanish ko‘rsatkichlari;
- boshqa tariflarga o‘tish tugmalari bor.

Hozircha to‘lov shlyuzi ulanmagan: tarif tanlash darhol qo‘llanadi. Payme/Click keyin qo‘shiladi.

### 3.4. Savdo qilish

1. `http://localhost:5173/pos/sales/new` ni oching.
2. Agar smena ochiq bo‘lmasa, **Smenani ochish** tugmasini bosing.
3. Mahsulotlardan birini bosing yoki qidiruvdan toping.
4. Miqdorni belgilang.
5. O‘ng panelda **JAMI** summani tekshiring.
6. **To‘lovga o‘tish** ni bosing.
7. `Naqd` yoki `Karta` ni tanlang, olgan pul miqdorini kiriting.
8. **To‘lovni tasdiqlash** ni bosing.
9. Chek raqami chiqadi. Masalan: `R-1795159142953-8c2ed5ee`.
10. Kun oxirida smenani yoping.

### 3.5. Mahsulotlar yo‘q bo‘lsa

POS da mahsulot ko‘rinishi uchun katalog bo‘sh bo‘lmasligi kerak. Demo mahsulotlarni yuklash:

```bash
cd backend
npm run seed:products
```

Keyin sahifani yangilang.

### 3.6. Internet yo‘q bo‘lsa

- Mahsulotlar brauzer IndexedDB bazasiga saqlanadi.
- Internet yo‘q paytda qilingan savdolar `pending` navbatga tushadi.
- Internet qaytganda **Pending** ko‘rsatkichi yoki **Sync** tugmasi orqali serverga yuboriladi.
- Har bir offline savdo o‘z `syncId`/`localId` bilan idempotent yuboriladi.

### 3.7. Chek va qaytarish

- Chek API orqali yaratiladi va ekranda ko‘rsatiladi.
- Chekni chop etish/ulashish hali qo‘shilmagan.
- Sotuvni qaytarish (`POST /pos/returns`) faqat `OWNER` yoki `MANAGER` ga ruxsat etilgan.

---

## 4. Limit xatolari va ularning ma‘nosi

| Xatolik | Sababi | Yechim |
|---|---|---|
| `Plan 'BASIC' allows only 1 store(s)` | 2-do‘kon qo‘shilyapti | Growth yoki Pro ga o‘ting |
| `Plan 'BASIC' allows only 3 register(s) per store` | 4-kassa qo‘shilyapti | Tarifni ko‘tarish yoki kassalardan birini faolsizlantirish |
| `Plan 'BASIC' allows only 3 cashier(s)` | 4-kassir qo‘shilyapti | Tarifni ko‘tarish |
| `Plan 'BASIC' allows only 4 user(s)` | Ega + 3 kassir sig‘maydigan holat | Tarifni ko‘tarish |
| `You are not an active member of this organization` | Foydalanuvchi tashkilotga biriktirilmagan | Admin member qo‘shishi kerak |
| `No open shift found for this register` | Smena ochilmagan | Avval smenani oching |

---

## 5. Tezkor misol: 1 mijoz, BASIC, 1 do‘kon, 3 kassa

Admin panel:

1. `/customers` → **Yangi mijoz**.
2. Tashkilot: `Demo Do‘kon`, tarif: `Starter/BASIC`.
3. Ega: `Aziz`, telefon `+998901111111`.
4. Do‘kon: `Asosiy do‘kon`, kod `MAIN`, kassalar soni `3`.
5. Kassirlar:
   - `Kassir 1`, `+998902222222`
   - `Kassir 2`, `+998903333333`
   - `Kassir 3`, `+998904444444`
6. **Mijozni yaratish** → parollarni oling va yuboring.

Mijoz tomoni:

1. `+998901111111` bilan `/login` ga kiradi (ega).
2. `/dashboard/subscription` da `Starter`, `1 do‘kon`, `3 kassa`, `3 kassir` ko‘radi.
3. `/pos/sales/new` ga o‘tadi.
4. `Kassa 1` ni tanlaydi, smenani ochadi, savdo qiladi, chek oladi, smenani yopadi.
5. Xodimlar o‘z telefonlari bilan kirib, o‘z kassalarida ishlaydi.

Natijada BASIC chegaralari to‘g‘ri ishlaydi: 2-do‘kon, 4-kassa yoki 4-kassir qo‘shish 409 xatoligi bilan rad etiladi.

---

## 6. Texnik eslatma

- Admin panel: `web/admin`, port `5174`.
- Mijoz web POS: `web`, port `5173`.
- API: `http://localhost:5000/api/v1`.
- Barcha tashkilot konteksti `x-organization-id` header bilan yuboriladi.
- POS konteksti `x-store-id` va `x-register-id` headerlarini ham o‘z ichiga oladi.
- Real to‘lov, webhook, muddat tugashi va hisob-faktura hali yo‘q: ular keyingi bosqich.
