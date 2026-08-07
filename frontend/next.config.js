/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/backend/:path*',
        destination: 'http://16.146.57.220:8000/:path*' // Proxy to Backend
      }
    ]
  }
}
module.exports = nextConfig
