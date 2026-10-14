# FitMitra Backend Setup & Operational Runbook
## Phase 19: Live PostgreSQL Validation, Migration Idempotency & Disaster Recovery Runbook

**Target Audience**: Developers, DevOps, SRE, QA Engineers, Security Auditors  
**Updated**: October 2026 (Phase 19 Staging Verification Release)  

---

## 1. Architecture Overview

FitMitra's backend is a lightweight, modular REST API server implemented in TypeScript (`src/server/`). It operates independently from the Next.js static frontend (`out/`), maintaining full compatibility with GitHub Pages while providing authenticated cloud synchronization and private social challenges for both Web and Native Android clients.

In Phase 17, the backend architecture transition from an in-memory development store to an enterprise-grade **PostgreSQL Persistent Engine** utilizing connection pooling (`pg.Pool`), parameterized queries, and strict transaction isolation.

```text
                  +---------------------------+
                  |  Next.js Web / GH Pages   |
                  |     (Static Client)       |
                  +-------------+-------------+
                                | REST / JSON
                                v
+----------------------+  HTTP  +---------------------------+  pg.Pool      +----------------------+
| Native Android Client| =====> | Node.js Backend Host      | ============> | PostgreSQL 15+ DB    |
|  (Compose/DataStore) | :3001  | - routes.ts (API Handler) | (Persistent)  | (schema.sql DDL)     |
+----------------------+        | - db.ts (IDatabase Engine)|               | - Supabase / Neon    |
                                | - postgresDb.ts (Adapter) |               | - Docker / AWS RDS   |
                                +---------------------------+               +----------------------+
```

---

## 2. Storage Engines & Production Guardrails

FitMitra implements dual storage implementations unified behind the `IDatabase` contract:

1. **`PostgresDatabase` (Production Engine)**:
   - Built on `pg.Pool` connection pooling.
   - Enforces relational foreign keys with `ON DELETE CASCADE`.
   - Protects multi-row mutations with transactional atomicity (`BEGIN`/`COMMIT`/`ROLLBACK`).
   - Automatically masks connection strings to prevent credential leaks in logs (`PostgresDatabase.maskConnectionString`).
   - Handles SSL connections with hosted cloud providers (`sslmode=require`).

2. **`InMemoryDatabase` (Development & Unit Testing)**:
   - Fast, isolated in-memory Map store for local offline development and ephemeral unit test execution.
   - Zero external daemon dependencies.

### 2.1 Critical Production Guardrail (Fail-Fast)
FitMitra strictly prevents accidental data loss:
- If `NODE_ENV === 'production'` and `DATABASE_URL` is missing, the server **immediately throws a fatal error and terminates with exit code 1**.
- The server will **never** silently fall back to ephemeral in-memory storage in a production environment.

---

## 3. Environment Variables & Configuration

Configuration is supplied via environment variables or a `.env` file:

| Variable | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `PORT` | Number | `3001` | The TCP port on which the HTTP server listens. |
| `DATABASE_URL` | String | *(Optional in dev)* | PostgreSQL connection URI (e.g. `postgres://user:pass@localhost:5432/fitmitradb`). **Mandatory in production**. |
| `DATABASE_SSL` | Boolean | `false` | Enable TLS/SSL connection handling (`true` for cloud providers like Supabase, Neon, AWS RDS). |
| `DB_POOL_MAX` | Number | `10` | Maximum number of concurrent connections in the connection pool. |
| `DB_IDLE_TIMEOUT_MS` | Number | `30000` | Milliseconds before an idle pool client is closed (30s). |
| `DB_CONNECTION_TIMEOUT_MS` | Number | `5000` | Milliseconds to wait before connection acquisition times out (5s). |
| `JWT_SECRET` | String | *(dev-secret)* | HMAC-SHA256 signing secret for session tokens. Must be a secure 64+ char random string in production. |
| `NODE_ENV` | String | `development` | Operating environment (`development`, `test`, `production`). |

---

## 4. Local PostgreSQL Setup (Docker)

To run a persistent PostgreSQL instance locally:

### 4.1 Launch PostgreSQL Container
```bash
docker run --name fitmitra-postgres \
  -e POSTGRES_DB=fitmitradb \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  -d postgres:15-alpine
```

