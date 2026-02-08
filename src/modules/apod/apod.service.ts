import axios from 'axios';
import { CachePrefix, CacheTTL, env } from '../../config';
import { cacheKey, getOrSet, neoLogger } from '../../utils';
import type { ApodEntry, ApodRaw } from './apod.types';

const APOD_CLIENT = axios.create({
  baseURL: env.nasa.apodBaseUrl,
  timeout: 15000,
  params: { api_key: env.nasa.apiKey },
});

const apodLogger = neoLogger.child({ submodule: 'apod' });

/** Transform raw NASA APOD payload into a clean domain object. */
function transformApod(raw: ApodRaw): ApodEntry {
  return {
    title: raw.title,
    date: raw.date,
    explanation: raw.explanation,
    mediaType: raw.media_type,
    url: raw.url,
    hdUrl: raw.hdurl || null,
    thumbnailUrl: raw.thumbnail_url || null,
    copyright: raw.copyright || null,
  };
}

/** Astronomy Picture of the Day service — proxies and caches NASA APOD API. */
export const ApodService = {
  /** Fetch today's APOD or a specific date (6 h TTL). */
  async getToday(date?: string): Promise<ApodEntry> {
    const resolvedDate = date || new Date().toISOString().split('T')[0];
    const key = cacheKey(CachePrefix.APOD, { date: resolvedDate });

    return getOrSet(key, CacheTTL.APOD_TODAY, async () => {
      const params: Record<string, unknown> = { thumbs: true };
      if (date) params.date = date;

      const { data } = await APOD_CLIENT.get<ApodRaw>('/apod', { params });

      apodLogger.info({ date: data.date, title: data.title }, 'APOD retrieved');

      return transformApod(data);
    });
  },

  /** Fetch random APOD entries (uncached — every call returns different results). */
  async getRandom(count: number = 5): Promise<ApodEntry[]> {
    const clampedCount = Math.min(Math.max(1, count), 10);

    const { data } = await APOD_CLIENT.get<ApodRaw[]>('/apod', {
      params: { count: clampedCount, thumbs: true },
    });

    apodLogger.info({ count: data.length }, 'Random APODs retrieved (uncached)');

    return data.map(transformApod);
  },

  /** Fetch APODs for a date range (24 h TTL — historical data is immutable). */
  async getRange(startDate: string, endDate: string): Promise<ApodEntry[]> {
    const key = cacheKey(CachePrefix.APOD, { start: startDate, end: endDate });

    return getOrSet(key, CacheTTL.APOD_RANGE, async () => {
      const { data } = await APOD_CLIENT.get<ApodRaw[]>('/apod', {
        params: { start_date: startDate, end_date: endDate, thumbs: true },
      });

      apodLogger.info({ count: data.length }, 'APOD range retrieved');

      return data.map(transformApod);
    });
  },
};
