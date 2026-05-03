'use client';

import dynamic from 'next/dynamic';

// Dynamically import the editor to avoid SSR issues with Three.js / Konva / FFmpeg
const Editor = dynamic(() => import('@/components/Editor'), { ssr: false });

export default function Home() {
  return <Editor />;
}
