import 'dotenv/config';

const env = {
  PORT: Number(process.env['PORT'] ?? 3000),
  NODE_ENV: process.env['NODE_ENV'] ?? 'development',
  DATABASE_URL: process.env['DATABASE_URL'] ?? '',
  DIRECT_URL: process.env['DIRECT_URL'] ?? '',
} as const;

export default env;
