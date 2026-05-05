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
      // <font color="..."> is what execCommand produces without styleWithCSS
      if (el.tagName === 'FONT' && !('color' in r) && el.getAttribute('color')) {
        r.color = el.getAttribute('color');
      }
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

// ── Color presets ─────────────────────────────────────────────────────────────

const COLOR_PRESETS = [
  '#ffffff', '#cccccc', '#888888', '#444444', '#000000',
  '#ff4444', '#ff8800', '#ffcc00', '#88cc00', '#00cc44',
  '#00cccc', '#0088ff', '#4444ff', '#8800ff', '#ff00cc',
  '#ff8888', '#ffcc88', '#ffffaa', '#aaffcc', '#aaddff',
];

// ── Custom colour picker (no OS native dialog → selection never lost) ─────────

function ColorPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [hex, setHex] = useState(value || '#ffffff');

  // Keep hex input in sync when value changes externally
  useEffect(() => { setHex(normaliseColor(value)); }, [value]);

  const pick = (c) => {
    onChange(c);
    setHex(c);
    setOpen(false);
  };

  return (
    <div className="relative flex-shrink-0">
      {/* Swatch button */}
      <button
        title="Text color"
        className="w-6 h-6 rounded border border-[#555] flex-shrink-0"
        style={{ background: normaliseColor(value) }}
        onMouseDown={(e) => { e.preventDefault(); setOpen((o) => !o); }}
      />

      {/* Dropdown */}
      {open && (
        <div
          className="absolute top-8 left-0 z-[200] bg-[#1e1e1e] border border-[#444] rounded-xl p-2 shadow-2xl w-[142px]"
          onMouseDown={(e) => e.preventDefault()}
        >
          {/* Preset grid */}
          <div className="grid grid-cols-5 gap-1 mb-2">
            {COLOR_PRESETS.map((c) => (
              <button
                key={c}
                className="w-5 h-5 rounded hover:scale-110 transition-transform"
                style={{
                  background: c,
                  outline: normaliseColor(value) === c ? '2px solid white' : 'none',
                  outlineOffset: 1,
                }}
                onMouseDown={(e) => { e.preventDefault(); pick(c); }}
              />
            ))}
          </div>

          {/* Hex input */}
          <div className="flex gap-1 items-center">
            <div
              className="w-5 h-5 rounded border border-[#555] flex-shrink-0"
              style={{ background: /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : '#888' }}
            />
            <input
              type="text"
              value={hex}
              onChange={(e) => setHex(e.target.value)}
              onMouseDown={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const v = hex.trim();
                  if (/^#[0-9a-fA-F]{6}$/.test(v)) pick(v);
                }
                if (e.key === 'Escape') setOpen(false);
              }}
              placeholder="#rrggbb"
              maxLength={7}
              className="flex-1 min-w-0 bg-[#111] border border-[#333] rounded px-1 py-0.5 text-[10px] text-gray-300 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <p className="text-[9px] text-gray-600 mt-1">Press Enter to apply hex</p>
        </div>
      )}
    </div>
  );
}

// ── Named export so TextElement can reuse it ─────────────────────────────────
export { ColorPicker };

// ── Component ────────────────────────────────────────────────────────────────

export default function RichTextEditor({
  richContent,
  defaultStyle = {},
  onChange,
  placeholder = 'Type here…',
}) {
  const editorRef = useRef(null);
  const ignoreInputRef = useRef(false);
  const savedRangeRef = useRef(null); // persists selection across toolbar interactions

  const [showToolbar, setShowToolbar] = useState(false);
  const [toolbarPos, setToolbarPos] = useState({ top: 0, left: 0 });
  const [activeBold, setActiveBold] = useState(false);
  const [activeItalic, setActiveItalic] = useState(false);
  const [activeColor, setActiveColor] = useState(defaultStyle.color || '#ffffff');

  // ── Initialise ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (!editorRef.current) return;
    ignoreInputRef.current = true;
    editorRef.current.innerHTML = richContentToHtml(richContent) || '';
    ignoreInputRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // ── Change emission ──────────────────────────────────────────────────────

  const emitChange = useCallback(() => {
    if (!editorRef.current || ignoreInputRef.current) return;
    const segs = parseEditorToRichContent(editorRef.current);
    const json = JSON.stringify(segs);
    if (json !== lastExternal.current) {
      lastExternal.current = json;
      onChange(segs);
    }
  }, [onChange]);

  // ── Selection save / restore ─────────────────────────────────────────────

  const saveSelection = useCallback(() => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.anchorNode)) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    }
  }, []);

  const restoreSelection = useCallback(() => {
    editorRef.current?.focus();
    if (savedRangeRef.current) {
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(savedRangeRef.current);
    }
  }, []);

  // ── Selection-based toolbar ──────────────────────────────────────────────

  const updateToolbar = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !editorRef.current?.contains(sel.anchorNode)) {
      setShowToolbar(false);
      return;
    }

    // Persist the range so toolbar actions can restore it
    savedRangeRef.current = sel.getRangeAt(0).cloneRange();

    const range = sel.getRangeAt(0);
    const rRect = range.getBoundingClientRect();
    const eRect = editorRef.current.getBoundingClientRect();
    setToolbarPos({
      top: rRect.top - eRect.top - 42,
      left: Math.max(0, (rRect.left + rRect.right) / 2 - eRect.left - 56),
    });
    setShowToolbar(true);

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

  // All formatting goes through this: restore selection → enable styleWithCSS → run → emit
  const applyFormat = useCallback((fn) => {
    restoreSelection();
    document.execCommand('styleWithCSS', false, true);
    fn();
    emitChange();
  }, [restoreSelection, emitChange]);

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

  // Called by the custom ColorPicker (never triggers OS dialog → selection safe)
  const applyColor = useCallback((color) => {
    applyFormat(() => {
      document.execCommand('foreColor', false, color);
      setActiveColor(color);
    });
  }, [applyFormat]);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="relative">
      {/* Floating mini-toolbar */}
      {showToolbar && (
        <div
          className="absolute z-50 flex items-center gap-1 bg-[#222] border border-[#444] rounded-lg px-2 py-1.5 shadow-xl"
          style={{ top: toolbarPos.top, left: toolbarPos.left }}
          onMouseDown={(e) => { saveSelection(); e.preventDefault(); }}
        >
          <ToolBtn active={activeBold} onClick={toggleBold} title="Bold">
            <span className="font-bold text-sm leading-none">B</span>
          </ToolBtn>
          <ToolBtn active={activeItalic} onClick={toggleItalic} title="Italic">
            <span className="italic text-sm leading-none">I</span>
          </ToolBtn>
          <div className="w-px h-4 bg-[#444] mx-0.5" />
          <ColorPicker value={activeColor} onChange={applyColor} />
        </div>
      )}

      {/* Contenteditable */}
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
        className="w-full bg-[#1a1a1a] border border-[#333] rounded px-2 py-2 text-sm focus:outline-none focus:border-indigo-500 empty:before:content-[attr(data-placeholder)] empty:before:text-gray-600 empty:before:pointer-events-none"
      />

      <p className="text-[10px] text-gray-600 mt-1">
        Select text → choose color, bold, or italic
      </p>
    </div>
  );
}

function ToolBtn({ active, onClick, title, children }) {
  return (
    <button
      onMouseDown={(e) => e.preventDefault()}
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
