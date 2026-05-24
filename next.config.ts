import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["three", "@react-three/fiber", "@react-three/drei"],
  // Allow phones/other devices on the local network to reach the dev server
  // for mobile testing. Dev-only; has no effect on production builds.
  allowedDevOrigins: ["192.168.1.34", "192.168.1.*"],
};

export default nextConfig;

import('@opennextjs/cloudflare').then(m => m.initOpenNextCloudflareForDev());
