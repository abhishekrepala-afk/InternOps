/**
 * PM2 process configuration for InternOps backend.
 *
 * The only background worker is proof-image-cleanup, which runs as a
 * node-cron job inside the main API process (src/app.js). There are no
 * separate worker scripts.
 *
 * Usage:
 *   pm2 start ecosystem.config.js   # start all processes
 *   pm2 status                       # view process list
 *   pm2 logs                         # stream logs from all processes
 *   pm2 restart all                  # rolling restart
 *   pm2 stop all                     # stop without removing
 *   pm2 delete all                   # remove from process list
 */

'use strict';

module.exports = {
  apps: [
    {
      // ── API server (also hosts the proof-image-cleanup cron job) ──────────
      name: 'internops-api',
      script: 'src/app.js',
      cwd: __dirname,

      // Runtime environment
      env: {
        NODE_ENV: 'production',
      },

      // Reliability
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      restart_delay: 4000,   // ms to wait before restarting after a crash
      max_restarts: 10,       // give up after 10 consecutive crashes

      // Logging — PM2 rotates these automatically when pm2-logrotate is installed
      out_file: 'logs/api-out.log',
      error_file: 'logs/api-error.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DDTHH:mm:ss.SSSZ',
    },
  ],
};
