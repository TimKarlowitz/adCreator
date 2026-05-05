'use client';

import { useRef, useState, useEffect } from 'react';
import { Group, Rect, Shape } from 'react-konva';
import { getAnimationState } from '@/lib/animationUtils';
import { drawTextContent } from '@/lib/richTextUtils';
import { useProjectStore } from '@/store/projectStore';

export default function TextBoxElement({
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
    x, y, width, height, rotation = 0,
    content = '',
    richContent,
    style = {},
    animation,
  } = element;

  const {
    fontFamily = 'Geist',
    fontSize = 20,
    color = '#ffffff',
    bold = false,
    align = 'left',
    borderColor = '#ffffff',
    borderWidth = 2,
    padding = 12,
    background = 'rgba(0,0,0,0.4)',
    borderRadius = 4,
  } = style;

  const animState = getAnimationState(animation, 0);
  const scaledFontSize = fontSize * scale;
  const w = width * scale;
  const h = height * scale;
  const pad = padding * scale;

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [editing]);

  const finishEditing = () => {
    if (textareaRef.current) {
      updateElement(element.id, { content: textareaRef.current.value });
    }
    setEditing(false);
  };

  const stageEl = nodeRef.current?.getStage?.()?.container();
  const stageRect = stageEl?.getBoundingClientRect?.();
  const textareaStyle = editing && stageRect ? {
    position: 'fixed',
    top: stageRect.top + y * scale + pad,
    left: stageRect.left + x * scale + pad,
    width: w - pad * 2,
    minHeight: h - pad * 2,
    fontSize: scaledFontSize,
    fontFamily,
    fontWeight: bold ? 'bold' : 'normal',
    color,
    textAlign: align,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    resize: 'none',
    zIndex: 9999,
    lineHeight: 1.35,
  } : null;

  return (
    <>
    <Group
      id={element.id}
      ref={nodeRef}
      x={x * scale}
      y={y * scale}
      width={w}
      height={h}
      rotation={rotation}
      draggable={!editing}
      onClick={onSelect}
      onTap={onSelect}
      onDblClick={() => setEditing(true)}
      onDblTap={() => setEditing(true)}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
      onContextMenu={onContextMenu}
      onTransformEnd={(e) => onTransformEnd(e.target)}
      opacity={animState.opacity}
      scaleX={animState.scaleX}
      scaleY={animState.scaleY}
    >
      {/* Background box */}
      <Rect
        width={w}
        height={h}
        fill={background}
        stroke={borderColor}
        strokeWidth={borderWidth * scale}
        cornerRadius={borderRadius * scale}
      />
      {/* Text content */}
      <Shape
        width={w}
        height={h}
        sceneFunc={(ctx) => {
          drawTextContent(
            ctx,
            { content, richContent },
            { fontFamily, fontSize: scaledFontSize, color, bold, align },
            w,
            pad,
            pad,
          );
        }}
        hitFunc={(ctx, shape) => {
          ctx.beginPath();
          ctx.rect(0, 0, w, h);
          ctx.closePath();
          ctx.fillStrokeShape(shape);
        }}
      />
    </Group>

    {editing && textareaStyle && (
      <textarea
        ref={textareaRef}
        defaultValue={content}
        style={textareaStyle}
        onBlur={finishEditing}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setEditing(false);
        }}
      />
    )}
    </>
  );
}
