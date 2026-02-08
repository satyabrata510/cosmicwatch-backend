/**
 * DONKI API types for space weather events.
 * @module space-weather/types
 */

/** Raw CME event from the DONKI API. */
export interface DonkiCmeRaw {
  activityID: string;
  catalog: string;
  startTime: string;
  sourceLocation: string;
  activeRegionNum: number | null;
  link: string;
  note: string;
  instruments: { displayName: string }[];
  linkedEvents?: { activityID: string }[];
  cmeAnalyses:
    | {
        time21_5: string | null;
        latitude: number | null;
        longitude: number | null;
        halfAngle: number | null;
        speed: number | null;
        type: string;
        isMostAccurate: boolean;
        note: string;
        levelOfData: number;
        link: string;
        enlilList:
          | {
              modelCompletionTime: string;
              au: number;
              estimatedShockArrivalTime: string | null;
              estimatedDuration: number | null;
              rmin_re: number | null;
              kp_18: number | null;
              kp_90: number | null;
              kp_135: number | null;
              kp_180: number | null;
              isEarthGB: boolean;
              link: string;
              impactList:
                | {
                    isGlancingBlow: boolean;
                    location: string;
                    arrivalTime: string;
                  }[]
                | null;
              cmeIDs: string[];
            }[]
          | null;
      }[]
    | null;
}

export interface CmeEvent {
  activityId: string;
  startTime: string;
  sourceLocation: string;
  activeRegionNum: number | null;
  note: string;
  instruments: string[];
  speed: number | null;
  halfAngle: number | null;
  latitude: number | null;
  longitude: number | null;
  type: string | null;
  earthDirected: boolean;
  estimatedArrival: string | null;
  linkedEvents: string[];
  link: string;
}

export interface CmeResponse {
  totalCount: number;
  dateRange: { start: string; end: string };
  events: CmeEvent[];
}

/** Raw solar flare event from the DONKI API. */
export interface DonkiFlareRaw {
  flrID: string;
  instruments: { displayName: string }[];
  beginTime: string;
  peakTime: string;
  endTime: string | null;
  classType: string;
  sourceLocation: string;
  activeRegionNum: number | null;
  note: string;
  link: string;
}

export interface SolarFlare {
  flareId: string;
  beginTime: string;
  peakTime: string;
  endTime: string | null;
  classType: string;
  classCategory: string;
  intensity: number;
  sourceLocation: string;
  activeRegionNum: number | null;
  instruments: string[];
  note: string;
  link: string;
}

export interface SolarFlareResponse {
  totalCount: number;
  dateRange: { start: string; end: string };
  events: SolarFlare[];
  summary: {
    xClass: number;
    mClass: number;
    cClass: number;
    other: number;
  };
}

/** Raw geomagnetic storm event from the DONKI API. */
export interface DonkiStormRaw {
  gstID: string;
  startTime: string;
  allKpIndex: {
    observedTime: string;
    kpIndex: number;
    source: string;
  }[];
  link: string;
}

export interface GeomagneticStorm {
  stormId: string;
  startTime: string;
  maxKpIndex: number;
  stormLevel: string;
  kpReadings: {
    observedTime: string;
    kpIndex: number;
    source: string;
  }[];
  link: string;
}

export interface GeomagneticStormResponse {
  totalCount: number;
  dateRange: { start: string; end: string };
  events: GeomagneticStorm[];
}

/** Raw DONKI notification message. */
export interface DonkiNotificationRaw {
  messageType: string;
  messageID: string;
  messageURL: string;
  messageIssueTime: string;
  messageBody: string;
}

export interface SpaceWeatherNotification {
  messageType: string;
  messageId: string;
  messageUrl: string;
  issueTime: string;
  body: string;
}

export interface SpaceWeatherNotificationsResponse {
  totalCount: number;
  dateRange: { start: string; end: string };
  notifications: SpaceWeatherNotification[];
}
