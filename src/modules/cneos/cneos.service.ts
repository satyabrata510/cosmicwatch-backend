import axios from 'axios';
import { CachePrefix, CacheTTL, env } from '../../config';
import { cacheKey, getOrSet, neoLogger } from '../../utils';
import type {
  CadRawResponse,
  CloseApproach,
  CloseApproachResponse,
  Fireball,
  FireballRawResponse,
  FireballResponse,
  SentryDetailResponse,
  SentryListResponse,
  SentryObject,
  SentryRawDetailResponse,
  SentryRawSummaryResponse,
} from './cneos.types';

// SSD/CNEOS APIs don't require an API key
const SSD_CLIENT = axios.create({
  baseURL: env.nasa.ssdBaseUrl,
  timeout: 20000,
});

const AU_TO_KM = 149597870.7;
const AU_TO_LUNAR = 389.17;

const cneosLogger = neoLogger.child({ submodule: 'cneos' });

/** Parse raw SBDB close-approach tabular data into typed objects. */
function parseCadData(raw: CadRawResponse): CloseApproach[] {
  if (!raw.data || raw.count === 0) return [];

  const fieldIndices = new Map(raw.fields.map((f, i) => [f, i]));

  return raw.data.map((record) => {
    const get = (field: string) => record[fieldIndices.get(field)!];
    const distAu = parseFloat(get('dist') as string);

    return {
      designation: (get('des') as string) || '',
      orbitId: (get('orbit_id') as string) || '',
      julianDate: (get('jd') as string) || '',
      approachDate: (get('cd') as string) || '',
      distanceAu: distAu,
      distanceMinAu: parseFloat(get('dist_min') as string),
      distanceMaxAu: parseFloat(get('dist_max') as string),
      distanceKm: distAu * AU_TO_KM,
      distanceLunar: distAu * AU_TO_LUNAR,
      velocityRelative: parseFloat(get('v_rel') as string),
      velocityInfinity: parseFloat(get('v_inf') as string),
      uncertaintyTime: (get('t_sigma_f') as string) || '',
      absoluteMagnitude: get('h') ? parseFloat(get('h') as string) : null,
      diameter: get('diameter') ? parseFloat(get('diameter') as string) : null,
      diameterSigma: get('diameter_sigma') ? parseFloat(get('diameter_sigma') as string) : null,
      fullname: (get('fullname') as string)?.trim() || null,
    };
  });
}

/** Parse raw fireball tabular data into typed objects. */
function parseFireballData(raw: FireballRawResponse): Fireball[] {
  if (!raw.data || raw.count === 0) return [];

  const fieldIndices = new Map(raw.fields.map((f, i) => [f, i]));

  return raw.data.map((record) => {
    const get = (field: string) => record[fieldIndices.get(field)!];

    const lat = get('lat') ? parseFloat(get('lat') as string) : null;
    const latDir = get('lat-dir') as string | null;
    const lon = get('lon') ? parseFloat(get('lon') as string) : null;
    const lonDir = get('lon-dir') as string | null;

    let location: string | null = null;
    if (lat !== null && lon !== null) {
      location = `${lat}°${latDir || ''}, ${lon}°${lonDir || ''}`;
    }

    return {
      date: (get('date') as string) || '',
      latitude: lat,
      latitudeDirection: latDir,
      longitude: lon,
      longitudeDirection: lonDir,
      altitude: get('alt') ? parseFloat(get('alt') as string) : null,
      velocity: get('vel') ? parseFloat(get('vel') as string) : null,
      totalRadiatedEnergy: parseFloat(get('energy') as string),
      impactEnergy: parseFloat(get('impact-e') as string),
      location,
    };
  });
}

