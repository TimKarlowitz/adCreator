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
  // Suppress Three.js/Konva SSR warnings
  transpilePackages: ['three', 'konva', 'react-konva'],
};

export default nextConfig;
