import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@muvit/validators'],
  typedRoutes: false,
};

export default withSentryConfig(config, {
  silent: !process.env.CI,
});
