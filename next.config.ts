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
      // geolocation=(self): the checkout map offers "Use my location", and
      // an empty allowlist blocks it before the browser ever asks the person.
      // Only our own origin; an embedded third party still gets nothing.
      // The other three stay closed — nothing on this site uses them.
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=(self), payment=()',
      },
    ];
    // The builder embeds /preview/<id> in an iframe. X-Frame-Options: DENY
    // would refuse that even from our own origin, so preview — and only
    // preview — allows same-origin framing. It is staff-only and noindex, and
    // frame-ancestors 'self' is the modern header that actually gets obeyed.
    const previewFramable = [
      ...secure.filter((h) => h.key !== 'X-Frame-Options'),
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'Content-Security-Policy', value: "frame-ancestors 'self'" },
      { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
    ];

    // Next applies EVERY matching rule, so a broad '/:path*' would re-add
    // X-Frame-Options: DENY on top of the preview rule and the iframe would
    // still be refused. The catch-all therefore excludes /preview explicitly.
    return [
      { source: '/preview/:path*', headers: previewFramable },
      { source: '/:path((?!preview/).*)', headers: secure },
      // Admin must never reach an index.
      { source: '/admin/:path*', headers: [...secure, { key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
      { source: '/account/:path*', headers: [...secure, { key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
      { source: '/api/:path*', headers: [...secure, { key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
    ];
  },
};

export default nextConfig;
