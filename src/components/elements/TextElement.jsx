'use client';

import { useRef, useState, useEffect } from 'react';
import { Group, Shape, Rect } from 'react-konva';
import { getAnimationState } from '@/lib/animationUtils';
import { useProjectStore } from '@/store/projectStore';

export default function TextElement({
  element,
  scale,
  isSelected,
  onSelect,
  onDragMove,
  onDragEnd,
  onTransformEnd,
  onContextMenu,
}) {
  const { updateElement } = useProjectStore();
  const [editing, setEditing] = useState(false);
  const textareaRef = useRef();
  const nodeRef = useRef();

  const {
    id, x, y, width, height, rotation = 0,
    content = '',
    style = {},
    animation,
  } = element;

  const {
    fontFamily = 'sans-serif',
    fontSize = 24,
    color = '#ffffff',
    bold = false,
    align = 'left',
  } = style;

  const animState = getAnimationState(animation, 0);
  const scaledFontSize = fontSize * scale;

  // Show a native textarea overlay for editing
  const startEditing = (e) => {
    e.cancelBubble = true;
    setEditing(true);
  };

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [editing]);

  const finishEditing = () => {
    if (textareaRef.current) {
      updateElement(id, { content: textareaRef.current.value });
    }
    setEditing(false);
  };

  // Textarea position in page coordinates
  const stageEl = nodeRef.current?.getStage()?.container();
  const stageRect = stageEl?.getBoundingClientRect?.();
  const textareaStyle = editing && stageRect ? {
    position: 'fixed',
    top: stageRect.top + y * scale,
    left: stageRect.left + x * scale,
    width: width * scale,
    minHeight: height * scale,
    fontSize: scaledFontSize,
    fontFamily,
    fontWeight: bold ? 'bold' : 'normal',
    color,
    textAlign: align,
    background: 'rgba(0,0,0,0.85)',
    border: '2px solid #6366f1',
    borderRadius: 4,
    padding: '4px 6px',
    outline: 'none',
    resize: 'none',
    zIndex: 9999,
    transform: `rotate(${rotation}deg)`,
    transformOrigin: 'top left',
    lineHeight: 1.3,
    overflow: 'hidden',
  } : null;

  return (
    <>
      <Group>
        <Shape
          id={id}
          ref={nodeRef}
          x={x * scale}
          y={y * scale}
          width={width * scale}
          height={height * scale}
          rotation={rotation}
          draggable={!editing}
          onClick={onSelect}
          onTap={onSelect}
          onDblClick={startEditing}
          onDblTap={startEditing}
          onDragMove={onDragMove}
          onDragEnd={onDragEnd}
          onContextMenu={onContextMenu}
          onTransformEnd={(e) => onTransformEnd(e.target)}
          opacity={animState.opacity}
          sceneFunc={(ctx, shape) => {
            const w = width * scale;
            const h = height * scale;
            ctx.clearRect(0, 0, w, h);
            ctx.save();

            if (animState.scaleX !== 1 || animState.scaleY !== 1) {
              ctx.translate(w / 2, h / 2);
              ctx.scale(animState.scaleX, animState.scaleY);
              ctx.translate(-w / 2, -h / 2);
            }

            ctx.font = `${bold ? 'bold' : 'normal'} ${scaledFontSize}px "${fontFamily}"`;
            ctx.fillStyle = color;
            ctx.textBaseline = 'top';
            ctx.textAlign = align;

            const xPos = align === 'center' ? w / 2 : align === 'right' ? w : 0;
            const lines = content.split('\n');
            lines.forEach((line, i) => {
              ctx.fillText(line, xPos, i * scaledFontSize * 1.3);
            });

            ctx.restore();
            shape.fill('rgba(0,0,0,0)');
          }}
          hitFunc={(ctx, shape) => {
            ctx.beginPath();
            ctx.rect(0, 0, shape.width(), shape.height());
            ctx.closePath();
            ctx.fillStrokeShape(shape);
          }}
        />
      </Group>

      {/* Inline textarea overlay */}
      {editing && textareaStyle && (
        <textarea
          ref={textareaRef}
          defaultValue={content}
          style={textareaStyle}
          onBlur={finishEditing}
          onKeyDown={(e) => {
            if (e.key === 'Escape') { setEditing(false); }
            if (e.key === 'Enter' && !e.shiftKey) { finishEditing(); }
          }}
        />
      )}
    </>
  );
}
