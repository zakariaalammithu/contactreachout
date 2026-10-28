/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', 'framer-motion'],
  },
  // Public image folders change rarely (avatars, logos, brand marks), so
  // repeat visits serve them from the browser cache for a day instead of
  // re-downloading. Updates still reach visitors within a day.
  async headers() {
    const imageCache = {
      key: 'Cache-Control',
      value: 'public, max-age=86400, stale-while-revalidate=86400',
    };
    return [
      { source: '/client-reviews/:path*', headers: [imageCache] },
      { source: '/trusted-logos/:path*', headers: [imageCache] },
      { source: '/brand/:path*', headers: [imageCache] },
    ];
  },
  // The project lives on a Windows filesystem that does not support symlinks.
  // Disable Webpack's symlink resolution probes, which otherwise fail with EISDIR.
  webpack: (config) => {
    config.resolve.symlinks = false;
    return config;
  },
};

export default nextConfig;
