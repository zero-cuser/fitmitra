/**
 * FitMitra Phase 17: Persistent Database & PostgreSQL Adapter Test Suite
 * 
 * Verifies:
 * 1. Factory guardrails (in-memory dev fallback vs. fail-fast in production).
 * 2. Credential masking (never leak passwords in logs or error traces).
 * 3. PostgreSQL connection pooling lifecycle (ping, query execution, close).
 * 4. Relational cascading and parameterized SQL execution.
 * 5. Health check storage reflection (postgresql vs. in-memory).
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { PostgresDatabase } from '../../src/server/postgresDb.ts';
import { createDatabase, Database } from '../../src/server/db.ts';
import { createServer } from '../../src/server/server.ts';

describe('Phase 17: Persistent Database & PostgreSQL Adapter', () => {

  // =========================================================================
  // 1. FACTORY GUARDRAILS & FALLBACK RULES
  // =========================================================================
  describe('Database Factory & Production Guardrails', () => {
    const originalEnv = process.env.NODE_ENV;
    const originalDbUrl = process.env.DATABASE_URL;

    test('Falls back to InMemoryDatabase in development/test when DATABASE_URL is unset', () => {
      delete process.env.DATABASE_URL;
      (process.env as any).NODE_ENV = 'test';

      const db = createDatabase();
      assert.equal(db.isPersistent(), false);
      assert.ok(db instanceof Database);
    });

    test('Instantiates PostgresDatabase when DATABASE_URL is provided', () => {
      const db = createDatabase('postgres://testuser:testpass@localhost:5432/fitmitradb');
      assert.equal(db.isPersistent(), true);
      assert.ok(db instanceof PostgresDatabase);
    });

    test('CRITICAL GUARDRAIL: Throws fatal error in production if DATABASE_URL is missing', () => {
      delete process.env.DATABASE_URL;
      (process.env as any).NODE_ENV = 'production';

      try {
        assert.throws(() => {
          createDatabase();
        }, (err: any) => {
          assert.match(err.message, /Production environment detected \(NODE_ENV=production\) but DATABASE_URL is missing/);
          return true;
        });
      } finally {
        (process.env as any).NODE_ENV = originalEnv;
        if (originalDbUrl) {
          process.env.DATABASE_URL = originalDbUrl;
        } else {
          delete process.env.DATABASE_URL;
        }
      }
    });
  });

  // =========================================================================
  // 2. CREDENTIAL SANITIZATION & LOGGING SAFETY
  // =========================================================================
  describe('Credential Masking', () => {
    test('Masks credentials in standard PostgreSQL URIs', () => {
      const raw = 'postgres://admin:SuperSecret123@db.fitmitra.cloud:5432/fitmitra_prod?sslmode=require';
      const masked = PostgresDatabase.maskConnectionString(raw);
      assert.equal(masked, 'postgres://***:***@db.fitmitra.cloud:5432/fitmitra_prod?sslmode=require');
      assert.ok(!masked.includes('admin'));
      assert.ok(!masked.includes('SuperSecret123'));
    });

    test('Masks credentials with special characters in password', () => {
      const raw = 'postgresql://campus_app:p%40ss%3Aw0rd@10.0.0.5:5432/prod_db';
      const masked = PostgresDatabase.maskConnectionString(raw);
      assert.ok(!masked.includes('p%40ss%3Aw0rd'));
      assert.ok(!masked.includes('campus_app'));
      assert.ok(masked.includes('***:***@10.0.0.5:5432/prod_db'));
    });

    test('Handles malformed or missing URIs gracefully without crashing', () => {
      assert.equal(PostgresDatabase.maskConnectionString(''), 'undefined');
      assert.equal(PostgresDatabase.maskConnectionString(undefined), 'undefined');
      assert.equal(PostgresDatabase.maskConnectionString('invalid-uri'), 'invalid-uri');
    });
  });

  // =========================================================================
  // 3. POSTGRES DATABASE ADAPTER WITH INJECTED POOL MOCK
  // =========================================================================
  describe('PostgreSQL Adapter & Lifecycle Semantics', () => {

    test('ping() returns true on successful database response', async () => {
      const executedQueries: string[] = [];
      const mockPool: any = {
        query: async (sql: string) => {
          executedQueries.push(sql);
          return { rows: [{ healthy: 1 }] };
        },
        end: async () => {}
      };

      const pgDb = new PostgresDatabase({ pool: mockPool });
      const healthy = await pgDb.ping();
      assert.equal(healthy, true);
      assert.ok(executedQueries.some(q => q.includes('SELECT 1')));
    });

    test('ping() returns false when query throws an exception', async () => {
      const mockPool: any = {
        query: async () => {
          throw new Error('Connection refused: ECONNREFUSED 127.0.0.1:5432');
        },
        end: async () => {}
      };

      const pgDb = new PostgresDatabase({ pool: mockPool });
      const healthy = await pgDb.ping();
      assert.equal(healthy, false);
    });

    test('createAccount executes transactional account & profile insertion', async () => {
      const capturedQueries: { sql: string; params: any[] }[] = [];
      let transactionCommitted = false;

      const mockClient: any = {
        query: async (sql: string, params?: any[]) => {
          capturedQueries.push({ sql, params: params || [] });
          if (sql === 'COMMIT') transactionCommitted = true;
          return { rows: [] };
        },
        release: () => {}
      };

      const mockPool: any = {
        connect: async () => mockClient,
        query: async (sql: string, params?: any[]) => mockClient.query(sql, params),
        end: async () => {}
      };

      const pgDb = new PostgresDatabase({ pool: mockPool });
      await pgDb.createAccount(
        {
          id: '11111111-2222-3333-4444-555555555555',
          email: 'student@campus.edu.in',
          passwordHash: 'hash123',
          salt: 'salt123',
          authType: 'authenticated',
          provider: 'email',
          emailVerified: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastSeenAt: new Date().toISOString()
        },
        {
          accountId: '11111111-2222-3333-4444-555555555555',
          displayName: 'Campus Athlete',
          username: 'athlete_1',
          avatarColor: 'from-cyan-500 to-blue-700',
          fitnessGoal: 'strength',
          preferencesJson: {},
          biometricsJson: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      );

      assert.ok(transactionCommitted);
      assert.ok(capturedQueries.some(q => q.sql === 'BEGIN'));
      assert.ok(capturedQueries.some(q => q.sql.includes('INSERT INTO accounts')));
      assert.ok(capturedQueries.some(q => q.sql.includes('INSERT INTO profiles')));
      assert.ok(capturedQueries.some(q => q.sql === 'COMMIT'));
    });

    test('getAccountByEmail queries with lowercased email parameter', async () => {
      let capturedParam = '';

      const mockPool: any = {
        query: async (sql: string, params: any[]) => {
          capturedParam = params[0];
          return {
            rows: [{
              id: '00000000-0000-0000-0000-000000000001',
              email: 'student@campus.edu.in',
              passwordHash: 'hash123',
              salt: 'salt123',
              authType: 'authenticated',
              provider: 'email',
              emailVerified: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              lastSeenAt: new Date().toISOString()
            }]
          };
        },
        end: async () => {}
      };

      const pgDb = new PostgresDatabase({ pool: mockPool });
      const account = await pgDb.getAccountByEmail('StUdEnT@CaMpUs.EdU.iN');
      assert.equal(capturedParam, 'student@campus.edu.in');
      assert.ok(account);
      assert.equal(account.email, 'student@campus.edu.in');
    });

    test('deleteAccountCascade executes single cascade DELETE query', async () => {
      let executedSql = '';
      let executedParams: any[] = [];

      const mockPool: any = {
        query: async (sql: string, params: any[]) => {
          executedSql = sql;
          executedParams = params;
          return { rowCount: 1 };
        },
        end: async () => {}
      };

      const pgDb = new PostgresDatabase({ pool: mockPool });
      const targetId = '11111111-1111-1111-1111-111111111111';
      await pgDb.deleteAccountCascade(targetId);

      assert.ok(executedSql.includes('DELETE FROM accounts WHERE id = $1'));
      assert.equal(executedParams[0], targetId);
    });

    test('close() ends the connection pool gracefully', async () => {
      let poolEnded = false;
      const mockPool: any = {
        end: async () => {
          poolEnded = true;
        }
      };

      const pgDb = new PostgresDatabase({ pool: mockPool });
      await pgDb.close();
      assert.equal(poolEnded, true);
    });
  });

  // =========================================================================
  // 4. SERVER HEALTH ENDPOINT STORAGE CLASSIFICATION
  // =========================================================================
  describe('Server Health Endpoint Storage Reflection', () => {

    test('Returns storage: "in-memory" and persistent: false for InMemoryDatabase', async () => {
      const memDb = new Database();
      const server = await createServer(memDb);

      try {
        const res = await fetch(`${server.url}/api/v1/health`);
        assert.equal(res.status, 200);
        const data = await res.json();
        assert.equal(data.status, 'ok');
        assert.equal(data.storage, 'in-memory');
        assert.equal(data.persistent, false);
      } finally {
        await server.close();
      }
    });

    test('Returns storage: "postgresql" and persistent: true for PostgresDatabase', async () => {
      const mockPool: any = {
        query: async () => ({ rows: [] }),
        end: async () => {}
      };

      const pgDb = new PostgresDatabase({ pool: mockPool });
      const server = await createServer(pgDb);

      try {
        const res = await fetch(`${server.url}/api/v1/health`);
        assert.equal(res.status, 200);
        const data = await res.json();
        assert.equal(data.status, 'ok');
        assert.equal(data.storage, 'postgresql');
        assert.equal(data.persistent, true);
      } finally {
        await server.close();
      }
    });
  });
});
