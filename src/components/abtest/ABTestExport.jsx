'use client';

import { useState, useRef } from 'react';
import JSZip from 'jszip';
import { applyVariantToProject, variantLabel } from '@/lib/abTestEngine';
import { useProjectStore } from '@/store/projectStore';
import { useAssetStore } from '@/store/assetStore';
import { exportFrameControl, waitForRender } from '@/lib/exportFrameControl';

let ffmpegInstance = null;

async function getFFmpeg() {
  if (ffmpegInstance) return ffmpegInstance;
  const { FFmpeg } = await import('@ffmpeg/ffmpeg');
  const { toBlobURL } = await import('@ffmpeg/util');
  const ffmpeg = new FFmpeg();
  const coreBase = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
  await ffmpeg.load({
    classWorkerURL: new URL('/ffmpeg/worker.js', window.location.href).href,
    coreURL: await toBlobURL(`${coreBase}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${coreBase}/ffmpeg-core.wasm`, 'application/wasm'),
  });
  ffmpegInstance = ffmpeg;
  return ffmpeg;
}

async function compositeFrame({ threeCanvas, topKonvaStage, bottomKonvaStage, backgroundColor, width, height }) {
  const offscreen = new OffscreenCanvas(width, height);
  const ctx = offscreen.getContext('2d');
  ctx.fillStyle = backgroundColor || '#000000';
  ctx.fillRect(0, 0, width, height);
  if (bottomKonvaStage) {
    const c = bottomKonvaStage.toCanvas({ pixelRatio: width / bottomKonvaStage.width() });
    ctx.drawImage(c, 0, 0, width, height);
  }
  if (threeCanvas) ctx.drawImage(threeCanvas, 0, 0, width, height);
  if (topKonvaStage) {
    const c = topKonvaStage.toCanvas({ pixelRatio: width / topKonvaStage.width() });
    ctx.drawImage(c, 0, 0, width, height);
  }
  const blob = await offscreen.convertToBlob({ type: 'image/png' });
  return new Uint8Array(await blob.arrayBuffer());
}

/**
 * Export a single project snapshot to a Blob (mp4 or gif).
 * Returns { blob, ext }.
 */
