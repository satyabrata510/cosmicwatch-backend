import axios from 'axios';
import { CachePrefix, CacheTTL, env } from '../../config';
import { cacheKey, getOrSet, neoLogger } from '../../utils';
import type { EpicImage, EpicImageRaw, EpicResponse } from './epic.types';

const EPIC_CLIENT = axios.create({
  baseURL: env.nasa.epicBaseUrl,
  timeout: 15000,
});

const epicLogger = neoLogger.child({ submodule: 'epic' });

/** Transform a raw EPIC image record into a typed domain object. */
function transformImage(raw: EpicImageRaw, type: 'natural' | 'enhanced'): EpicImage {
  // Construct image URL: https://epic.gsfc.nasa.gov/archive/{type}/{year}/{month}/{day}/png/{image}.png
  const dateStr = raw.date.split(' ')[0]; // "2024-01-15"
  const [year, month, day] = dateStr.split('-');
  const imageUrl = `https://epic.gsfc.nasa.gov/archive/${type}/${year}/${month}/${day}/png/${raw.image}.png`;

  return {
    identifier: raw.identifier,
    caption: raw.caption,
    imageFilename: raw.image,
    version: raw.version,
    date: raw.date,
    imageUrl,
    centroidCoordinates: {
      latitude: raw.centroid_coordinates.lat,
      longitude: raw.centroid_coordinates.lon,
    },
    dscovrPosition: raw.dscovr_j2000_position,
    lunarPosition: raw.lunar_j2000_position,
    sunPosition: raw.sun_j2000_position,
    attitudeQuaternions: raw.attitude_quaternions,
  };
}

/** EPIC service — Earth imagery from the DSCOVR satellite. */
export const EpicService = {
  /** Fetch latest or date-specific natural-color Earth images (30 m TTL). */
  async getNatural(date?: string): Promise<EpicResponse> {
    const resolvedDate = date || `latest:${new Date().toISOString().split('T')[0]}`;
    const key = cacheKey(CachePrefix.EPIC, { type: 'natural', date: resolvedDate });

    return getOrSet(key, CacheTTL.EPIC_IMAGES, async () => {
      const endpoint = date ? `/api/natural/date/${date}` : '/api/natural';
      const { data } = await EPIC_CLIENT.get<EpicImageRaw[]>(endpoint);

      const images = data.map((img) => transformImage(img, 'natural'));

      epicLogger.info({ count: images.length }, 'EPIC natural images retrieved');

      return { totalCount: images.length, imageType: 'natural', images };
    });
  },

  /** Fetch latest or date-specific enhanced-color Earth images (30 m TTL). */
  async getEnhanced(date?: string): Promise<EpicResponse> {
    const resolvedDate = date || `latest:${new Date().toISOString().split('T')[0]}`;
    const key = cacheKey(CachePrefix.EPIC, { type: 'enhanced', date: resolvedDate });

    return getOrSet(key, CacheTTL.EPIC_IMAGES, async () => {
      const endpoint = date ? `/api/enhanced/date/${date}` : '/api/enhanced';
      const { data } = await EPIC_CLIENT.get<EpicImageRaw[]>(endpoint);

      const images = data.map((img) => transformImage(img, 'enhanced'));

      epicLogger.info({ count: images.length }, 'EPIC enhanced images retrieved');

      return { totalCount: images.length, imageType: 'enhanced', images };
    });
  },

  /** List available image dates for a given type (6 h TTL). */
  async getAvailableDates(type: 'natural' | 'enhanced' = 'natural'): Promise<string[]> {
    const key = cacheKey(CachePrefix.EPIC_DATES, type);

    return getOrSet(key, CacheTTL.EPIC_DATES, async () => {
      const { data } = await EPIC_CLIENT.get<{ date: string }[]>(`/api/${type}/available`);
      return data.map((d) => d.date);
    });
  },
};
