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
  const { x, y, width, height, rotation = 0, assetId, src, animation, style } = element;
  const { getObjectUrl } = useAssetStore();
  const [img, setImg] = useState(null);
  const [displayImg, setDisplayImg] = useState(null);
  const animState = getAnimationState(animation, 0);
  const tintColor = style?.tintColor;

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

  // Re-apply tint whenever the source image or tint color changes
  useEffect(() => {
    if (!img) { setDisplayImg(null); return; }
    if (!tintColor) { setDisplayImg(img); return; }

    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    // Replace drawn pixels with tint color while preserving the alpha channel
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = tintColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const tinted = new window.Image();
    tinted.src = canvas.toDataURL();
    tinted.onload = () => setDisplayImg(tinted);
  }, [img, tintColor]);

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
      {displayImg && (
        <KonvaImage
          image={displayImg}
          width={width * scale}
          height={height * scale}
        />
      )}
    </Group>
  );
}
