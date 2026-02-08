import { prisma } from '../../config';
import { ConflictError, NotFoundError } from '../../utils/errors';
import type { AddWatchlistInput, UpdateWatchlistInput } from './watchlist.schema';

export const WatchlistService = {
  /**
   * Add asteroid to user's watchlist
   */
  async addToWatchlist(userId: string, input: AddWatchlistInput) {
    const existing = await prisma.watchlist.findUnique({
      where: {
        userId_asteroidId: {
          userId,
          asteroidId: input.asteroidId,
        },
      },
    });

    if (existing) {
      throw new ConflictError('Asteroid already in watchlist');
    }

    return prisma.watchlist.create({
      data: {
        userId,
        asteroidId: input.asteroidId,
        asteroidName: input.asteroidName,
        alertOnApproach: input.alertOnApproach,
        alertDistanceKm: input.alertDistanceKm,
      },
    });
  },

  /**
   * Get user's watchlist
   */
  async getWatchlist(userId: string, page: number, limit: number) {
    const [items, total] = await Promise.all([
      prisma.watchlist.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.watchlist.count({ where: { userId } }),
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  /**
   * Remove asteroid from watchlist
   */
  async removeFromWatchlist(userId: string, asteroidId: string) {
    const existing = await prisma.watchlist.findUnique({
      where: {
        userId_asteroidId: {
          userId,
          asteroidId,
        },
      },
    });

    if (!existing) {
      throw new NotFoundError('Asteroid not in watchlist');
    }

    return prisma.watchlist.delete({
      where: {
        userId_asteroidId: {
          userId,
          asteroidId,
        },
      },
    });
  },

  /**
   * Update watchlist item alert settings
   */
  async updateWatchlistItem(userId: string, asteroidId: string, input: UpdateWatchlistInput) {
    const existing = await prisma.watchlist.findUnique({
      where: {
        userId_asteroidId: {
          userId,
          asteroidId,
        },
      },
    });

    if (!existing) {
      throw new NotFoundError('Asteroid not in watchlist');
    }

    return prisma.watchlist.update({
      where: {
        userId_asteroidId: {
          userId,
          asteroidId,
        },
      },
      data: input,
    });
  },
};
