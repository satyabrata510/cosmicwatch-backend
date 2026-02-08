/**
 * APOD API types for Astronomy Picture of the Day.
 * @module apod/types
 */

/** Raw APOD response from the NASA API. */
export interface ApodRaw {
  copyright?: string;
  date: string;
  explanation: string;
  hdurl?: string;
  media_type: string;
  service_version: string;
  title: string;
  url: string;
  thumbnail_url?: string;
}

export interface ApodEntry {
  title: string;
  date: string;
  explanation: string;
  mediaType: string;
  url: string;
  hdUrl: string | null;
  thumbnailUrl: string | null;
  copyright: string | null;
}
