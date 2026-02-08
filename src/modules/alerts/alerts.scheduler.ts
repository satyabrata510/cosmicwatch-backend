import cron, { type ScheduledTask } from 'node-cron';
import { prisma } from '../../config';
import { logger } from '../../utils';
import { NeoService } from '../neo/neo.service';
import { AlertService } from './alerts.service';

const schedulerLogger = logger.child({ module: 'alert-scheduler' });

/** How many days ahead to scan for close approaches. */
const SCAN_WINDOW_DAYS = 7;

/** Threshold in km — only generate alerts when miss distance is within this. */
const DEFAULT_ALERT_DISTANCE_KM = 7_500_000;

/**
 * Determine risk level from miss distance and hazardous flag.
 * Maps distance brackets + PHA status to LOW / MEDIUM / HIGH / CRITICAL.
 */
function classifyRisk(
  missDistanceKm: number,
  isHazardous: boolean
): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  if (missDistanceKm < 500_000 && isHazardous) return 'CRITICAL';
  if (missDistanceKm < 2_000_000 && isHazardous) return 'HIGH';
  if (missDistanceKm < 5_000_000 || isHazardous) return 'MEDIUM';
  return 'LOW';
}

/**
 * Core scan logic — fetches upcoming NEO approaches, cross-references
 * every user's watchlist, and creates alerts for matching asteroids
 * that haven't already been alerted.
 */
