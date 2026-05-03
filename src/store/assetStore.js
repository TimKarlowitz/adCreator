import { create } from 'zustand';
import { saveAsset, getAsset, deleteAsset, listAssets } from '@/lib/idb';
import { v4 as uuidv4 } from 'uuid';

export const useAssetStore = create((set, get) => ({
  assets: [],          // { id, name, type, mimeType, size, objectUrl }
  blobUrls: {},        // id -> objectUrl (for cleanup)
  loaded: false,

  // Load all asset metadata from IndexedDB on startup
  loadAll: async () => {
    const items = await listAssets();
    const assets = [];
    const blobUrls = {};
    for (const item of items) {
      if (item.data) {
        const blob = new Blob([item.data], { type: item.mimeType });
        const url = URL.createObjectURL(blob);
        blobUrls[item.id] = url;
        assets.push({ ...item, objectUrl: url });
      }
    }
    set({ assets, blobUrls, loaded: true });
  },

  // Upload a file and persist it
  uploadAsset: async (file) => {
    const id = uuidv4();
    const buffer = await file.arrayBuffer();
    const type = file.type.startsWith('model/') || file.name.endsWith('.glb') || file.name.endsWith('.gltf')
      ? '3d'
      : file.type.startsWith('image/')
      ? 'image'
      : 'other';

    const record = {
      id,
      name: file.name,
      type,
      mimeType: file.type || 'application/octet-stream',
      size: file.size,
      data: buffer,
    };

    await saveAsset(record);

    const blob = new Blob([buffer], { type: record.mimeType });
    const objectUrl = URL.createObjectURL(blob);

    set((s) => ({
      assets: [...s.assets, { id, name: file.name, type, mimeType: record.mimeType, size: file.size, objectUrl }],
      blobUrls: { ...s.blobUrls, [id]: objectUrl },
    }));

    return { id, objectUrl };
  },

  // Get or create a blob URL for an asset ID
  getObjectUrl: async (id) => {
    const { blobUrls } = get();
    if (blobUrls[id]) return blobUrls[id];
    const record = await getAsset(id);
    if (!record) return null;
    const blob = new Blob([record.data], { type: record.mimeType });
    const url = URL.createObjectURL(blob);
    set((s) => ({ blobUrls: { ...s.blobUrls, [id]: url } }));
    return url;
  },

  // Remove an asset
  removeAsset: async (id) => {
    const { blobUrls } = get();
    if (blobUrls[id]) URL.revokeObjectURL(blobUrls[id]);
    await deleteAsset(id);
    set((s) => ({
      assets: s.assets.filter((a) => a.id !== id),
      blobUrls: Object.fromEntries(Object.entries(s.blobUrls).filter(([k]) => k !== id)),
    }));
  },

  // Revoke all blob URLs (call on unmount)
  revokeAll: () => {
    const { blobUrls } = get();
    Object.values(blobUrls).forEach((url) => URL.revokeObjectURL(url));
    set({ blobUrls: {} });
  },
}));
