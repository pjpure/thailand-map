import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // ข้าม ESLint ตอน build
  eslint: { ignoreDuringBuilds: true }, //TODO: remove this when ESLint is fixed

  // ข้าม TypeScript type errors ตอน build
  typescript: { ignoreBuildErrors: true }, //TODO: remove this when TypeScript is fixed
};

export default nextConfig;
