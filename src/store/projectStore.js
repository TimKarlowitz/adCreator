import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

const ASPECT_RATIOS = {
  '1:1':  { width: 1080, height: 1080 },
  '16:9': { width: 1920, height: 1080 },
  '9:16': { width: 1080, height: 1920 },
};

const defaultProject = () => ({
  id: uuidv4(),
  name: 'Untitled Project',
  canvasConfig: {
    aspectRatio: '1:1',
    baseWidth: 1080,
    baseHeight: 1080,
    backgroundColor: '#000000',
  },
  background: {
    type: 'color',
    assetId: null,
    src: null,
    opacity: 1,
    fit: 'cover',
  },
  model3d: {
    assetId: null,
    src: null,
    position: { x: 0.65, y: 0.5 },
    scale: 1.2,
    rotationSpeed: 0.8,
    autoRotate: true,
    lighting: 'studio',
  },
  elements: [],
  exportConfig: {
    duration: 4,
    fps: 30,
    format: 'mp4',
  },
});

/** Snapshot only the parts that matter for undo/redo */
function snapshot(state) {
  return {
    elements: state.elements,
    background: state.background,
    model3d: state.model3d,
    canvasConfig: state.canvasConfig,
  };
}

export const useProjectStore = create((set, get) => ({
  // History
  _past: [],
  _future: [],

  // Project
  ...defaultProject(),
  selectedId: null,
  zoom: 1,

  // Record current state to history before a change
  _record: () => {
    const s = get();
    set({ _past: [...s._past, snapshot(s)].slice(-50), _future: [] });
  },

  // ---- Project ----
  newProject: () => set({ ...defaultProject(), _past: [], _future: [], selectedId: null }),

  loadProject: (project) => set({
    ...project,
    selectedId: null,
    _past: [],
    _future: [],
  }),

  setProjectName: (name) => set({ name }),

  // ---- Canvas ----
  setAspectRatio: (ratio) => {
    const s = get();
    const { baseWidth, baseHeight } = s.canvasConfig;
    const newDims = ASPECT_RATIOS[ratio];
    const scaleY = newDims.height / baseHeight;

    s._record();
    set({
      canvasConfig: { ...s.canvasConfig, aspectRatio: ratio, baseWidth: newDims.width, baseHeight: newDims.height },
      elements: s.elements.map((el) => ({
        ...el,
        y: Math.min(el.y * scaleY, newDims.height - el.height),
        height: el.height * scaleY,
      })),
    });
  },

  setBackgroundColor: (color) => set((s) => ({
    canvasConfig: { ...s.canvasConfig, backgroundColor: color },
  })),

  // ---- Background ----
  setBackground: (bg) => {
    get()._record();
    set({ background: bg });
  },

  // ---- 3D Model ----
  setModel3d: (model) => {
    get()._record();
    set({ model3d: model });
  },
  updateModel3d: (patch) => set((s) => ({ model3d: { ...s.model3d, ...patch } })),

  // ---- Elements ----
  addElement: (element) => {
    get()._record();
    const id = element.id || uuidv4();
    set((s) => ({
      elements: [...s.elements, { ...element, id, zIndex: s.elements.length }],
      selectedId: id,
    }));
  },

  updateElement: (id, patch) => set((s) => ({
    elements: s.elements.map((el) => el.id === id ? { ...el, ...patch } : el),
  })),

  removeElement: (id) => {
    get()._record();
    set((s) => ({
      elements: s.elements.filter((el) => el.id !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
    }));
  },

  duplicateElement: (id) => {
    const s = get();
    const el = s.elements.find((e) => e.id === id);
    if (!el) return;
    s._record();
    const newEl = { ...el, id: uuidv4(), x: el.x + 20, y: el.y + 20, zIndex: s.elements.length };
    set({ elements: [...s.elements, newEl], selectedId: newEl.id });
  },

  bringForward: (id) => set((s) => {
    const sorted = [...s.elements].sort((a, b) => a.zIndex - b.zIndex);
    const idx = sorted.findIndex((e) => e.id === id);
    if (idx < sorted.length - 1) {
      const [a, b] = [sorted[idx].zIndex, sorted[idx + 1].zIndex];
      sorted[idx] = { ...sorted[idx], zIndex: b };
      sorted[idx + 1] = { ...sorted[idx + 1], zIndex: a };
    }
    return { elements: sorted };
  }),

  sendBackward: (id) => set((s) => {
    const sorted = [...s.elements].sort((a, b) => a.zIndex - b.zIndex);
    const idx = sorted.findIndex((e) => e.id === id);
    if (idx > 0) {
      const [a, b] = [sorted[idx].zIndex, sorted[idx - 1].zIndex];
      sorted[idx] = { ...sorted[idx], zIndex: b };
      sorted[idx - 1] = { ...sorted[idx - 1], zIndex: a };
    }
    return { elements: sorted };
  }),

  // ---- Selection ----
  setSelectedId: (id) => set({ selectedId: id }),

  // ---- Export ----
  setExportConfig: (patch) => set((s) => ({
    exportConfig: { ...s.exportConfig, ...patch },
  })),

  // ---- Zoom ----
  setZoom: (zoom) => set({ zoom: Math.max(0.25, Math.min(3, zoom)) }),

  // ---- Undo / Redo ----
  undo: () => {
    const s = get();
    if (s._past.length === 0) return;
    const prev = s._past[s._past.length - 1];
    set({
      ...prev,
      _past: s._past.slice(0, -1),
      _future: [snapshot(s), ...s._future].slice(0, 50),
    });
  },

  redo: () => {
    const s = get();
    if (s._future.length === 0) return;
    const next = s._future[0];
    set({
      ...next,
      _past: [...s._past, snapshot(s)].slice(-50),
      _future: s._future.slice(1),
    });
  },
}));

export { ASPECT_RATIOS };
