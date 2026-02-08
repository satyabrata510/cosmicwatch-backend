import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('database.config', () => {
  const mockConnect = vi.fn();
  const mockDisconnect = vi.fn();
  const mockPoolEnd = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    mockConnect.mockReset();
    mockDisconnect.mockReset();
    mockPoolEnd.mockReset();

    vi.doMock('../../src/utils/logger', () => ({
      dbLogger: {
        info: vi.fn(),
        fatal: vi.fn(),
      },
    }));

    vi.doMock('pg', () => ({
      Pool: vi.fn(function (this: any) {
        this.end = mockPoolEnd;
        return this;
      }),
    }));

    vi.doMock('@prisma/adapter-pg', () => ({
      PrismaPg: vi.fn(() => ({})),
    }));

    vi.doMock('@prisma/client', () => ({
      PrismaClient: vi.fn(function (this: any) {
        this.$connect = mockConnect;
        this.$disconnect = mockDisconnect;
        return this;
      }),
    }));
  });

  it('connectDatabase calls process.exit(1) on failure', async () => {
    mockConnect.mockRejectedValueOnce(new Error('conn fail'));
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    const { connectDatabase } = await import('../../src/config/database.config');
    await connectDatabase();

    expect(mockConnect).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(1);

    exitSpy.mockRestore();
  });

  it('disconnectDatabase disconnects prisma and ends pool', async () => {
    mockDisconnect.mockResolvedValueOnce(undefined);
    mockPoolEnd.mockResolvedValueOnce(undefined);

    const { disconnectDatabase } = await import('../../src/config/database.config');
    await disconnectDatabase();

    expect(mockDisconnect).toHaveBeenCalled();
    expect(mockPoolEnd).toHaveBeenCalled();
  });
});
