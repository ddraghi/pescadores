import { PrismaClient } from '@prisma/client';

// En desarrollo Next.js recarga los módulos en caliente, y sin esto cada recarga
// abriría una conexión nueva hasta agotar el pool de Postgres.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
