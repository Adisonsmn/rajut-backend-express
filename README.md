# Rajut Backend API

REST API backend untuk aplikasi **Rajut**, dibangun dengan Express.js + TypeScript, menggunakan Prisma 7 ORM dan Supabase PostgreSQL.

## Tech Stack

- **Runtime** — [Bun](https://bun.sh)
- **Framework** — Express.js 5
- **Language** — TypeScript
- **ORM** — Prisma 7 (driver adapter mode)
- **Database** — PostgreSQL via Supabase
- **Validation** — Zod

## Struktur Proyek

```
src/
├── config/          # Environment & konfigurasi
├── controllers/     # Logic handler per resource
├── lib/             # Utility (AppError, asyncHandler, apiResponse, prisma)
├── middlewares/     # errorHandler, notFound
├── routes/          # Definisi endpoint
├── types/           # TypeScript types & interfaces
└── generated/       # Prisma generated client (jangan diedit manual)
```

## Memulai

### 1. Clone & install dependencies

```bash
git clone <repo-url>
cd rajut-backend-express
bun install
```

### 2. Setup environment

```bash
cp .env.example .env
```

Isi file `.env`:

```env
PORT=3000
NODE_ENV=development

# Supabase → Project Settings → Database → Connection String
# Transaction mode (port 6543) — untuk runtime app
DATABASE_URL="postgresql://postgres:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres"

# Session mode (port 5432) — untuk prisma migrate
DIRECT_URL="postgresql://postgres:[PASSWORD]@aws-0-[region].pooler.supabase.com:5432/postgres"
```

### 3. Generate Prisma Client

```bash
bun run db:generate
```

### 4. Jalankan migrasi database

```bash
bun run db:migrate
```

### 5. Jalankan server

```bash
bun run dev
```

Server berjalan di `http://localhost:3000`

## Scripts

| Command | Deskripsi |
|---|---|
| `bun run dev` | Jalankan server development (hot reload) |
| `bun run build` | Build untuk production |
| `bun run start` | Jalankan hasil build |
| `bun run db:generate` | Generate Prisma client |
| `bun run db:migrate` | Jalankan migrasi database |
| `bun run db:push` | Push schema ke DB tanpa migrasi |
| `bun run db:studio` | Buka Prisma Studio |
| `bun run lint` | Cek lint |
| `bun run format` | Format kode dengan Prettier |

## API Endpoints

### Health Check

```
GET /api/health
```

Response:

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "timestamp": "2026-07-12T02:22:44.000Z",
    "server": {
      "environment": "development",
      "uptime": "5m 10s",
      "memory": { "usedMb": 45, "totalMb": 64 },
      "nodeVersion": "v22.x.x"
    },
    "database": {
      "status": "connected",
      "latencyMs": 12,
      "provider": "postgresql"
    }
  }
}
```

## Response Format

Semua endpoint menggunakan shape yang konsisten:

**Sukses**
```json
{ "success": true, "data": { ... }, "message": "optional" }
```

**Error**
```json
{ "success": false, "error": "Pesan error", "details": { ... } }
```

> `details` hanya muncul saat `NODE_ENV=development` atau untuk validation error.
