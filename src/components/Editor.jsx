'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { useAssetStore } from '@/store/assetStore';
import { useAspectRatio } from '@/hooks/useAspectRatio';
import TopBar from '@/components/panels/TopBar';
import BottomBar from '@/components/panels/BottomBar';
import LeftPanel from '@/components/panels/LeftPanel';
import RightPanel from '@/components/panels/RightPanel';
import CanvasContainer from '@/components/canvas/CanvasContainer';
import ExportModal from '@/components/modals/ExportModal';
import TemplateModal from '@/components/modals/TemplateModal';

export default function Editor() {
  const stageRef = useRef();
  const threeCanvasRef = useRef();
  const [showExport, setShowExport] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  const { loadAll } = useAssetStore();
  const { zoom, canvasConfig, undo, redo } = useProjectStore();
  const { displayWidth, displayHeight } = useAspectRatio(canvasConfig.aspectRatio);

  // Load assets from IndexedDB on startup
  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if (ctrl && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [undo, redo]);

  const handleWheel = useCallback((e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const { setZoom, zoom } = useProjectStore.getState();
      setZoom(zoom - e.deltaY * 0.001);
    }
  }, []);

  return (
    <div className="flex flex-col h-screen bg-[#111] select-none">
      <TopBar onExport={() => setShowExport(true)} onTemplates={() => setShowTemplates(true)} />

      <div className="flex flex-1 overflow-hidden">
        <LeftPanel />

        {/* Canvas area */}
        <main
          className="flex-1 overflow-auto flex items-center justify-center bg-[#0d0d0d]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #1a1a1a 1px, transparent 0)', backgroundSize: '24px 24px' }}
          onWheel={handleWheel}
        >
          <div
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'center center',
              transition: 'transform 0.1s ease',
            }}
          >
            <div ref={threeCanvasRef} className="relative">
              <CanvasContainer stageRef={stageRef} />
            </div>
          </div>
        </main>

        <RightPanel />
      </div>

      <BottomBar
        stageRef={stageRef}
        onSaveTemplate={() => setShowTemplates(true)}
      />

      {showExport && (
        <ExportModal
          onClose={() => setShowExport(false)}
          stageRef={stageRef}
          threeCanvasRef={threeCanvasRef}
        />
      )}

      {showTemplates && (
        <TemplateModal
          onClose={() => setShowTemplates(false)}
          stageRef={stageRef}
        />
      )}
    </div>
  );
}
