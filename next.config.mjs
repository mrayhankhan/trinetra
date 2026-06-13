/** @type {import('next').NextConfig} */
// Catalyst Web Client Hosting serves the app under /app, so production assets
// need the /app prefix. Dev stays at root for a clean localhost experience.
const prod = process.env.NODE_ENV === "production";

const nextConfig = {
  reactStrictMode: true,
  output: "export", // static site → Catalyst Web Client Hosting
  trailingSlash: true,
  images: { unoptimized: true },
  ...(prod ? { basePath: "/app", assetPrefix: "/app" } : {}),
};

export default nextConfig;
