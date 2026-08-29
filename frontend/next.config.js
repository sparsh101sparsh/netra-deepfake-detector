const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'https://netra-api-pmr7.onrender.com'
    : 'http://127.0.0.1:8000');

const nextConfig = {
  reactStrictMode: false,
  output: 'standalone',
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = { ...config.resolve.fallback, fs: false };
    }
    return config;
  },
  async rewrites() {
    return [
      {
        source: '/api/backend/:path*',
        destination: `${BACKEND_URL}/:path*`
      },
      {
        source: '/api/v1/:path*',
        destination: `${BACKEND_URL}/api/v1/:path*`
      },
      {
        source: '/media/:path*',
        destination: `${BACKEND_URL}/api/v1/media/:path*`
      }
    ];
  }
};

module.exports = nextConfig;
