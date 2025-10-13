import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { Request, Response, NextFunction } from 'express';

const ISSUER = process.env.OIDC_ISSUER || 'https://access.line.me';
let JWKS: ReturnType<typeof createRemoteJWKSet> | null = null;

export function oidc() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = req.headers.authorization || '';
      const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
      if (!token) return res.status(401).json({ error: 'missing bearer' });
      JWKS = JWKS || createRemoteJWKSet(new URL(`${ISSUER}/.well-known/jwks.json`));
      const { payload } = await jwtVerify(token, JWKS, { issuer: ISSUER, audience: process.env.OIDC_CLIENT_ID });
      (req as any).user = payload;
      next();
    } catch (e:any) { return res.status(401).json({ error: 'invalid token', detail: e.message }); }
  };
}
