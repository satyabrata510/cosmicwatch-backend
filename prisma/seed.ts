// ═══════════════════════════════════════════════════════════
//  Cosmic Watch — Database Seed
//  Creates 3 demo users (one per role) with password Pass@123
// ═══════════════════════════════════════════════════════════

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const SALT_ROUNDS = 12;
const PASSWORD = "Pass@123";

const DEMO_USERS = [
  {
    name: "Test User",
    email: "testuser@gmail.com",
    role: Role.USER,
  },
  {
    name: "Test Researcher",
    email: "testresearcher@gmail.com",
    role: Role.RESEARCHER,
  },
  {
    name: "Test Admin",
    email: "testadmin@gmail.com",
    role: Role.ADMIN,
  },
];

async function main() {
  const hashedPassword = await bcrypt.hash(PASSWORD, SALT_ROUNDS);

  for (const user of DEMO_USERS) {
    const created = await prisma.user.upsert({
      where: { email: user.email },
      update: { password: hashedPassword, role: user.role, name: user.name },
      create: {
        name: user.name,
        email: user.email,
        password: hashedPassword,
        role: user.role,
        isVerified: true,
      },
    });
    console.log(`✔ ${created.role.padEnd(10)} → ${created.email} (${created.id})`);
  }

  console.log(`\n🚀 Seeded ${DEMO_USERS.length} demo users — password: ${PASSWORD}`);
}

main()
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
