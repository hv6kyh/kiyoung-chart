import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: {
    sub: string;
    email?: string;
    role?: string;
  };
}

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice(7);
}

/**
 * 인증 필수 미들웨어 — 유효한 JWT가 없으면 401 응답.
 * 사용: app.get('/api/protected', requireAuth, handler)
 */
export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ error: '인증이 필요합니다.' });
    return;
  }

  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) {
    console.error('[Auth] SUPABASE_JWT_SECRET is not configured');
    res.status(500).json({ error: 'Server auth configuration error' });
    return;
  }

  try {
    const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] }) as jwt.JwtPayload;
    req.user = {
      sub: decoded.sub!,
      email: decoded.email as string | undefined,
      role: decoded.role as string | undefined,
    };
    next();
  } catch {
    res.status(401).json({ error: '유효하지 않은 토큰입니다.' });
  }
}

/**
 * 인증 선택 미들웨어 — JWT가 있으면 검증하고, 없어도 통과.
 * 사용: app.get('/api/optional', optionalAuth, handler)
 */
export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) {
    next();
    return;
  }

  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) {
    next();
    return;
  }

  try {
    const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] }) as jwt.JwtPayload;
    req.user = {
      sub: decoded.sub!,
      email: decoded.email as string | undefined,
      role: decoded.role as string | undefined,
    };
  } catch {
    // 유효하지 않은 토큰이면 무시하고 진행
  }

  next();
}
