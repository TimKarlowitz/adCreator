/**
 * Mutable singleton for deterministic Three.js rotation during GIF/video export.
 *
 * During normal preview the model rotates via useFrame's real-time delta.
 * During export the rotation must be frame-perfect: frame N should always show
 * exactly angle = (N / totalFrames) × totalAngle, regardless of how long the
 * CPU takes to composite and write each frame.
 *
 * Usage (in useExport.js):
 *   exportFrameControl.active = true;
 *   exportFrameControl.angle  = (frame / totalFrames) * totalAngle;
 *   await waitForRender();   // allow R3F to paint this exact angle
 *   // capture canvas …
 *   exportFrameControl.active = false; // in finally
 *
 * R3F's useFrame reads .active and .angle on every tick and applies them
 * as an absolute quaternion (setRotationFromAxisAngle) instead of the usual
 * incremental rotateOnAxis call.
 */
export const exportFrameControl = {
  active: false,
  angle: 0,
};

/**
 * Returns a promise that resolves after the next requestAnimationFrame tick.
 * Because R3F schedules its render callback before ours (it was registered
 * first when the Canvas mounted), R3F will have already rendered the latest
 * exportFrameControl.angle by the time our resolve callback fires.
 */
export function waitForRender() {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}
