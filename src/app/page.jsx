'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import ProjectsHome from '@/components/ProjectsHome';

// Dynamically import the editor to avoid SSR issues with Three.js / Konva / FFmpeg
const Editor = dynamic(() => import('@/components/Editor'), { ssr: false });

export default function Home() {
  const [view, setView] = useState('home');
  const [openABTest, setOpenABTest] = useState(false);

  const handleEnterEditor = useCallback(() => setView('editor'), []);
  const handleGoHome = useCallback(() => { setView('home'); setOpenABTest(false); }, []);
  const handleEnterABTest = useCallback(() => { setView('editor'); setOpenABTest(true); }, []);
  const handleABTestClosed = useCallback(() => setOpenABTest(false), []);

  if (view === 'home') {
    return <ProjectsHome onEnterEditor={handleEnterEditor} onEnterABTest={handleEnterABTest} />;
  }

  return <Editor onGoHome={handleGoHome} initialOpenABTest={openABTest} onABTestClosed={handleABTestClosed} />;
}
