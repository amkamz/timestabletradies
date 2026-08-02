import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets phones and tablets on the same Wi-Fi reach `next dev`, which
  // otherwise only accepts requests originating from localhost.
  allowedDevOrigins: ["192.168.20.8"],
};

export default nextConfig;
