import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@muvit/validators'],
  experimental: {
    typedRoutes: false,
  },
};

export default config;
