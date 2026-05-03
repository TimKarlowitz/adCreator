import { openDB } from 'idb';

const DB_NAME = 'ad-editor-assets';
const DB_VERSION = 1;
const STORE_NAME = 'assets';

let dbPromise = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

export async function saveAsset(record) {
  const db = await getDB();
  await db.put(STORE_NAME, record);
}

export async function getAsset(id) {
  const db = await getDB();
  return db.get(STORE_NAME, id);
}

export async function deleteAsset(id) {
  const db = await getDB();
  await db.delete(STORE_NAME, id);
}

export async function listAssets() {
  const db = await getDB();
  return db.getAll(STORE_NAME);
}
