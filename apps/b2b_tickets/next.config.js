//@ts-check
const dotenv = require('dotenv');

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { composePlugins, withNx } = require('@nx/next');

/**
 * @type {import('@nx/next/plugins/with-nx').WithNxOptions}
 **/
const nextConfig = {
  // Transpile Reason: https://github.com/viclafouch/mui-otp-input
  transpilePackages: ['mui-one-time-password-input'],
  nx: {
    // Set this to true if you would like to use SVGR
    // See: https://github.com/gregberge/svgr
    svgr: false,
  },
  compiler: {
    styledComponents: true,
  },
};

const plugins = [
  // Add more Next.js plugins to this list if needed.
  withNx,
];

// Load the appropriate .env file based on APP_ENV or NODE_ENV
dotenv.config({
  path:
    process.env.APP_ENV === 'staging'
      ? '.env.staging'
      : process.env.NODE_ENV === 'production'
      ? '.env.production'
      : '.env.development',
});

module.exports = composePlugins(...plugins)(nextConfig);
