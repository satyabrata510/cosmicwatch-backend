/**
 * EPIC API types for Earth Polychromatic Imaging Camera data.
 * @module epic/types
 */

/** Raw image record from the EPIC API. */
export interface EpicImageRaw {
  identifier: string;
  caption: string;
  image: string;
  version: string;
  date: string;
  centroid_coordinates: {
    lat: number;
    lon: number;
  };
  dscovr_j2000_position: {
    x: number;
    y: number;
    z: number;
  };
  lunar_j2000_position: {
    x: number;
    y: number;
    z: number;
  };
  sun_j2000_position: {
    x: number;
    y: number;
    z: number;
  };
  attitude_quaternions: {
    q0: number;
    q1: number;
    q2: number;
    q3: number;
  };
}

export interface EpicImage {
  identifier: string;
  caption: string;
  imageFilename: string;
  version: string;
  date: string;
  imageUrl: string;
  centroidCoordinates: {
    latitude: number;
    longitude: number;
  };
  dscovrPosition: { x: number; y: number; z: number };
  lunarPosition: { x: number; y: number; z: number };
  sunPosition: { x: number; y: number; z: number };
  attitudeQuaternions: {
    q0: number;
    q1: number;
    q2: number;
    q3: number;
  };
}

export interface EpicResponse {
  totalCount: number;
  imageType: string;
  images: EpicImage[];
}
