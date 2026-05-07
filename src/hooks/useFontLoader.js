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

/**
 * Categorized font catalog. Each entry has a `name` (Google Fonts family name)
 * and a `category` used for filtering in the font picker.
 */
export const FONT_CATALOG = [
  // ── Sans-Serif ──────────────────────────────────────────────────────────────
  { name: 'Geist',            category: 'Sans-Serif' },
  { name: 'Inter',            category: 'Sans-Serif' },
  { name: 'Roboto',           category: 'Sans-Serif' },
  { name: 'Open Sans',        category: 'Sans-Serif' },
  { name: 'Lato',             category: 'Sans-Serif' },
  { name: 'Montserrat',       category: 'Sans-Serif' },
  { name: 'Poppins',          category: 'Sans-Serif' },
  { name: 'Raleway',          category: 'Sans-Serif' },
  { name: 'Nunito',           category: 'Sans-Serif' },
  { name: 'Barlow',           category: 'Sans-Serif' },
  { name: 'Ubuntu',           category: 'Sans-Serif' },
  { name: 'PT Sans',          category: 'Sans-Serif' },
  { name: 'Source Sans Pro',  category: 'Sans-Serif' },
  { name: 'Noto Sans',        category: 'Sans-Serif' },
  { name: 'Rubik',            category: 'Sans-Serif' },
  { name: 'Work Sans',        category: 'Sans-Serif' },
  { name: 'Fira Sans',        category: 'Sans-Serif' },
  { name: 'Mulish',           category: 'Sans-Serif' },
  { name: 'Jost',             category: 'Sans-Serif' },
  { name: 'Space Grotesk',    category: 'Sans-Serif' },
  { name: 'DM Sans',          category: 'Sans-Serif' },
  { name: 'Quicksand',        category: 'Sans-Serif' },
  { name: 'Cabin',            category: 'Sans-Serif' },
  { name: 'Karla',            category: 'Sans-Serif' },
  { name: 'Exo 2',            category: 'Sans-Serif' },
  { name: 'Titillium Web',    category: 'Sans-Serif' },
  { name: 'Manrope',          category: 'Sans-Serif' },
  { name: 'Plus Jakarta Sans',category: 'Sans-Serif' },
  { name: 'Outfit',           category: 'Sans-Serif' },
  { name: 'Syne',             category: 'Sans-Serif' },
  { name: 'Figtree',          category: 'Sans-Serif' },
  { name: 'Be Vietnam Pro',   category: 'Sans-Serif' },
  { name: 'Lexend',           category: 'Sans-Serif' },
  { name: 'Urbanist',         category: 'Sans-Serif' },
  { name: 'Onest',            category: 'Sans-Serif' },
  { name: 'Albert Sans',      category: 'Sans-Serif' },
  { name: 'IBM Plex Sans',    category: 'Sans-Serif' },
  { name: 'Hind',             category: 'Sans-Serif' },
  { name: 'Oxygen',           category: 'Sans-Serif' },
  { name: 'Asap',             category: 'Sans-Serif' },
  { name: 'Dosis',            category: 'Sans-Serif' },
  { name: 'Varela Round',     category: 'Sans-Serif' },
  { name: 'Prompt',           category: 'Sans-Serif' },

  // ── Serif ────────────────────────────────────────────────────────────────────
  { name: 'Merriweather',       category: 'Serif' },
  { name: 'Playfair Display',   category: 'Serif' },
  { name: 'Lora',               category: 'Serif' },
  { name: 'PT Serif',           category: 'Serif' },
  { name: 'Bitter',             category: 'Serif' },
  { name: 'Libre Baskerville',  category: 'Serif' },
  { name: 'Noto Serif',         category: 'Serif' },
  { name: 'Crimson Text',       category: 'Serif' },
  { name: 'EB Garamond',        category: 'Serif' },
  { name: 'Cormorant Garamond', category: 'Serif' },
  { name: 'Spectral',           category: 'Serif' },
  { name: 'Arvo',               category: 'Serif' },
  { name: 'Zilla Slab',         category: 'Serif' },
  { name: 'Rokkitt',            category: 'Serif' },
  { name: 'Domine',             category: 'Serif' },
  { name: 'Vollkorn',           category: 'Serif' },
  { name: 'Cardo',              category: 'Serif' },
  { name: 'DM Serif Display',   category: 'Serif' },
  { name: 'Fraunces',           category: 'Serif' },
  { name: 'Instrument Serif',   category: 'Serif' },
  { name: 'Gilda Display',      category: 'Serif' },
  { name: 'Libre Caslon Text',  category: 'Serif' },

  // ── Display ──────────────────────────────────────────────────────────────────
  { name: 'Oswald',               category: 'Display' },
  { name: 'Anton',                category: 'Display' },
  { name: 'Bebas Neue',           category: 'Display' },
  { name: 'Righteous',            category: 'Display' },
  { name: 'Teko',                 category: 'Display' },
  { name: 'Russo One',            category: 'Display' },
  { name: 'Yanone Kaffeesatz',    category: 'Display' },
  { name: 'Passion One',          category: 'Display' },
  { name: 'Squada One',           category: 'Display' },
  { name: 'Big Shoulders Display',category: 'Display' },
  { name: 'Chakra Petch',         category: 'Display' },
  { name: 'Archivo Black',        category: 'Display' },
  { name: 'Black Ops One',        category: 'Display' },
  { name: 'Alfa Slab One',        category: 'Display' },
  { name: 'Bangers',              category: 'Display' },
  { name: 'Boogaloo',             category: 'Display' },
  { name: 'Fredoka One',          category: 'Display' },
  { name: 'Lilita One',           category: 'Display' },
  { name: 'Ultra',                category: 'Display' },
  { name: 'Graduate',             category: 'Display' },
  { name: 'Saira Condensed',      category: 'Display' },
  { name: 'Press Start 2P',       category: 'Display' },
  { name: 'VT323',                category: 'Display' },

  // ── Handwriting ──────────────────────────────────────────────────────────────
  { name: 'Dancing Script',      category: 'Handwriting' },
  { name: 'Pacifico',            category: 'Handwriting' },
  { name: 'Great Vibes',         category: 'Handwriting' },
  { name: 'Sacramento',          category: 'Handwriting' },
  { name: 'Satisfy',             category: 'Handwriting' },
  { name: 'Allura',              category: 'Handwriting' },
  { name: 'Kaushan Script',      category: 'Handwriting' },
  { name: 'Courgette',           category: 'Handwriting' },
  { name: 'Cookie',              category: 'Handwriting' },
  { name: 'Pinyon Script',       category: 'Handwriting' },
  { name: 'Alex Brush',          category: 'Handwriting' },
  { name: 'Amatic SC',           category: 'Handwriting' },
  { name: 'Caveat',              category: 'Handwriting' },
  { name: 'Indie Flower',        category: 'Handwriting' },
  { name: 'Shadows Into Light',  category: 'Handwriting' },
  { name: 'Handlee',             category: 'Handwriting' },
  { name: 'Patrick Hand',        category: 'Handwriting' },
  { name: 'Gochi Hand',          category: 'Handwriting' },
  { name: 'Architects Daughter', category: 'Handwriting' },
  { name: 'Gloria Hallelujah',   category: 'Handwriting' },
  { name: 'Rock Salt',           category: 'Handwriting' },
  { name: 'Permanent Marker',    category: 'Handwriting' },

  // ── Monospace ────────────────────────────────────────────────────────────────
  { name: 'Geist Mono',       category: 'Monospace' },
  { name: 'Roboto Mono',      category: 'Monospace' },
  { name: 'Source Code Pro',  category: 'Monospace' },
  { name: 'Fira Code',        category: 'Monospace' },
  { name: 'JetBrains Mono',   category: 'Monospace' },
  { name: 'IBM Plex Mono',    category: 'Monospace' },
  { name: 'Inconsolata',      category: 'Monospace' },
  { name: 'Courier Prime',    category: 'Monospace' },
  { name: 'Space Mono',       category: 'Monospace' },
  { name: 'Share Tech Mono',  category: 'Monospace' },
  { name: 'Overpass Mono',    category: 'Monospace' },
  { name: 'Azeret Mono',      category: 'Monospace' },
];

/** Flat list of all font names — kept for backward-compatibility. */
export const POPULAR_FONTS = FONT_CATALOG.map((f) => f.name);

export function useFontLoader() {
  const cache = useRef(new Set());

  const ensureFont = async (fontFamily) => {
    if (!fontFamily || cache.current.has(fontFamily)) return;
    await loadGoogleFont(fontFamily);
    cache.current.add(fontFamily);
  };

  return { ensureFont, loadedFonts: cache.current };
}
