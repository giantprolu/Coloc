import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
  customWorkerSrc: "public",
  customWorkerDest: "public",
  customWorkerPrefix: "custom",
  workboxOptions: {
    disableDevLogs: true,
    importScripts: ["/custom-sw.js"],
  },
});

const nextConfig: NextConfig = {
  /* config options here */
};

export default withPWA(nextConfig);
