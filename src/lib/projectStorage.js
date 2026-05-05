import {
  saveProjectRecord,
  getProjectRecord,
  deleteProjectRecord,
  listProjectRecords,
  getMetaValue,
  setMetaValue,
} from './idb';

const LAST_OPENED_KEY = 'lastOpenedProjectId';

/** Strip a blob: URL from an object that also has an assetId.
 *  Blob URLs are session-only; the asset is re-resolved from IndexedDB on load. */
function stripBlobSrc(obj) {
  if (!obj) return obj;
  if (obj.assetId && obj.src && obj.src.startsWith('blob:')) {
    return { ...obj, src: null };
  }
  return obj;
}

/** Pull only the fields that belong in a saved project (no UI state). */
export function extractProjectData(state) {
  return {
    id: state.id,
    name: state.name,
    canvasConfig: state.canvasConfig,
    background: stripBlobSrc(state.background),
    model3d: stripBlobSrc(state.model3d),
    elements: state.elements,
    exportConfig: state.exportConfig,
  };
}

export async function saveProject(projectData, thumbnail = null) {
  const now = Date.now();
  const record = {
    ...projectData,
    thumbnail: thumbnail ?? null,
    updatedAt: now,
    createdAt: projectData.createdAt ?? now,
  };
  await saveProjectRecord(record);
  return record;
}

export async function getProject(id) {
  return getProjectRecord(id);
}

export async function deleteProject(id) {
  return deleteProjectRecord(id);
}

export async function listProjects() {
  const all = await listProjectRecords();
  return all.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

export async function getLastOpenedId() {
  return getMetaValue(LAST_OPENED_KEY);
}

export async function setLastOpenedId(id) {
  return setMetaValue(LAST_OPENED_KEY, id);
}
