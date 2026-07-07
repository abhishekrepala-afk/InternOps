/**
 * Lightweight in-memory heartbeat registry for background workers.
 *
 * Workers call `heartbeat(name)` every 60 s.
 * The /health/workers endpoint reads `getAll()` to report liveness.
 *
 * Design constraints:
 *  - No external dependencies (no Redis, no DB writes).
 *  - Failures never crash the caller — every public function is wrapped in
 *    try/catch and logged.
 *  - The module is a plain singleton so it works across require() calls in
 *    the same process.
 */

'use strict';

const STALE_THRESHOLD_MS = 3 * 60 * 1000; // 3 × the 60 s interval = stale

/** @type {Map<string, { lastHeartbeat: Date }>} */
const registry = new Map();

/**
 * Record a heartbeat for the named worker.
 * Safe to call from inside a cron callback — never throws.
 *
 * @param {string} name  Worker identifier (e.g. 'proof-image-cleanup')
 * @param {import('pino').Logger} [logger]
 */
function heartbeat(name, logger) {
  try {
    registry.set(name, { lastHeartbeat: new Date() });
    const msg = `[worker:${name}] heartbeat sent`;
    if (logger) {
      logger.info({ worker: name }, msg);
    } else {
      console.info(JSON.stringify({ worker: name, event: 'heartbeat' }), msg);
    }
  } catch (err) {
    // Never crash the worker
    try {
      const msg = `[worker:${name}] heartbeat error: ${err.message}`;
      if (logger) {
        logger.error({ worker: name, err }, msg);
      } else {
        console.error(msg);
      }
    } catch {
      /* intentionally swallowed */
    }
  }
}

/**
 * Returns the current state of all registered workers.
 *
 * @returns {{ name: string, alive: boolean, lastHeartbeat: string | null }[]}
 */
function getAll() {
  const now = Date.now();
  const result = [];
  for (const [name, { lastHeartbeat }] of registry) {
    result.push({
      name,
      alive: now - lastHeartbeat.getTime() < STALE_THRESHOLD_MS,
      lastHeartbeat: lastHeartbeat.toISOString(),
    });
  }
  return result;
}

/**
 * Register a worker so it appears in the health endpoint even before its
 * first heartbeat fires. Marks it as not-yet-alive.
 *
 * @param {string} name
 */
function register(name) {
  if (!registry.has(name)) {
    // Use epoch 0 so the worker appears in the list but alive=false until the
    // first real heartbeat arrives.
    registry.set(name, { lastHeartbeat: new Date(0) });
  }
}

module.exports = { heartbeat, getAll, register };
