import axios from 'axios';
import { CachePrefix, CacheTTL, env } from '../../config';
import { cacheKey, getOrSet, neoLogger } from '../../utils';
import type {
  CmeEvent,
  CmeResponse,
  DonkiCmeRaw,
  DonkiFlareRaw,
  DonkiNotificationRaw,
  DonkiStormRaw,
  GeomagneticStorm,
  GeomagneticStormResponse,
  SolarFlare,
  SolarFlareResponse,
  SpaceWeatherNotification,
  SpaceWeatherNotificationsResponse,
} from './space-weather.types';

const DONKI_CLIENT = axios.create({
  baseURL: env.nasa.donkiBaseUrl,
  timeout: 20000,
  params: { api_key: env.nasa.apiKey },
});

const donkiLogger = neoLogger.child({ submodule: 'donki' });

/**
 * Default date range: last 30 days
 */
function getDefaultDates(startDate?: string, endDate?: string) {
  const end = endDate || new Date().toISOString().split('T')[0];
  const start =
    startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  return { start, end };
}

/** Maps a Kp index to its NOAA geomagnetic storm level designation. */
function kpToStormLevel(kp: number): string {
  if (kp >= 9) return 'G5 — Extreme';
  if (kp >= 8) return 'G4 — Severe';
  if (kp >= 7) return 'G3 — Strong';
  if (kp >= 6) return 'G2 — Moderate';
  if (kp >= 5) return 'G1 — Minor';
  return 'Below storm threshold';
}

export const SpaceWeatherService = {
  /** Fetches Coronal Mass Ejection events from DONKI. */
  async getCme(startDate?: string, endDate?: string): Promise<CmeResponse> {
    const dates = getDefaultDates(startDate, endDate);
    const key = cacheKey(CachePrefix.DONKI_CME, dates);

    return getOrSet(key, CacheTTL.DONKI_CME, async () => {
      const { data } = await DONKI_CLIENT.get<DonkiCmeRaw[]>('/CME', {
        params: { startDate: dates.start, endDate: dates.end },
      });

      const events: CmeEvent[] = (data || []).map((raw) => {
        const bestAnalysis = raw.cmeAnalyses?.find((a) => a.isMostAccurate) || raw.cmeAnalyses?.[0];
        const earthImpact = bestAnalysis?.enlilList?.find((e) => e.isEarthGB);

        return {
          activityId: raw.activityID,
          startTime: raw.startTime,
          sourceLocation: raw.sourceLocation,
          activeRegionNum: raw.activeRegionNum,
          note: raw.note || '',
          instruments: raw.instruments.map((i) => i.displayName),
          speed: bestAnalysis?.speed || null,
          halfAngle: bestAnalysis?.halfAngle || null,
          latitude: bestAnalysis?.latitude || null,
          longitude: bestAnalysis?.longitude || null,
          type: bestAnalysis?.type || null,
          earthDirected: !!earthImpact,
          estimatedArrival: earthImpact?.estimatedShockArrivalTime || null,
          linkedEvents: raw.linkedEvents?.map((e) => e.activityID) || [],
          link: raw.link,
        };
      });

      donkiLogger.info({ count: events.length }, 'CME events retrieved');

      return { totalCount: events.length, dateRange: dates, events };
    });
  },

  /** Fetches solar flare events from DONKI. */
  async getSolarFlares(startDate?: string, endDate?: string): Promise<SolarFlareResponse> {
    const dates = getDefaultDates(startDate, endDate);
    const key = cacheKey(CachePrefix.DONKI_FLR, dates);

    return getOrSet(key, CacheTTL.DONKI_FLR, async () => {
      const { data } = await DONKI_CLIENT.get<DonkiFlareRaw[]>('/FLR', {
        params: { startDate: dates.start, endDate: dates.end },
      });

      const summary = { xClass: 0, mClass: 0, cClass: 0, other: 0 };

      const events: SolarFlare[] = (data || []).map((raw) => {
        const classCategory = raw.classType?.charAt(0)?.toUpperCase() || '?';
        const intensity = parseFloat(raw.classType?.slice(1) || '0') || 0;

        if (classCategory === 'X') summary.xClass++;
        else if (classCategory === 'M') summary.mClass++;
        else if (classCategory === 'C') summary.cClass++;
        else summary.other++;

        return {
          flareId: raw.flrID,
          beginTime: raw.beginTime,
          peakTime: raw.peakTime,
          endTime: raw.endTime,
          classType: raw.classType,
          classCategory,
          intensity,
          sourceLocation: raw.sourceLocation,
          activeRegionNum: raw.activeRegionNum,
          instruments: raw.instruments.map((i) => i.displayName),
          note: raw.note || '',
          link: raw.link,
        };
      });

      donkiLogger.info({ count: events.length }, 'Solar flare events retrieved');

      return { totalCount: events.length, dateRange: dates, events, summary };
    });
  },

  /** Fetches geomagnetic storm events from DONKI. */
  async getGeomagneticStorms(
    startDate?: string,
    endDate?: string
  ): Promise<GeomagneticStormResponse> {
    const dates = getDefaultDates(startDate, endDate);
    const key = cacheKey(CachePrefix.DONKI_GST, dates);

    return getOrSet(key, CacheTTL.DONKI_GST, async () => {
      const { data } = await DONKI_CLIENT.get<DonkiStormRaw[]>('/GST', {
        params: { startDate: dates.start, endDate: dates.end },
      });

      const events: GeomagneticStorm[] = (data || []).map((raw) => {
        const maxKp = Math.max(...(raw.allKpIndex || []).map((k) => k.kpIndex));
        return {
          stormId: raw.gstID,
          startTime: raw.startTime,
          maxKpIndex: maxKp,
          stormLevel: kpToStormLevel(maxKp),
          kpReadings: raw.allKpIndex || [],
          link: raw.link,
        };
      });

      donkiLogger.info({ count: events.length }, 'Geomagnetic storm events retrieved');

      return { totalCount: events.length, dateRange: dates, events };
    });
  },

  /** Fetches space weather notification messages from DONKI. */
  async getNotifications(
    startDate?: string,
    endDate?: string,
    type?: string
  ): Promise<SpaceWeatherNotificationsResponse> {
    const dates = getDefaultDates(startDate, endDate);
    const key = cacheKey(CachePrefix.DONKI_NOTIFICATIONS, { ...dates, type });

    return getOrSet(key, CacheTTL.DONKI_NOTIFICATIONS, async () => {
      const params: Record<string, unknown> = {
        startDate: dates.start,
        endDate: dates.end,
      };
      if (type) params.type = type;

      const { data } = await DONKI_CLIENT.get<DonkiNotificationRaw[]>('/notifications', {
        params,
      });

      const notifications: SpaceWeatherNotification[] = (data || []).map((raw) => ({
        messageType: raw.messageType,
        messageId: raw.messageID,
        messageUrl: raw.messageURL,
        issueTime: raw.messageIssueTime,
        body: raw.messageBody,
      }));

      donkiLogger.info({ count: notifications.length }, 'Space weather notifications retrieved');

      return { totalCount: notifications.length, dateRange: dates, notifications };
    });
  },
};
