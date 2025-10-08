import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Configure path aliases for frontend directory
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'frontend'),
    };
    return config;
  },
};

export default nextConfig;
