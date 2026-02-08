import type { NextFunction, Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NeoObject } from '../../src/modules/neo/neo.types';

vi.mock('../../src/modules/neo/neo.service', () => ({
  NeoService: {
    getFeed: vi.fn(),
    lookup: vi.fn(),
    analyzeRiskEnhanced: vi.fn(),
    analyzeRiskSingle: vi.fn(),
    analyzeRiskSentryEnhanced: vi.fn(),
  },
}));

vi.mock('../../src/modules/cneos/cneos.service', () => ({
  CneosService: {
    getSentryDetail: vi.fn(),
  },
}));

import { CneosService } from '../../src/modules/cneos/cneos.service';
import { NeoController } from '../../src/modules/neo/neo.controller';
import { NeoService } from '../../src/modules/neo/neo.service';

const mockReq = (overrides = {}) =>
  ({ query: {}, params: {}, body: {}, ...overrides }) as unknown as Request;
const mockRes = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn() }) as unknown as Response;

const mockAsteroid: NeoObject = {
  id: '123',
  neo_reference_id: '123',
  name: 'TestAsteroid',
  nasa_jpl_url: 'https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=123',
  absolute_magnitude_h: 22.0,
  is_potentially_hazardous_asteroid: false,
  estimated_diameter: {
    kilometers: { estimated_diameter_min: 0.1, estimated_diameter_max: 0.3 },
    meters: { estimated_diameter_min: 100, estimated_diameter_max: 300 },
  },
  close_approach_data: [],
};
const mockSentryDetail = {
  designation: '99942',
  cumulativeImpactProbability: 0.00001,
  palermoCumulative: -2.5,
  palermoMax: -3.0,
  torinoMax: 0,
  impactEnergy: 0.1,
  diameter: '0.37km',
  mass: '6.1E+10',
  velocityImpact: '12.6',
  velocityInfinity: '5.87',
  totalVirtualImpactors: 100,
  virtualImpactors: [],
};

describe('NeoController error handling', () => {
  let next: NextFunction;
  beforeEach(() => {
    vi.clearAllMocks();
    next = vi.fn();
  });

  it('getFeed forwards errors to next', async () => {
    const err = new Error('api fail');
    vi.mocked(NeoService.getFeed).mockRejectedValueOnce(err);
    await NeoController.getFeed(mockReq(), mockRes(), next);
    expect(next).toHaveBeenCalledWith(err);
  });

  it('lookup forwards errors to next', async () => {
    const err = new Error('not found');
    vi.mocked(NeoService.lookup).mockRejectedValueOnce(err);
    await NeoController.lookup(mockReq({ params: { asteroidId: '123' } }), mockRes(), next);
    expect(next).toHaveBeenCalledWith(err);
  });

  it('getRiskAnalysis forwards errors to next', async () => {
    const err = new Error('fail');
    vi.mocked(NeoService.getFeed).mockRejectedValueOnce(err);
    await NeoController.getRiskAnalysis(mockReq(), mockRes(), next);
    expect(next).toHaveBeenCalledWith(err);
  });

  it('lookupRisk forwards errors to next', async () => {
    const err = new Error('fail');
    vi.mocked(NeoService.lookup).mockRejectedValueOnce(err);
    await NeoController.lookupRisk(mockReq({ params: { asteroidId: '123' } }), mockRes(), next);
    expect(next).toHaveBeenCalledWith(err);
  });

  it('lookupSentryRisk forwards errors to next when lookup fails', async () => {
    const err = new Error('fail');
    vi.mocked(NeoService.lookup).mockRejectedValueOnce(err);
    await NeoController.lookupSentryRisk(
      mockReq({ params: { asteroidId: '123' } }),
      mockRes(),
      next
    );
    expect(next).toHaveBeenCalledWith(err);
  });

  it('lookupSentryRisk falls back to standard analysis when sentry detail not found', async () => {
    vi.mocked(NeoService.lookup).mockResolvedValueOnce(mockAsteroid);
    vi.mocked(CneosService.getSentryDetail).mockRejectedValueOnce(new Error('not in sentry'));
    vi.mocked(NeoService.analyzeRiskSingle).mockResolvedValueOnce({ risk_level: 'LOW' });

    const res = mockRes();
    await NeoController.lookupSentryRisk(mockReq({ params: { asteroidId: '123' } }), res, next);

    expect(NeoService.analyzeRiskSingle).toHaveBeenCalledWith(mockAsteroid);
    expect(next).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({ sentry_available: false }),
      })
    );
  });

  it('lookupSentryRisk executes sentry-enhanced analysis when sentry detail found', async () => {
    vi.mocked(NeoService.lookup).mockResolvedValueOnce(mockAsteroid);
    vi.mocked(CneosService.getSentryDetail).mockResolvedValueOnce(mockSentryDetail as any);
    vi.mocked(NeoService.analyzeRiskSentryEnhanced).mockResolvedValueOnce({
      risk_level: 'LOW',
      sentry_data: true,
    });

    const res = mockRes();
    await NeoController.lookupSentryRisk(mockReq({ params: { asteroidId: '123' } }), res, next);

    expect(NeoService.analyzeRiskSentryEnhanced).toHaveBeenCalledWith(mockAsteroid, {
      designation: mockSentryDetail.designation,
      cumulativeImpactProbability: mockSentryDetail.cumulativeImpactProbability,
      palermoCumulative: mockSentryDetail.palermoCumulative,
      palermoMax: mockSentryDetail.palermoMax,
      torinoMax: mockSentryDetail.torinoMax,
      impactEnergy: mockSentryDetail.impactEnergy,
      diameter: mockSentryDetail.diameter,
      mass: mockSentryDetail.mass,
      velocityImpact: mockSentryDetail.velocityImpact,
      velocityInfinity: mockSentryDetail.velocityInfinity,
      totalVirtualImpactors: mockSentryDetail.totalVirtualImpactors,
      virtualImpactors: mockSentryDetail.virtualImpactors,
    });
    expect(next).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({ sentry_data: true }),
      })
    );
  });
});