/** CNEOS / SSD service — close-approach, Sentry impact monitoring and fireball data. */
export const CneosService = {
  /** Query SBDB close-approach data with date/distance filters. */
  async getCloseApproaches(
    options: {
      dateMin?: string;
      dateMax?: string;
      distMax?: string;
      sort?: string;
      limit?: number;
      neo?: boolean;
      pha?: boolean;
      diameter?: boolean;
      fullname?: boolean;
    } = {}
  ): Promise<CloseApproachResponse> {
    // Normalize defaults into the key so equivalent queries share one cache entry
    const normalized = {
      dateMin: options.dateMin || 'now',
      dateMax: options.dateMax || '+60',
      distMax: options.distMax || '10LD',
      sort: options.sort || 'dist',
      limit: options.limit,
      neo: options.neo !== false,
      pha: options.pha || false,
    };
    const key = cacheKey(CachePrefix.CNEOS_CAD, normalized);

    return getOrSet(key, CacheTTL.CNEOS_CAD, async () => {
      const { data } = await SSD_CLIENT.get<CadRawResponse>('/cad.api', {
        params: {
          'date-min': options.dateMin || 'now',
          'date-max': options.dateMax || '%2B60',
          'dist-max': options.distMax || '10LD',
          sort: options.sort || 'dist',
          limit: options.limit,
          neo: options.neo !== false,
          pha: options.pha || undefined,
          diameter: true,
          fullname: true,
        },
      });

      const approaches = parseCadData(data);

      cneosLogger.info({ count: data.count }, 'Close approach data retrieved');

      return {
        totalCount: data.count,
        dateRange: {
          min: options.dateMin || 'now',
          max: options.dateMax || '+60 days',
        },
        approaches,
      };
    });
  },

  /** List objects in CNEOS Sentry impact monitoring with optional filters. */
  async getSentryList(
    options: { psMin?: number; ipMin?: number; hMax?: number; days?: number } = {}
  ): Promise<SentryListResponse> {
    const key = cacheKey(CachePrefix.CNEOS_SENTRY, options);

    return getOrSet(key, CacheTTL.CNEOS_SENTRY_LIST, async () => {
      const params: Record<string, unknown> = {};
      if (options.psMin !== undefined) params['ps-min'] = options.psMin;
      if (options.ipMin !== undefined) params['ip-min'] = options.ipMin;
      if (options.hMax !== undefined) params['h-max'] = options.hMax;
      if (options.days !== undefined) params.days = options.days;

      const { data } = await SSD_CLIENT.get<SentryRawSummaryResponse>('/sentry.api', { params });

      const objects: SentryObject[] = (data.data || []).map((r) => ({
        designation: r.des,
        fullname: r.fullname,
        absoluteMagnitude: parseFloat(r.h),
        diameter: r.diameter ? parseFloat(r.diameter) : null,
        impactCount: parseInt(r.n_imp, 10),
        impactProbability: parseFloat(r.ip),
        palermoCumulative: parseFloat(r.ps_cum),
        palermoMax: parseFloat(r.ps_max),
        torinoMax: parseInt(r.ts_max, 10),
        impactDateRange: r.range,
        lastObservation: r.last_obs,
        velocityInfinity: parseFloat(r.v_inf),
      }));

      cneosLogger.info({ count: data.count }, 'Sentry list retrieved');

      return { totalCount: data.count, objects };
    });
  },

  /** Fetch detailed Sentry data for a specific object by designation. */
  async getSentryDetail(designation: string): Promise<SentryDetailResponse> {
    const key = cacheKey(CachePrefix.CNEOS_SENTRY_DETAIL, designation);

    return getOrSet(key, CacheTTL.CNEOS_SENTRY_DETAIL, async () => {
      const { data } = await SSD_CLIENT.get<SentryRawDetailResponse>('/sentry.api', {
        params: { des: designation },
      });

      // Handle "not found" or "removed" cases
      if ((data as unknown as { error?: string }).error) {
        throw new Error(
          `Sentry object "${designation}": ${(data as unknown as { error: string }).error}`
        );
      }

      const s = data.summary;
      const detail: SentryDetailResponse = {
        designation: s.des,
        fullname: s.fullname,
        method: s.method,
        absoluteMagnitude: parseFloat(s.h),
        diameter: s.diameter ? parseFloat(s.diameter) : null,
        mass: s.mass ? parseFloat(s.mass) : null,
        impactEnergy: s.energy ? parseFloat(s.energy) : null,
        velocityInfinity: parseFloat(s.v_inf),
        velocityImpact: parseFloat(s.v_imp),
        cumulativeImpactProbability: parseFloat(s.ip),
        totalVirtualImpactors: parseInt(s.n_imp, 10),
        palermoCumulative: parseFloat(s.ps_cum),
        palermoMax: parseFloat(s.ps_max),
        torinoMax: parseInt(s.ts_max, 10),
        observationArc: s.darc,
        totalObservations: parseInt(s.nobs, 10),
        firstObservation: s.first_obs,
        lastObservation: s.last_obs,
        virtualImpactors: (data.data || []).map((vi) => ({
          date: vi.date,
          impactEnergy: vi.energy ? parseFloat(vi.energy) : null,
          impactProbability: parseFloat(vi.ip),
          palermoScale: parseFloat(vi.ps),
          torinoScale: parseInt(vi.ts, 10),
        })),
      };

      cneosLogger.info(
        { designation, impactors: detail.totalVirtualImpactors },
        'Sentry detail retrieved'
      );

      return detail;
    });
  },

  /** Query recorded fireball / bolide events from the SSD API. */
  async getFireballs(
    options: {
      dateMin?: string;
      dateMax?: string;
      limit?: number;
      sort?: string;
      energyMin?: number;
      reqLoc?: boolean;
    } = {}
  ): Promise<FireballResponse> {
    // Normalize defaults so equivalent queries share one cache entry
    const normalized = {
      dateMin: options.dateMin,
      dateMax: options.dateMax,
      sort: options.sort || '-date',
      limit: options.limit || 20,
      energyMin: options.energyMin,
      reqLoc: options.reqLoc || false,
    };
    const key = cacheKey(CachePrefix.CNEOS_FIREBALL, normalized);

    return getOrSet(key, CacheTTL.CNEOS_FIREBALL, async () => {
      const params: Record<string, unknown> = {
        sort: options.sort || '-date',
        limit: options.limit || 20,
      };
      if (options.dateMin) params['date-min'] = options.dateMin;
      if (options.dateMax) params['date-max'] = options.dateMax;
      if (options.energyMin) params['impact-e-min'] = options.energyMin;
      if (options.reqLoc) params['req-loc'] = true;

      const { data } = await SSD_CLIENT.get<FireballRawResponse>('/fireball.api', { params });

      const fireballs = parseFireballData(data);

      cneosLogger.info({ count: data.count }, 'Fireball data retrieved');

      return { totalCount: data.count, fireballs };
    });
  },
};
