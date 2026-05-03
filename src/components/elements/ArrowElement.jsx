'use client';

import { Group, Arrow, Shape } from 'react-konva';
import { getAnimationState } from '@/lib/animationUtils';

const ARROW_VARIANTS = {
  'arrow-right': { points: (w, h) => [0, h / 2, w, h / 2] },
  'arrow-left': { points: (w, h) => [w, h / 2, 0, h / 2] },
  'arrow-double': { points: (w, h) => [w * 0.1, h / 2, w * 0.9, h / 2], pointerAtBeginning: true },
  'arrow-curved': null, // handled specially
};

export default function ArrowElement({
  element,
  scale,
  isSelected,
  onSelect,
  onDragMove,
  onDragEnd,
  onTransformEnd,
  onContextMenu,
}) {
  const {
    x, y, width, height, rotation = 0,
    variant = 'arrow-right',
    style = {},
    animation,
  } = element;

  const {
    color = '#ffffff',
    strokeWidth = 3,
  } = style;

  const animState = getAnimationState(animation, 0);
  const w = width * scale;
  const h = height * scale;

  const variantDef = ARROW_VARIANTS[variant] || ARROW_VARIANTS['arrow-right'];
  const points = variantDef.points(w, h);
  const pointerAtBeginning = variant === 'arrow-double';

  const isCurved = variant === 'arrow-curved';

  return (
    <Group
      id={element.id}
      x={x * scale}
      y={y * scale}
      width={w}
      height={h}
      rotation={rotation}
      draggable
      onClick={onSelect}
      onTap={onSelect}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
      onContextMenu={onContextMenu}
      onTransformEnd={(e) => onTransformEnd(e.target)}
      opacity={animState.opacity}
    >
      {isCurved ? (
        <Shape
          width={w}
          height={h}
          sceneFunc={(ctx, shape) => {
            ctx.save();
            ctx.strokeStyle = color;
            ctx.lineWidth = strokeWidth * scale;
            ctx.beginPath();
            ctx.moveTo(0, h / 2);
            ctx.quadraticCurveTo(w / 2, 0, w, h / 2);
            ctx.stroke();
            // Arrowhead
            const angle = Math.atan2(h / 2 - 0, w - w / 2);
            const aSize = 10 * scale;
            ctx.beginPath();
            ctx.moveTo(w, h / 2);
            ctx.lineTo(w - aSize * Math.cos(angle - 0.4), h / 2 - aSize * Math.sin(angle - 0.4));
            ctx.lineTo(w - aSize * Math.cos(angle + 0.4), h / 2 - aSize * Math.sin(angle + 0.4));
            ctx.closePath();
            ctx.fillStyle = color;
            ctx.fill();
            ctx.restore();
          }}
          hitFunc={(ctx, shape) => {
            ctx.beginPath();
            ctx.rect(0, 0, w, h);
            ctx.closePath();
            ctx.fillStrokeShape(shape);
          }}
        />
      ) : (
        <Arrow
          points={points}
          stroke={color}
          strokeWidth={strokeWidth * scale}
          fill={color}
          pointerAtBeginning={pointerAtBeginning}
          pointerLength={10 * scale}
          pointerWidth={8 * scale}
        />
      )}
    </Group>
  );
}
