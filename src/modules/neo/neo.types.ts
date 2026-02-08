/** Standard API response envelope. */
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** NASA NEO feed response from the NeoWs API. */
export interface NeoFeedResponse {
  links?: {
    next?: string;
    previous?: string;
    self?: string;
  };
  element_count: number;
  near_earth_objects: Record<string, NeoObject[]>;
}

export interface NeoObject {
  id: string;
  neo_reference_id: string;
  name: string;
  designation?: string;
  nasa_jpl_url: string;
  absolute_magnitude_h: number;
  is_potentially_hazardous_asteroid: boolean;
  is_sentry_object?: boolean;
  estimated_diameter: {
    kilometers: {
      estimated_diameter_min: number;
      estimated_diameter_max: number;
    };
    meters: {
      estimated_diameter_min: number;
      estimated_diameter_max: number;
    };
    miles?: {
      estimated_diameter_min: number;
      estimated_diameter_max: number;
    };
    feet?: {
      estimated_diameter_min: number;
      estimated_diameter_max: number;
    };
  };
  close_approach_data: CloseApproachData[];
  orbital_data?: OrbitalData;
}

export interface OrbitalData {
  orbit_id: string;
  orbit_determination_date: string;
  first_observation_date: string;
  last_observation_date: string;
  data_arc_in_days: number;
  observations_used: number;
  orbit_uncertainty: string;
  minimum_orbit_intersection: string;
  jupiter_tisserand_invariant: string;
  epoch_osculation: string;
  eccentricity: string;
  semi_major_axis: string;
  inclination: string;
  ascending_node_longitude: string;
  orbital_period: string;
  perihelion_distance: string;
  perihelion_argument: string;
  aphelion_distance: string;
  perihelion_time: string;
  mean_anomaly: string;
  mean_motion: string;
  equinox: string;
  orbit_class: {
    orbit_class_type: string;
    orbit_class_description: string;
    orbit_class_range: string;
  };
}

export interface CloseApproachData {
  close_approach_date: string;
  close_approach_date_full: string;
  epoch_date_close_approach: number;
  relative_velocity: {
    kilometers_per_second: string;
    kilometers_per_hour: string;
    miles_per_hour: string;
  };
  miss_distance: {
    astronomical: string;
    lunar: string;
    kilometers: string;
    miles: string;
  };
  orbiting_body: string;
}

/** Severity level for asteroid risk assessments. */
export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface RiskAssessment {
  asteroidId: string;
  name: string;
  riskLevel: RiskLevel;
  riskScore: number;
  hazardous: boolean;
  estimatedDiameter: number;
  missDistance: number;
  missDistanceLunar: number;
  velocity: number;
  velocityKmH: number;
  closestApproachDate: string;
  kineticEnergy: number;
  kineticEnergyJoules: number;
  estimatedMassKg: number;
  torinoScale: number;
  palermoScale: number;
  impactProbability: number;
  approachCount: number;
  relativeSize: string;
  impactEnergyComparison: string;
  scoreBreakdown: RiskScoreBreakdown;
}

export interface RiskScoreBreakdown {
  hazardousPoints: number;
  diameterPoints: number;
  missDistancePoints: number;
  velocityPoints: number;
  kineticEnergyPoints: number;
  orbitalUncertaintyPoints: number;
}

export interface RiskStatistics {
  totalAnalyzed: number;
  hazardousCount: number;
  byRiskLevel: Record<string, number>;
  averageRiskScore: number;
  medianRiskScore: number;
  maxRiskScore: number;
  stdDevRiskScore: number;
  totalKineticEnergyMt: number;
  closestApproach: {
    asteroidId: string;
    name: string;
    distanceKm: number;
    date: string;
  } | null;
  largestAsteroid: {
    asteroidId: string;
    name: string;
    diameterKm: number;
  } | null;
  fastestAsteroid: {
    asteroidId: string;
    name: string;
    velocityKmph: number;
  } | null;
  highestEnergy: {
    asteroidId: string;
    name: string;
    kineticEnergyMt: number;
  } | null;
}

export interface EnhancedRiskResult {
  totalAnalyzed: number;
  dateRange: { start: string; end: string };
  statistics: RiskStatistics;
  assessments: RiskAssessment[];
}

/** Zod validation schemas for NEO query parameters. */
import { z } from 'zod';

export const neoFeedSchema = z.object({
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
});

export const neoLookupSchema = z.object({
  asteroid_id: z.string().min(1, 'Asteroid ID is required'),
});

export type NeoFeedInput = z.infer<typeof neoFeedSchema>;
export type NeoLookupInput = z.infer<typeof neoLookupSchema>;
