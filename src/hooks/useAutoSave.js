import { useEffect, useRef, useState, useCallback } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { extractProjectData, saveProject, setLastOpenedId } from '@/lib/projectStorage';

const DEBOUNCE_MS = 2000;

/**
 * Subscribes to project state changes and auto-saves to IndexedDB after a brief
 * debounce. Also tracks saving status so the UI can show a save indicator.
 *
 * @param {() => string|null} getThumb - Optional callback that returns a base64
 *   thumbnail data URL (e.g. from stageRef.current.toDataURL).
 * @returns {{ isSaving: boolean, lastSaved: number|null }}
 */
export function useAutoSave(getThumb) {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const timerRef = useRef(null);
  const getThumbRef = useRef(getThumb);

  useEffect(() => {
    getThumbRef.current = getThumb;
  }, [getThumb]);

  useEffect(() => {
    const unsubscribe = useProjectStore.subscribe((state, prev) => {
      // Only react to meaningful project-data changes, not UI state
      if (
        state.elements === prev.elements &&
        state.background === prev.background &&
        state.model3d === prev.model3d &&
        state.canvasConfig === prev.canvasConfig &&
        state.name === prev.name &&
        state.exportConfig === prev.exportConfig
      ) {
        return;
      }

      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(async () => {
        setIsSaving(true);
        try {
          const projectData = extractProjectData(useProjectStore.getState());
          const thumbnail = getThumbRef.current?.() ?? null;
          await saveProject(projectData, thumbnail);
          await setLastOpenedId(projectData.id);
          setLastSaved(Date.now());
        } catch (e) {
          console.warn('Auto-save failed:', e);
        } finally {
          setIsSaving(false);
        }
      }, DEBOUNCE_MS);
    });

    return () => {
      unsubscribe();
      clearTimeout(timerRef.current);
    };
  }, []);

  /** Immediately flush any pending auto-save and persist right now. */
  const saveNow = useCallback(async (thumbnail = null) => {
    clearTimeout(timerRef.current);
    setIsSaving(true);
    try {
      const projectData = extractProjectData(useProjectStore.getState());
      const thumb = thumbnail ?? getThumbRef.current?.() ?? null;
      await saveProject(projectData, thumb);
      await setLastOpenedId(projectData.id);
      setLastSaved(Date.now());
    } catch (e) {
      console.warn('Save failed:', e);
    } finally {
      setIsSaving(false);
    }
  }, []);

  return { isSaving, lastSaved, saveNow };
}
