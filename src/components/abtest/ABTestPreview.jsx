'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { applyVariantToProject } from '@/lib/abTestEngine';
import { useProjectStore } from '@/store/projectStore';
import { useAssetStore } from '@/store/assetStore';

// ─────────────────────────────────────────────
// Offscreen GLB renderer
// Renders a single frame of a GLB model into a canvas data URL,
// then fully disposes all GPU resources. Does NOT touch the DOM.
// ─────────────────────────────────────────────
async function renderGLBOffscreen(src, width, height) {
  const THREE = await import('three');
  const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, width / height, 0.001, 10000);

  scene.add(new THREE.AmbientLight(0xffffff, 0.9));
  const dir = new THREE.DirectionalLight(0xffffff, 1.5);
  dir.position.set(2, 4, 3);
  scene.add(dir);
  const fill = new THREE.DirectionalLight(0xffffff, 0.4);
  fill.position.set(-3, -1, -2);
  scene.add(fill);

  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.load(
      src,
      (gltf) => {
        const model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const center = new THREE.Vector3();
        const sizeVec = new THREE.Vector3();
        box.getCenter(center);
        box.getSize(sizeVec);
        model.position.sub(center);
        scene.add(model);

        const maxDim = Math.max(sizeVec.x, sizeVec.y, sizeVec.z);
        const dist = Math.max(maxDim * 1.8, 0.5);
        camera.position.set(dist * 0.5, dist * 0.35, dist);
        camera.lookAt(0, 0, 0);
        camera.near = dist * 0.001;
        camera.far = dist * 20;
        camera.updateProjectionMatrix();

        renderer.render(scene, camera);
        const dataUrl = renderer.domElement.toDataURL('image/png');

        renderer.dispose();
        scene.traverse((child) => {
          if (!child.isMesh) return;
          child.geometry?.dispose();
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          for (const mat of mats) { mat?.map?.dispose(); mat?.dispose(); }
        });

        resolve(dataUrl);
      },
      undefined,
      (err) => { renderer.dispose(); reject(err); },
    );
  });
}

// ─────────────────────────────────────────────
// Load an image from a URL and return an HTMLImageElement
// ─────────────────────────────────────────────
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// ─────────────────────────────────────────────
// Draw an image with object-fit: cover scaling (mirrors ThreeLayer's applyTextureCover)
// ─────────────────────────────────────────────
function drawImageCover(ctx, img, x, y, w, h, opacity = 1) {
  const imgAR = img.naturalWidth / img.naturalHeight;
  const frameAR = w / h;
  let drawW, drawH;
  if (imgAR > frameAR) { drawH = h; drawW = imgAR * h; }
  else                  { drawW = w; drawH = w / imgAR; }
  const drawX = x + (w - drawW) / 2;
  const drawY = y + (h - drawH) / 2;
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, opacity ?? 1));
  ctx.drawImage(img, drawX, drawY, drawW, drawH);
  ctx.restore();
}

// ─────────────────────────────────────────────
// Main thumbnail compositor — fully independent of the live Three.js canvas.
//
// Layers (bottom to top):
//   1. solid canvasConfig.backgroundColor fill
//   2. bottom Konva stage (elements below 3D model)
//   3. background image — drawn directly from blob URL with cover scaling
//   4. 3D model — rendered via offscreen WebGLRenderer (per-variant, deterministic)
//   5. top Konva stage (elements above 3D model)
// ─────────────────────────────────────────────
async function buildVariantThumb({ patchedProject, topStage, bottomStage, blobUrls, getObjectUrl }) {
  if (!topStage) return null;

  const W = topStage.width();
  const H = topStage.height();
  if (!W || !H) return null;

  const canvas = document.createElement('canvas');
  canvas.width  = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // 1 — solid background
  ctx.fillStyle = patchedProject.canvasConfig?.backgroundColor || '#111111';
  ctx.fillRect(0, 0, W, H);

  // 2 — bottom Konva layer
  if (bottomStage) {
    try { ctx.drawImage(bottomStage.toCanvas({ pixelRatio: 1 }), 0, 0, W, H); } catch {}
  }

  // 3 — background image (skip Three.js canvas entirely)
  const bg = patchedProject.background;
  if (bg?.type === 'image') {
    const bgSrc =
      (bg.assetId ? blobUrls[bg.assetId] : null) ||
      (bg.assetId ? await getObjectUrl(bg.assetId).catch(() => null) : null) ||
      bg.src || null;
    if (bgSrc) {
      try {
        const img = await loadImage(bgSrc);
        drawImageCover(ctx, img, 0, 0, W, H, bg.opacity ?? 1);
      } catch {}
    }
  }

  // 4 — 3D model via offscreen WebGL (per-variant, no live Three.js dependency)
  const m3d = patchedProject.model3d;
  const modelSrc =
    (m3d?.assetId ? blobUrls[m3d.assetId] : null) ||
    (m3d?.assetId ? await getObjectUrl(m3d.assetId).catch(() => null) : null) ||
    m3d?.src || null;
  if (modelSrc) {
    try {
      const modelDataUrl = await renderGLBOffscreen(modelSrc, W, H);
      const modelImg = await loadImage(modelDataUrl);
      // Draw centered, preserving aspect ratio (similar to how Three.js frames it)
      ctx.drawImage(modelImg, 0, 0, W, H);
    } catch {}
  }

  // 5 — top Konva layer
  try { ctx.drawImage(topStage.toCanvas({ pixelRatio: 1 }), 0, 0, W, H); } catch {}

  return canvas.toDataURL('image/jpeg', 0.80);
}

