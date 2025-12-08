//@ts-check
const { version } = require('../../package.json');

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
  poweredByHeader: false,
  staticPageGenerationTimeout: 120,
  env: {
    version,
  },
  // Generate consistent build ID to prevent Server Action mismatches
  // generateBuildId: async () => {
  //   // Use version from package.json for build ID consistency
  //   // This ensures the same build has the same ID across deployments
  //   // Use a unique ID each time to force client refresh
  //   return `${version}-${process.env.BUILD_ID || Date.now()}`;
  // },
  experimental: {
    // Enable instrumentation hook for global error handlers
    instrumentationHook: true,
    // Improve Server Actions reliability
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

const plugins = [
  // Add more Next.js plugins to this list if needed.
  withNx,
];

module.exports = composePlugins(...plugins)(nextConfig);