async function exportVariantBlob({ project, stageRef, bottomStageRef, threeCanvasRef, onProgress, abortRef }) {
  const ffmpeg = await getFFmpeg();
  const { exportConfig, canvasConfig, model3d } = project;
  const { duration = 4, fps = 30, format = 'mp4' } = exportConfig;
  const totalFrames = Math.round(duration * fps);

  const { autoRotate = true, syncRotationToGif = false, rotationLoops = 1, rotationSpeed = 0.8 } = model3d || {};
  const totalAngle = syncRotationToGif ? 2 * Math.PI * rotationLoops : rotationSpeed * duration;

  const threeCanvas = threeCanvasRef?.current?.querySelector('[data-layer="three"] canvas');
  const topKonvaStage = stageRef?.current;
  const bottomKonvaStage = bottomStageRef?.current;
  if (!topKonvaStage) throw new Error('Konva stage not ready');

  const exportWidth = canvasConfig.aspectRatio === '1:1' ? 1080 : canvasConfig.aspectRatio === '16:9' ? 1920 : 1080;
  const exportHeight = canvasConfig.aspectRatio === '9:16' ? 1920 : canvasConfig.aspectRatio === '16:9' ? 1080 : 1080;

  if (autoRotate) {
    exportFrameControl.active = true;
    exportFrameControl.angle = 0;
    await waitForRender();
  }

  try {
    for (let frame = 0; frame < totalFrames; frame++) {
      if (abortRef.current) throw new Error('Aborted');
      onProgress(Math.round((frame / totalFrames) * 80));

      if (autoRotate) {
        exportFrameControl.angle = (frame / totalFrames) * totalAngle;
        await waitForRender();
      }

      const frameData = await compositeFrame({
        threeCanvas, topKonvaStage, bottomKonvaStage,
        backgroundColor: canvasConfig.backgroundColor,
        width: exportWidth, height: exportHeight,
      });
      await ffmpeg.writeFile(`frame${String(frame).padStart(4, '0')}.png`, frameData);
    }

    onProgress(85);

    if (format === 'mp4') {
      await ffmpeg.exec(['-r', String(fps), '-i', 'frame%04d.png', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', 'output.mp4']);
      const data = await ffmpeg.readFile('output.mp4');
      onProgress(99);
      // Cleanup
      for (let f = 0; f < totalFrames; f++) {
        try { await ffmpeg.deleteFile(`frame${String(f).padStart(4, '0')}.png`); } catch {}
      }
      try { await ffmpeg.deleteFile('output.mp4'); } catch {}
      return { blob: new Blob([data.buffer], { type: 'video/mp4' }), ext: 'mp4' };
    } else {
      await ffmpeg.exec(['-r', String(fps), '-i', 'frame%04d.png', '-vf', 'palettegen=stats_mode=diff', 'palette.png']);
      await ffmpeg.exec(['-r', String(fps), '-i', 'frame%04d.png', '-i', 'palette.png', '-lavfi', 'paletteuse=dither=sierra2_4a', '-loop', '0', 'output.gif']);
      const data = await ffmpeg.readFile('output.gif');
      onProgress(99);
      for (let f = 0; f < totalFrames; f++) {
        try { await ffmpeg.deleteFile(`frame${String(f).padStart(4, '0')}.png`); } catch {}
      }
      try { await ffmpeg.deleteFile('output.gif'); } catch {}
      try { await ffmpeg.deleteFile('palette.png'); } catch {}
      return { blob: new Blob([data.buffer], { type: 'image/gif' }), ext: 'gif' };
    }
  } finally {
    exportFrameControl.active = false;
  }
}

function sanitizeFilename(str) {
  return str.replace(/[^a-zA-Z0-9_\-. ]/g, '').replace(/\s+/g, '_').slice(0, 60);
}

export default function ABTestExport({ variants, slots, project, stageRef, bottomStageRef, threeCanvasRef, excludedIds, configName }) {
  const [phase, setPhase] = useState('idle'); // idle | running | done | error
  const [currentIdx, setCurrentIdx] = useState(0);
  const [frameProgress, setFrameProgress] = useState(0);
  const [results, setResults] = useState([]); // { name, status: 'ok'|'error', message? }
  const [zipUrl, setZipUrl] = useState(null);
  const abortRef = useRef(false);
  const { getObjectUrl } = useAssetStore();

  const activeVariants = variants.filter((v) => !excludedIds.includes(v.id));

  const handleStart = async () => {
    abortRef.current = false;
    setPhase('running');
    setCurrentIdx(0);
    setFrameProgress(0);
    setResults([]);
    setZipUrl(null);

    const zip = new JSZip();
    const resultLog = [];

    // Save original store state to restore after all exports
    const originalState = {
      model3d: useProjectStore.getState().model3d,
      background: useProjectStore.getState().background,
      canvasConfig: useProjectStore.getState().canvasConfig,
      elements: useProjectStore.getState().elements,
    };

    for (let i = 0; i < activeVariants.length; i++) {
      if (abortRef.current) break;
      setCurrentIdx(i);
      setFrameProgress(0);

      const variant = activeVariants[i];
      const label = variantLabel(variant, slots);
      const filename = sanitizeFilename(`${String(i + 1).padStart(2, '0')}_${configName || 'ab'}_${label}`);

      try {
        // Build patched project
        const patchedProject = applyVariantToProject(project, variant, slots);

        // Resolve blob URLs
        if (patchedProject.model3d?.assetId && !patchedProject.model3d?.src) {
          patchedProject.model3d.src = await getObjectUrl(patchedProject.model3d.assetId);
        }
        if (patchedProject.background?.assetId && !patchedProject.background?.src) {
          patchedProject.background.src = await getObjectUrl(patchedProject.background.assetId);
        }
        for (const el of patchedProject.elements) {
          if (el.assetId && !el.src) {
            el.src = await getObjectUrl(el.assetId);
          }
        }

        // Apply variant to store (triggers canvas re-render)
        useProjectStore.setState({
          model3d: patchedProject.model3d,
          background: patchedProject.background,
          canvasConfig: patchedProject.canvasConfig,
          elements: patchedProject.elements,
        });

        // Wait for canvas to repaint
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

        const { blob, ext } = await exportVariantBlob({
          project: patchedProject,
          stageRef,
          bottomStageRef,
          threeCanvasRef,
          onProgress: setFrameProgress,
          abortRef,
        });

        zip.file(`${filename}.${ext}`, await blob.arrayBuffer());
        resultLog.push({ name: `${filename}.${ext}`, status: 'ok' });
      } catch (err) {
        resultLog.push({ name: filename, status: 'error', message: err.message });
      }

      setResults([...resultLog]);
    }

    // Restore original store state
    useProjectStore.setState(originalState);

    if (!abortRef.current) {
      try {
        setFrameProgress(100);
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(zipBlob);
        setZipUrl(url);
        setPhase('done');
      } catch (err) {
        setPhase('error');
      }
    } else {
      setPhase('idle');
    }
  };

  const handleDownload = () => {
    if (!zipUrl) return;
    const a = document.createElement('a');
    a.href = zipUrl;
    a.download = `${sanitizeFilename(configName || 'ab-test')}_${activeVariants.length}-variants.zip`;
    a.click();
  };

  const overallProgress = phase === 'running'
    ? Math.round(((currentIdx + frameProgress / 100) / activeVariants.length) * 100)
    : phase === 'done' ? 100 : 0;

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Variants to export', value: activeVariants.length, color: 'text-white' },
          { label: 'Format', value: (project.exportConfig?.format || 'mp4').toUpperCase(), color: 'text-indigo-400' },
          { label: 'Duration each', value: `${project.exportConfig?.duration || 4}s @ ${project.exportConfig?.fps || 30}fps`, color: 'text-gray-300' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl bg-[#111] border border-[#2a2a2a] px-4 py-3">
            <p className={`text-lg font-bold ${color}`}>{value}</p>
            <p className="text-[10px] text-gray-600">{label}</p>
          </div>
        ))}
      </div>

      {/* Warning about 3D model thumbnails */}
      <div className="px-3 py-2.5 rounded-lg bg-[#111] border border-[#2a2a2a] text-xs text-gray-500 flex gap-2">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="flex-shrink-0 mt-0.5 text-gray-600">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        Export runs sequentially in your browser via FFmpeg WASM. Keep this tab active during the process. The 3D model canvas will be captured per-frame.
      </div>

      {/* Progress */}
      {(phase === 'running' || phase === 'done') && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">
              {phase === 'done'
                ? 'All exports complete'
                : `Exporting variant ${currentIdx + 1} of ${activeVariants.length}…`}
            </span>
            <span className="text-gray-300 font-medium">{overallProgress}%</span>
          </div>
          <div className="w-full bg-[#1a1a1a] rounded-full h-2">
            <div
              className="bg-indigo-500 h-2 rounded-full transition-all duration-200"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
          {phase === 'running' && (
            <p className="text-[10px] text-gray-600">
              Current variant: {frameProgress}% frames rendered
            </p>
          )}
        </div>
      )}

      {/* Result log */}
      {results.length > 0 && (
        <div className="rounded-xl border border-[#2a2a2a] bg-[#0d0d0d] overflow-hidden max-h-48 overflow-y-auto">
          {results.map((r, i) => (
            <div key={i} className={`flex items-center gap-2 px-3 py-2 border-b border-[#1a1a1a] last:border-0 text-xs ${r.status === 'error' ? 'bg-red-950/20' : ''}`}>
              <span className={r.status === 'ok' ? 'text-green-500' : 'text-red-400'}>
                {r.status === 'ok' ? '✓' : '✕'}
              </span>
              <span className="text-gray-300 truncate flex-1">{r.name}</span>
              {r.message && <span className="text-red-400 text-[10px] truncate max-w-[140px]" title={r.message}>{r.message}</span>}
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {phase === 'idle' && (
          <button
            onClick={handleStart}
            disabled={activeVariants.length === 0}
            className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            Start Export ({activeVariants.length} variant{activeVariants.length !== 1 ? 's' : ''})
          </button>
        )}
        {phase === 'running' && (
          <button
            onClick={() => { abortRef.current = true; }}
            className="flex-1 py-3 rounded-xl bg-[#1a1a1a] border border-[#333] text-red-400 hover:bg-red-900/20 transition-colors font-medium text-sm"
          >
            Cancel
          </button>
        )}
        {phase === 'done' && (
          <>
            <button
              onClick={handleDownload}
              className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Download ZIP
            </button>
            <button
              onClick={() => { setPhase('idle'); setResults([]); setZipUrl(null); }}
              className="px-4 py-3 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] text-gray-300 hover:text-white text-sm transition-colors"
            >
              Export Again
            </button>
          </>
        )}
      </div>
    </div>
  );
}