// ─────────────────────────────────────────────
// Variant card
// ─────────────────────────────────────────────
function VariantCard({
  variant, index, slots, project,
  stageRef, bottomStageRef,
  excluded, onToggleExclude,
}) {
  const [thumb, setThumb] = useState(null);
  const [thumbState, setThumbState] = useState('idle');
  const cardRef = useRef();
  const { getObjectUrl } = useAssetStore();

  useEffect(() => {
    const node = cardRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      async (entries) => {
        if (entries[0].isIntersecting && thumbState === 'idle') {
          observer.disconnect();
          await renderThumb();
        }
      },
      { rootMargin: '120px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thumbState]);

  const renderThumb = useCallback(async () => {
    if (!stageRef?.current) return;
    setThumbState('loading');

    // Save live store state so we can restore it afterwards
    const saved = {
      model3d:      useProjectStore.getState().model3d,
      background:   useProjectStore.getState().background,
      canvasConfig: useProjectStore.getState().canvasConfig,
      elements:     useProjectStore.getState().elements,
    };

    try {
      const patchedProject = applyVariantToProject(project, variant, slots);

      // Resolve any missing blob URLs for Konva elements (text/image)
      if (patchedProject.model3d?.assetId && !patchedProject.model3d?.src) {
        patchedProject.model3d.src = await getObjectUrl(patchedProject.model3d.assetId).catch(() => null);
      }
      if (patchedProject.background?.assetId && !patchedProject.background?.src) {
        patchedProject.background.src = await getObjectUrl(patchedProject.background.assetId).catch(() => null);
      }
      for (const el of patchedProject.elements) {
        if (el.assetId && !el.src) el.src = await getObjectUrl(el.assetId).catch(() => null);
      }

      // Apply variant to store so Konva re-renders element/text changes
      useProjectStore.setState({
        model3d:      patchedProject.model3d,
        background:   patchedProject.background,
        canvasConfig: patchedProject.canvasConfig,
        elements:     patchedProject.elements,
      });

      // 2 animation frames is enough for Konva to re-paint text/image elements
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

      const blobUrls = useAssetStore.getState().blobUrls;

      const dataUrl = await buildVariantThumb({
        patchedProject,
        topStage:    stageRef.current,
        bottomStage: bottomStageRef?.current ?? null,
        blobUrls,
        getObjectUrl,
      });

      setThumb(dataUrl);
      setThumbState('done');
    } catch (err) {
      console.error('Variant thumb failed:', err);
      setThumbState('error');
    } finally {
      try { useProjectStore.setState(saved); } catch {}
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageRef, bottomStageRef, variant, slots, project, getObjectUrl]);

  const pills = Object.entries(variant.slotValues).map(([slotId, valueId]) => {
    const slot = slots.find((s) => s.id === slotId);
    const val  = slot?.values.find((v) => v.id === valueId);
    return { slotLabel: slot?.label || slotId, valueLabel: val?.label || valueId.slice(0, 6) };
  });

  return (
    <div
      ref={cardRef}
      className={`rounded-xl border overflow-hidden flex flex-col transition-all ${
        excluded
          ? 'border-[#2a2a2a] opacity-40 bg-[#0d0d0d]'
          : variant.warnings?.length
          ? 'border-yellow-700/40 bg-[#141410]'
          : 'border-[#2a2a2a] bg-[#111] hover:border-[#3a3a3a]'
      }`}
    >
      {/* Thumbnail */}
      <div className="relative bg-[#0a0a0a] aspect-square overflow-hidden">
        {thumbState === 'done' && thumb ? (
          <img src={thumb} alt={`Variant ${index + 1}`} className="w-full h-full object-cover" />
        ) : thumbState === 'loading' ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            <span className="w-5 h-5 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
            <span className="text-[9px] text-gray-700">rendering…</span>
          </div>
        ) : thumbState === 'error' ? (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-[10px] text-red-500/50">render error</span>
          </div>
        ) : (
          <div className="w-full h-full" />
        )}

        <div className="absolute top-1.5 left-1.5 bg-black/70 text-white text-[9px] font-bold px-1.5 py-0.5 rounded backdrop-blur-sm">
          #{index + 1}
        </div>

        {variant.warnings?.length > 0 && (
          <div className="absolute top-1.5 right-1.5 bg-yellow-900/80 text-yellow-400 text-[9px] px-1.5 py-0.5 rounded"
            title={variant.warnings.join(', ')}>
            ⚠
          </div>
        )}

        {excluded && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="text-white text-[10px] font-bold bg-red-900/80 px-2 py-0.5 rounded">EXCLUDED</span>
          </div>
        )}
      </div>

      {/* Value pills */}
      <div className="p-2 flex flex-wrap gap-1 flex-1">
        {pills.map(({ slotLabel, valueLabel }, i) => (
          <span key={i} className="flex items-center gap-1 text-[9px] rounded-full px-2 py-0.5 bg-[#1a1a1a] border border-[#2a2a2a]">
            <span className="text-gray-600">{slotLabel}:</span>
            <span className="text-gray-300 font-medium">{valueLabel}</span>
          </span>
        ))}
      </div>

      {/* Exclude toggle */}
      <div className="px-2 pb-2">
        <button
          onClick={() => onToggleExclude(variant.id)}
          className={`w-full py-1 rounded-lg text-[10px] font-medium transition-colors border ${
            excluded
              ? 'bg-[#1a1a1a] hover:bg-indigo-900/30 text-gray-500 hover:text-indigo-400 border-[#2a2a2a]'
              : 'bg-[#1a1a1a] hover:bg-red-900/20 text-gray-500 hover:text-red-400 border-[#2a2a2a]'
          }`}
        >
          {excluded ? 'Include' : 'Exclude'}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main preview component
// ─────────────────────────────────────────────
export default function ABTestPreview({
  variants, slots, project,
  stageRef, bottomStageRef,
  onUpdateExcludes, excludedIds,
}) {
  const activeCount  = variants.filter((v) => !excludedIds.includes(v.id)).length;
  const warningCount = variants.filter((v) => v.warnings?.length > 0).length;

  const handleToggleExclude = (variantId) => {
    if (excludedIds.includes(variantId)) {
      onUpdateExcludes(excludedIds.filter((id) => id !== variantId));
    } else {
      onUpdateExcludes([...excludedIds, variantId]);
    }
  };

  if (variants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#161616] border border-[#2a2a2a] flex items-center justify-center mb-4">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="1.5">
            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
            <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
          </svg>
        </div>
        <p className="text-gray-500 text-sm font-medium mb-1">No variants generated</p>
        <p className="text-gray-600 text-xs max-w-xs">Go back to Step 2 and add at least 2 values to one or more slots.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="flex items-center gap-4 px-4 py-3 rounded-xl bg-[#111] border border-[#2a2a2a]">
        <div className="flex-1">
          <p className="text-lg font-bold text-white">{variants.length}</p>
          <p className="text-[10px] text-gray-500">Total variants</p>
        </div>
        <div className="flex-1">
          <p className="text-lg font-bold text-indigo-400">{activeCount}</p>
          <p className="text-[10px] text-gray-500">Will export</p>
        </div>
        {excludedIds.length > 0 && (
          <div className="flex-1">
            <p className="text-lg font-bold text-gray-500">{excludedIds.length}</p>
            <p className="text-[10px] text-gray-500">Excluded</p>
          </div>
        )}
        {warningCount > 0 && (
          <div className="flex-1">
            <p className="text-lg font-bold text-yellow-400">{warningCount}</p>
            <p className="text-[10px] text-gray-500">Warnings</p>
          </div>
        )}
        <div className="text-right text-[10px] text-gray-700 leading-relaxed">
          <p>Each thumbnail renders independently.</p>
          <p>Background &amp; 3D composited per variant.</p>
        </div>
      </div>

      {warningCount > 0 && (
        <div className="px-3 py-2 rounded-lg bg-yellow-900/20 border border-yellow-700/30 text-yellow-400 text-xs">
          {warningCount} variant{warningCount > 1 ? 's have' : ' has'} incomplete bindings — dependent slot values may be missing.
        </div>
      )}

      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
        {variants.map((variant, i) => (
          <VariantCard
            key={variant.id}
            variant={variant}
            index={i}
            slots={slots}
            project={project}
            stageRef={stageRef}
            bottomStageRef={bottomStageRef}
            excluded={excludedIds.includes(variant.id)}
            onToggleExclude={handleToggleExclude}
          />
        ))}
      </div>
    </div>
  );
}
