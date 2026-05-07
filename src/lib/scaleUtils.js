/**
 * Scale element positions and sizes when switching aspect ratios.
 * Both axes are scaled independently so the layout is preserved across
 * any ratio transition. Font sizes are intentionally left untouched —
 * they are stored in design-space pixels and re-scaled by the display
 * scale factor at render time.
 */
export function scaleElementsForRatio(elements, oldWidth, oldHeight, newWidth, newHeight) {
  const scaleX = newWidth / oldWidth;
  const scaleY = newHeight / oldHeight;
  return elements.map((el) => {
    const newW = el.width * scaleX;
    const newH = el.height * scaleY;
    return {
      ...el,
      x: Math.max(0, Math.min(el.x * scaleX, newWidth - newW)),
      y: Math.max(0, Math.min(el.y * scaleY, newHeight - newH)),
      width: newW,
      height: newH,
    };
  });
}

/**
 * Clamp element bounds to canvas bounds.
 */
export function clampToBounds(el, canvasWidth, canvasHeight) {
  return {
    ...el,
    x: Math.max(0, Math.min(el.x, canvasWidth - el.width)),
    y: Math.max(0, Math.min(el.y, canvasHeight - el.height)),
  };
}

/**
 * Given design-space coords, compute display-space coords based on zoom/scale.
 */
export function designToDisplay(val, scale) {
  return val * scale;
}

export function displayToDesign(val, scale) {
  return val / scale;
}
