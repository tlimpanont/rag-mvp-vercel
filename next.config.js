/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optimize for Vercel deployment
  poweredByHeader: false,
  reactStrictMode: true,
  swcMinify: true,
};

module.exports = nextConfig;
