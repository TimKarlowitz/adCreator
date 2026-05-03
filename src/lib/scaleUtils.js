/**
 * Scale element positions/sizes when switching aspect ratios.
 * Only positions and box dimensions are scaled — font sizes are not.
 */
export function scaleElementsForRatio(elements, oldHeight, newHeight) {
  const scaleY = newHeight / oldHeight;
  return elements.map((el) => ({
    ...el,
    y: el.y * scaleY,
    height: el.height * scaleY,
  }));
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
