'use strict';

const cron = require('node-cron');
const fs = require('fs').promises;
const path = require('path');
const pool = require('../config/db');
const pLimit = require('p-limit');
const wb = require('./workerHeartbeat');

let cleanupRunning = false;

const CONCURRENCY = 20;
const BATCH_SIZE = 500;
const JOB_NAME = 'proof-image-cleanup';
const HEARTBEAT_INTERVAL_MS = 60_000;

// Heartbeat timer reference — kept so graceful shutdown can clear it.
let heartbeatTimer = null;

function setupCronJobs() {
  // Register the worker so /health/workers shows it before the first heartbeat.
  wb.register(JOB_NAME);

  // Emit a heartbeat every 60 s, independent of job execution timing.
  heartbeatTimer = setInterval(() => {
    wb.heartbeat(JOB_NAME);
  }, HEARTBEAT_INTERVAL_MS);

  // Do not let the timer prevent clean process exit.
  if (heartbeatTimer.unref) heartbeatTimer.unref();

  console.info(
    JSON.stringify({ worker: JOB_NAME, event: 'started' }),
    'Worker started'
  );

  // Graceful shutdown: clear the heartbeat timer before the process exits.
  // app.js already handles SIGTERM/SIGINT, but we clean up the timer early.
  function stopHeartbeat(signal) {
    console.info(
      JSON.stringify({ worker: JOB_NAME, event: 'stopping', signal }),
      'Worker stopping'
    );
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  }
  process.once('SIGTERM', () => stopHeartbeat('SIGTERM'));
  process.once('SIGINT', () => stopHeartbeat('SIGINT'));

  try {
    cron.schedule('0 * * * *', async () => {
      if (cleanupRunning) {
        console.warn(
          JSON.stringify({
            job: JOB_NAME,
            message: 'Cleanup already running. Skipping...',
          })
        );
        return;
      }

      cleanupRunning = true;

      const startTime = Date.now();

      console.info(
        JSON.stringify({ job: JOB_NAME, startedAt: new Date(startTime) }),
        'Cron job started'
      );

      try {
        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const uploadsRoot = path.resolve(__dirname, '..', '..', 'uploads');

        let totalProcessed = 0;
        let filesDeleted = 0;
        let totalUpdated = 0;

        while (true) {
          const { rows } = await pool.query(
            `
            SELECT id, image_path
            FROM proof_submissions
           WHERE status = 'VERIFIED'
            AND verified_at < $1
            AND image_path IS NOT NULL
            ORDER BY id
            LIMIT $2
            `,
            [cutoff, BATCH_SIZE]
          );

          if (rows.length === 0) break;

          totalProcessed += rows.length;

          const deletedIds = [];
          const limit = pLimit(CONCURRENCY);

          const results = await Promise.allSettled(
            rows.map((row) =>
              limit(async () => {
                const filePath = path.resolve(
                  __dirname,
                  '..',
                  '..',
                  row.image_path
                );

                const relative = path.relative(uploadsRoot, filePath);

                if (relative.startsWith('..') || path.isAbsolute(relative)) {
                  console.error(
                    `Invalid path for record ${row.id}: ${row.image_path}`
                  );
                  return;
                }

                try {
                  await fs.unlink(filePath);
                  filesDeleted++;
                } catch (err) {
                  if (err.code !== 'ENOENT') {
                    console.error(
                      `Failed deleting ${row.image_path}: ${err.message}`
                    );
                    return;
                  }
                }

                deletedIds.push(row.id);
              })
            )
          );

          results.forEach((result) => {
            if (result.status === 'rejected') {
              console.error(result.reason);
            }
          });

          if (deletedIds.length > 0) {
            await pool.query(
              `
              UPDATE proof_submissions
              SET image_path = NULL
              WHERE id = ANY($1::int[])
              `,
              [deletedIds]
            );

            totalUpdated += deletedIds.length;
          }

          if (rows.length < BATCH_SIZE) break;
        }

        console.info(
          JSON.stringify({
            job: JOB_NAME,
            durationMs: Date.now() - startTime,
            recordsProcessed: totalProcessed,
            filesDeleted,
            databaseRowsUpdated: totalUpdated,
          }),
          'Cron job completed'
        );
      } catch (err) {
        console.error(
          JSON.stringify({
            job: JOB_NAME,
            err: err.message,
            stack: err.stack,
          }),
          'Cron job failed'
        );
      } finally {
        cleanupRunning = false;
      }
    });
  } catch (err) {
    console.error(
      JSON.stringify({
        job: 'cron-initialization',
        err: err.message,
        stack: err.stack,
      }),
      'Failed to initialize cron jobs'
    );
  }
}

module.exports = { setupCronJobs };
