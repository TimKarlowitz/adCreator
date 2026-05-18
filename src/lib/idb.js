import { openDB } from 'idb';

const DB_NAME = 'ad-editor-assets';
const DB_VERSION = 3;
const ASSETS_STORE = 'assets';
const PROJECTS_STORE = 'projects';
const META_STORE = 'meta';
const AB_TESTS_STORE = 'abTests';

let dbPromise = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          if (!db.objectStoreNames.contains(ASSETS_STORE)) {
            db.createObjectStore(ASSETS_STORE, { keyPath: 'id' });
          }
        }
        if (oldVersion < 2) {
          if (!db.objectStoreNames.contains(PROJECTS_STORE)) {
            db.createObjectStore(PROJECTS_STORE, { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains(META_STORE)) {
            db.createObjectStore(META_STORE, { keyPath: 'key' });
          }
        }
        if (oldVersion < 3) {
          if (!db.objectStoreNames.contains(AB_TESTS_STORE)) {
            const store = db.createObjectStore(AB_TESTS_STORE, { keyPath: 'id' });
            store.createIndex('byProject', 'projectId', { unique: false });
          }
        }
      },
    });
  }
  return dbPromise;
}

// ---- Assets ----

export async function saveAsset(record) {
  const db = await getDB();
  await db.put(ASSETS_STORE, record);
}

export async function getAsset(id) {
  const db = await getDB();
  return db.get(ASSETS_STORE, id);
}

export async function deleteAsset(id) {
  const db = await getDB();
  await db.delete(ASSETS_STORE, id);
}

export async function listAssets() {
  const db = await getDB();
  return db.getAll(ASSETS_STORE);
}

// ---- Projects ----

export async function saveProjectRecord(record) {
  const db = await getDB();
  await db.put(PROJECTS_STORE, record);
}

export async function getProjectRecord(id) {
  const db = await getDB();
  return db.get(PROJECTS_STORE, id);
}

export async function deleteProjectRecord(id) {
  const db = await getDB();
  await db.delete(PROJECTS_STORE, id);
}

export async function listProjectRecords() {
  const db = await getDB();
  return db.getAll(PROJECTS_STORE);
}

// ---- AB Tests ----

export async function saveABTestRecord(record) {
  const db = await getDB();
  await db.put(AB_TESTS_STORE, record);
}

export async function getABTestRecord(id) {
  const db = await getDB();
  return db.get(AB_TESTS_STORE, id);
}

export async function deleteABTestRecord(id) {
  const db = await getDB();
  await db.delete(AB_TESTS_STORE, id);
}

export async function listABTestsByProject(projectId) {
  const db = await getDB();
  const index = db.transaction(AB_TESTS_STORE).store.index('byProject');
  return index.getAll(projectId);
}

// ---- Meta ----

export async function getMetaValue(key) {
  const db = await getDB();
  const record = await db.get(META_STORE, key);
  return record?.value ?? null;
}

export async function setMetaValue(key, value) {
  const db = await getDB();
  await db.put(META_STORE, { key, value });
}
