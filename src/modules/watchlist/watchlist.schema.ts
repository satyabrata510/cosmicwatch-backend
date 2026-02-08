import { z } from 'zod';

/** Zod schema for adding an asteroid to the watchlist. */
export const addWatchlistSchema = z.object({
  asteroidId: z.string().min(1, 'Asteroid ID is required'),
  asteroidName: z.string().min(1, 'Asteroid name is required'),
  alertOnApproach: z.boolean().optional().default(true),
  alertDistanceKm: z.number().positive().optional().default(7500000),
});

export const updateWatchlistSchema = z.object({
  alertOnApproach: z.boolean().optional(),
  alertDistanceKm: z.number().positive().optional(),
});

/** Zod schema for pagination query parameters. */
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

/** Inferred type from {@link addWatchlistSchema}. */
export type AddWatchlistInput = z.infer<typeof addWatchlistSchema>;
export type UpdateWatchlistInput = z.infer<typeof updateWatchlistSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
