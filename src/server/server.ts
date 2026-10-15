/**
 * FitMitra Backend HTTP Server
 * 
 * Standalone, lightweight HTTP server providing REST API endpoints.
 * Compatible with Node.js 18+, runs independently of Next.js static export.
 * Supports persistent PostgreSQL database via connection pooling or in-memory development storage.
 */

import http from 'node:http';
import { handleRequest } from './routes.ts';
import { db, createDatabase, type IDatabase } from './db.ts';
import { migrations } from './migrations.ts';
import { getJwtSecret } from './crypto.ts';

export interface ServerInstance {
  server: http.Server;
  port: number;
  url: string;
  close: () => Promise<void>;
  db: IDatabase;
}

export function createServer(customDb: IDatabase = db): Promise<ServerInstance> {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      handleRequest(req, res, customDb);
    });

    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : 3001;
      const url = `http://127.0.0.1:${port}`;

      resolve({
        server,
        port,
        url,
        close: async () => {
          await new Promise<void>((closeResolve, closeReject) => {
            server.close((err) => {
              if (err) closeReject(err);
              else closeResolve();
            });
          });
          if (customDb.close) {
            try {
              await customDb.close();
            } catch {
              // Safe no-op if database connection was already severed
            }
          }
        },
        db: customDb
      });
    });
  });
}

// If executed directly via `node src/server/server.ts`
if (process.argv[1]?.endsWith('server.ts') || process.argv[1]?.endsWith('server.js')) {
  (async () => {
    let activeDb: IDatabase;
    try {
      // 1. Verify cryptographic secrets in production
      getJwtSecret();

      // 2. Initialize database engine
      activeDb = createDatabase();
      const isHealthy = await activeDb.ping();

      if (!isHealthy) {
        if (process.env.NODE_ENV === 'production') {
          console.error('[FitMitra Backend] FATAL: Database ping failed during production startup. Aborting.');
          process.exit(1);
        } else {
          console.warn('[FitMitra Backend] Warning: Initial database ping returned false.');
        }
      }

      // 3. Run pending schema migrations on persistent database
      if (activeDb.isPersistent()) {
        const migResult = await migrations.runPendingMigrations(activeDb);
        console.log(
          `[FitMitra Backend] Database migrations verified (Applied: ${migResult.appliedCount}, Current Version: v${migResult.currentVersion}).`
        );
      }
    } catch (err: any) {
      console.error('[FitMitra Backend] Fatal startup error:', err.message);
      process.exit(1);
    }

    const PORT = Number(process.env.PORT) || 3001;
    const server = http.createServer((req, res) => {
      handleRequest(req, res, activeDb);
    });

    server.listen(PORT, '0.0.0.0', () => {
      console.log(`[FitMitra Backend] Server listening at http://0.0.0.0:${PORT}`);
      console.log(
        `[FitMitra Backend] Storage engine: ${
          activeDb.isPersistent() ? 'PostgreSQL (Persistent Pool)' : 'In-Memory (Development/Isolated)'
        }`
      );
      console.log(`[FitMitra Backend] Health check: http://localhost:${PORT}/api/v1/health`);
      console.log(`[FitMitra Backend] Liveness: http://localhost:${PORT}/api/v1/health/liveness`);
      console.log(`[FitMitra Backend] Readiness: http://localhost:${PORT}/api/v1/health/readiness`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      console.log(`[FitMitra Backend] Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        try {
          if (activeDb.close) {
            await activeDb.close();
          }
          console.log('[FitMitra Backend] Server and database connections closed cleanly.');
          process.exit(0);
        } catch (err) {
          console.error('[FitMitra Backend] Error closing database connections:', err);
          process.exit(1);
        }
      });

      // Force close after 10s timeout
      setTimeout(() => {
        console.error('[FitMitra Backend] Forced shutdown after timeout.');
        process.exit(1);
      }, 10000).unref();
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  })();
}
