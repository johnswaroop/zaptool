/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ["raw.githubusercontent.com", "assets.coingecko.com"], // Add allowed domains here
  },
};

export default nextConfig;
