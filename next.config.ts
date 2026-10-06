import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // render metadata in <head> up front for every client (not streamed into <body>)
  htmlLimitedBots: /.*/,
  images: {
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
