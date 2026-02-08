import { describe, expect, it, vi } from 'vitest';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    alert: {
      create: vi.fn(),
    },
  },
}));

vi.mock('../../src/config', async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  return { ...actual, prisma: mockPrisma };
});

import { AlertService } from '../../src/modules/alerts/alerts.service';

describe('AlertService.createAlert', () => {
  it('creates an alert via prisma.alert.create', async () => {
    const alertData = {
      userId: 'user-1',
      asteroidId: '12345',
      asteroidName: 'Test Asteroid',
      alertType: 'CLOSE_APPROACH' as const,
      message: 'Asteroid approaching Earth',
      riskLevel: 'HIGH' as const,
      approachDate: new Date('2024-12-01'),
      missDistanceKm: 500000,
      velocityKmph: 25000,
    };

    const mockCreated = { id: 'alert-1', ...alertData, isRead: false, createdAt: new Date() };
    mockPrisma.alert.create.mockResolvedValueOnce(mockCreated);

    const result = await AlertService.createAlert(alertData);

    expect(mockPrisma.alert.create).toHaveBeenCalledWith({ data: alertData });
    expect(result).toEqual(mockCreated);
  });
});
