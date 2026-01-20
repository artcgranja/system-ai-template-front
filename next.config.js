/** @type {import('next').NextConfig} */

// Security headers for production
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
];

const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'gswjkjuftdikymnqbnmm.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
  webpack: (config, { isServer }) => {
    // Fix for pptxgenjs and html2canvas in client-side
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        http: false,
        https: false,
        zlib: false,
        util: false,
        url: false,
        buffer: false,
      };
      
      // Ignore node: protocol imports in client-side
      config.externals = config.externals || [];
      config.externals.push({
        'node:fs': 'commonjs node:fs',
        'node:path': 'commonjs node:path',
        'node:crypto': 'commonjs node:crypto',
        'node:https': 'commonjs node:https',
        'node:http': 'commonjs node:http',
        'node:stream': 'commonjs node:stream',
        'node:util': 'commonjs node:util',
        'node:url': 'commonjs node:url',
        'node:buffer': 'commonjs node:buffer',
        'node:zlib': 'commonjs node:zlib',
      });
    }
    return config;
  },
}

module.exports = nextConfig
