const SNAP_THRESHOLD = 8;

/**
 * Given a dragging element and all other elements + canvas config,
 * compute snap positions and guide lines.
 *
 * Returns: { snappedX, snappedY, guides: [{x?, y?, width?, height?}] }
 */
export function computeSnap({ x, y, width, height, canvasWidth, canvasHeight, otherElements }) {
  const guides = [];
  let snappedX = x;
  let snappedY = y;

  // Reference lines: canvas center + edges
  const hLines = [0, canvasWidth / 2, canvasWidth];
  const vLines = [0, canvasHeight / 2, canvasHeight];

  // Add other elements' edges and centers
  for (const el of otherElements) {
    hLines.push(el.x, el.x + el.width / 2, el.x + el.width);
    vLines.push(el.y, el.y + el.height / 2, el.y + el.height);
  }

  // Snap points on the dragging element
  const elHPoints = [x, x + width / 2, x + width];
  const elVPoints = [y, y + height / 2, y + height];

  // Check horizontal snaps
  for (const elH of elHPoints) {
    for (const ref of hLines) {
      if (Math.abs(elH - ref) < SNAP_THRESHOLD) {
        const offset = elH - x;
        snappedX = ref - offset;
        guides.push({ x: ref, y: 0, height: canvasHeight });
        break;
      }
    }
  }

  // Check vertical snaps
  for (const elV of elVPoints) {
    for (const ref of vLines) {
      if (Math.abs(elV - ref) < SNAP_THRESHOLD) {
        const offset = elV - y;
        snappedY = ref - offset;
        guides.push({ x: 0, y: ref, width: canvasWidth });
        break;
      }
    }
  }

  return { snappedX, snappedY, guides };
}

export function useSnap(canvasWidth, canvasHeight) {
  return {
    snap: (pos, dragEl, allElements) => {
      const others = allElements.filter((e) => e.id !== dragEl.id);
      return computeSnap({
        x: pos.x,
        y: pos.y,
        width: dragEl.width,
        height: dragEl.height,
        canvasWidth,
        canvasHeight,
        otherElements: others,
      });
    },
  };
}
