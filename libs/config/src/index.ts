// libs/config/src/lib/index.ts
import { productionConfig } from './lib/production';
import { developmentConfig } from './lib/development';

export const config =
  process.env['NODE_ENV'] === 'production'
    ? productionConfig
    : developmentConfig;

export default config;
