/**
 * FitMitra Sanitized Operational Logger
 * 
 * Provides privacy-preserving operational visibility for synchronization
 * and authentication diagnosing.
 * 
 * INVARIANT: Never logs passwords, tokens, full video frames,
 * skeletal landmarks, or sensitive biometrics.
 */

export type SyncEventType =
  | 'AUTH_REGISTER'
  | 'AUTH_LOGIN'
  | 'AUTH_LOGOUT'
  | 'AUTH_DELETE'
  | 'SYNC_PUSH'
  | 'SYNC_PULL'
  | 'RATE_LIMITED'
  | 'PRIVACY_VIOLATION'
  | 'UNAUTHORIZED'
  | 'CONFLICT_RESOLVED'
  | 'MIGRATION'
  | 'FRIEND_INVITE'
  | 'FRIEND_REQUEST'
  | 'FRIEND_RESPOND'
  | 'FRIEND_REMOVE'
  | 'CHALLENGE_CREATE'
  | 'CHALLENGE_JOIN'
  | 'CHALLENGE_CONTRIBUTE'
  | 'CHALLENGE_LEAVE'
  | 'CHALLENGE_CANCEL'
  | 'DATABASE_ERROR'
  | 'DATABASE_CONNECT';

export interface OperationalLogEvent {
  timestamp?: string;
  eventType: SyncEventType;
  accountId?: string;
  statusCode: number;
  itemCount?: number;
  durationMs?: number;
  retryCount?: number;
  errorCategory?: string;
  message?: string;
}

class OperationalLogger {
  private events: OperationalLogEvent[] = [];
  private isQuiet = process.env.NODE_ENV === 'test' && !process.env.DEBUG_SYNC;

  log(event: OperationalLogEvent): void {
    const sanitized: OperationalLogEvent = {
      timestamp: event.timestamp || new Date().toISOString(),
      eventType: event.eventType,
      accountId: event.accountId ? this.maskId(event.accountId) : undefined,
      statusCode: event.statusCode,
      itemCount: event.itemCount,
      durationMs: event.durationMs,
      retryCount: event.retryCount,
      errorCategory: event.errorCategory,
      message: event.message ? this.sanitizeMessage(event.message) : undefined
    };

    this.events.push(sanitized);

    // Keep bounded history (last 500 events)
    if (this.events.length > 500) {
      this.events.shift();
    }

    if (!this.isQuiet) {
      // Structured single-line operational output
      console.log(`[OPERATIONAL_LOG] ${JSON.stringify(sanitized)}`);
    }
  }

  getRecentEvents(limit = 50): OperationalLogEvent[] {
    return this.events.slice(-limit);
  }

  clear(): void {
    this.events = [];
  }

  private maskId(id: string): string {
    if (id.length <= 8) return 'acc_***';
    return `${id.slice(0, 6)}...${id.slice(-4)}`;
  }

  private sanitizeMessage(msg: string): string {
    // Strip any possible bearer token or password accidental inclusions
    return msg
      .replace(/Bearer\s+[A-Za-z0-9-_.]+/gi, 'Bearer [REDACTED]')
      .replace(/password[:=]\s*\S+/gi, 'password=[REDACTED]');
  }
}

export const logger = new OperationalLogger();
