import type { Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import env from '../config/env.js';
import { apiSuccess, apiError } from '../lib/apiResponse.js';


function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return [h && `${h}h`, m && `${m}m`, `${s}s`].filter(Boolean).join(' ');
}

async function checkDatabase(): Promise<{ status: 'connected' | 'disconnected'; latencyMs: number }> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'connected', latencyMs: Date.now() - start };
  } catch {
    return { status: 'disconnected', latencyMs: Date.now() - start };
  }
}

export async function healthCheck(_req: Request, res: Response): Promise<void> {
  const db = await checkDatabase();

  const overallStatus = db.status === 'connected' ? 'ok' : 'degraded';
  const httpStatus    = db.status === 'connected' ? 200 : 503;

  const payload = {
    status:    overallStatus,
    timestamp: new Date().toISOString(),
    server: {
      environment: env.NODE_ENV,
      uptime:      formatUptime(process.uptime()),
      uptimeRaw:   Math.floor(process.uptime()),
      memory: {
        usedMb:  Math.round(process.memoryUsage().heapUsed  / 1024 / 1024),
        totalMb: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      },
      nodeVersion: process.version,
    },
    database: {
      status:    db.status,
      latencyMs: db.latencyMs,
      provider:  'postgresql',
    },
  };

  if (overallStatus === 'ok') {
    res.status(httpStatus).json(apiSuccess(payload));
  } else {
    res.status(httpStatus).json(apiError('Service degraded — database unreachable', payload));
  }
}
