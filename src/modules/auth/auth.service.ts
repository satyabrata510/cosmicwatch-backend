import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env, prisma } from '../../config';
import { ConflictError, NotFoundError, UnauthorizedError } from '../../utils/errors';
import type { LoginInput, RegisterInput } from './auth.schema';
import type { UserPayload, UserRole } from './auth.types';

const SALT_ROUNDS = 12;

/** Generate a signed JWT access + refresh token pair. */
function generateTokens(payload: UserPayload) {
  const accessToken = jwt.sign(payload, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn as jwt.SignOptions['expiresIn'],
  });

  const refreshToken = jwt.sign(payload, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpiresIn as jwt.SignOptions['expiresIn'],
  });

  return { accessToken, refreshToken };
}

/** Authentication service — register, login, profile and token refresh. */
export const AuthService = {
  /** Create a new user account with hashed password and return JWT tokens. */
  async register(input: RegisterInput) {
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(input.password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        password: hashedPassword,
        role: input.role as UserRole,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    const tokens = generateTokens({
      id: user.id,
      email: user.email,
      role: user.role as UserRole,
    });

    return { user, ...tokens };
  },

  /** Verify credentials, update last-login timestamp and return JWT tokens. */
  async login(input: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(input.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = generateTokens({
      id: user.id,
      email: user.email,
      role: user.role as UserRole,
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
      ...tokens,
    };
  },

  /** Fetch user profile including watchlist/alert counts. */
  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        isVerified: true,
        lastLoginAt: true,
        createdAt: true,
        _count: {
          select: {
            watchlist: true,
            alerts: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return user;
  },

  /** Verify a refresh token and issue new access + refresh tokens. */
  async refreshToken(refreshToken: string) {
    try {
      const decoded = jwt.verify(refreshToken, env.jwt.refreshSecret) as UserPayload;
      const tokens = generateTokens({
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
      });
      return tokens;
    } catch {
      throw new UnauthorizedError('Invalid refresh token');
    }
  },
};
