/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow the proxy to set its own headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "ALLOWALL" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
