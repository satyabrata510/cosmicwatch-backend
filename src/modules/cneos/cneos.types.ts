/**
 * SSD/CNEOS API types for Close Approach, Sentry, and Fireball data.
 * @module cneos/types
 */

/** Raw response from the CNEOS Close Approach Data (CAD) API. */
export interface CadRawResponse {
  signature: { version: string; source: string };
  count: number;
  fields: string[];
  data: (string | null)[][];
}

export interface CloseApproach {
  designation: string;
  orbitId: string;
  julianDate: string;
  approachDate: string;
  distanceAu: number;
  distanceMinAu: number;
  distanceMaxAu: number;
  distanceKm: number;
  distanceLunar: number;
  velocityRelative: number;
  velocityInfinity: number;
  uncertaintyTime: string;
  absoluteMagnitude: number | null;
  diameter: number | null;
  diameterSigma: number | null;
  fullname: string | null;
}

export interface CloseApproachResponse {
  totalCount: number;
  dateRange: { min: string; max: string };
  approaches: CloseApproach[];
}

/** Raw response from the Sentry impact monitoring API. */
export interface SentryRawSummaryResponse {
  signature: { version: string; source: string };
  count: number;
  data: SentryRawSummaryRecord[];
}

export interface SentryRawSummaryRecord {
  des: string;
  fullname: string;
  h: string;
  diameter: string;
  n_imp: string;
  ip: string;
  ps_cum: string;
  ps_max: string;
  ts_max: string;
  range: string;
  last_obs: string;
  last_obs_jd: string;
  v_inf: string;
  id: string;
}

export interface SentryObject {
  designation: string;
  fullname: string;
  absoluteMagnitude: number;
  diameter: number | null;
  impactCount: number;
  impactProbability: number;
  palermoCumulative: number;
  palermoMax: number;
  torinoMax: number;
  impactDateRange: string;
  lastObservation: string;
  velocityInfinity: number;
}

export interface SentryListResponse {
  totalCount: number;
  objects: SentryObject[];
}

// Sentry Mode-O detail response
export interface SentryRawDetailResponse {
  signature: { version: string; source: string };
  summary: {
    des: string;
    fullname: string;
    method: string;
    h: string;
    diameter: string;
    mass: string;
    energy: string;
    v_inf: string;
    v_imp: string;
    ip: string;
    n_imp: string;
    ps_cum: string;
    ps_max: string;
    ts_max: string;
    first_obs: string;
    last_obs: string;
    darc: string;
    nobs: string;
    ndel: string;
    ndop: string;
    nsat: string;
    pdate: string;
    cdate: string;
  };
  data: SentryVirtualImpactor[];
}

export interface SentryVirtualImpactor {
  date: string;
  energy: string;
  ip: string;
  ps: string;
  ts: string;
  sigma_vi?: string;
  sigma_lov?: string;
  sigma_mc?: string;
  dist?: string;
  width?: string;
  sigma_imp?: string;
  stretch?: string;
}

export interface SentryDetailResponse {
  designation: string;
  fullname: string;
  method: string;
  absoluteMagnitude: number;
  diameter: number | null;
  mass: number | null;
  impactEnergy: number | null;
  velocityInfinity: number;
  velocityImpact: number;
  cumulativeImpactProbability: number;
  totalVirtualImpactors: number;
  palermoCumulative: number;
  palermoMax: number;
  torinoMax: number;
  observationArc: string;
  totalObservations: number;
  firstObservation: string;
  lastObservation: string;
  virtualImpactors: {
    date: string;
    impactEnergy: number | null;
    impactProbability: number;
    palermoScale: number;
    torinoScale: number;
  }[];
}

/** Raw response from the CNEOS fireball / bolide API. */
export interface FireballRawResponse {
  signature: { version: string; source: string };
  count: number;
  fields: string[];
  data: (string | null)[][];
}

export interface Fireball {
  date: string;
  latitude: number | null;
  latitudeDirection: string | null;
  longitude: number | null;
  longitudeDirection: string | null;
  altitude: number | null;
  velocity: number | null;
  totalRadiatedEnergy: number;
  impactEnergy: number;
  location: string | null;
}

export interface FireballResponse {
  totalCount: number;
  fireballs: Fireball[];
}
