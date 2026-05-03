/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for FFmpeg WASM SharedArrayBuffer support
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
        ],
      },
    ];
  },
  // Only transpile packages that need it in this app.
  // Transpiling konva/react-konva can force server-side resolution of
  // node-canvas on some Next.js/Vercel build pipelines.
  transpilePackages: ['three'],
  turbopack: {},
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
    };
    return config;
  },
};

export default nextConfig;
