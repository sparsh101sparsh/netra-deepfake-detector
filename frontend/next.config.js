/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/backend/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://32.199.119.222:8000'}/:path*` // Proxy to Backend
      }
    ]
  }
}
module.exports = nextConfig
