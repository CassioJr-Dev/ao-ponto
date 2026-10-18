import { INestApplication, ValidationPipe } from '@nestjs/common';
import { PrismaService } from '../src/database/prisma.service';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('US01 /pedidos (e2e; PostgreSQL required)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const corteId = '2d74707c-fbf2-49ad-8b5f-cf4c29c86bc7';
  const sessionIds: string[] = [];
  const newSession = () => {
    const id = crypto.randomUUID();
    sessionIds.push(id);
    return id;
  };

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
    prisma = app.get(PrismaService);
    await prisma.corte.upsert({
      where: { id: corteId },
      create: {
        id: corteId,
        nome: 'Corte de teste',
        imagemUrl: 'https://example.test/corte.png',
        precoKg: '40.00',
      },
      update: { disponivel: true },
    });
  }, 30000);

  it('persists order and ticket before returning; retry recovers the same order', async () => {
    const sessaoId = newSession();
    const body = {
      sessaoId,
      itens: [{ corteId, quantidade: 0.75, unidadeMedida: 'KG' }],
    };
    const response = await request(app.getHttpServer())
      .post('/pedidos')
      .send(body)
      .expect(201);
    const responseBody = response.body as {
      id: string;
      senha: { numeroSequencial: number };
    };
    const persisted = await prisma.pedido.findUnique({
      where: { sessaoId },
      include: { senha: true, itensPedido: true },
    });
    expect(persisted?.id).toBe(responseBody.id);
    expect(persisted?.senha?.numeroSequencial).toBe(
      responseBody.senha.numeroSequencial,
    );
    expect(persisted?.total.toString()).toBe('30');

    const retry = await request(app.getHttpServer())
      .post('/pedidos')
      .send(body)
      .expect(201);
    expect((retry.body as { id: string }).id).toBe(responseBody.id);
    expect(await prisma.pedido.count({ where: { sessaoId } })).toBe(1);
  });

  it('rejects empty, zero quantity and missing/invalid measurement', async () => {
    const cases = [
      { sessaoId: newSession(), itens: [] },
      {
        sessaoId: newSession(),
        itens: [{ corteId, quantidade: 0, unidadeMedida: 'KG' }],
      },
      {
        sessaoId: newSession(),
        itens: [{ corteId, quantidade: -0.01, unidadeMedida: 'KG' }],
      },
      { sessaoId: newSession(), itens: [{ corteId, quantidade: 1 }] },
      {
        sessaoId: newSession(),
        itens: [{ corteId, quantidade: 1, unidadeMedida: 'INVALID' }],
      },
    ];
    for (const body of cases) {
      await request(app.getHttpServer())
        .post('/pedidos')
        .send(body)
        .expect(400);
      expect(
        await prisma.pedido.count({ where: { sessaoId: body.sessaoId } }),
      ).toBe(0);
    }
  });

  it('accepts every allowed measurement and converts grams to kilograms', async () => {
    const cases = [
      { unidadeMedida: 'KG', quantidade: 0.25 },
      { unidadeMedida: 'GRAMA', quantidade: 250 },
      { unidadeMedida: 'PECA', quantidade: 1 },
      { unidadeMedida: 'FATIA', quantidade: 2 },
    ] as const;

    for (const item of cases) {
      const sessaoId = newSession();
      const response = await request(app.getHttpServer())
        .post('/pedidos')
        .send({ sessaoId, itens: [{ corteId, ...item }] })
        .expect(201);
      const responseBody = response.body as { id: string; total: string };
      const saved = await prisma.itemPedido.findFirst({
        where: { pedido: { sessaoId } },
      });

      expect(saved?.unidadeMedida).toBe(item.unidadeMedida);
      expect(saved?.quantidade.toString()).toBe(String(item.quantidade));
      expect(responseBody.id).toBeDefined();
      if (item.unidadeMedida === 'GRAMA') {
        expect(responseBody.total).toBe('10');
      }
    }
  });

  it('allows only one concurrent order per session', async () => {
    const sessaoId = newSession();
    const body = {
      sessaoId,
      itens: [{ corteId, quantidade: 1, unidadeMedida: 'KG' }],
    };
    const responses = await Promise.all([
      request(app.getHttpServer()).post('/pedidos').send(body),
      request(app.getHttpServer()).post('/pedidos').send(body),
    ]);
    expect(responses.map((response) => response.status)).toEqual([201, 201]);
    expect((responses[0].body as { id: string }).id).toBe(
      (responses[1].body as { id: string }).id,
    );
    expect(await prisma.pedido.count({ where: { sessaoId } })).toBe(1);
  });

  it('rejects a different order on an already confirmed session', async () => {
    const sessaoId = newSession();
    await request(app.getHttpServer())
      .post('/pedidos')
      .send({
        sessaoId,
        itens: [{ corteId, quantidade: 1, unidadeMedida: 'KG' }],
      })
      .expect(201);
    await request(app.getHttpServer())
      .post('/pedidos')
      .send({
        sessaoId,
        itens: [{ corteId, quantidade: 2, unidadeMedida: 'KG' }],
      })
      .expect(409);
    expect(await prisma.pedido.count({ where: { sessaoId } })).toBe(1);
  });

  it('rolls back the order and ticket when ticket persistence fails', async () => {
    const sessaoId = newSession();
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION fail_ticket_insert() RETURNS trigger AS $$
      BEGIN RAISE EXCEPTION 'simulated ticket persistence failure'; END;
      $$ LANGUAGE plpgsql;
    `);
    await prisma.$executeRawUnsafe(
      `CREATE TRIGGER fail_ticket_insert BEFORE INSERT ON "SenhaAtendimento" FOR EACH ROW EXECUTE FUNCTION fail_ticket_insert()`,
    );
    try {
      await request(app.getHttpServer())
        .post('/pedidos')
        .send({
          sessaoId,
          itens: [{ corteId, quantidade: 1, unidadeMedida: 'KG' }],
        })
        .expect(500);
      expect(await prisma.pedido.count({ where: { sessaoId } })).toBe(0);
      expect(await prisma.sessaoTotem.count({ where: { id: sessaoId } })).toBe(
        0,
      );
    } finally {
      await prisma.$executeRawUnsafe(
        'DROP TRIGGER IF EXISTS fail_ticket_insert ON "SenhaAtendimento"',
      );
      await prisma.$executeRawUnsafe(
        'DROP FUNCTION IF EXISTS fail_ticket_insert()',
      );
    }
  });

  it('keeps p95 below two seconds across 30 registrations', async () => {
    const durations: number[] = [];
    for (let i = 0; i < 30; i += 1) {
      const started = performance.now();
      await request(app.getHttpServer())
        .post('/pedidos')
        .send({
          sessaoId: newSession(),
          itens: [{ corteId, quantidade: 0.25, unidadeMedida: 'KG' }],
        })
        .expect(201);
      durations.push(performance.now() - started);
    }
    durations.sort((a, b) => a - b);
    const p95 = durations[Math.ceil(durations.length * 0.95) - 1];
    console.log(
      `US01: p95=${p95.toFixed(1)}ms; tempos(ms)=${durations.map((time) => time.toFixed(1)).join(',')}`,
    );
    expect(p95).toBeLessThanOrEqual(2000);
  }, 30000);

  it('lists available cuts', async () => {
    const response = await request(app.getHttpServer()).get('/').expect(200);
    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: corteId, disponivel: true }),
      ]),
    );
  });

  it('rejects unavailable cuts without confirming an order', async () => {
    const sessaoId = newSession();
    await prisma.corte.update({
      where: { id: corteId },
      data: { disponivel: false },
    });
    try {
      await request(app.getHttpServer())
        .post('/pedidos')
        .send({
          sessaoId,
          itens: [{ corteId, quantidade: 1, unidadeMedida: 'KG' }],
        })
        .expect(404);
      expect(await prisma.pedido.count({ where: { sessaoId } })).toBe(0);
    } finally {
      await prisma.corte.update({
        where: { id: corteId },
        data: { disponivel: true },
      });
    }
  });

  it('rejects a cut that does not exist without confirming an order', async () => {
    const sessaoId = newSession();
    const corteInexistenteId = crypto.randomUUID();

    await request(app.getHttpServer())
      .post('/pedidos')
      .send({
        sessaoId,
        itens: [
          { corteId: corteInexistenteId, quantidade: 1, unidadeMedida: 'KG' },
        ],
      })
      .expect(404);

    expect(await prisma.pedido.count({ where: { sessaoId } })).toBe(0);
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.itemPedido.deleteMany({ where: { corteId } });
      await prisma.senhaAtendimento.deleteMany({
        where: { pedido: { sessaoId: { in: sessionIds } } },
      });
      await prisma.pedido.deleteMany({
        where: { sessaoId: { in: sessionIds } },
      });
      await prisma.sessaoTotem.deleteMany({
        where: { id: { in: sessionIds } },
      });
      await prisma.corte
        .delete({ where: { id: corteId } })
        .catch(() => undefined);
    }
    if (app) await app.close();
  });
});
