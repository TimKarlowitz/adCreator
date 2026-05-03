'use client';

import { useProjectStore } from '@/store/projectStore';

const RATIOS = ['1:1', '16:9', '9:16'];

function SaveIndicator({ isSaving, lastSaved }) {
  if (isSaving) {
    return (
      <span className="flex items-center gap-1 text-[10px] text-gray-500">
        <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
        Saving…
      </span>
    );
  }
  if (lastSaved) {
    return (
      <span className="flex items-center gap-1 text-[10px] text-gray-600">
        <span className="w-1.5 h-1.5 rounded-full bg-green-600" />
        Saved
      </span>
    );
  }
  return null;
}

export default function TopBar({ onExport, onTemplates, onProjects, isSaving, lastSaved }) {
  const { canvasConfig, setAspectRatio, undo, redo, _past, _future } = useProjectStore();

  return (
    <header className="flex items-center justify-between px-4 h-12 bg-[#111] border-b border-[#2a2a2a] flex-shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-indigo-600 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="2" width="5" height="5" rx="1" fill="white" />
              <rect x="9" y="2" width="5" height="5" rx="1" fill="white" opacity="0.7" />
              <rect x="2" y="9" width="5" height="5" rx="1" fill="white" opacity="0.7" />
              <rect x="9" y="9" width="5" height="5" rx="1" fill="white" />
            </svg>
          </div>
          <span className="font-semibold text-white text-sm tracking-tight">AdCreator</span>
        </div>

        {/* Undo/Redo */}
        <div className="flex gap-1 ml-2">
          <button
            onClick={undo}
            disabled={_past.length === 0}
            className="p-1.5 rounded hover:bg-[#2a2a2a] disabled:opacity-30 disabled:cursor-not-allowed text-gray-300 transition-colors"
            title="Undo (Ctrl+Z)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 7v6h6" /><path d="M3 13C5 7 10 4 16 5.5a9 9 0 0 1 5 4.5" />
            </svg>
          </button>
          <button
            onClick={redo}
            disabled={_future.length === 0}
            className="p-1.5 rounded hover:bg-[#2a2a2a] disabled:opacity-30 disabled:cursor-not-allowed text-gray-300 transition-colors"
            title="Redo (Ctrl+Y)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 7v6h-6" /><path d="M21 13C19 7 14 4 8 5.5a9 9 0 0 0-5 4.5" />
            </svg>
          </button>
        </div>
      </div>

      {/* Aspect ratio switcher */}
      <div className="flex items-center gap-1 bg-[#1a1a1a] rounded-lg p-1">
        {RATIOS.map((ratio) => (
          <button
            key={ratio}
            onClick={() => setAspectRatio(ratio)}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              canvasConfig.aspectRatio === ratio
                ? 'bg-indigo-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-[#2a2a2a]'
            }`}
          >
            {ratio}
          </button>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <SaveIndicator isSaving={isSaving} lastSaved={lastSaved} />
        <button
          onClick={onProjects}
          className="px-3 py-1.5 rounded text-sm text-gray-300 hover:text-white hover:bg-[#2a2a2a] transition-colors"
        >
          Projects
        </button>
        <button
          onClick={onTemplates}
          className="px-3 py-1.5 rounded text-sm text-gray-300 hover:text-white hover:bg-[#2a2a2a] transition-colors"
        >
          Templates
        </button>
        <button
          onClick={onExport}
          className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors flex items-center gap-2"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export
        </button>
      </div>
    </header>
  );
}
