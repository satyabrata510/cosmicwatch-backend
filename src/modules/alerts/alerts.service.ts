import { prisma } from '../../config';

/** Alert persistence service — CRUD operations for per-user alerts. */
export const AlertService = {
  /** Retrieve paginated alerts for a user, optionally filtered to unread only. */
  async getUserAlerts(userId: string, page: number, limit: number, unreadOnly = false) {
    const where = {
      userId,
      ...(unreadOnly && { isRead: false }),
    };

    const [items, total] = await Promise.all([
      prisma.alert.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.alert.count({ where }),
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

  /** Mark a single alert as read by its ID (scoped to the owning user). */
  async markAsRead(alertId: string, userId: string) {
    return prisma.alert.updateMany({
      where: { id: alertId, userId },
      data: { isRead: true },
    });
  },

  /** Bulk-mark all unread alerts as read for a given user. */
  async markAllAsRead(userId: string) {
    return prisma.alert.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  },

  /** Return the count of unread alerts for a user. */
  async getUnreadCount(userId: string) {
    return prisma.alert.count({
      where: { userId, isRead: false },
    });
  },

  /** Persist a new close-approach / hazardous / watchlist alert. */
  async createAlert(data: {
    userId: string;
    asteroidId: string;
    asteroidName: string;
    alertType: 'CLOSE_APPROACH' | 'HAZARDOUS_DETECTED' | 'WATCHLIST_UPDATE';
    message: string;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    approachDate: Date;
    missDistanceKm: number;
    velocityKmph: number;
  }) {
    return prisma.alert.create({ data });
  },
};
