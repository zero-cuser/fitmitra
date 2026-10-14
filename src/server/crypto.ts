/**
 * FitMitra Backend Cryptographic Utilities
 * 
 * Provides production-grade password hashing and JWT token handling using Node.js built-in crypto.
 * No custom or untested cryptographic algorithms.
 */

import crypto from 'node:crypto';

const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_KEYLEN = 64; // 512 bits
const PBKDF2_DIGEST = 'sha512';
const SALT_BYTES = 32;

// Standard server secret with secure fallback and production enforcement
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET || process.env.FITMITRA_JWT_SECRET;
  if (process.env.NODE_ENV === 'production') {
    if (!secret || secret === 'fitmitra_campus_secure_jwt_secret_dev_2026' || secret.length < 32) {
      throw new Error(
        '[FitMitra Security] FATAL: Production environment detected (NODE_ENV=production) but JWT_SECRET is missing or insecure. ' +
        'JWT_SECRET must be configured with at least 32 cryptographically random characters.'
      );
    }
    return secret;
  }
  return secret || 'fitmitra_campus_secure_jwt_secret_dev_2026';
}

export interface TokenPayload {
  accountId: string;
  email: string;
  username: string;
  displayName: string;
  iat: number;
  exp: number;
}

/**
 * Hashes a plaintext password using PBKDF2 with HMAC-SHA512 and a cryptographically random salt.
 */
export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(SALT_BYTES).toString('hex');
  const hash = crypto
    .pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST)
    .toString('hex');
  return { hash, salt };
}

/**
 * Verifies a password against a stored PBKDF2 hash using constant-time equality.
 */
export function verifyPassword(password: string, storedHash: string, salt: string): boolean {
  try {
    const computedHash = crypto
      .pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST)
      .toString('hex');

    const storedBuffer = Buffer.from(storedHash, 'hex');
    const computedBuffer = Buffer.from(computedHash, 'hex');

    if (storedBuffer.length !== computedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(storedBuffer, computedBuffer);
  } catch {
    return false;
  }
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

/**
 * Issues a signed HMAC-SHA256 JWT token with explicit expiration.
 */
export function issueToken(
  account: { id: string; email: string; username: string; displayName: string },
  expiresInSeconds = 30 * 24 * 60 * 60 // 30 days
): string {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const now = Math.floor(Date.now() / 1000);
  const payload: TokenPayload = {
    accountId: account.id,
    email: account.email,
    username: account.username,
    displayName: account.displayName,
    iat: now,
    exp: now + expiresInSeconds
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto
    .createHmac('sha256', getJwtSecret())
    .update(dataToSign)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${dataToSign}.${signature}`;
}

/**
 * Verifies a JWT token signature and expiration, returning the payload if valid.
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, signature] = parts;
    const dataToSign = `${encodedHeader}.${encodedPayload}`;

    const expectedSignature = crypto
      .createHmac('sha256', getJwtSecret())
      .update(dataToSign)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    const expectedBuf = Buffer.from(expectedSignature);
    const actualBuf = Buffer.from(signature);

    if (expectedBuf.length !== actualBuf.length || !crypto.timingSafeEqual(expectedBuf, actualBuf)) {
      return null;
    }

    const payloadJson = base64UrlDecode(encodedPayload);
    const payload = JSON.parse(payloadJson) as TokenPayload;

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null; // Expired
    }

    return payload;
  } catch {
    return null;
  }
}
