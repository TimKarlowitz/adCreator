import { useRef, useState } from 'react';
import { getAnimationState } from '@/lib/animationUtils';

let ffmpegInstance = null;

async function getFFmpeg() {
  if (ffmpegInstance) return ffmpegInstance;
  const { FFmpeg } = await import('@ffmpeg/ffmpeg');
  const { toBlobURL } = await import('@ffmpeg/util');
  const ffmpeg = new FFmpeg();

  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  });

  ffmpegInstance = ffmpeg;
  return ffmpeg;
}

/**
 * Composite one frame: Three.js canvas on bottom, Konva on top.
 * Returns an ImageData-compatible Uint8ClampedArray.
 */
async function compositeFrame({ threeCanvas, konvaStage, t, elements, width, height, scale }) {
  const offscreen = new OffscreenCanvas(width, height);
  const ctx = offscreen.getContext('2d');

  // Draw Three.js WebGL frame
  if (threeCanvas) {
    ctx.drawImage(threeCanvas, 0, 0, width, height);
  }

  // Apply animation state to each element before Konva draws
  // We mutate a temporary representation, not the real store
  const stageCanvas = konvaStage.toCanvas({ pixelRatio: width / konvaStage.width() });
  ctx.drawImage(stageCanvas, 0, 0, width, height);

  const blob = await offscreen.convertToBlob({ type: 'image/png' });
  return new Uint8Array(await blob.arrayBuffer());
}

export function useExport() {
  const [progress, setProgress] = useState(0); // 0-100
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(false);

  const exportVideo = async ({ stageRef, threeCanvasRef, exportConfig, elements }) => {
    const { duration = 4, fps = 30, format = 'mp4' } = exportConfig;
    const totalFrames = Math.round(duration * fps);

    setIsExporting(true);
    setProgress(0);
    setError(null);
    abortRef.current = false;

    try {
      const ffmpeg = await getFFmpeg();

      // Get the Three.js canvas element
      const threeCanvas = threeCanvasRef?.current?.querySelector('canvas');
      const konvaStage = stageRef?.current;

      if (!konvaStage) throw new Error('Konva stage not found');

      const exportWidth = 1080;
      const exportHeight = konvaStage.height() === konvaStage.width()
        ? 1080
        : konvaStage.height() > konvaStage.width()
        ? 1920 : 607; // approximate

      for (let frame = 0; frame < totalFrames; frame++) {
        if (abortRef.current) break;

        const t = frame / fps;
        setProgress(Math.round((frame / totalFrames) * 85));

        const frameData = await compositeFrame({
          threeCanvas,
          konvaStage,
          t,
          elements,
          width: exportWidth,
          height: exportHeight,
          scale: exportWidth / konvaStage.width(),
        });

        const filename = `frame${String(frame).padStart(4, '0')}.png`;
        await ffmpeg.writeFile(filename, frameData);
      }

      setProgress(88);

      if (format === 'mp4') {
        await ffmpeg.exec([
          '-r', String(fps),
          '-i', 'frame%04d.png',
          '-c:v', 'libx264',
          '-pix_fmt', 'yuv420p',
          '-movflags', '+faststart',
          'output.mp4',
        ]);

        const data = await ffmpeg.readFile('output.mp4');
        setProgress(99);
        downloadBlob(new Blob([data.buffer], { type: 'video/mp4' }), 'ad-export.mp4');
      } else {
        // GIF: two-pass with palette
        await ffmpeg.exec([
          '-r', String(fps),
          '-i', 'frame%04d.png',
          '-vf', 'palettegen',
          'palette.png',
        ]);
        await ffmpeg.exec([
          '-r', String(fps),
          '-i', 'frame%04d.png',
          '-i', 'palette.png',
          '-lavfi', 'paletteuse',
          'output.gif',
        ]);

        const data = await ffmpeg.readFile('output.gif');
        setProgress(99);
        downloadBlob(new Blob([data.buffer], { type: 'image/gif' }), 'ad-export.gif');
      }

      setProgress(100);
    } catch (err) {
      console.error('Export error:', err);
      setError(err.message || 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const abort = () => { abortRef.current = true; };

  return { exportVideo, progress, isExporting, error, abort };
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
