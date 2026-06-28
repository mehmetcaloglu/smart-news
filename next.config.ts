/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // These native modules must run server-side only — don't bundle them with webpack
  serverExternalPackages: ['better-sqlite3', 'node-cron'],

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;
