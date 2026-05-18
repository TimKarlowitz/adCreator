'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { useAssetStore } from '@/store/assetStore';
import { useAspectRatio } from '@/hooks/useAspectRatio';
import { useAutoSave } from '@/hooks/useAutoSave';
import { setLastOpenedId } from '@/lib/projectStorage';
import TopBar from '@/components/panels/TopBar';
import BottomBar from '@/components/panels/BottomBar';
import LeftPanel from '@/components/panels/LeftPanel';
import RightPanel from '@/components/panels/RightPanel';
import CanvasContainer from '@/components/canvas/CanvasContainer';
import ExportModal from '@/components/modals/ExportModal';
import TemplateModal from '@/components/modals/TemplateModal';
import ProjectsModal from '@/components/modals/ProjectsModal';
import ABTestModal from '@/components/abtest/ABTestModal';

export default function Editor({ onGoHome, initialOpenABTest = false, onABTestClosed }) {
  const stageRef = useRef();
  const bottomStageRef = useRef();
  const threeCanvasRef = useRef();
  const [showExport, setShowExport] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showProjects, setShowProjects] = useState(false);
  const [showABTest, setShowABTest] = useState(initialOpenABTest);

  const { loadAll } = useAssetStore();
  const { zoom, canvasConfig, undo, redo, loadProject, newProject } = useProjectStore();
  const { displayWidth, displayHeight } = useAspectRatio(canvasConfig.aspectRatio);

  // Thumbnail generator passed to auto-save
  const getThumb = useCallback(() => {
    try {
      return stageRef.current?.toDataURL({ pixelRatio: 0.3 }) ?? null;
    } catch {
      return null;
    }
  }, []);

  const { isSaving, lastSaved } = useAutoSave(getThumb);

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

  // Called when a project is imported via JSON — load it and mark it last opened
  const handleImport = useCallback(async (project) => {
    loadProject(project);
    await setLastOpenedId(project.id);
  }, [loadProject]);

  return (
    <div className="flex flex-col h-screen bg-[#111] select-none">
      <TopBar
        onExport={() => setShowExport(true)}
        onTemplates={() => setShowTemplates(true)}
        onProjects={() => setShowProjects(true)}
        onNewProject={() => { newProject(); }}
        onGoHome={onGoHome}
        onABTest={() => setShowABTest(true)}
        isSaving={isSaving}
        lastSaved={lastSaved}
      />

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
              <CanvasContainer stageRef={stageRef} bottomStageRef={bottomStageRef} />
            </div>
          </div>
        </main>

        <RightPanel />
      </div>

      <BottomBar
        stageRef={stageRef}
        onSaveTemplate={() => setShowProjects(true)}
      />

      {showExport && (
        <ExportModal
          onClose={() => setShowExport(false)}
          stageRef={stageRef}
          bottomStageRef={bottomStageRef}
          threeCanvasRef={threeCanvasRef}
        />
      )}

      {showTemplates && (
        <TemplateModal
          onClose={() => setShowTemplates(false)}
          stageRef={stageRef}
        />
      )}

      {showProjects && (
        <ProjectsModal
          onClose={() => setShowProjects(false)}
          stageRef={stageRef}
          onImport={handleImport}
        />
      )}

      {showABTest && (
        <ABTestModal
          onClose={() => { setShowABTest(false); onABTestClosed?.(); }}
          stageRef={stageRef}
          bottomStageRef={bottomStageRef}
          threeCanvasRef={threeCanvasRef}
        />
      )}
    </div>
  );
}
