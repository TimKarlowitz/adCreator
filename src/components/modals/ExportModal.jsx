'use client';

import { useProjectStore } from '@/store/projectStore';
import { useExport } from '@/hooks/useExport';

const RESOLUTIONS = {
  '1:1':  { label: '1080×1080', width: 1080, height: 1080 },
  '16:9': { label: '1920×1080', width: 1920, height: 1080 },
  '9:16': { label: '1080×1920', width: 1080, height: 1920 },
};

export default function ExportModal({ onClose, stageRef, bottomStageRef, threeCanvasRef }) {
  const { exportConfig, setExportConfig, canvasConfig, elements } = useProjectStore();
  const { exportVideo, progress, isExporting, error, abort } = useExport();

  const resolution = RESOLUTIONS[canvasConfig.aspectRatio] || RESOLUTIONS['1:1'];

  const handleExport = () => {
    exportVideo({
      stageRef,
      bottomStageRef,
      threeCanvasRef,
      exportConfig,
      elements,
      backgroundColor: canvasConfig.backgroundColor,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={!isExporting ? onClose : undefined}>
      <div
        className="bg-[#1a1a1a] border border-[#333] rounded-xl shadow-2xl w-[440px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-[#2a2a2a]">
          <h3 className="font-semibold text-white text-lg">Export</h3>
          {!isExporting && (
            <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">✕</button>
          )}
        </div>

        <div className="p-5 space-y-4">
          {/* Format */}
          <div>
            <label className="text-sm text-gray-400 block mb-2">Format</label>
            <div className="grid grid-cols-2 gap-2">
              {['mp4', 'gif'].map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setExportConfig({ format: fmt })}
                  disabled={isExporting}
                  className={`py-3 rounded-lg border text-sm font-medium transition-colors ${
                    exportConfig.format === fmt
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-[#111] border-[#333] text-gray-400 hover:border-[#555]'
                  }`}
                >
                  {fmt.toUpperCase()}
                  <div className="text-xs font-normal text-current opacity-70 mt-0.5">
                    {fmt === 'mp4' ? 'Best quality' : 'Loops everywhere'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="text-sm text-gray-400 block mb-2">Duration</label>
            <div className="flex items-center gap-3">
              <input
                type="range" min="1" max="30" step="0.5"
                value={exportConfig.duration}
                onChange={(e) => setExportConfig({ duration: Number(e.target.value) })}
                disabled={isExporting}
                className="flex-1"
              />
              <span className="text-white font-medium w-12 text-center">{exportConfig.duration}s</span>
            </div>
          </div>

          {/* FPS */}
          <div>
            <label className="text-sm text-gray-400 block mb-2">Frame Rate</label>
            <div className="flex gap-2">
              {[10, 15, 20, 24, 30].map((rate) => (
                <button
                  key={rate}
                  onClick={() => setExportConfig({ fps: rate })}
                  disabled={isExporting}
                  className={`flex-1 py-2 rounded text-sm transition-colors border ${
                    exportConfig.fps === rate
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-[#111] border-[#333] text-gray-400 hover:border-[#555]'
                  }`}
                >
                  {rate} fps
                </button>
              ))}
            </div>
          </div>

          {/* Resolution info */}
          <div className="bg-[#111] rounded-lg px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Output Resolution</p>
              <p className="text-white font-medium">{resolution.label}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Estimated frames</p>
              <p className="text-white font-medium">{Math.round(exportConfig.duration * exportConfig.fps)}</p>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-900/30 border border-red-800 rounded-lg px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Progress */}
          {isExporting && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">
                  {progress < 88 ? `Rendering frames... ${progress}%` : progress < 99 ? 'Encoding...' : 'Done!'}
                </span>
                <span className="text-sm text-gray-300">{progress}%</span>
              </div>
              <div className="w-full bg-[#111] rounded-full h-2">
                <div
                  className="bg-indigo-500 h-2 rounded-full transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            {isExporting ? (
              <button
                onClick={abort}
                className="flex-1 py-3 rounded-lg bg-[#111] border border-[#333] text-red-400 hover:bg-red-900/20 transition-colors font-medium"
              >
                Cancel
              </button>
            ) : (
              <>
                <button
                  onClick={onClose}
                  className="flex-1 py-3 rounded-lg bg-[#111] border border-[#333] text-gray-300 hover:bg-[#222] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExport}
                  className="flex-1 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors"
                >
                  Export {exportConfig.format.toUpperCase()}
                </button>
              </>
            )}
          </div>

          <p className="text-[10px] text-gray-600 text-center">
            Export uses FFmpeg WASM — runs entirely in your browser. No upload needed.
          </p>
        </div>
      </div>
    </div>
  );
}
