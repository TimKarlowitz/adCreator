'use client';

import { useRef, useEffect } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { useAspectRatio } from '@/hooks/useAspectRatio';
import ThreeLayer from './ThreeLayer';
import KonvaLayer from './KonvaLayer';

export default function CanvasContainer({ stageRef }) {
  const { canvasConfig } = useProjectStore();
  const { displayWidth, displayHeight, scale } = useAspectRatio(canvasConfig.aspectRatio);

  return (
    <div
      className="relative flex-shrink-0 shadow-2xl"
      style={{
        width: displayWidth,
        height: displayHeight,
        background: canvasConfig.backgroundColor,
      }}
    >
      {/* Three.js layer — sits behind, no pointer events */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      >
        <ThreeLayer displayWidth={displayWidth} displayHeight={displayHeight} scale={scale} />
      </div>

      {/* Konva layer — on top, handles all interactions */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
        }}
      >
        <KonvaLayer
          stageRef={stageRef}
          displayWidth={displayWidth}
          displayHeight={displayHeight}
          scale={scale}
        />
      </div>
    </div>
  );
}
