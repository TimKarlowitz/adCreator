'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { FONT_CATALOG, loadGoogleFont } from '@/hooks/useFontLoader';

const CATEGORIES = ['All', 'Sans-Serif', 'Serif', 'Display', 'Handwriting', 'Monospace'];

export default function FontPickerModal({ currentFont, onSelect, onClose }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [loaded, setLoaded] = useState({});
  const observerRef = useRef(null);
  const itemRefs = useRef({});

  const filtered = FONT_CATALOG.filter((f) => {
    const matchesCategory = category === 'All' || f.category === category;
    const matchesQuery = !query || f.name.toLowerCase().includes(query.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  // Load a font and mark it ready for preview
  const ensureLoaded = useCallback(async (name) => {
    if (loaded[name]) return;
    await loadGoogleFont(name);
    setLoaded((p) => ({ ...p, [name]: true }));
  }, [loaded]);

  // Observe each font row; load its font when it scrolls into view
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const name = entry.target.dataset.font;
            if (name) ensureLoaded(name);
          }
        });
      },
      { threshold: 0.1 }
    );
    return () => observerRef.current?.disconnect();
  }, [ensureLoaded]);

  // Re-attach observer whenever the filtered list changes
  useEffect(() => {
    const obs = observerRef.current;
    if (!obs) return;
    obs.disconnect();
    Object.values(itemRefs.current).forEach((el) => {
      if (el) obs.observe(el);
    });
  }, [filtered]);

  const handleSelect = async (name) => {
    await loadGoogleFont(name);
    onSelect(name);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={onClose}
    >
      <div
        className="bg-[#1a1a1a] border border-[#333] rounded-xl shadow-2xl w-[420px] max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a]">
          <h3 className="font-semibold text-white text-sm">Font Picker</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-lg leading-none">✕</button>
        </div>

        {/* Search */}
        <div className="px-3 pt-3 pb-2">
          <input
            type="text"
            placeholder="Search fonts…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Category tabs */}
        <div className="flex gap-1 px-3 pb-2 overflow-x-auto scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                category === cat
                  ? 'bg-indigo-600 text-white'
                  : 'bg-[#2a2a2a] text-gray-400 hover:text-white hover:bg-[#333]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Font list */}
        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {filtered.length === 0 ? (
            <p className="text-center text-gray-600 text-sm py-8">No fonts match your search.</p>
          ) : (
            filtered.map((f) => (
              <button
                key={f.name}
                data-font={f.name}
                ref={(el) => { itemRefs.current[f.name] = el; }}
                onClick={() => handleSelect(f.name)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[#2a2a2a] transition-colors group ${
                  f.name === currentFont
                    ? 'bg-indigo-900/40 text-indigo-300'
                    : 'text-gray-300'
                }`}
              >
                <span className="text-xs text-gray-500 w-20 text-left shrink-0">{f.category}</span>
                <span className="flex-1 text-sm text-left truncate">{f.name}</span>
                <span
                  style={{ fontFamily: loaded[f.name] ? `"${f.name}"` : 'sans-serif' }}
                  className="text-base text-gray-400 group-hover:text-gray-200 shrink-0 ml-2"
                >
                  Aa
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
