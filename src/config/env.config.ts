import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

interface EnvironmentConfig {
  node_env: string;
  port: number;
  apiVersion: string;
  database: {
    url: string;
  };
  jwt: {
    secret: string;
    expiresIn: string;
    refreshSecret: string;
    refreshExpiresIn: string;
  };
  nasa: {
    apiKey: string;
    baseUrl: string;
    ssdBaseUrl: string;
    donkiBaseUrl: string;
    apodBaseUrl: string;
    epicBaseUrl: string;
    mediaBaseUrl: string;
  };
  riskEngine: {
    url: string;
  };
  redis: {
    url: string;
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
    authWindowMs: number;
    authMaxRequests: number;
    nasaWindowMs: number;
    nasaMaxRequests: number;
  };
  logLevel: string;
}

/** Read a required string environment variable, falling back to `fallback` if provided. */
const getEnvVar = (key: string, fallback?: string): string => {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    throw new Error(`⛔ Missing required environment variable: ${key}`);
  }
  return value;
};

/** Read an environment variable as a number, falling back to `fallback` if the var is unset. */
const getEnvNumber = (key: string, fallback?: number): number => {
  const value = process.env[key];
  if (value === undefined && fallback !== undefined) return fallback;
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`⛔ Environment variable ${key} must be a valid number`);
  }
  return parsed;
};

/** Validated and typed environment configuration object. */
export const env: EnvironmentConfig = {
  node_env: getEnvVar('NODE_ENV', 'development'),
  port: getEnvNumber('PORT', 4000),
  apiVersion: getEnvVar('API_VERSION', 'v1'),
  database: {
    url: getEnvVar('DATABASE_URL'),
  },
  jwt: {
    secret: getEnvVar('JWT_SECRET'),
    expiresIn: getEnvVar('JWT_EXPIRES_IN', '7d'),
    refreshSecret: getEnvVar('JWT_REFRESH_SECRET'),
    refreshExpiresIn: getEnvVar('JWT_REFRESH_EXPIRES_IN', '30d'),
  },
  nasa: {
    apiKey: getEnvVar('NASA_API_KEY', 'DEMO_KEY'),
    baseUrl: getEnvVar('NASA_API_BASE_URL', 'https://api.nasa.gov/neo/rest/v1'),
    ssdBaseUrl: getEnvVar('NASA_SSD_BASE_URL', 'https://ssd-api.jpl.nasa.gov'),
    donkiBaseUrl: getEnvVar('NASA_DONKI_BASE_URL', 'https://api.nasa.gov/DONKI'),
    apodBaseUrl: getEnvVar('NASA_APOD_BASE_URL', 'https://api.nasa.gov/planetary'),
    epicBaseUrl: getEnvVar('NASA_EPIC_BASE_URL', 'https://epic.gsfc.nasa.gov'),
    mediaBaseUrl: getEnvVar('NASA_MEDIA_BASE_URL', 'https://images-api.nasa.gov'),
  },
  riskEngine: {
    url: getEnvVar('RISK_ENGINE_URL', 'http://localhost:8000'),
  },
  redis: {
    url: getEnvVar('REDIS_URL', 'redis://localhost:6379'),
  },
  rateLimit: {
    windowMs: getEnvNumber('RATE_LIMIT_WINDOW_MS', 900000),
    maxRequests: getEnvNumber('RATE_LIMIT_MAX_REQUESTS', 100),
    authWindowMs: getEnvNumber('RATE_LIMIT_AUTH_WINDOW_MS', 900000),
    authMaxRequests: getEnvNumber('RATE_LIMIT_AUTH_MAX_REQUESTS', 10),
    nasaWindowMs: getEnvNumber('RATE_LIMIT_NASA_WINDOW_MS', 60000),
    nasaMaxRequests: getEnvNumber('RATE_LIMIT_NASA_MAX_REQUESTS', 30),
  },
  logLevel: getEnvVar('LOG_LEVEL', 'debug'),
};

export const isDev = env.node_env === 'development';
export const isProd = env.node_env === 'production';
