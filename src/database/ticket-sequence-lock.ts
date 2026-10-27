import { Prisma } from '@prisma/client';

export async function lockTicketSequence(tx: Prisma.TransactionClient) {
  await tx.$queryRaw<{ locked: boolean }[]>(
    Prisma.sql`SELECT pg_advisory_xact_lock(718204, 2) IS NULL AS locked`,
  );
}
