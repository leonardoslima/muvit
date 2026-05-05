import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@muvit/validators'],
  experimental: {
    typedRoutes: true,
  },
};

export default config;
