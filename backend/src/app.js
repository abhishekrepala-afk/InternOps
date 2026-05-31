require('dotenv').config();
const Fastify = require('fastify');
const config = require('./config');
const authRoutes = require('./modules/auth/routes');
const userRoutes = require('./modules/users/routes');
const departmentRoutes = require('./modules/departments/routes');
const hierarchyRoutes = require('./modules/hierarchy/routes');
const attendanceRoutes = require('./modules/attendance/routes');
const ratingRoutes = require('./modules/ratings/routes');
const socialTaskRoutes = require('./modules/social-tasks/routes');
const proofRoutes = require('./modules/proof-submissions/routes');
const notificationRoutes = require('./modules/notifications/routes');
const auditRoutes = require('./modules/audit/routes');
const uploadRoutes = require('./modules/uploads/routes');
const analyticsRoutes = require('./modules/analytics/routes');
const meetingRoutes = require('./modules/meetings/routes');
const sessionRoutes = require('./modules/sessions/routes');
const reportRoutes = require('./modules/reports/routes');
const reportExportRoutes = require('./modules/reports/export');
const uptoskillsRoutes = require('./modules/uptoskills/routes');
const { setupCronJobs } = require('./utils/cron');
const sanitizationMiddleware = require('./middleware/sanitize');
const { csrfProtection } = require('./middleware/csrf');

const app = Fastify({
  logger: config.nodeEnv === 'development' ? { transport: { target: 'pino-pretty' } } : true,
  genReqId: () => require('uuid').v4(),
});

// Plugins
app.register(require('@fastify/cors'), {
  origin: config.nodeEnv === 'production' ? config.corsOrigin : true,
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE'],
  allowedHeaders: ['Content-Type','Authorization','X-CSRF-Token'],
});
app.register(require('@fastify/helmet'));
app.register(sanitizationMiddleware);
app.register(require('@fastify/rate-limit'), { max: 100, timeWindow: '1 minute' });
// Stricter rate limit for auth routes
app.register(require('@fastify/rate-limit'), {
  max: 5,
  timeWindow: '1 minute',
  keyGenerator: (request) => request.ip + '_auth',
  onExceeded: (request, reply) => reply.status(429).send({ error: 'Too many requests, please try again later' }),
  prefix: '/api/auth'
});
app.register(require('@fastify/cookie'));
app.register(csrfProtection);
app.register(require('@fastify/multipart'), { limits: { fileSize: config.maxFileSize } });
app.register(require('@fastify/static'), { root: require('path').join(__dirname, '..', config.uploadDir), prefix: '/uploads/' });
app.register(require('@fastify/swagger'), { openapi: { info: { title: 'InternOps API', version: '1.0.0' } } });
app.register(require('@fastify/swagger-ui'), { routePrefix: '/docs' });

// Routes
app.register(authRoutes, { prefix: '/api/auth' });
app.register(userRoutes, { prefix: '/api/users' });
app.register(departmentRoutes, { prefix: '/api/departments' });
app.register(hierarchyRoutes, { prefix: '/api/hierarchy' });
app.register(attendanceRoutes, { prefix: '/api/attendance' });
app.register(ratingRoutes, { prefix: '/api/ratings' });
app.register(socialTaskRoutes, { prefix: '/api/tasks' });
app.register(proofRoutes, { prefix: '/api/proofs' });
app.register(notificationRoutes, { prefix: '/api/notifications' });
app.register(auditRoutes, { prefix: '/api/audit' });
app.register(uploadRoutes, { prefix: '/api/uploads' });
app.register(analyticsRoutes, { prefix: '/api/analytics' });
app.register(meetingRoutes, { prefix: '/api/meetings' });
app.register(sessionRoutes, { prefix: '/api/sessions' });
app.register(reportRoutes, { prefix: '/api/reports' });
app.register(reportExportRoutes, { prefix: '/api/reports/export' });
app.register(uptoskillsRoutes, { prefix: '/api/uptoskills' });

// Health endpoints
app.get('/health', async () => ({ status: 'ok' }));
app.get('/health/db', async (req, reply) => {
  try {
    await require('./config/db').query('SELECT 1');
    reply.send({ status: 'ok', db: 'connected' });
  } catch (err) {
    reply.status(503).send({ status: 'error', db: 'disconnected' });
  }
});
app.get('/health/full', async (req, reply) => {
  const checks = { db: false, redis: false };
  try {
    await require('./config/db').query('SELECT 1');
    checks.db = true;
  } catch (e) {}
  try {
    const redis = require('./config/redis');
    const client = await redis.getRedisClient();
    if (client) {
      await client.ping();
      checks.redis = true;
    }
  } catch (e) {}
  const healthy = Object.values(checks).every(Boolean);
  reply.status(healthy ? 200 : 503).send({ status: healthy ? 'healthy' : 'degraded', checks });
});

// Request logging hook
app.addHook('onRequest', async (request, reply) => {
  request.log.info({ reqId: request.id, method: request.method, url: request.url }, 'incoming request');
});

// Global error handler
app.setErrorHandler((error, request, reply) => {
  request.log.error(error);
  reply.status(error.statusCode || 500).send({ error: error.message || 'Internal Server Error' });
});

// Start cron jobs
setupCronJobs();

// Start server
const start = async () => {
  try {
    await app.listen({ port: config.port, host: config.host });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};
start();
