import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@muvit/validators'],
  typedRoutes: false,
};

export default withSentryConfig(config, {
  silent: !process.env.CI,
});
