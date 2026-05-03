'use client';

import { useEffect, useRef, useState } from 'react';
import { Image as KonvaImage, Group } from 'react-konva';
import { getAnimationState } from '@/lib/animationUtils';
import { useAssetStore } from '@/store/assetStore';

export default function ImageElement({
  element,
  scale,
  isSelected,
  onSelect,
  onDragMove,
  onDragEnd,
  onTransformEnd,
  onContextMenu,
}) {
  const { x, y, width, height, rotation = 0, assetId, src, animation } = element;
  const { getObjectUrl } = useAssetStore();
  const [img, setImg] = useState(null);
  const animState = getAnimationState(animation, 0);

  useEffect(() => {
    let mounted = true;
    async function loadImage() {
      const url = src || (assetId ? await getObjectUrl(assetId) : null);
      if (!url || !mounted) return;
      const image = new window.Image();
      image.crossOrigin = 'anonymous';
      image.src = url;
      image.onload = () => { if (mounted) setImg(image); };
    }
    loadImage();
    return () => { mounted = false; };
  }, [src, assetId, getObjectUrl]);

  return (
    <Group
      id={element.id}
      x={x * scale}
      y={y * scale}
      width={width * scale}
      height={height * scale}
      rotation={rotation}
      draggable
      onClick={onSelect}
      onTap={onSelect}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
      onContextMenu={onContextMenu}
      onTransformEnd={(e) => onTransformEnd(e.target)}
      opacity={animState.opacity}
      scaleX={animState.scaleX}
      scaleY={animState.scaleY}
    >
      {img && (
        <KonvaImage
          image={img}
          width={width * scale}
          height={height * scale}
        />
      )}
    </Group>
  );
}
