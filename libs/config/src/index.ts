// libs/config/src/lib/index.ts
import { developmentConfig } from './lib/development';
import { productionConfig } from './lib/production';

export const config =
  process.env['APP_ENV'] === 'staging'
    ? developmentConfig
    : process.env['NODE_ENV'] === 'production'
    ? productionConfig
    : developmentConfig;

export default config;
