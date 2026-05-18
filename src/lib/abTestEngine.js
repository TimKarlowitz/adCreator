import { v4 as uuidv4 } from 'uuid';

/**
 * Identify which slots are "dependent" — their values are fully determined
 * by bindings from another (driver) slot, so they collapse out of the matrix.
 *
 * A slot is dependent if every value of its driver slot has a binding to it.
 * If only some driver values are bound, the slot is still free (partially bound).
 */
export function classifySlots(slots, bindings) {
  const activeSlots = slots.filter((s) => s.active && s.values.length > 0);

  // dependentSlotId -> driverSlotId
  const dependencyMap = {};

  for (const slot of activeSlots) {
    // Find all driver slots that have bindings pointing to this slot
    const driversForThisSlot = [...new Set(
      bindings
        .filter((b) => b.dependentSlotId === slot.id)
        .map((b) => b.driverSlotId)
    )];

    if (driversForThisSlot.length !== 1) continue; // ambiguous or none

    const driverSlotId = driversForThisSlot[0];
    const driverSlot = activeSlots.find((s) => s.id === driverSlotId);
    if (!driverSlot) continue;

    // Check every value of the driver slot has a binding to this slot
    const coveredDriverValues = bindings
      .filter((b) => b.driverSlotId === driverSlotId && b.dependentSlotId === slot.id)
      .map((b) => b.driverValueId);

    const allDriverValuesCovered = driverSlot.values.every((v) =>
      coveredDriverValues.includes(v.id)
    );

    if (allDriverValuesCovered) {
      dependencyMap[slot.id] = driverSlotId;
    }
  }

  const freeSlots = activeSlots.filter((s) => !dependencyMap[s.id]);
  const dependentSlots = activeSlots.filter((s) => !!dependencyMap[s.id]);

  return { freeSlots, dependentSlots, dependencyMap };
}

/**
 * Resolve a dependent slot's value for a given combination (row).
 * row: { [slotId]: valueId }
 */
function resolveDependentValue(dependentSlotId, row, bindings) {
  const binding = bindings.find(
    (b) => b.dependentSlotId === dependentSlotId && b.driverValueId === row[b.driverSlotId]
  );
  return binding?.dependentValueId ?? null;
}

/**
 * Cartesian product of arrays.
 * cartesian([[A,B],[1,2]]) → [[A,1],[A,2],[B,1],[B,2]]
 */
function cartesian(arrays) {
  if (arrays.length === 0) return [[]];
  const [first, ...rest] = arrays;
  const restProduct = cartesian(rest);
  return first.flatMap((item) => restProduct.map((combo) => [item, ...combo]));
}

/**
 * Generate all variants from the slot/binding configuration.
 *
 * Returns an array of Variant objects:
 * {
 *   id: string,
 *   slotValues: { [slotId]: valueId },   // complete map for all active slots
 *   warnings: string[],                  // e.g. missing binding
 *   excluded: boolean,
 * }
 */
export function generateVariants(slots, bindings, variantOverrides = { add: [], exclude: [] }) {
  const activeSlots = slots.filter((s) => s.active && s.values.length > 0);
  if (activeSlots.length === 0) return [];

  const { freeSlots, dependentSlots } = classifySlots(slots, bindings);

  // Build cartesian product of free slots
  const freeValueArrays = freeSlots.map((s) => s.values.map((v) => ({ slotId: s.id, valueId: v.id })));
  const rawMatrix = freeSlots.length > 0 ? cartesian(freeValueArrays) : [[]];

  const variants = rawMatrix.map((combo) => {
    // Build the base row from free slots
    const row = {};
    for (const { slotId, valueId } of combo) {
      row[slotId] = valueId;
    }

    const warnings = [];

    // Resolve dependent slots
    for (const depSlot of dependentSlots) {
      const resolvedValueId = resolveDependentValue(depSlot.id, row, bindings);
      if (resolvedValueId) {
        row[depSlot.id] = resolvedValueId;
      } else {
        warnings.push(`No binding found for "${depSlot.label}"`);
      }
    }

    const excluded = variantOverrides.exclude.includes(
      // We'll match by content fingerprint since IDs are generated fresh each time
      JSON.stringify(row)
    );

    return {
      id: uuidv4(),
      slotValues: row,
      warnings,
      excluded,
    };
  });

  // Append manual add overrides
  const added = (variantOverrides.add || []).map((v) => ({ ...v, id: v.id || uuidv4() }));

  return [...variants, ...added];
}

