FROM oven/bun:1 as builder

WORKDIR /app

COPY package.json bun.lock ./
COPY prisma ./prisma/

RUN bun install --frozen-lockfile

COPY . .

RUN bun run db:generate
RUN bun run build

FROM oven/bun:1-slim

WORKDIR /app

ENV NODE_ENV=production

ENV PORT=3000
EXPOSE $PORT

COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

CMD ["bun", "run", "dist/index.js"]
