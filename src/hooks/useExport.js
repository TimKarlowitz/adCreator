import { useRef, useState } from 'react';
import { getAnimationState } from '@/lib/animationUtils';
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

/**
 * Draw a background image onto a 2D canvas context with cover-fit + scale/offset/opacity,
 * matching the CSS BackgroundImageLayer behavior in CanvasContainer.
 */
async function drawBackgroundImage(ctx, { src, scale = 1, offsetX = 0, offsetY = 0, opacity = 1 }, width, height) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const imgAR = img.width / img.height;
      const canvasAR = width / height;

      // Cover fit: expand to fill the canvas on the constraining axis
      let drawW, drawH;
      if (imgAR > canvasAR) {
        drawH = height;
        drawW = height * imgAR;
      } else {
        drawW = width;
        drawH = width / imgAR;
      }

      // Apply scale (zooms from center)
      drawW *= scale;
      drawH *= scale;

      // Center + offset (offsetX/Y are fractions of canvas size, Y axis flipped to match CSS)
      const x = (width - drawW) / 2 + offsetX * width;
      const y = (height - drawH) / 2 + (-offsetY) * height;

      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.drawImage(img, x, y, drawW, drawH);
      ctx.restore();
      resolve();
    };
    img.onerror = resolve;
    img.src = src;
  });
}

/**
 * Composite one frame with correct z-order:
 *   1. background color (CSS)
 *   2. background image (CSS layer — now separate from Three.js)
 *   3. bottom Konva stage (elements below 3D model)
 *   4. Three.js canvas (3D model only, transparent elsewhere)
 *   5. top Konva stage (elements above 3D model)
 */
async function compositeFrame({
  threeCanvas,
  topKonvaStage,
  bottomKonvaStage,
  backgroundColor,
  backgroundImage,
  width,
  height,
}) {
  const offscreen = new OffscreenCanvas(width, height);
  const ctx = offscreen.getContext('2d');

  // 1. Background color
  ctx.fillStyle = backgroundColor || '#000000';
  ctx.fillRect(0, 0, width, height);

  // 2. Background image (always below all elements, matching CSS layer order)
  if (backgroundImage?.src) {
    await drawBackgroundImage(ctx, backgroundImage, width, height);
  }

  // 3. Bottom Konva stage (elements below 3D model)
  if (bottomKonvaStage) {
    const bottomCanvas = bottomKonvaStage.toCanvas({ pixelRatio: width / bottomKonvaStage.width() });
    ctx.drawImage(bottomCanvas, 0, 0, width, height);
  }

  // 4. Three.js WebGL frame (3D model only, transparent elsewhere)
  if (threeCanvas) {
    ctx.drawImage(threeCanvas, 0, 0, width, height);
  }

  // 5. Top Konva stage (elements above 3D model)
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

  // Read store state at hook render time so exportVideo closes over the latest values.
  const model3d = useProjectStore((state) => state.model3d);
  const background = useProjectStore((state) => state.background);
  const blobUrls = useAssetStore((state) => state.blobUrls);

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

    // Resolve the background image src the same way CanvasContainer does.
    const bgSrc = background?.type === 'image'
      ? ((background.assetId ? blobUrls[background.assetId] : null) || background.src)
      : null;
    const backgroundImage = bgSrc ? {
      src: bgSrc,
      scale: background.scale ?? 1,
      offsetX: background.offsetX ?? 0,
      offsetY: background.offsetY ?? 0,
      opacity: background.opacity ?? 1,
    } : null;

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
          backgroundImage,
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
