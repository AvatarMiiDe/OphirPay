/**
 * Application monitoring utility.
 * Tracks health, performance, and error rates for operational visibility.
 */

interface HealthSnapshot {
  timestamp: number;
  uptime: number;
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    rss: number;
  };
  activeConnections: number;
}

/**
 * Capture a health snapshot of the current process.
 */
export function captureHealthSnapshot(): HealthSnapshot {
  const mem = process.memoryUsage();
  return {
    timestamp: Date.now(),
    uptime: process.uptime(),
    memoryUsage: {
      heapUsed: mem.heapUsed,
      heapTotal: mem.heapTotal,
      rss: mem.rss,
    },
    activeConnections: 0, // Track via server metrics
  };
}

/**
 * Format a health snapshot for display or logging.
 */
export function formatHealthSnapshot(snapshot: HealthSnapshot): string {
  return [
    `Uptime: ${Math.floor(snapshot.uptime / 3600)}h ${Math.floor((snapshot.uptime % 3600) / 60)}m`,
    `Memory: ${(snapshot.memoryUsage.heapUsed / 1024 / 1024).toFixed(1)}MB used / ${(snapshot.memoryUsage.heapTotal / 1024 / 1024).toFixed(1)}MB total`,
    `Active connections: ${snapshot.activeConnections}`,
  ].join(" | ");
}
