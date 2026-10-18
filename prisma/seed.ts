import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const cortes = [
    {
      id: 'e7b58a06-6ed8-4636-9fb2-8fe12856f72d',
      nome: 'Alcatra',
      imagemUrl: '/imgs/alcatra.png',
      precoKg: '59.90',
    },
    {
      id: '2c11e337-b6eb-4f2e-b13a-5c13d9c60902',
      nome: 'Costela bovina',
      imagemUrl: '/imgs/costela.png',
      precoKg: '34.90',
    },
  ];

  for (const corte of cortes) {
    await prisma.corte.upsert({
      where: { id: corte.id },
      create: { ...corte, precoKg: new Prisma.Decimal(corte.precoKg) },
      update: {
        ...corte,
        precoKg: new Prisma.Decimal(corte.precoKg),
        disponivel: true,
      },
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
