import { createHmac } from 'node:crypto';
import type { Request } from 'express';
import { getEnv } from '../../config/env.js';

/**
 * Pepper-keyed HMAC-SHA256 of an arbitrary string. Used for storing
 * obfuscated identifiers (IP, UA) in the DB so a leak of those rows
 * does not yield raw PII.
 */
export const peppered = (value: string | null | undefined): string | null => {
  if (!value) return null;
  return createHmac('sha256', getEnv().AUTH_HASH_PEPPER)
    .update(value)
    .digest('hex');
};

/**
 * Best-effort source IP for a request. Trusts X-Forwarded-For first
 * (Railway, Cloudflare, etc. terminate TLS upstream).
 */
export const sourceIp = (req: Request): string | null => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length) {
    return forwarded.split(',')[0]?.trim() ?? null;
  }
  if (Array.isArray(forwarded) && forwarded[0]) {
    return forwarded[0].split(',')[0]?.trim() ?? null;
  }
  return req.socket.remoteAddress ?? null;
};

export const userAgent = (req: Request): string | null => {
  const raw = req.headers['user-agent'];
  return typeof raw === 'string' ? raw.slice(0, 256) : null;
};

export const requestIdentity = (
  req: Request,
): { ipHash: string | null; uaHash: string | null } => ({
  ipHash: peppered(sourceIp(req)),
  uaHash: peppered(userAgent(req)),
});
