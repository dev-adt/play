import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',
  appOrigin: process.env.APP_ORIGIN || 'https://play.edunow.today',
  sessionSecret: process.env.SESSION_SECRET || 'play_edunow_today_super_secret_jwt_key_2026',
  databaseUrl: process.env.DATABASE_URL || '',
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  turnTimeoutSeconds: parseInt(process.env.TURN_TIMEOUT_SECONDS || '30', 10),
  clientDistPath: process.env.CLIENT_DIST_PATH || path.resolve(process.cwd(), '../client/dist'),
};
