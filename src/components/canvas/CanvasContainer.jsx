'use client';

import { useEffect, useState } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { useAssetStore } from '@/store/assetStore';
import { useAspectRatio } from '@/hooks/useAspectRatio';
import ThreeLayer from './ThreeLayer';
import KonvaLayer from './KonvaLayer';

/**
 * Renders the background image as a plain CSS layer so it can be correctly
 * sandwiched between the background color and the Konva/Three.js layers.
 * Previously this lived inside the WebGL canvas, which forced it to always
 * render above every element in the bottom Konva stage regardless of layer order.
 */
function BackgroundImageLayer({ src, scale = 1, offsetX = 0, offsetY = 0, opacity = 1 }) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => { setLoaded(false); }, [src]);

  if (!src) return null;

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      {/* Preload trigger */}
      <img src={src} onLoad={() => setLoaded(true)} style={{ display: 'none' }} alt="" />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url(${src})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          opacity: loaded ? opacity : 0,
          // translate() percentages are relative to the element's own size which
          // equals the canvas size (inset:0), so offsetX=0.1 → shift right 10% of canvas.
          // scale() is applied first (CSS reads right-to-left), matching Three.js behavior
          // where position offset is in world units independent of the mesh scale.
          transform: `translate(${offsetX * 100}%, ${-offsetY * 100}%) scale(${scale})`,
          transformOrigin: 'center',
        }}
      />
    </div>
  );
}

export default function CanvasContainer({ stageRef, bottomStageRef }) {
  const { canvasConfig, model3d, elements, background } = useProjectStore();
  const { blobUrls } = useAssetStore();
  const { displayWidth, displayHeight, scale } = useAspectRatio(canvasConfig.aspectRatio);

  const model3dZIndex = model3d?.zIndex ?? -1;

  // Elements below the 3D model layer (rendered behind Three.js, read-only)
  const belowElements = elements.filter((el) => el.zIndex < model3dZIndex);
  // Elements at or above the 3D model layer (rendered on top, interactive)
  const aboveElements = elements.filter((el) => el.zIndex >= model3dZIndex);

  const bgImageSrc = background?.type === 'image'
    ? ((background.assetId ? blobUrls[background.assetId] : null) || background.src)
    : null;

  return (
    <div
      className="relative flex-shrink-0 shadow-2xl"
      style={{
        width: displayWidth,
        height: displayHeight,
        background: canvasConfig.backgroundColor,
        overflow: 'hidden',
      }}
    >
      {/* Background image — always at the very bottom, below all elements */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <BackgroundImageLayer
          src={bgImageSrc}
          scale={background?.scale ?? 1}
          offsetX={background?.offsetX ?? 0}
          offsetY={background?.offsetY ?? 0}
          opacity={background?.opacity ?? 1}
        />
      </div>

      {/* Bottom Konva layer — elements below the 3D model, no pointer events */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          pointerEvents: 'none',
        }}
      >
        <KonvaLayer
          stageRef={bottomStageRef}
          displayWidth={displayWidth}
          displayHeight={displayHeight}
          scale={scale}
          elements={belowElements}
          interactive={false}
        />
      </div>

      {/* Three.js layer — 3D model only (background image moved to CSS layer above) */}
      <div
        data-layer="three"
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 2,
        }}
      >
        <ThreeLayer displayWidth={displayWidth} displayHeight={displayHeight} scale={scale} />
      </div>

      {/* Top Konva layer — all elements for interaction.
          Elements above the 3D model are rendered normally.
          Elements below the 3D model are rendered with opacity=0 so they are
          invisible here (their visual lives in the bottom stage) but still
          hittable via Konva's hit canvas, enabling click and drag on them. */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 3,
        }}
      >
        <KonvaLayer
          stageRef={stageRef}
          displayWidth={displayWidth}
          displayHeight={displayHeight}
          scale={scale}
          elements={elements}
          hitOnlyIds={new Set(belowElements.map((el) => el.id))}
          interactive={true}
        />
      </div>
    </div>
  );
}