### 4.2 Initialize Schema DDL
Execute the schema file to establish all 10 core relational tables and foreign keys:
```bash
# Using psql:
psql -h localhost -U postgres -d fitmitradb -f src/server/schema.sql

# Or inside Docker:
docker exec -i fitmitra-postgres psql -U postgres -d fitmitradb < src/server/schema.sql
```

### 4.3 Start Server with PostgreSQL
```bash
export DATABASE_URL="postgres://postgres:postgres@localhost:5432/fitmitradb"
npx tsx src/server/server.ts
```

Expected startup logs:
```text
[FitMitra Backend] Server listening at http://0.0.0.0:3001
[FitMitra Backend] Storage engine: PostgreSQL (Persistent Pool)
[FitMitra Backend] Health check: http://localhost:3001/api/v1/health
```

---

## 5. Cloud Database Deployment (Supabase / Neon / RDS)

1. Provision a PostgreSQL 15+ database on your cloud provider.
2. In the provider's SQL Editor or terminal, execute `src/server/schema.sql`.
3. Obtain the connection URI (e.g. from Supabase Settings -> Database -> Connection URI).
4. Configure production environment variables:
   ```bash
   DATABASE_URL="postgres://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require"
   DATABASE_SSL="true"
   NODE_ENV="production"
   PORT="3001"
   JWT_SECRET="<generate-64-character-cryptographic-random-secret>"
   ```

---

## 6. Health & Storage Verification Endpoint

Verify the server status and active storage engine:
```bash
curl http://localhost:3001/api/v1/health
```

Response with PostgreSQL:
```json
{
  "status": "ok",
  "version": "1.0.0",
  "schemaVersion": 2,
  "storage": "postgresql",
  "persistent": true,
  "timestamp": "2026-10-14T14:40:00.000Z"
}
```

Response in development fallback (no `DATABASE_URL`):
```json
{
  "status": "ok",
  "version": "1.0.0",
  "schemaVersion": 2,
  "storage": "in-memory",
  "persistent": false,
  "timestamp": "2026-10-14T14:40:00.000Z"
}
```

---

## 7. Graceful Shutdown & Lifecycle Management

The backend intercepts POSIX signals (`SIGINT`, `SIGTERM`) to guarantee zero connection leaks:
1. **HTTP Drain**: Stops accepting new HTTP requests (`server.close()`).
2. **Pool Drainage**: Awaits existing queries and drains `pg.Pool` connections (`activeDb.close()`).
3. **Safety Timeout**: If lingering sockets do not close within 10 seconds, the process forcibly exits with code 1.

---

## 8. Android Client Connectivity

### 8.1 Android Emulator Host Routing
When running Android Studio Emulator, host machine `localhost` is accessible at `10.0.2.2`:
- Default base URL in Android client: `http://10.0.2.2:3001`
- Configure in `RemoteAuthRepository.kt` and `RemoteSyncRepository.kt`.

### 8.2 Network Permissions
`android/app/src/main/AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

---

## 9. Verification & Test Execution

Run the complete test verification suite:
```bash
# 1. Run all unit and integration tests:
npm test

# 2. Run TypeScript strict type verification:
npx tsc --noEmit

# 3. Verify Next.js production build:
npm run build

# 4. Run Android unit tests & APK compilation:
cd android
./gradlew testDebugUnitTest
./gradlew assembleDebug
```

---

## 10. Migration Runbook & Advisory Locking

FitMitra executes database migrations forward-only via `src/server/migrations.ts` and the CLI runner `src/server/migrate.ts`.

### 10.1 CLI Migration Execution
To execute pending migrations against the configured PostgreSQL instance:
```bash
export DATABASE_URL="postgres://user:pass@host:5432/fitmitradb"
npm run db:migrate
```

### 10.2 Concurrency Protection (PostgreSQL Advisory Locks)
When multiple server replicas boot concurrently in an auto-scaling group (e.g. Kubernetes, AWS ECS, Google Cloud Run):
- `runPendingMigrations()` starts a PostgreSQL transaction and acquires an explicit transaction-level advisory lock:
  ```sql
  BEGIN;
  SELECT pg_advisory_xact_lock(424242);
  ```
- All other replicas attempting migrations block until the first instance commits or aborts.
- `schema_migrations` tracks applied versions (`version`, `name`, `applied_at`, `description`).
- Migrations are strictly idempotent: re-executing migrations results in `appliedCount: 0` without altering existing schema or data.

### 10.3 Migration Rollback Strategy
Because production databases prioritize data preservation:
- Rollbacks are non-destructive: do NOT drop tables or columns in production.
- If an emergency rollback is required, author a forward-only compensating migration (e.g. v4 that reverses schema additions or alters constraints safely).

---

## 11. Disaster Recovery & Backup/Restore Runbook

FitMitra data models store account credentials, workout history, sync tombstones, and campus social graph connections. A robust backup and recovery strategy ensures business continuity and zero data loss.

### 11.1 Automated Full Backup (`pg_dump`)
Run a daily automated backup of the PostgreSQL database:
```bash
# Export compressed binary custom-format dump
pg_dump -h $DB_HOST -p 5432 -U $DB_USER -d fitmitradb -Fc -f "/backups/fitmitra_$(date +%Y%m%d_%H%M%S).dump"

