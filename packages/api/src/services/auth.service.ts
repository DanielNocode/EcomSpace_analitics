import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { UserRole } from '@ecomspace/shared';

const BCRYPT_ROUNDS = 10;

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not configured');
  return secret;
}

function getRefreshSecret(): string {
  return getJwtSecret() + '_refresh';
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export type LoginResult =
  | { ok: true; tokens: TokenPair }
  | { ok: false; reason: 'invalid_credentials' | 'inactive' | 'banned'; banReason?: string };

class AuthService {
  /**
   * Аутентификация по email + пароль.
   * Возвращает результат логина с деталями ошибки.
   */
  async login(email: string, password: string): Promise<LoginResult> {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return { ok: false, reason: 'invalid_credentials' };
    }

    if (!user.active) {
      return { ok: false, reason: 'inactive' };
    }

    if (user.banned) {
      return { ok: false, reason: 'banned', banReason: user.banReason ?? undefined };
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return { ok: false, reason: 'invalid_credentials' };
    }

    const tokens = this.generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role as UserRole,
    });

    return { ok: true, tokens };
  }

  /**
   * Обновить access token через refresh token.
   */
  async refresh(refreshToken: string): Promise<TokenPair | null> {
    try {
      const payload = jwt.verify(
        refreshToken,
        getRefreshSecret(),
      ) as JwtPayload & { type: string };

      if (payload.type !== 'refresh') return null;

      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
      });

      if (!user || !user.active || user.banned) return null;

      return this.generateTokens({
        userId: user.id,
        email: user.email,
        role: user.role as UserRole,
      });
    } catch {
      return null;
    }
  }

  /**
   * Верифицировать access token, вернуть payload.
   */
  verifyAccessToken(token: string): JwtPayload | null {
    try {
      const payload = jwt.verify(token, getJwtSecret()) as JwtPayload & {
        type: string;
      };
      if (payload.type !== 'access') return null;
      return {
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
      };
    } catch {
      return null;
    }
  }

  /**
   * Хешировать пароль.
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
  }

  /**
   * Смена пароля. Проверяет текущий пароль и обновляет на новый.
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ ok: true } | { ok: false; reason: 'invalid_password' | 'user_not_found' }> {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      return { ok: false, reason: 'user_not_found' };
    }

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      return { ok: false, reason: 'invalid_password' };
    }

    const newHash = await this.hashPassword(newPassword);
    await prisma.user.update({
      where: { id: userId },
      data: { password: newHash },
    });

    return { ok: true };
  }

  // ── Private ──

  private generateTokens(payload: JwtPayload): TokenPair {
    const accessToken = jwt.sign(
      { ...payload, type: 'access' },
      getJwtSecret(),
      { expiresIn: '2h' },
    );

    const refreshToken = jwt.sign(
      { ...payload, type: 'refresh' },
      getRefreshSecret(),
      { expiresIn: '7d' },
    );

    return { accessToken, refreshToken };
  }
}

export const authService = new AuthService();
