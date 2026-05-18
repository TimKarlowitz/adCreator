'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { applyVariantToProject, variantLabel } from '@/lib/abTestEngine';
import { useProjectStore } from '@/store/projectStore';
import { useAssetStore } from '@/store/assetStore';

/**
 * Composite all three canvas layers into a single thumbnail data-URL.
 * Mirrors the compositeFrame logic used in ABTestExport, but produces a
 * small JPEG instead of a full-resolution PNG frame.
 *
 *   1. canvasConfig.backgroundColor (solid fill)
 *   2. bottomKonvaStage (elements below 3D model)
 *   3. Three.js canvas (background image + 3D model)
 *   4. topKonvaStage (elements above 3D model)
 */
async function compositeThumb({ topKonvaStage, bottomKonvaStage, threeCanvas, backgroundColor }) {
  if (!topKonvaStage) return null;

  const stageW = topKonvaStage.width();
  const stageH = topKonvaStage.height();

  const offscreen = document.createElement('canvas');
  offscreen.width = stageW;
  offscreen.height = stageH;
  const ctx = offscreen.getContext('2d');

  // 1. Solid background fill
  ctx.fillStyle = backgroundColor || '#000000';
  ctx.fillRect(0, 0, stageW, stageH);

  // 2. Bottom Konva layer
  if (bottomKonvaStage) {
    try {
      const c = bottomKonvaStage.toCanvas({ pixelRatio: 1 });
      ctx.drawImage(c, 0, 0, stageW, stageH);
    } catch {}
  }

  // 3. Three.js layer — background image + 3D model
  if (threeCanvas) {
    try {
      ctx.drawImage(threeCanvas, 0, 0, stageW, stageH);
    } catch {}
  }

  // 4. Top Konva layer
  try {
    const c = topKonvaStage.toCanvas({ pixelRatio: 1 });
    ctx.drawImage(c, 0, 0, stageW, stageH);
  } catch {}

  return offscreen.toDataURL('image/jpeg', 0.72);
}

/**
 * Renders a single variant card: slot label pills + lazy thumbnail.
 */
function VariantCard({
  variant, index, slots, project,
  stageRef, bottomStageRef, threeCanvasRef,
  excluded, onToggleExclude,
}) {
  const [thumb, setThumb] = useState(null);
  const [thumbState, setThumbState] = useState('idle'); // idle | loading | done | error
  const cardRef = useRef();
  const { getObjectUrl } = useAssetStore();

  // Lazy-render thumbnail using IntersectionObserver
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
      { rootMargin: '120px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thumbState]);

  const renderThumb = useCallback(async () => {
    if (!stageRef?.current) return;
    setThumbState('loading');

    // Save original store state
    const saved = {
      model3d:      useProjectStore.getState().model3d,
      background:   useProjectStore.getState().background,
      canvasConfig: useProjectStore.getState().canvasConfig,
      elements:     useProjectStore.getState().elements,
    };

    try {
      const patchedProject = applyVariantToProject(project, variant, slots);

      // Resolve stale / missing blob URLs the same way ThreeLayer does
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

      // Apply variant — triggers Three.js + Konva to re-render
      useProjectStore.setState({
        model3d:      patchedProject.model3d,
        background:   patchedProject.background,
        canvasConfig: patchedProject.canvasConfig,
        elements:     patchedProject.elements,
      });

      // Give Three.js enough time to:
      //   - pick up the new background src via TextureLoader
      //   - decode and upload the image texture
      //   - render a new WebGL frame
      // A 3D model GLB swap may still be loading at this point (large files),
      // but 450 ms is a good balance between preview quality and responsiveness.
      await new Promise((r) => setTimeout(r, 450));

      // Resolve Three.js canvas from the wrapper ref
      const threeCanvas = threeCanvasRef?.current?.querySelector('[data-layer="three"] canvas') ?? null;

      const dataUrl = await compositeThumb({
        topKonvaStage:    stageRef.current,
        bottomKonvaStage: bottomStageRef?.current ?? null,
        threeCanvas,
        backgroundColor:  patchedProject.canvasConfig?.backgroundColor,
      });

      setThumb(dataUrl);
      setThumbState('done');
    } catch (err) {
      console.error('Thumb render failed:', err);
      setThumbState('error');
    } finally {
      // Always restore original state
      try { useProjectStore.setState(saved); } catch {}
    }
  }, [stageRef, bottomStageRef, threeCanvasRef, variant, slots, project, getObjectUrl]);

  // Slot value pills
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
      <div className="relative bg-[#0a0a0a] aspect-square">
        {thumbState === 'done' && thumb ? (
          <img src={thumb} alt={`Variant ${index + 1}`} className="w-full h-full object-cover" />
        ) : thumbState === 'loading' ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1.5">
            <span className="w-4 h-4 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
            <span className="text-[9px] text-gray-700">rendering…</span>
          </div>
        ) : thumbState === 'error' ? (
          <div className="w-full h-full flex items-center justify-center text-red-500/60 text-[10px]">
            render error
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-800 text-[10px]">
            pending
          </div>
        )}

        {/* Variant number badge */}
        <div className="absolute top-1.5 left-1.5 bg-black/70 text-white text-[9px] font-bold px-1.5 py-0.5 rounded backdrop-blur-sm">
          #{index + 1}
        </div>

        {/* Warning badge */}
        {variant.warnings?.length > 0 && (
          <div
            className="absolute top-1.5 right-1.5 bg-yellow-900/80 text-yellow-400 text-[9px] px-1.5 py-0.5 rounded"
            title={variant.warnings.join(', ')}
          >
            ⚠
          </div>
        )}

        {/* Exclude overlay */}
        {excluded && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="text-white text-[10px] font-bold bg-red-900/80 px-2 py-0.5 rounded">EXCLUDED</span>
          </div>
        )}
      </div>

      {/* Slot value pills */}
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
          className={`w-full py-1 rounded-lg text-[10px] font-medium transition-colors ${
            excluded
              ? 'bg-[#1a1a1a] hover:bg-indigo-900/30 text-gray-500 hover:text-indigo-400 border border-[#2a2a2a]'
              : 'bg-[#1a1a1a] hover:bg-red-900/20 text-gray-500 hover:text-red-400 border border-[#2a2a2a]'
          }`}
        >
          {excluded ? 'Include' : 'Exclude'}
        </button>
      </div>
    </div>
  );
}

export default function ABTestPreview({
  variants, slots, project,
  stageRef, bottomStageRef, threeCanvasRef,
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
          <p>Thumbnails lazy-render as you scroll.</p>
          <p>Background &amp; 3D are composited.</p>
        </div>
      </div>

      {warningCount > 0 && (
        <div className="px-3 py-2 rounded-lg bg-yellow-900/20 border border-yellow-700/30 text-yellow-400 text-xs">
          {warningCount} variant{warningCount > 1 ? 's have' : ' has'} incomplete bindings — the dependent slot value may be missing.
        </div>
      )}

      {/* Variant grid */}
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
            threeCanvasRef={threeCanvasRef}
            excluded={excludedIds.includes(variant.id)}
            onToggleExclude={handleToggleExclude}
          />
        ))}
      </div>
    </div>
  );
}
