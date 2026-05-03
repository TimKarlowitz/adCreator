import { ASPECT_RATIOS } from '@/store/projectStore';

export const DISPLAY_WIDTH = 800; // Fixed display width for canvas preview

export function useAspectRatio(aspectRatio) {
  const dims = ASPECT_RATIOS[aspectRatio] || ASPECT_RATIOS['1:1'];
  const scale = DISPLAY_WIDTH / dims.width;
  const displayHeight = dims.height * scale;

  return {
    designWidth: dims.width,
    designHeight: dims.height,
    displayWidth: DISPLAY_WIDTH,
    displayHeight,
    scale,
  };
}
