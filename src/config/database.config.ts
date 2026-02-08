import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { dbLogger } from '../utils/logger';
import { env, isDev } from './env.config';

const pool = new Pool({
  connectionString: env.database.url,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

const adapter = new PrismaPg(pool);

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  /* v8 ignore next */
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    /* v8 ignore next */
    log: isDev ? ['info', 'warn', 'error'] : ['error'],
  });

/* v8 ignore next */
if (isDev) globalForPrisma.prisma = prisma;

/** Connect to PostgreSQL via Prisma. Exits the process on failure. */
export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    dbLogger.info('Database connected successfully');
  } catch (error) {
    dbLogger.fatal({ err: error }, 'Database connection failed');
    process.exit(1);
  }
}

/** Disconnect Prisma and close the pg connection pool. */
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  await pool.end();
  dbLogger.info('Database disconnected');
}
