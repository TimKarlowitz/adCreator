import { v4 as uuidv4 } from 'uuid';
import {
  saveABTestRecord,
  getABTestRecord,
  deleteABTestRecord,
  listABTestsByProject,
} from './idb';

/**
 * ABTestConfig shape:
 * {
 *   id: string,
 *   projectId: string,
 *   name: string,
 *   createdAt: number,
 *   updatedAt: number,
 *   slots: Slot[],
 *   bindings: Binding[],
 *   variantOverrides: { add: Variant[], exclude: string[] },
 * }
 *
 * Slot: {
 *   id, label,
 *   type: 'model3d' | 'background' | 'imageElement' | 'textElement' | 'textboxElement',
 *   targetId: string,   // '__model3d__', '__background__', or element.id
 *   active: boolean,
 *   values: SlotValue[],
 * }
 *
 * SlotValue: {
 *   id, label,
 *   // model3d / imageElement: { assetId, objectUrl }
 *   // background: { type: 'color'|'image', color?, assetId?, objectUrl? }
 *   // textElement / textboxElement: { content }
 *   data: object,
 * }
 *
 * Binding: {
 *   id,
 *   driverSlotId, driverValueId,
 *   dependentSlotId, dependentValueId,
 * }
 *
 * Variant (for overrides): { id, slotValues: { [slotId]: valueId }, excluded: bool }
 */

export function createDefaultABTest(projectId) {
  return {
    id: uuidv4(),
    projectId,
    name: 'A/B Test 1',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    slots: [],
    // bindingGroups: which slot→slot panels exist (UI structure)
    bindingGroups: [],
    // bindings: the actual value→value mappings inside those panels
    bindings: [],
    variantOverrides: { add: [], exclude: [] },
  };
}

export async function saveABTest(config) {
  const record = { ...config, updatedAt: Date.now() };
  await saveABTestRecord(record);
  return record;
}

export async function getABTest(id) {
  return getABTestRecord(id);
}

export async function deleteABTest(id) {
  return deleteABTestRecord(id);
}

export async function listABTests(projectId) {
  const all = await listABTestsByProject(projectId);
  return all.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}