async function scanAndGenerateAlerts(): Promise<void> {
  const start = Date.now();
  schedulerLogger.info('Starting close-approach alert scan');

  try {
    const today = new Date().toISOString().slice(0, 10);
    const endDate = new Date(Date.now() + SCAN_WINDOW_DAYS * 86_400_000).toISOString().slice(0, 10);

    // 1. Fetch upcoming NEO feed
    const feed = await NeoService.getFeed(today, endDate);
    const allAsteroids = Object.values(feed.near_earth_objects).flat();

    if (allAsteroids.length === 0) {
      schedulerLogger.info('No NEOs found in scan window');
      return;
    }

    // 2. Fetch all watchlist entries that have alerting enabled
    const watchlistEntries = await prisma.watchlist.findMany({
      where: { alertOnApproach: true },
      select: {
        userId: true,
        asteroidId: true,
        asteroidName: true,
        alertDistanceKm: true,
      },
    });

    if (watchlistEntries.length === 0) {
      schedulerLogger.info('No watchlist entries with alerts enabled');
      return;
    }

    // Index watchlist by asteroidId for O(1) lookups
    const watchlistByAsteroid = new Map<
      string,
      Array<{ userId: string; asteroidName: string; alertDistanceKm: number }>
    >();
    for (const entry of watchlistEntries) {
      const list = watchlistByAsteroid.get(entry.asteroidId) ?? [];
      list.push({
        userId: entry.userId,
        asteroidName: entry.asteroidName,
        alertDistanceKm: entry.alertDistanceKm,
      });
      watchlistByAsteroid.set(entry.asteroidId, list);
    }

    let alertsCreated = 0;

    // 3. For each asteroid in the feed, check against watchlist
    for (const asteroid of allAsteroids) {
      const neoId = asteroid.neo_reference_id;
      const watchers = watchlistByAsteroid.get(neoId);
      if (!watchers) continue;

      for (const approach of asteroid.close_approach_data) {
        const missDistanceKm = Number.parseFloat(approach.miss_distance.kilometers);
        const velocityKmph = Number.parseFloat(approach.relative_velocity.kilometers_per_hour);
        const approachDate = new Date(approach.close_approach_date_full);

        for (const watcher of watchers) {
          const threshold = watcher.alertDistanceKm || DEFAULT_ALERT_DISTANCE_KM;
          if (missDistanceKm > threshold) continue;

          // De-duplicate: skip if an alert already exists for this user + asteroid + date
          const existingAlert = await prisma.alert.findFirst({
            where: {
              userId: watcher.userId,
              asteroidId: neoId,
              approachDate,
            },
          });
          if (existingAlert) continue;

          const riskLevel = classifyRisk(
            missDistanceKm,
            asteroid.is_potentially_hazardous_asteroid
          );

          const alertType = asteroid.is_potentially_hazardous_asteroid
            ? 'HAZARDOUS_DETECTED'
            : 'CLOSE_APPROACH';

          const formattedDist =
            missDistanceKm > 1_000_000
              ? `${(missDistanceKm / 1_000_000).toFixed(2)}M km`
              : `${Math.round(missDistanceKm).toLocaleString()} km`;

          await AlertService.createAlert({
            userId: watcher.userId,
            asteroidId: neoId,
            asteroidName: watcher.asteroidName || asteroid.name,
            alertType,
            message: `${asteroid.name} will pass Earth at ${formattedDist} on ${approach.close_approach_date}. Velocity: ${Number.parseFloat(approach.relative_velocity.kilometers_per_second).toFixed(1)} km/s.`,
            riskLevel,
            approachDate,
            missDistanceKm,
            velocityKmph,
          });

          alertsCreated++;
        }
      }
    }

    // 4. Also scan for any hazardous asteroid approaching within default distance,
    //    even if not on anyone's watchlist — create alerts for all users
    for (const asteroid of allAsteroids) {
      if (!asteroid.is_potentially_hazardous_asteroid) continue;

      for (const approach of asteroid.close_approach_data) {
        const missDistanceKm = Number.parseFloat(approach.miss_distance.kilometers);
        if (missDistanceKm > DEFAULT_ALERT_DISTANCE_KM) continue;

        // Find all users who do NOT already have this asteroid on their watchlist
        const existingWatcherUserIds = new Set(
          (watchlistByAsteroid.get(asteroid.neo_reference_id) ?? []).map((w) => w.userId)
        );

        const allUsers = await prisma.user.findMany({
          select: { id: true },
        });

        for (const user of allUsers) {
          // Skip users who are already covered by watchlist alerts above
          if (existingWatcherUserIds.has(user.id)) continue;

          const approachDate = new Date(approach.close_approach_date_full);
          const existing = await prisma.alert.findFirst({
            where: {
              userId: user.id,
              asteroidId: asteroid.neo_reference_id,
              approachDate,
            },
          });
          if (existing) continue;

          const riskLevel = classifyRisk(missDistanceKm, true);
          const velocityKmph = Number.parseFloat(approach.relative_velocity.kilometers_per_hour);
          const formattedDist =
            missDistanceKm > 1_000_000
              ? `${(missDistanceKm / 1_000_000).toFixed(2)}M km`
              : `${Math.round(missDistanceKm).toLocaleString()} km`;

          await AlertService.createAlert({
            userId: user.id,
            asteroidId: asteroid.neo_reference_id,
            asteroidName: asteroid.name,
            alertType: 'HAZARDOUS_DETECTED',
            message: `⚠️ Hazardous asteroid ${asteroid.name} approaching at ${formattedDist} on ${approach.close_approach_date}. Velocity: ${Number.parseFloat(approach.relative_velocity.kilometers_per_second).toFixed(1)} km/s.`,
            riskLevel,
            approachDate,
            missDistanceKm,
            velocityKmph,
          });

          alertsCreated++;
        }
      }
    }

    const elapsed = Date.now() - start;
    schedulerLogger.info(
      { alertsCreated, asteroidsScanned: allAsteroids.length, durationMs: elapsed },
      'Alert scan completed'
    );
  } catch (error) {
    schedulerLogger.error({ err: error }, 'Alert scan failed');
  }
}

/** Active cron task reference for cleanup on shutdown. */
let scheduledTask: ScheduledTask | null = null;

/**
 * Start the close-approach alert scheduler.
 * Runs every 6 hours: 00:00, 06:00, 12:00, 18:00.
 * Also runs an immediate scan on startup.
 */
export function startAlertScheduler(): void {
  schedulerLogger.info('Starting alert scheduler (every 6 hours)');

  // Run immediately on startup (after a short delay so DB/Redis are ready)
  setTimeout(() => {
    scanAndGenerateAlerts().catch((err) => {
      schedulerLogger.error({ err }, 'Initial alert scan failed');
    });
  }, 10_000);

  // Schedule recurring scans: "At minute 0 past every 6th hour"
  scheduledTask = cron.schedule('0 */6 * * *', () => {
    scanAndGenerateAlerts().catch((err) => {
      schedulerLogger.error({ err }, 'Scheduled alert scan failed');
    });
  });
}

/** Stop the cron scheduler gracefully. */
export function stopAlertScheduler(): void {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    schedulerLogger.info('Alert scheduler stopped');
  }
}
