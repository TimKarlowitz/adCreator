'use client';
import { useRef, useState, useEffect, useCallback } from 'react';

// ── Serialisation helpers ─────────────────────────────────────────────────────

function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Convert a richContent segment array → HTML string for a contenteditable */
export function richContentToHtml(richContent) {
  if (!richContent?.length) return '';
  return richContent
    .map((seg) => {
      const styles = [];
      if (seg.color) styles.push(`color:${seg.color}`);
      if (seg.bold === true) styles.push('font-weight:bold');
      if (seg.bold === false) styles.push('font-weight:normal');
      if (seg.italic) styles.push('font-style:italic');
      const attr = styles.length ? ` style="${styles.join(';')}"` : '';
      const html = seg.text.split('\n').map(escHtml).join('<br>');
      return `<span${attr}>${html}</span>`;
    })
    .join('');
}

/** Walk the contenteditable DOM → richContent segment array */
export function parseEditorToRichContent(rootEl) {
  const segs = [];

  function getStyles(node) {
    const r = {};
    let el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
    while (el && el !== rootEl) {
      if (el.style) {
        if (!('color' in r) && el.style.color) r.color = el.style.color;
        if (!('bold' in r) && el.style.fontWeight) {
          r.bold = el.style.fontWeight === 'bold' || el.style.fontWeight === '700';
        }
        if (!('italic' in r) && el.style.fontStyle) {
          r.italic = el.style.fontStyle === 'italic';
        }
      }
      if (!('bold' in r) && (el.tagName === 'B' || el.tagName === 'STRONG')) r.bold = true;
      if (!('italic' in r) && (el.tagName === 'I' || el.tagName === 'EM')) r.italic = true;
      el = el.parentElement;
    }
    return r;
  }

  function sameStyles(a, b) {
    return a.color === b.color && !!a.bold === !!b.bold && !!a.italic === !!b.italic;
  }

  function push(text, styles) {
    if (!text) return;
    if (segs.length && sameStyles(segs[segs.length - 1], styles)) {
      segs[segs.length - 1].text += text;
    } else {
      const seg = { text };
      if (styles.color) seg.color = styles.color;
      if (styles.bold) seg.bold = true;
      if (styles.italic) seg.italic = true;
      segs.push(seg);
    }
  }

  let newlineNext = false;

  function walk(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent;
      if (!text) return;
      const styles = getStyles(node);
      const fullText = newlineNext ? '\n' + text : text;
      newlineNext = false;
      push(fullText, styles);
    } else if (node.nodeName === 'BR') {
      if (segs.length) {
        segs[segs.length - 1].text += '\n';
      } else {
        segs.push({ text: '\n' });
      }
      newlineNext = false;
    } else if ((node.nodeName === 'DIV' || node.nodeName === 'P') && node !== rootEl) {
      if (segs.length > 0) newlineNext = true;
      node.childNodes.forEach(walk);
    } else {
      node.childNodes.forEach(walk);
    }
  }

  rootEl.childNodes.forEach(walk);
  return segs.filter((s) => s.text.length > 0);
}

function rgbToHex(rgb) {
  const m = rgb.match(/\d+/g);
  if (!m || m.length < 3) return '#ffffff';
  return '#' + m.slice(0, 3).map((n) => parseInt(n).toString(16).padStart(2, '0')).join('');
}

function normaliseColor(c) {
  if (!c) return '#ffffff';
  if (c.startsWith('rgb')) return rgbToHex(c);
  return c;
}

// ── Component ────────────────────────────────────────────────────────────────

/**
 * RichTextEditor
 *
 * Props:
 *   richContent   – Segment[]  current value
 *   defaultStyle  – { fontFamily, fontSize, color, bold, align }
 *   onChange      – (Segment[]) => void
 *   placeholder   – string
 */
