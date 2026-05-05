import { useRef } from 'react';

const loadedFonts = new Set();

// Fonts bundled with the app — no Google Fonts fetch needed.
const LOCAL_FONTS = new Set(['Geist', 'Geist Mono']);

/**
 * Load a font for use in Konva canvas.
 * Local/bundled fonts (e.g. Geist) are already available in document.fonts via
 * Next.js; Google Fonts are injected via a <link> tag on demand.
 */
export async function loadGoogleFont(fontFamily) {
  if (loadedFonts.has(fontFamily)) return true;

  if (!LOCAL_FONTS.has(fontFamily)) {
    // Inject a Google Fonts <link> tag
    const encoded = encodeURIComponent(fontFamily);
    const linkId = `gf-${encoded}`;
    if (!document.getElementById(linkId)) {
      const link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${encoded}:wght@400;700&display=swap`;
      document.head.appendChild(link);
    }
  }

  try {
    // Wait until the font is actually available in the document
    await document.fonts.load(`1em "${fontFamily}"`);
    loadedFonts.add(fontFamily);
    return true;
  } catch (e) {
    console.warn(`Failed to load font: ${fontFamily}`, e);
    return false;
  }
}

/**
 * Search Google Fonts API for font names matching a query.
 */
export async function searchGoogleFonts(query) {
  if (!query.trim()) return [];
  try {
    const res = await fetch(
      `https://www.googleapis.com/webfonts/v1/webfonts?key=AIzaSyDummy&sort=popularity`
    );
    // If API key not set, fall back to a static popular fonts list
    if (!res.ok) throw new Error('API unavailable');
    const data = await res.json();
    return data.items
      .filter((f) => f.family.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 20)
      .map((f) => f.family);
  } catch {
    return POPULAR_FONTS.filter((f) =>
      f.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 20);
  }
}

export const POPULAR_FONTS = [
  'Geist', 'Geist Mono',
  'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Oswald',
  'Raleway', 'Poppins', 'Bebas Neue', 'Anton', 'Barlow',
  'Inter', 'Nunito', 'Playfair Display', 'Merriweather', 'Ubuntu',
  'PT Sans', 'Source Sans Pro', 'Noto Sans', 'Rubik', 'Work Sans',
  'Exo 2', 'Titillium Web', 'Fira Sans', 'Mulish', 'Jost',
  'Space Grotesk', 'DM Sans', 'Quicksand', 'Cabin', 'Karla',
];

export function useFontLoader() {
  const cache = useRef(new Set());

  const ensureFont = async (fontFamily) => {
    if (!fontFamily || cache.current.has(fontFamily)) return;
    await loadGoogleFont(fontFamily);
    cache.current.add(fontFamily);
  };

  return { ensureFont, loadedFonts: cache.current };
}
