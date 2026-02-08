import axios from 'axios';
import { CachePrefix, CacheTTL, env } from '../../config';
import { cacheKey, getOrSet, neoLogger } from '../../utils';
import type { NasaMediaItem, NasaMediaSearchRaw, NasaMediaSearchResponse } from './media.types';

// NASA Image & Video Library requires NO API key
const MEDIA_CLIENT = axios.create({
  baseURL: env.nasa.mediaBaseUrl,
  timeout: 15000,
});

const mediaLogger = neoLogger.child({ submodule: 'media' });

/** NASA Image & Video Library service — search and asset retrieval. */
export const MediaService = {
  /** Search the NASA media library by keyword with optional type/year filters (10 m TTL). */
  async search(options: {
    query: string;
    mediaType?: string; // "image" | "video" | "audio"
    yearStart?: number;
    yearEnd?: number;
    page?: number;
  }): Promise<NasaMediaSearchResponse> {
    // Normalize page default so {query:'mars'} and {query:'mars',page:1} share one entry
    const normalized = {
      query: options.query,
      mediaType: options.mediaType,
      yearStart: options.yearStart,
      yearEnd: options.yearEnd,
      page: options.page || 1,
    };
    const key = cacheKey(CachePrefix.MEDIA_SEARCH, normalized);

    return getOrSet(key, CacheTTL.MEDIA_SEARCH, async () => {
      const params: Record<string, unknown> = {
        q: options.query,
        page: options.page || 1,
      };
      if (options.mediaType) params.media_type = options.mediaType;
      if (options.yearStart) params.year_start = options.yearStart;
      if (options.yearEnd) params.year_end = options.yearEnd;

      const { data } = await MEDIA_CLIENT.get<NasaMediaSearchRaw>('/search', { params });

      const items: NasaMediaItem[] = (data.collection.items || []).map((item) => {
        const meta = item.data[0];
        const thumbnail = item.links?.find((l) => l.rel === 'preview')?.href || null;

        return {
          nasaId: meta.nasa_id,
          title: meta.title,
          description: meta.description || meta.description_508 || null,
          mediaType: meta.media_type,
          dateCreated: meta.date_created,
          center: meta.center,
          keywords: meta.keywords || [],
          thumbnailUrl: thumbnail,
          collectionUrl: item.href,
          photographer: meta.photographer || meta.secondary_creator || null,
          location: meta.location || null,
        };
      });

      const hasMore = !!data.collection.links?.find((l) => l.rel === 'next');

      mediaLogger.info(
        { query: options.query, totalHits: data.collection.metadata.total_hits },
        'NASA media search completed'
      );

      return {
        totalHits: data.collection.metadata.total_hits,
        query: options.query,
        items,
        hasMore,
      };
    });
  },

  /** Retrieve the asset manifest for a specific NASA media ID (1 h TTL). */
  async getAsset(nasaId: string): Promise<{ url: string; type: string }[]> {
    const key = cacheKey(CachePrefix.MEDIA_ASSET, nasaId);

    return getOrSet(key, CacheTTL.MEDIA_ASSET, async () => {
      const { data } = await MEDIA_CLIENT.get<{
        collection: { items: { href: string }[] };
      }>(`/asset/${nasaId}`);

      return (data.collection.items || []).map((item) => ({
        url: item.href,
        type: item.href.split('.').pop() || 'unknown',
      }));
    });
  },
};
