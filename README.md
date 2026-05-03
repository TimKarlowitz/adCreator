# Ad Asset Editor

A browser-based animated ad asset editor. Compose, animate, and export MP4/GIF ads for Meta, Instagram, and Reddit — fully client-side, no backend required.

## Features

- **Layered canvas**: Three.js (3D + background) underneath Konva.js (2D elements)
- **Elements**: Text, Text Box, Image, Arrow — all draggable, resizable, rotatable
- **3D GLB model** with auto-rotation, position, scale, and lighting controls
- **Inline rich text editing** — double-click any text element to edit in place
- **Animations**: fade-in, fade-out, scale-in, scale-out with configurable start/duration
- **Smart snap guides** — 8px threshold, snaps to canvas center/edges and other elements
- **Aspect ratios**: 1:1, 16:9, 9:16 with proportional element rescaling
- **Font picker** — searches popular Google Fonts with live previews
- **Templates** — save/load projects as JSON in localStorage, with canvas thumbnail
- **IndexedDB asset storage** — uploaded GLBs and images persist across sessions
- **Export** — FFmpeg WASM encodes MP4 (h264) or GIF directly in the browser
- **Undo/Redo** — 50-step history (Cmd+Z / Cmd+Shift+Z)
- **Zoom** — Cmd+scroll or bottom bar buttons

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Export Requirements

FFmpeg WASM requires `SharedArrayBuffer`, which needs these HTTP headers:
```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

These are set automatically in `next.config.mjs` for local dev. For deployment, `vercel.json` and `netlify.toml` are pre-configured.

## Project Structure

```
src/
  app/                   Next.js app router
  components/
    canvas/
      CanvasContainer    Two-layer canvas orchestration
      ThreeLayer         Three.js: background + GLB model
      KonvaLayer         Konva: all 2D interactive elements
    elements/
      TextElement        Rich text with inline editing
      TextBoxElement     Bordered box with inner text
      ImageElement       Uploaded image, resizable
      ArrowElement       4 arrow variants (straight, double, curved)
      SelectionTransformer  Konva transformer wrapper
    panels/
      TopBar             Aspect ratio switcher, undo/redo, export
      LeftPanel          Asset upload, element adder, built-in BGs
      RightPanel         Context-sensitive properties inspector
      BottomBar          Zoom, duration, save template
    modals/
      ExportModal        Format/duration/fps picker + FFmpeg progress
      TemplateModal      Save/load named project templates
      FontPickerModal    Google Fonts search with live preview
  store/
    projectStore         Zustand: project state + undo/redo history
    assetStore           Zustand: IndexedDB asset management
  hooks/
    useExport            FFmpeg WASM frame compositing + encode
    useSnap              Smart guide snap calculations
    useAspectRatio       Display dimensions from design space
    useFontLoader        Google Fonts dynamic loading
  lib/
    idb                  IndexedDB helpers (idb wrapper)
    animationUtils       Pure time-based animation state function
    scaleUtils           Proportional element scaling math
    templateStorage      localStorage template read/write
```

## Tech Stack

| Concern | Library |
|---|---|
| Framework | Next.js 16 |
| 3D | Three.js + @react-three/fiber + @react-three/drei |
| 2D Canvas | Konva.js + react-konva |
| State | Zustand 5 |
| Asset Storage | idb (IndexedDB) |
| Layout Storage | localStorage |
| Export | @ffmpeg/ffmpeg (WASM) |
| Styling | Tailwind CSS 4 |
