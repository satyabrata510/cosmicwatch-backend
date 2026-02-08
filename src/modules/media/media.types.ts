/**
 * NASA Image and Video Library API types.
 * @module media/types
 */

/** Raw search response from the NASA media API. */
export interface NasaMediaSearchRaw {
  collection: {
    version: string;
    href: string;
    items: NasaMediaItemRaw[];
    metadata: {
      total_hits: number;
    };
    links?: {
      rel: string;
      prompt: string;
      href: string;
    }[];
  };
}

export interface NasaMediaItemRaw {
  href: string;
  data: {
    center: string;
    title: string;
    nasa_id: string;
    date_created: string;
    media_type: string;
    description?: string;
    description_508?: string;
    keywords?: string[];
    photographer?: string;
    secondary_creator?: string;
    location?: string;
    album?: string[];
  }[];
  links?: {
    href: string;
    rel: string;
    render?: string;
  }[];
}

export interface NasaMediaItem {
  nasaId: string;
  title: string;
  description: string | null;
  mediaType: string;
  dateCreated: string;
  center: string;
  keywords: string[];
  thumbnailUrl: string | null;
  collectionUrl: string;
  photographer: string | null;
  location: string | null;
}

export interface NasaMediaSearchResponse {
  totalHits: number;
  query: string;
  items: NasaMediaItem[];
  hasMore: boolean;
}
