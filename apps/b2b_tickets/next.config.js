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
  generateBuildId: async () => {
    // Use version from package.json for build ID consistency
    // This ensures the same build has the same ID across deployments
    // Use a unique ID each time to force client refresh
    return `${version}-${process.env.BUILD_ID || Date.now()}`;
  },
  async headers() {
    return [
      {
        // Cache static assets aggressively (they have content hashes in URLs)
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Don't cache Next.js data requests (including Server Actions)
        source: '/_next/data/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, must-revalidate',
          },
        ],
      },
      {
        // Don't cache HTML pages - always fetch fresh
        source: '/((?!_next/static|_next/image|favicon.ico).*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, must-revalidate',
          },
        ],
      },
    ];
  },
  // Optional: Add experimental features for better Server Actions handling
  experimental: {
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
