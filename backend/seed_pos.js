require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const plans = [
  {
    code: 'BASIC',
    name: 'Oddiy',
    monthlyPrice: 0,
    maxStores: 1,
    maxRegistersPerStore: 3,
    maxUsers: 3,
    description: '1 do‘kon, 3 kassagacha, 3 foydalanuvchigacha',
  },
  {
    code: 'STANDARD',
    name: 'O‘rta',
    monthlyPrice: 99000,
    maxStores: 3,
    maxRegistersPerStore: 5,
    maxUsers: 10,
    description: '3 do‘kongacha, har do‘konda 5 kassagacha',
  },
  {
    code: 'PRO',
    name: 'Katta',
    monthlyPrice: 299000,
    maxStores: 10,
    maxRegistersPerStore: 10,
    maxUsers: 50,
    description: '10 filialgacha, cheksiz kassa va foydalanuvchi',
  },
];

async function main() {
  const savedPlans = [];
  for (const plan of plans) {
    const saved = await prisma.plan.upsert({
      where: { code: plan.code },
      update: plan,
      create: plan,
    });
    savedPlans.push(saved);
  }

  const owner = await prisma.user.findFirst({
    where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
    select: { id: true },
  });

  if (!owner) throw new Error('Admin foydalanuvchi topilmadi. Avval npm run seed:admin bajarilsin.');

  const basic = savedPlans.find((plan) => plan.code === 'BASIC');

  const organization = await prisma.organization.upsert({
    where: { slug: 'trades-main' },
    update: { planId: basic.id, subscriptionStatus: 'TRIAL', isActive: true },
    create: {
      name: 'TradeS',
      slug: 'trades-main',
      planId: basic.id,
      subscriptionStatus: 'TRIAL',
      currency: 'UZS',
      taxEnabled: false,
      taxRate: 0,
    },
  });

  const store = await prisma.store.upsert({
    where: { organizationId_code: { organizationId: organization.id, code: 'MAIN-001' } },
    update: { name: 'Asosiy do‘kon', isActive: true },
    create: {
      organizationId: organization.id,
      name: 'Asosiy do‘kon',
      code: 'MAIN-001',
    },
  });

  for (let index = 1; index <= basic.maxRegistersPerStore; index += 1) {
    await prisma.register.upsert({
      where: { storeId_code: { storeId: store.id, code: `REG-${String(index).padStart(3, '0')}` } },
      update: { name: `Kassa ${index}`, isActive: true },
      create: {
        storeId: store.id,
        name: `Kassa ${index}`,
        code: `REG-${String(index).padStart(3, '0')}`,
      },
    });
  }

  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: { organizationId: organization.id, userId: owner.id },
    },
    update: { role: 'OWNER', isActive: true },
    create: { organizationId: organization.id, userId: owner.id, role: 'OWNER' },
  });

  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: { id: true, stock: true },
  });

  for (const product of products) {
    await prisma.storeInventory.upsert({
      where: { storeId_productId: { storeId: store.id, productId: product.id } },
      update: {},
      create: { storeId: store.id, productId: product.id, quantity: product.stock },
    });
  }

  console.log(`Seeded ${savedPlans.length} plans, organization, store, ${basic.maxRegistersPerStore} registers, ${products.length} store inventories`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
