'use client';

import { useState, useEffect } from 'react';
import { POPULAR_FONTS, loadGoogleFont } from '@/hooks/useFontLoader';

export default function FontPickerModal({ currentFont, onSelect, onClose }) {
  const [query, setQuery] = useState('');
  const [previewFont, setPreviewFont] = useState(currentFont || '');
  const [loaded, setLoaded] = useState({});

  const filtered = query
    ? POPULAR_FONTS.filter((f) => f.toLowerCase().includes(query.toLowerCase()))
    : POPULAR_FONTS;

  const handleHover = async (font) => {
    if (loaded[font]) return;
    await loadGoogleFont(font);
    setLoaded((p) => ({ ...p, [font]: true }));
  };

  const handleSelect = async (font) => {
    await loadGoogleFont(font);
    onSelect(font);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div
        className="bg-[#1a1a1a] border border-[#333] rounded-xl shadow-2xl w-96 max-h-[70vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-[#2a2a2a]">
          <h3 className="font-semibold text-white">Font Picker</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>

        <div className="p-3 border-b border-[#2a2a2a]">
          <input
            type="text"
            placeholder="Search fonts..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="w-full bg-[#111] border border-[#333] rounded px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {filtered.map((font) => (
            <button
              key={font}
              onMouseEnter={() => handleHover(font)}
              onClick={() => handleSelect(font)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded hover:bg-[#2a2a2a] transition-colors group ${
                font === currentFont ? 'bg-indigo-900/40 text-indigo-300' : 'text-gray-300'
              }`}
            >
              <span className="text-sm">{font}</span>
              <span
                style={{ fontFamily: loaded[font] ? font : 'sans-serif' }}
                className="text-base text-gray-400 group-hover:text-gray-200"
              >
                Aa
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
