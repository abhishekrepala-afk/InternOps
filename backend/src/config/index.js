require('dotenv').config();
module.exports = {
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  port: parseInt(process.env.PORT,10)||3000,
  host: process.env.HOST||'0.0.0.0',
  nodeEnv: process.env.NODE_ENV||'development',
  databaseUrl: process.env.DATABASE_URL,
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiry: process.env.ACCESS_TOKEN_EXPIRY||'15m',
    refreshExpiry: process.env.REFRESH_TOKEN_EXPIRY||'7d'
  },
  uploadDir: process.env.UPLOAD_DIR||'uploads',
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE,10)||5242880,
  uptoskills: { baseUrl: process.env.UPTOSKILLS_BASE_URL||'', apiKey: process.env.UPTOSKILLS_API_KEY||'' }
};

