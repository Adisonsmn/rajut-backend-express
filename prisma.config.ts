// prisma.config.ts — Prisma 7 configuration
// Connection URLs are now managed here instead of schema.prisma
import 'dotenv/config';
import { defineConfig } from 'prisma/config';
import { PrismaPg } from '@prisma/adapter-pg';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // Used by Prisma Migrate (direct connection, bypasses PgBouncer)
    url: process.env['DIRECT_URL']!,
  },
});
