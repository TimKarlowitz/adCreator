'use client';

import { useProjectStore } from '@/store/projectStore';

export default function BottomBar({ onSaveTemplate, stageRef }) {
  const { zoom, setZoom, exportConfig, setExportConfig, canvasConfig } = useProjectStore();

  const DURATION_OPTIONS = [2, 3, 4, 5, 6, 8, 10, 15];

  const handleSnapshotDownload = () => {
    if (!stageRef?.current) return;
    const url = stageRef.current.toDataURL({ pixelRatio: 2 });
    const a = document.createElement('a');
    a.download = 'canvas-preview.png';
    a.href = url;
    a.click();
  };

  return (
    <footer className="flex items-center justify-between px-4 h-10 bg-[#111] border-t border-[#2a2a2a] flex-shrink-0 text-xs">
      {/* Zoom */}
      <div className="flex items-center gap-2">
        <span className="text-gray-500">Zoom</span>
        <button
          onClick={() => setZoom(zoom - 0.1)}
          className="w-6 h-6 rounded bg-[#1a1a1a] hover:bg-[#2a2a2a] flex items-center justify-center text-gray-300"
        >-</button>
        <span className="text-gray-300 w-10 text-center">{Math.round(zoom * 100)}%</span>
        <button
          onClick={() => setZoom(zoom + 0.1)}
          className="w-6 h-6 rounded bg-[#1a1a1a] hover:bg-[#2a2a2a] flex items-center justify-center text-gray-300"
        >+</button>
        <button
          onClick={() => setZoom(1)}
          className="px-2 py-0.5 rounded bg-[#1a1a1a] hover:bg-[#2a2a2a] text-gray-400"
        >Reset</button>
      </div>

      {/* Canvas info */}
      <div className="text-gray-500">
        {canvasConfig.baseWidth} × {canvasConfig.baseHeight} px
      </div>

      {/* Duration + Save */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-gray-500">Duration</span>
          <select
            value={exportConfig.duration}
            onChange={(e) => setExportConfig({ duration: Number(e.target.value) })}
            className="bg-[#1a1a1a] border border-[#333] text-gray-300 rounded px-2 py-0.5 text-xs"
          >
            {DURATION_OPTIONS.map((d) => (
              <option key={d} value={d}>{d}s</option>
            ))}
          </select>
        </div>

        <button
          onClick={handleSnapshotDownload}
          className="text-gray-400 hover:text-white transition-colors"
          title="Download preview snapshot"
        >
          Snapshot
        </button>

        <button
          onClick={onSaveTemplate}
          className="px-3 py-1 rounded bg-[#1a1a1a] hover:bg-[#2a2a2a] text-gray-300 hover:text-white transition-colors border border-[#333]"
        >
          Save Project
        </button>
      </div>
    </footer>
  );
}
