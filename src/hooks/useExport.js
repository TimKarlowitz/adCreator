import { useRef, useState } from 'react';
import { getAnimationState } from '@/lib/animationUtils';
import { useProjectStore } from '@/store/projectStore';
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

/**
 * Composite one frame with correct z-order:
 *   1. background color (CSS)
 *   2. bottom Konva stage (elements below 3D model)
 *   3. Three.js canvas (background image + 3D model, transparent elsewhere)
 *   4. top Konva stage (elements above 3D model)
 */
async function compositeFrame({
  threeCanvas,
  topKonvaStage,
  bottomKonvaStage,
  backgroundColor,
  width,
  height,
}) {
  const offscreen = new OffscreenCanvas(width, height);
  const ctx = offscreen.getContext('2d');

  // 1. Background color
  ctx.fillStyle = backgroundColor || '#000000';
  ctx.fillRect(0, 0, width, height);

  // 2. Bottom Konva stage (elements below 3D model)
  if (bottomKonvaStage) {
    const bottomCanvas = bottomKonvaStage.toCanvas({ pixelRatio: width / bottomKonvaStage.width() });
    ctx.drawImage(bottomCanvas, 0, 0, width, height);
  }

  // 3. Three.js WebGL frame (transparent background, draws bg image + 3D model)
  if (threeCanvas) {
    ctx.drawImage(threeCanvas, 0, 0, width, height);
  }

  // 4. Top Konva stage (elements above 3D model)
  if (topKonvaStage) {
    const topCanvas = topKonvaStage.toCanvas({ pixelRatio: width / topKonvaStage.width() });
    ctx.drawImage(topCanvas, 0, 0, width, height);
  }

  const blob = await offscreen.convertToBlob({ type: 'image/png' });
  return new Uint8Array(await blob.arrayBuffer());
}

export function useExport() {
  const [progress, setProgress] = useState(0); // 0-100
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(false);

  // Read model3d at hook render time so exportVideo closes over the latest values.
  const model3d = useProjectStore((state) => state.model3d);

  const exportVideo = async ({
    stageRef,
    bottomStageRef,
    threeCanvasRef,
    exportConfig,
    elements,
    backgroundColor,
  }) => {
    const { duration = 4, fps = 30, format = 'mp4' } = exportConfig;
    const totalFrames = Math.round(duration * fps);

    const {
      autoRotate = true,
      syncRotationToGif = false,
      rotationLoops = 1,
      rotationSpeed = 0.8,
    } = model3d || {};

    // Total rotation (radians) the model should complete over the full clip.
    // • Synced mode: exactly rotationLoops full turns regardless of fps.
    // • Free mode:   simulate speed at a deterministic 1/fps timestep per frame
    //               (same result as rotationSpeed rad/s for exactly `duration` s).
    const totalAngle = syncRotationToGif
      ? 2 * Math.PI * rotationLoops
      : rotationSpeed * duration;

    setIsExporting(true);
    setProgress(0);
    setError(null);
    abortRef.current = false;

    // Activate deterministic export rotation before the frame loop.
    if (autoRotate) {
      exportFrameControl.active = true;
      exportFrameControl.angle = 0;
      // Let R3F paint one frame at angle 0 before we start capturing.
      await waitForRender();
    }

    try {
      const ffmpeg = await getFFmpeg();

      const threeCanvas = threeCanvasRef?.current?.querySelector('[data-layer="three"] canvas');
      const topKonvaStage = stageRef?.current;
      const bottomKonvaStage = bottomStageRef?.current;

      if (!topKonvaStage) throw new Error('Konva stage not found');

      const exportWidth = 1080;
      const exportHeight = topKonvaStage.height() === topKonvaStage.width()
        ? 1080
        : topKonvaStage.height() > topKonvaStage.width()
        ? 1920 : 607;

      for (let frame = 0; frame < totalFrames; frame++) {
        if (abortRef.current) break;

        setProgress(Math.round((frame / totalFrames) * 85));

        // Pin the 3D model to its exact angle for this frame index.
        // Frame 0 → 0 rad, last frame → totalAngle rad (exclusive of the
        // final full-cycle position so the GIF loops cleanly).
        if (autoRotate) {
          exportFrameControl.angle = (frame / totalFrames) * totalAngle;
          // Wait for R3F to render the scene at this exact angle before
          // we read pixels from the WebGL canvas.
          await waitForRender();
        }

        const frameData = await compositeFrame({
          threeCanvas,
          topKonvaStage,
          bottomKonvaStage,
          backgroundColor,
          width: exportWidth,
          height: exportHeight,
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
        // Two-pass GIF: build a global palette from all frames first,
        // then encode with dithering.
        // GIF centisecond timing: FFmpeg converts -r {fps} to the nearest
        // centisecond delay automatically (e.g. 30fps → 3cs ≈ 33ms).
        await ffmpeg.exec([
          '-r', String(fps),
          '-i', 'frame%04d.png',
          '-vf', 'palettegen=stats_mode=diff',
          'palette.png',
        ]);
        await ffmpeg.exec([
          '-r', String(fps),
          '-i', 'frame%04d.png',
          '-i', 'palette.png',
          '-lavfi', 'paletteuse=dither=sierra2_4a',
          '-loop', '0',
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
      // Always deactivate export mode so the live preview resumes normally.
      exportFrameControl.active = false;
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
