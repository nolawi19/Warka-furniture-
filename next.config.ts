import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    // Product photography is served from local storage today; a CDN host can be
    // added here without touching any component.
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [360, 414, 640, 828, 1080, 1280, 1600, 1920],
  },
  async headers() {
    const secure = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
    ];
    return [
      { source: '/:path*', headers: secure },
      // Admin must never reach an index.
      { source: '/admin/:path*', headers: [...secure, { key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
      { source: '/account/:path*', headers: [...secure, { key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
      { source: '/api/:path*', headers: [...secure, { key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
    ];
  },
};

export default nextConfig;