/**
 * Build a human-readable label for a variant given the slots config.
 */
export function variantLabel(variant, slots) {
  const parts = Object.entries(variant.slotValues).map(([slotId, valueId]) => {
    const slot = slots.find((s) => s.id === slotId);
    const value = slot?.values.find((v) => v.id === valueId);
    return value?.label || valueId.slice(0, 6);
  });
  return parts.join(' · ') || 'Variant';
}

/**
 * Apply a variant's values to a project snapshot (deep clone), returning the
 * patched project that can be handed to loadProject().
 */
export function applyVariantToProject(project, variant, slots) {
  const patched = JSON.parse(JSON.stringify(project));

  for (const [slotId, valueId] of Object.entries(variant.slotValues)) {
    const slot = slots.find((s) => s.id === slotId);
    if (!slot) continue;
    const value = slot.values.find((v) => v.id === valueId);
    if (!value) continue;

    switch (slot.type) {
      case 'model3d':
        patched.model3d = {
          ...patched.model3d,
          assetId: value.data.assetId ?? patched.model3d.assetId,
          src: value.data.objectUrl ?? patched.model3d.src,
        };
        break;

      case 'background':
        if (value.data.type === 'color') {
          patched.canvasConfig = { ...patched.canvasConfig, backgroundColor: value.data.color };
          patched.background = { ...patched.background, type: 'color', assetId: null, src: null };
        } else {
          patched.background = {
            ...patched.background,
            type: value.data.type || 'image',
            assetId: value.data.assetId ?? patched.background.assetId,
            src: value.data.objectUrl ?? patched.background.src,
          };
        }
        break;

      case 'imageElement':
        patched.elements = patched.elements.map((el) =>
          el.id === slot.targetId
            ? { ...el, assetId: value.data.assetId, src: value.data.objectUrl }
            : el
        );
        break;

      case 'textElement':
      case 'textboxElement':
        patched.elements = patched.elements.map((el) =>
          el.id === slot.targetId
            ? { ...el, content: value.data.content, richContent: null }
            : el
        );
        break;
    }
  }

  return patched;
}

/**
 * Build slot definitions from the current project state.
 * Returns a list of available slots (all inactive by default).
 */
export function buildSlotsFromProject(project) {
  const slots = [];

  // 3D Model slot
  slots.push({
    id: 'slot-model3d',
    label: '3D Model',
    type: 'model3d',
    targetId: '__model3d__',
    active: false,
    values: [],
  });

  // Background slot
  slots.push({
    id: 'slot-background',
    label: 'Background',
    type: 'background',
    targetId: '__background__',
    active: false,
    values: [],
  });

  // Element slots (images + text boxes)
  for (const el of project.elements || []) {
    if (el.type === 'image') {
      slots.push({
        id: `slot-${el.id}`,
        label: el.label || `Image`,
        type: 'imageElement',
        targetId: el.id,
        active: false,
        values: [],
      });
    } else if (el.type === 'text' || el.type === 'textbox') {
      const preview = el.richContent?.map((s) => s.text).join('') || el.content || '';
      slots.push({
        id: `slot-${el.id}`,
        label: el.label || (preview.length > 20 ? preview.slice(0, 20) + '…' : preview) || `Text`,
        type: el.type === 'textbox' ? 'textboxElement' : 'textElement',
        targetId: el.id,
        active: false,
        values: [],
      });
    }
  }

  return slots;
}

/**
 * Merge newly built slots with existing saved slots, preserving active state
 * and values for slots that still exist in the project.
 */
export function mergeSlotsWithSaved(freshSlots, savedSlots) {
  return freshSlots.map((fresh) => {
    const saved = savedSlots.find((s) => s.id === fresh.id);
    return saved ? { ...fresh, active: saved.active, values: saved.values } : fresh;
  });
}
