'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { Group, Shape } from 'react-konva';
import { getAnimationState } from '@/lib/animationUtils';
import { drawTextContent } from '@/lib/richTextUtils';
import { richContentToHtml, parseEditorToRichContent, ColorPicker } from '@/components/elements/RichTextEditor';
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
  const savedRangeRef = useRef(null);

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
      const initHtml = richContent?.length
        ? richContentToHtml(richContent)
        : (content || '');
      editorRef.current.innerHTML = initHtml;
      editorRef.current.focus();
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

  // ── Toolbar state ────────────────────────────────────────────────────────

  const [activeBold, setActiveBold] = useState(false);
  const [activeItalic, setActiveItalic] = useState(false);
  const [activeColor, setActiveColor] = useState(color);

  // Save selection whenever it changes while editing
  const handleSelectionChange = useCallback(() => {
    if (!editing) return;
    const sel = window.getSelection();
    if (!sel || !editorRef.current?.contains(sel.anchorNode)) return;
    if (!sel.isCollapsed) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    }
    const el = sel.anchorNode?.parentElement;
    if (el) {
      const cs = window.getComputedStyle(el);
      setActiveBold(cs.fontWeight === '700' || cs.fontWeight === 'bold');
      setActiveItalic(cs.fontStyle === 'italic');
    }
  }, [editing]);

  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [handleSelectionChange]);

  // ── Format application ────────────────────────────────────────────────────

  const restoreSelection = useCallback(() => {
    editorRef.current?.focus();
    if (savedRangeRef.current) {
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(savedRangeRef.current);
    }
  }, []);

  const applyFormat = useCallback((fn) => {
    restoreSelection();
    document.execCommand('styleWithCSS', false, true);
    fn();
    // Re-save range after command (browser may adjust it)
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) savedRangeRef.current = sel.getRangeAt(0).cloneRange();
  }, [restoreSelection]);

  const applyColor = useCallback((c) => {
    applyFormat(() => {
      document.execCommand('foreColor', false, c);
      setActiveColor(c);
    });
  }, [applyFormat]);

  // ── Canvas rendering ────────────────────────────────────────────────────

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
        background: 'rgba(0,0,0,0.88)',
        border: '2px solid #6366f1',
        borderRadius: 4,
        padding: '4px 6px',
        outline: 'none',
        zIndex: 9999,
        transform: `rotate(${rotation}deg)`,
        transformOrigin: 'top left',
        overflow: 'visible',
      }
    : null;

  const toolbarStyle = editing && stageRect
    ? {
        position: 'fixed',
        top: stageRect.top + y * scale - 46,
        left: stageRect.left + x * scale,
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        background: '#222',
        border: '1px solid #444',
        borderRadius: 8,
        padding: '4px 8px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
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
              w, 0, 0,
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

      {editing && overlayStyle && (
        <>
          {/* Mini toolbar above the overlay */}
          <div
            ref={toolbarRef}
            style={toolbarStyle}
            onMouseDown={(e) => {
              savedRangeRef.current = (() => {
                const sel = window.getSelection();
                return sel && sel.rangeCount > 0 ? sel.getRangeAt(0).cloneRange() : savedRangeRef.current;
              })();
              e.preventDefault();
            }}
          >
            <InlineBtn
              active={activeBold}
              title="Bold"
              onClick={() => applyFormat(() => { document.execCommand('bold', false); setActiveBold((v) => !v); })}
            >
              <span style={{ fontWeight: 'bold', fontSize: 13 }}>B</span>
            </InlineBtn>
            <InlineBtn
              active={activeItalic}
              title="Italic"
              onClick={() => applyFormat(() => { document.execCommand('italic', false); setActiveItalic((v) => !v); })}
            >
              <span style={{ fontStyle: 'italic', fontSize: 13 }}>I</span>
            </InlineBtn>
            <div style={{ width: 1, height: 16, background: '#444', margin: '0 2px' }} />
            <ColorPicker value={activeColor} onChange={applyColor} />
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={finishEditing}
              style={{
                marginLeft: 4, padding: '2px 8px', fontSize: 11, borderRadius: 4,
                background: '#6366f1', color: '#fff', border: 'none', cursor: 'pointer',
              }}
            >
              Done
            </button>
          </div>

          {/* Contenteditable overlay */}
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            spellCheck={false}
            style={overlayStyle}
            onBlur={(e) => {
              if (toolbarRef.current?.contains(e.relatedTarget)) return;
              finishEditing();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setEditing(false);
            }}
          />
        </>
      )}
    </>
  );
}

function InlineBtn({ active, onClick, title, children }) {
  return (
    <button
      onMouseDown={(e) => e.preventDefault()}
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
