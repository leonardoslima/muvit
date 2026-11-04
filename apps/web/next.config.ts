import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@muvit/validators'],
  typedRoutes: false,
};

export default config;