export default function RichTextEditor({
  richContent,
  defaultStyle = {},
  onChange,
  placeholder = 'Type here…',
}) {
  const editorRef = useRef(null);
  const ignoreInputRef = useRef(false);

  const [showToolbar, setShowToolbar] = useState(false);
  const [toolbarPos, setToolbarPos] = useState({ top: 0, left: 0 });
  const [activeBold, setActiveBold] = useState(false);
  const [activeItalic, setActiveItalic] = useState(false);
  const [activeColor, setActiveColor] = useState(defaultStyle.color || '#ffffff');

  // Initialise HTML once on mount
  useEffect(() => {
    if (!editorRef.current) return;
    ignoreInputRef.current = true;
    editorRef.current.innerHTML = richContentToHtml(richContent) || '';
    ignoreInputRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep in sync when richContent changes externally (e.g. undo/redo)
  // but only if editor is not focused to avoid cursor jumps
  const lastExternal = useRef(JSON.stringify(richContent));
  useEffect(() => {
    const next = JSON.stringify(richContent);
    if (next === lastExternal.current) return;
    lastExternal.current = next;
    if (document.activeElement === editorRef.current) return;
    if (!editorRef.current) return;
    ignoreInputRef.current = true;
    editorRef.current.innerHTML = richContentToHtml(richContent) || '';
    ignoreInputRef.current = false;
  }, [richContent]);

  const emitChange = useCallback(() => {
    if (!editorRef.current || ignoreInputRef.current) return;
    const segs = parseEditorToRichContent(editorRef.current);
    const json = JSON.stringify(segs);
    if (json !== lastExternal.current) {
      lastExternal.current = json;
      onChange(segs);
    }
  }, [onChange]);

  // ── Selection-based toolbar ──────────────────────────────────────────────

  const updateToolbar = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !editorRef.current?.contains(sel.anchorNode)) {
      setShowToolbar(false);
      return;
    }

    const range = sel.getRangeAt(0);
    const rRect = range.getBoundingClientRect();
    const eRect = editorRef.current.getBoundingClientRect();
    setToolbarPos({
      top: rRect.top - eRect.top - 42,
      left: Math.max(0, (rRect.left + rRect.right) / 2 - eRect.left - 56),
    });
    setShowToolbar(true);

    // Detect active styles from anchor node
    const el = sel.anchorNode?.parentElement;
    if (el) {
      const cs = window.getComputedStyle(el);
      setActiveBold(cs.fontWeight === '700' || cs.fontWeight === 'bold');
      setActiveItalic(cs.fontStyle === 'italic');
      const c = el.style?.color || defaultStyle.color || '#ffffff';
      setActiveColor(normaliseColor(c));
    }
  }, [defaultStyle.color]);

  useEffect(() => {
    document.addEventListener('selectionchange', updateToolbar);
    return () => document.removeEventListener('selectionchange', updateToolbar);
  }, [updateToolbar]);

  // ── Formatting commands ──────────────────────────────────────────────────

  const applyFormat = useCallback((fn) => {
    // styleWithCSS makes execCommand produce <span style="..."> instead of <b>/<font>
    document.execCommand('styleWithCSS', false, true);
    fn();
    emitChange();
    editorRef.current?.focus();
  }, [emitChange]);

  const toggleBold = () =>
    applyFormat(() => {
      document.execCommand('bold', false);
      setActiveBold((v) => !v);
    });

  const toggleItalic = () =>
    applyFormat(() => {
      document.execCommand('italic', false);
      setActiveItalic((v) => !v);
    });

  const applyColor = (color) =>
    applyFormat(() => {
      document.execCommand('foreColor', false, color);
      setActiveColor(color);
    });

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="relative">
      {/* Floating mini-toolbar (shown when text is selected) */}
      {showToolbar && (
        <div
          className="absolute z-50 flex items-center gap-1 bg-[#222] border border-[#444] rounded-lg px-2 py-1 shadow-xl pointer-events-auto"
          style={{ top: toolbarPos.top, left: toolbarPos.left }}
          onMouseDown={(e) => e.preventDefault()} // keep selection alive
        >
          <ToolBtn active={activeBold} onClick={toggleBold} title="Bold">
            <span className="font-bold text-sm leading-none">B</span>
          </ToolBtn>
          <ToolBtn active={activeItalic} onClick={toggleItalic} title="Italic">
            <span className="italic text-sm leading-none">I</span>
          </ToolBtn>
          <div className="w-px h-4 bg-[#444] mx-0.5" />
          <label
            className="w-6 h-6 rounded overflow-hidden cursor-pointer border border-[#555] flex-shrink-0"
            title="Text color"
            style={{ background: activeColor }}
          >
            <input
              type="color"
              value={activeColor.startsWith('#') ? activeColor : '#ffffff'}
              onChange={(e) => applyColor(e.target.value)}
              className="opacity-0 w-0 h-0 absolute"
            />
          </label>
        </div>
      )}

      {/* Contenteditable editor */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        spellCheck={false}
        data-placeholder={placeholder}
        onInput={emitChange}
        onBlur={() => {
          setShowToolbar(false);
          emitChange();
        }}
        style={{
          fontFamily: defaultStyle.fontFamily || 'inherit',
          color: defaultStyle.color || '#ffffff',
          fontWeight: defaultStyle.bold ? 'bold' : 'normal',
          textAlign: defaultStyle.align || 'left',
          minHeight: 64,
          lineHeight: 1.45,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
        className={`
          w-full bg-[#1a1a1a] border border-[#333] rounded px-2 py-2
          text-sm focus:outline-none focus:border-indigo-500
          empty:before:content-[attr(data-placeholder)]
          empty:before:text-gray-600 empty:before:pointer-events-none
        `}
      />

      {/* Hint */}
      <p className="text-[10px] text-gray-600 mt-1">
        Select text to change color, bold, or italic
      </p>
    </div>
  );
}

function ToolBtn({ active, onClick, title, children }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${
        active ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-[#333]'
      }`}
    >
      {children}
    </button>
  );
}
