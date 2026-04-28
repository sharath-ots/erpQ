/** @type {import('next').NextConfig} */
const rawPrefix = process.env.AUTH_WEB_ASSET_PREFIX || "";
const normalizedPrefix =
  rawPrefix && !rawPrefix.startsWith("/") ? `/${rawPrefix}` : rawPrefix;

const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  /**
   * When auth-web is hosted at https://<host>/login, Next must emit assets as /login/_next/...
   * Otherwise the browser requests /_next/... from the root app (comDash) and the UI looks broken.
   */
  assetPrefix: normalizedPrefix || undefined,
};

module.exports = nextConfig;