# Or standard plain SQL dump (for auditing or human review)
pg_dump -h $DB_HOST -p 5432 -U $DB_USER -d fitmitradb --clean --if-exists -f "/backups/fitmitra_$(date +%Y%m%d_%H%M%S).sql"
```

### 11.2 Disaster Recovery & Point-In-Time Restore (`pg_restore`)
In the event of database failure or corrupted instance:
1. **Provision target instance**:
   ```bash
   createdb -h $DB_HOST -p 5432 -U $DB_USER fitmitradb_restored
   ```
2. **Execute restore**:
   ```bash
   pg_restore -h $DB_HOST -p 5432 -U $DB_USER -d fitmitradb_restored --clean --if-exists --no-owner --no-privileges "/backups/fitmitra_20261014_120000.dump"
   ```
3. **Verify Restoration Integrity**:
   ```bash
   psql -h $DB_HOST -U $DB_USER -d fitmitradb_restored -c "SELECT COUNT(*) FROM accounts;"
   psql -h $DB_HOST -U $DB_USER -d fitmitradb_restored -c "SELECT COUNT(*) FROM workout_records;"
   psql -h $DB_HOST -U $DB_USER -d fitmitradb_restored -c "SELECT version, name FROM schema_migrations ORDER BY version ASC;"
   ```
4. **Point Service to Restored Database**:
   Update `DATABASE_URL` in application deployment secrets and redeploy.

---

## 12. Staging & Production Deployment Checklist

Before approving staging or production deployments:

| Check | Requirement | Verification Method |
| :--- | :--- | :--- |
| **Fail-Fast Database** | `DATABASE_URL` must point to PostgreSQL 15+; memory fallback rejected in prod | Verified in `src/server/server.ts` |
| **Cryptographic Secrets** | `JWT_SECRET` must be >= 32 random chars in production | Verified via `getJwtSecret()` |
| **TLS/SSL Encryption** | `sslmode=require` enabled for all transit traffic | Set `DATABASE_SSL=true` |
| **Least Privilege Role** | App uses dedicated user with CRUD on FitMitra tables only | DB user lacks `SUPERUSER` / `DROP DATABASE` |
| **Connection Pooling** | Pool sized to match vCPU concurrency (default 10) | `DB_POOL_MAX=10`, `DB_IDLE_TIMEOUT_MS=30000` |
| **Zero Biometric Egress** | No video frames, landmarks, or pose keypoints transmitted | Checked in `/api/v1/sync/push` & schema |
| **Health Probes** | Liveness and readiness endpoints monitored by orchestrator | HTTP 200 on `/liveness`, 503 on DB disconnect |

---

## 13. Health, Liveness & Readiness Probes

FitMitra implements two distinct health endpoints for orchestrators (Kubernetes / Cloud Run / ECS):

1. **Liveness Probe**: `GET /api/v1/health/liveness`
   - Returns `200 OK` if the Node.js process is responsive.
   - Used by orchestrators to detect deadlocks and restart stuck pods.
   ```json
   { "status": "alive", "uptimeSeconds": 142.5, "timestamp": "2026-10-14T10:00:00.000Z" }
   ```

2. **Readiness Probe**: `GET /api/v1/health/readiness`
   - Actively verifies PostgreSQL connectivity (`database.ping()`).
   - Returns `200 OK` with `{ status: "ready", databaseConnected: true }` when ready for traffic.
   - Returns `503 Service Unavailable` with `{ status: "not_ready", databaseConnected: false }` if the database is disconnected or unreachable.
   - Prevents traffic routing to unhealthy pods during database maintenance or network partitions.

