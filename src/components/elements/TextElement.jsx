'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { Group, Shape, Rect } from 'react-konva';
import { getAnimationState } from '@/lib/animationUtils';
import { drawTextContent } from '@/lib/richTextUtils';
import { richContentToHtml, parseEditorToRichContent } from '@/components/elements/RichTextEditor';
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
  const editorRef = useRef(null);
  const nodeRef = useRef(null);
  const toolbarRef = useRef(null);

  const {
    id, x, y, width, height, rotation = 0,
    content = '',
    richContent,
    style = {},
    animation,
  } = element;

  const {
    fontFamily = 'Geist',
    fontSize = 24,
    color = '#ffffff',
    bold = false,
    align = 'left',
  } = style;

  const animState = getAnimationState(animation, 0);
  const scaledFontSize = fontSize * scale;

  // ── Inline editing ──────────────────────────────────────────────────────

  const startEditing = (e) => {
    e.cancelBubble = true;
    setEditing(true);
  };

  useEffect(() => {
    if (editing && editorRef.current) {
      // Populate with rich content if present, otherwise fall back to plain text
      const initHtml = richContent?.length
        ? richContentToHtml(richContent)
        : (content || '');
      editorRef.current.innerHTML = initHtml;
      editorRef.current.focus();
      // Move cursor to end
      const range = document.createRange();
      range.selectNodeContents(editorRef.current);
      range.collapse(false);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }, [editing]); // eslint-disable-line react-hooks/exhaustive-deps

  const finishEditing = useCallback(() => {
    if (editorRef.current) {
      const segs = parseEditorToRichContent(editorRef.current);
      const plain = segs.map((s) => s.text).join('');
      updateElement(id, { richContent: segs, content: plain });
    }
    setEditing(false);
  }, [id, updateElement]);

  // ── Toolbar state for inline editing ────────────────────────────────────

  const [activeBold, setActiveBold] = useState(false);
  const [activeItalic, setActiveItalic] = useState(false);
  const [activeColor, setActiveColor] = useState(color);

  const updateToolbarState = useCallback(() => {
    if (!editing) return;
    const sel = window.getSelection();
    if (!sel || !editorRef.current?.contains(sel.anchorNode)) return;
    const el = sel.anchorNode?.parentElement;
    if (el) {
      const cs = window.getComputedStyle(el);
      setActiveBold(cs.fontWeight === '700' || cs.fontWeight === 'bold');
      setActiveItalic(cs.fontStyle === 'italic');
    }
  }, [editing]);

  useEffect(() => {
    document.addEventListener('selectionchange', updateToolbarState);
    return () => document.removeEventListener('selectionchange', updateToolbarState);
  }, [updateToolbarState]);

  const applyFormat = (fn) => {
    document.execCommand('styleWithCSS', false, true);
    fn();
    editorRef.current?.focus();
  };

  const applyColor = (c) => {
    applyFormat(() => {
      document.execCommand('foreColor', false, c);
      setActiveColor(c);
    });
  };

  // ── Canvas rendering ────────────────────────────────────────────────────

  // Position of the stage container for inline overlay placement
  const stageEl = nodeRef.current?.getStage?.()?.container();
  const stageRect = stageEl?.getBoundingClientRect?.();

  const overlayStyle = editing && stageRect
    ? {
        position: 'fixed',
        top: stageRect.top + y * scale,
        left: stageRect.left + x * scale,
        width: width * scale,
        minHeight: height * scale,
        fontFamily,
        fontSize: scaledFontSize,
        fontWeight: bold ? 'bold' : 'normal',
        color,
        textAlign: align,
        lineHeight: 1.3,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        background: 'rgba(0,0,0,0.85)',
        border: '2px solid #6366f1',
        borderRadius: 4,
        padding: '4px 6px',
        outline: 'none',
        zIndex: 9999,
        transform: `rotate(${rotation}deg)`,
        transformOrigin: 'top left',
        overflow: 'hidden',
      }
    : null;

  const toolbarStyle = editing && stageRect
    ? {
        position: 'fixed',
        top: stageRect.top + y * scale - 44,
        left: stageRect.left + x * scale,
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        background: '#222',
        border: '1px solid #444',
        borderRadius: 8,
        padding: '4px 8px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
      }
    : null;

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

            drawTextContent(
              ctx,
              { content, richContent },
              { fontFamily, fontSize: scaledFontSize, color, bold, align },
              w,
              0,
              0,
            );

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

      {/* Inline rich-text overlay */}
      {editing && overlayStyle && (
        <>
          {/* Mini toolbar */}
          <div ref={toolbarRef} style={toolbarStyle} onMouseDown={(e) => e.preventDefault()}>
            <InlineToolBtn
              active={activeBold}
              title="Bold"
              onClick={() => applyFormat(() => { document.execCommand('bold', false); setActiveBold((v) => !v); })}
            >
              <span className="font-bold text-sm leading-none">B</span>
            </InlineToolBtn>
            <InlineToolBtn
              active={activeItalic}
              title="Italic"
              onClick={() => applyFormat(() => { document.execCommand('italic', false); setActiveItalic((v) => !v); })}
            >
              <span className="italic text-sm leading-none">I</span>
            </InlineToolBtn>
            <div style={{ width: 1, height: 16, background: '#444', margin: '0 2px' }} />
            <label
              title="Color"
              style={{
                width: 24, height: 24, borderRadius: 4, overflow: 'hidden',
                cursor: 'pointer', border: '1px solid #555',
                background: activeColor.startsWith('#') ? activeColor : '#fff',
                flexShrink: 0,
              }}
            >
              <input
                type="color"
                value={activeColor.startsWith('#') ? activeColor : '#ffffff'}
                onChange={(e) => applyColor(e.target.value)}
                style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }}
              />
            </label>
            <button
              onClick={finishEditing}
              style={{
                marginLeft: 4, padding: '2px 8px', fontSize: 11, borderRadius: 4,
                background: '#6366f1', color: '#fff', border: 'none', cursor: 'pointer',
              }}
            >
              Done
            </button>
          </div>

          {/* Contenteditable area */}
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            spellCheck={false}
            style={overlayStyle}
            onBlur={(e) => {
              // Don't finish if clicking the toolbar
              if (toolbarRef.current?.contains(e.relatedTarget)) return;
              finishEditing();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') { setEditing(false); }
            }}
          />
        </>
      )}
    </>
  );
}

function InlineToolBtn({ active, onClick, title, children }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 4, border: 'none', cursor: 'pointer',
        background: active ? '#6366f1' : 'transparent',
        color: active ? '#fff' : '#ccc',
      }}
    >
      {children}
    </button>
  );
}
