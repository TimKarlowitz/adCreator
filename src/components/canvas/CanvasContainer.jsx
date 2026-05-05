'use client';

import { useRef } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { useAspectRatio } from '@/hooks/useAspectRatio';
import ThreeLayer from './ThreeLayer';
import KonvaLayer from './KonvaLayer';

export default function CanvasContainer({ stageRef, bottomStageRef }) {
  const { canvasConfig, model3d, elements } = useProjectStore();
  const { displayWidth, displayHeight, scale } = useAspectRatio(canvasConfig.aspectRatio);

  const model3dZIndex = model3d?.zIndex ?? -1;

  // Elements below the 3D model layer (rendered behind Three.js, read-only)
  const belowElements = elements.filter((el) => el.zIndex < model3dZIndex);
  // Elements at or above the 3D model layer (rendered on top, interactive)
  const aboveElements = elements.filter((el) => el.zIndex >= model3dZIndex);

  return (
    <div
      className="relative flex-shrink-0 shadow-2xl"
      style={{
        width: displayWidth,
        height: displayHeight,
        background: canvasConfig.backgroundColor,
      }}
    >
      {/* Bottom Konva layer — elements below the 3D model, no pointer events */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
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

      {/* Three.js layer — 3D model and background image, no pointer events */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 1,
        }}
      >
        <ThreeLayer displayWidth={displayWidth} displayHeight={displayHeight} scale={scale} />
      </div>

      {/* Top Konva layer — elements above the 3D model, handles all interactions */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 2,
        }}
      >
        <KonvaLayer
          stageRef={stageRef}
          displayWidth={displayWidth}
          displayHeight={displayHeight}
          scale={scale}
          elements={aboveElements}
          interactive={true}
        />
      </div>
    </div>
  );
}
