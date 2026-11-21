import type { NextConfig } from 'next';

const config: NextConfig = {
  distDir: process.env.MUVIT_WEB_DIST_DIR || '.next',
  reactStrictMode: true,
  transpilePackages: ['@muvit/validators'],
  typedRoutes: false,
};

export default config;
