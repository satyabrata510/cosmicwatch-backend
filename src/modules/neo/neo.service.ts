import axios from 'axios';
import { CachePrefix, CacheTTL, env, prisma } from '../../config';
import { cacheKey, getOrSet, neoLogger } from '../../utils';
import { connectRiskEngineSocket } from '../../websocket';
import type { EnhancedRiskResult, NeoFeedResponse, NeoObject } from './neo.types';

const NASA_CLIENT = axios.create({
  baseURL: env.nasa.baseUrl,
  timeout: 15000,
  params: { api_key: env.nasa.apiKey },
});

/** Axios client for HTTP request/response calls to the Python risk engine. */
const RISK_ENGINE_CLIENT = axios.create({
  baseURL: env.riskEngine.url,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Connect to the Python risk engine via Socket.IO.
 * Establishes a persistent WebSocket connection instead of polling `/health`.
 */
async function connectToRiskEngine(): Promise<void> {
  await connectRiskEngineSocket();
}

/** Cache asteroid objects from a feed response into the Prisma DB (L2 cache). */
async function cacheAsteroids(feed: NeoFeedResponse): Promise<void> {
  const allAsteroids = Object.values(feed.near_earth_objects).flat();

  for (const asteroid of allAsteroids) {
    await prisma.cachedAsteroid.upsert({
      where: { neoReferenceId: asteroid.neo_reference_id },
      create: {
        neoReferenceId: asteroid.neo_reference_id,
        name: asteroid.name,
        absoluteMagnitude: asteroid.absolute_magnitude_h,
        isHazardous: asteroid.is_potentially_hazardous_asteroid,
        estimatedDiameterMin: asteroid.estimated_diameter.kilometers.estimated_diameter_min,
        estimatedDiameterMax: asteroid.estimated_diameter.kilometers.estimated_diameter_max,
        dataJson: JSON.parse(JSON.stringify(asteroid)),
      },
      update: {
        dataJson: JSON.parse(JSON.stringify(asteroid)),
        lastFetchedAt: new Date(),
      },
    });
  }

  neoLogger.info({ count: allAsteroids.length }, 'Cached asteroids from feed');
}

/** Check whether a cached record is still within the allowed age. */
function isCacheFresh(lastFetched: Date, maxAgeMinutes: number): boolean {
  const ageMs = Date.now() - lastFetched.getTime();
  return ageMs < maxAgeMinutes * 60 * 1000;
}

/** NEO service — feed, lookup, and Python risk-engine integration. */
export const NeoService = {
  /** Connect to the Python risk engine via Socket.IO (called at bootstrap). */
  async connectRiskEngine(): Promise<void> {
    await connectToRiskEngine();
  },

  /** Fetch NEO feed from NASA API for a date range. */
  async getFeed(startDate: string, endDate: string): Promise<NeoFeedResponse> {
    const key = cacheKey(CachePrefix.NEO_FEED, { startDate, endDate });

    return getOrSet(key, CacheTTL.NEO_FEED, async () => {
      const { data } = await NASA_CLIENT.get<NeoFeedResponse>('/feed', {
        params: { start_date: startDate, end_date: endDate },
      });

      // Cache asteroids in background (don't block response)
      cacheAsteroids(data).catch((err) => neoLogger.error({ err }, 'Failed to cache asteroids'));

      return data;
    });
  },

  /** Look up a single asteroid — L1 Redis → L2 Prisma DB → L3 NASA API. */
  async lookup(asteroidId: string): Promise<NeoObject> {
    const key = cacheKey(CachePrefix.NEO_LOOKUP, asteroidId);

    return getOrSet(key, CacheTTL.NEO_LOOKUP, async () => {
      // Check Prisma cache (L2)
      const cached = await prisma.cachedAsteroid.findUnique({
        where: { neoReferenceId: asteroidId },
      });

      // Return cached if less than 1 hour old
      if (cached && isCacheFresh(cached.lastFetchedAt, 60)) {
        return cached.dataJson as unknown as NeoObject;
      }

      const { data } = await NASA_CLIENT.get<NeoObject>(`/neo/${asteroidId}`);

      // Update Prisma cache
      await prisma.cachedAsteroid.upsert({
        where: { neoReferenceId: asteroidId },
        create: {
          neoReferenceId: data.neo_reference_id,
          name: data.name,
          absoluteMagnitude: data.absolute_magnitude_h,
          isHazardous: data.is_potentially_hazardous_asteroid,
          estimatedDiameterMin: data.estimated_diameter.kilometers.estimated_diameter_min,
          estimatedDiameterMax: data.estimated_diameter.kilometers.estimated_diameter_max,
          dataJson: JSON.parse(JSON.stringify(data)),
        },
        update: {
          dataJson: JSON.parse(JSON.stringify(data)),
          lastFetchedAt: new Date(),
        },
      });

      return data;
    });
  },

  /** Batch risk analysis via the Python scientific engine (cached). */
  async analyzeRiskEnhanced(
    asteroids: NeoObject[],
    dateRange?: { start: string; end: string }
  ): Promise<EnhancedRiskResult> {
    const ids = asteroids
      .map((a) => a.neo_reference_id)
      .sort()
      .join(',');
    const key = cacheKey(CachePrefix.RISK, { ids, dateRange });

    return getOrSet(key, CacheTTL.RISK_ANALYSIS, async () => {
      neoLogger.info({ count: asteroids.length }, 'Sending asteroids to Python risk engine');

      const { data } = await RISK_ENGINE_CLIENT.post('/api/v1/analyze', {
        asteroids,
        date_range: dateRange,
      });

      neoLogger.info(
        {
          analyzed: data.total_analyzed,
          engine: data.engine,
          maxRisk: data.statistics?.max_risk_score,
        },
        'Python risk engine analysis complete'
      );

      return data as EnhancedRiskResult;
    });
  },

  /** Single-asteroid risk analysis via the Python engine. */
  async analyzeRiskSingle(asteroid: NeoObject) {
    const key = cacheKey(CachePrefix.RISK, { id: asteroid.neo_reference_id, mode: 'single' });

    return getOrSet(key, CacheTTL.RISK_ANALYSIS, async () => {
      const { data } = await RISK_ENGINE_CLIENT.post('/api/v1/analyze/single', asteroid);
      return data;
    });
  },

  /** Sentry-enhanced risk analysis combining NeoWs + CNEOS Sentry data. */
  async analyzeRiskSentryEnhanced(
    asteroid: NeoObject,
    sentryData: {
      designation: string;
      cumulativeImpactProbability: number;
      palermoCumulative: number;
      palermoMax: number;
      torinoMax: number;
      impactEnergy: number | null;
      diameter: number | null;
      mass: number | null;
      velocityImpact: number | null;
      velocityInfinity: number;
      totalVirtualImpactors: number;
      virtualImpactors: unknown[];
    }
  ) {
    // Include volatile Sentry fields in the cache key so that updated
    // impact probabilities, Palermo scales, etc. produce a new key.
    const key = cacheKey(CachePrefix.RISK, {
      id: asteroid.neo_reference_id,
      mode: 'sentry',
      des: sentryData.designation,
      ip: sentryData.cumulativeImpactProbability,
      ps: sentryData.palermoCumulative,
      psMax: sentryData.palermoMax,
      nVi: sentryData.totalVirtualImpactors,
    });

    return getOrSet(key, CacheTTL.RISK_ANALYSIS, async () => {
      const { data } = await RISK_ENGINE_CLIENT.post('/api/v1/analyze/sentry-enhanced', {
        asteroid,
        sentry_data: {
          designation: sentryData.designation,
          cumulative_impact_probability: sentryData.cumulativeImpactProbability,
          palermo_cumulative: sentryData.palermoCumulative,
          palermo_max: sentryData.palermoMax,
          torino_max: sentryData.torinoMax,
          impact_energy_mt: sentryData.impactEnergy,
          diameter_km: sentryData.diameter,
          mass_kg: sentryData.mass,
          velocity_impact: sentryData.velocityImpact,
          velocity_infinity: sentryData.velocityInfinity,
          total_virtual_impactors: sentryData.totalVirtualImpactors,
          virtual_impactors: sentryData.virtualImpactors,
        },
      });
      return data;
    });
  },
};
