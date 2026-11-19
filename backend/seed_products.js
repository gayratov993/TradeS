require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const slugify = require('slugify');

const prisma = new PrismaClient();

const rawProducts = [
  { name: 'Un (premium, 1 kg)', buyPrice: 8500, sellPrice: 11000, stock: 120, unit: 'kg', category: 'oziq-ovqat', brand: 'Oltin don', description: 'Yuqori sifatli bug‘doy uni' },
  { name: 'Shakar (1 kg)', buyPrice: 9000, sellPrice: 11500, stock: 80, unit: 'kg', category: 'oziq-ovqat', brand: 'Shakar qamish', description: 'Oq shakar, 1 kg qadoq' },
  { name: 'O‘simlik moyi (1 l)', buyPrice: 18000, sellPrice: 23000, stock: 60, unit: 'litr', category: 'oziq-ovqat', brand: 'Zarafshon', description: 'Rafinlangan o‘simlik moyi' },
  { name: 'Guruch (1 kg)', buyPrice: 14000, sellPrice: 18000, stock: 95, unit: 'kg', category: 'oziq-ovqat', brand: 'Oq guruch', description: 'Devzira guruchi' },
  { name: 'Choy (100 g)', buyPrice: 12000, sellPrice: 17000, stock: 150, unit: 'dona', category: 'ichimliklar', brand: 'Choy bog‘i', description: 'Qora choy, 100 g' },
  { name: 'Kofe (250 g)', buyPrice: 35000, sellPrice: 45000, stock: 40, unit: 'dona', category: 'ichimliklar', brand: 'Bahor kofe', description: 'Maydalangan qahva' },
  { name: 'Sut (1 l)', buyPrice: 9000, sellPrice: 12000, stock: 50, unit: 'litr', category: 'sut mahsulotlari', brand: 'Sut ferma', description: 'Pasterizatsiyalangan sut' },
  { name: 'Pishloq (200 g)', buyPrice: 22000, sellPrice: 29000, stock: 35, unit: 'dona', category: 'sut mahsulotlari', brand: 'Sut ferma', description: 'Yarim qattiq pishloq' },
  { name: 'Sovun (3 dona)', buyPrice: 6000, sellPrice: 9000, stock: 200, unit: 'dona', category: 'maishiy', brand: 'Toza', description: 'Hoja sovun, 3 dona' },
  { name: 'Yuvish vositasi (1 l)', buyPrice: 15000, sellPrice: 21000, stock: 70, unit: 'litr', category: 'maishiy', brand: 'Toza', description: 'Idish yuvish vositasi' },
  { name: 'Qalam (10 dona)', buyPrice: 8000, sellPrice: 12000, stock: 110, unit: 'dona', category: 'kanselyariya', brand: 'Yozuvchi', description: 'Sharikli qalam, 10 dona' },
  { name: 'Daftar (100 varaq)', buyPrice: 5000, sellPrice: 8000, stock: 180, unit: 'dona', category: 'kanselyariya', brand: 'Yozuvchi', description: 'Chiziqli daftar' },
];

const products = rawProducts.map((p) => ({
  ...p,
  price: p.sellPrice,
  finalPrice: p.sellPrice,
  tags: [],
  slug: `${slugify(p.name, { lower: true, strict: true })}-seed`,
}));

async function main() {
  const owner = await prisma.user.findFirst({
    where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
    select: { id: true },
  });

  for (const item of products) {
    await prisma.product.upsert({
      where: { slug: item.slug },
      update: {},
      create: {
        ...item,
        ownerId: owner?.id || null,
        createdById: owner?.id || null,
      },
    });
  }

  console.log(`Seeded ${products.length} products`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
