import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable strict mode to prevent double-renders during voice recording
  reactStrictMode: false,
  // Prisma needs to be bundled externally
  serverExternalPackages: ['@prisma/client', 'prisma'],
  // Enable standalone output for Docker deployments
  output: 'standalone',
};

export default nextConfig;
