//  Test Global Setup
//  Connects to real PostgreSQL & Redis before tests
//  Cleans database between test suites

import { afterAll, afterEach, beforeAll } from 'vitest';
import { connectDatabase, disconnectDatabase, prisma } from '../src/config';

beforeAll(async () => {
  await connectDatabase();
});

afterEach(async () => {
  // Clean all tables between tests (order matters due to FK constraints)
  await prisma.chatMessage.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.watchlist.deleteMany();
  await prisma.cachedAsteroid.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await disconnectDatabase();
});
