'use client';

import { useState, useEffect, useCallback } from 'react';
import { useProjectStore } from '@/store/projectStore';
import {
  buildSlotsFromProject,
  mergeSlotsWithSaved,
  generateVariants,
  classifySlots,
} from '@/lib/abTestEngine';
import {
  createDefaultABTest,
  saveABTest,
  listABTests,
  deleteABTest,
} from '@/lib/abTestStorage';
import ABTestSlots from './ABTestSlots';
import ABTestBindings from './ABTestBindings';
import ABTestPreview from './ABTestPreview';
import ABTestExport from './ABTestExport';

const STEPS = [
  { id: 1, label: 'Select', description: 'Choose what varies' },
  { id: 2, label: 'Configure', description: 'Add values & links' },
  { id: 3, label: 'Preview', description: 'Review all variants' },
  { id: 4, label: 'Export', description: 'Bulk export as ZIP' },
];

function StepIndicator({ current, onGoTo, variants }) {
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((step, i) => {
        const isActive = step.id === current;
        const isDone = step.id < current;
        const isClickable = step.id <= current || step.id === current + 1;
        return (
          <div key={step.id} className="flex items-center">
            <button
              onClick={() => isClickable && onGoTo(step.id)}
              disabled={!isClickable}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                isActive
                  ? 'bg-indigo-600 text-white'
                  : isDone
                  ? 'text-indigo-400 hover:bg-[#1a1a1a]'
                  : 'text-gray-600 cursor-default'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                isActive ? 'bg-white/20' : isDone ? 'bg-indigo-900/40' : 'bg-[#1a1a1a]'
              }`}>
                {isDone ? '✓' : step.id}
              </span>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-semibold leading-none">{step.label}</p>
                <p className="text-[9px] opacity-60 leading-none mt-0.5">{step.description}</p>
              </div>
              {step.id === 3 && variants.length > 0 && (
                <span className="text-[9px] bg-white/10 px-1.5 py-0.5 rounded-full font-bold">
                  {variants.filter((v) => !v.excluded).length}
                </span>
              )}
            </button>
            {i < STEPS.length - 1 && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.5" className="flex-shrink-0 mx-1">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function ABTestModal({ onClose, stageRef, bottomStageRef, threeCanvasRef }) {
  const projectState = useProjectStore.getState();
  const projectId = projectState.id;

  const [step, setStep] = useState(1);
  const [config, setConfig] = useState(null);
  const [savedConfigs, setSavedConfigs] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [variants, setVariants] = useState([]);
  const [excludedIds, setExcludedIds] = useState([]);
  const [showConfigList, setShowConfigList] = useState(false);

  // Get current project snapshot for applying variants
  const projectSnapshot = useCallback(() => {
    const s = useProjectStore.getState();
    return {
      id: s.id,
      name: s.name,
      canvasConfig: s.canvasConfig,
      background: s.background,
      model3d: s.model3d,
      elements: s.elements,
      exportConfig: s.exportConfig,
    };
  }, []);

  // Initialize: load or create A/B config for this project
  useEffect(() => {
    async function init() {
      const existing = await listABTests(projectId);
      setSavedConfigs(existing);

      const current = useProjectStore.getState();
      const freshSlots = buildSlotsFromProject(current);

      if (existing.length > 0) {
        const last = existing[0];
        const mergedSlots = mergeSlotsWithSaved(freshSlots, last.slots);
        setConfig({ ...last, slots: mergedSlots, bindingGroups: last.bindingGroups ?? [] });
      } else {
        const newConfig = createDefaultABTest(projectId);
        newConfig.slots = freshSlots;
        setConfig(newConfig);
      }
    }
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Regenerate variants whenever slots/bindings change
  useEffect(() => {
    if (!config) return;
    const generated = generateVariants(config.slots, config.bindings, config.variantOverrides);
    setVariants(generated);
    // Remove stale excludedIds
    setExcludedIds((prev) => prev.filter((id) => generated.some((v) => v.id === id)));
  }, [config]);

  const handleSave = useCallback(async () => {
    if (!config || isSaving) return;
    setIsSaving(true);
    try {
      const saved = await saveABTest(config);
      setSavedConfigs((prev) => {
        const idx = prev.findIndex((c) => c.id === saved.id);
        return idx >= 0 ? prev.map((c) => c.id === saved.id ? saved : c) : [saved, ...prev];
      });
    } finally {
      setIsSaving(false);
    }
  }, [config, isSaving]);

  const handleLoadConfig = useCallback((cfg) => {
    const current = useProjectStore.getState();
    const freshSlots = buildSlotsFromProject(current);
    const mergedSlots = mergeSlotsWithSaved(freshSlots, cfg.slots);
    setConfig({ ...cfg, slots: mergedSlots, bindingGroups: cfg.bindingGroups ?? [] });
    setShowConfigList(false);
    setStep(1);
  }, []);

  const handleNewConfig = useCallback(() => {
    const current = useProjectStore.getState();
    const freshSlots = buildSlotsFromProject(current);
    const newConfig = createDefaultABTest(projectId);
    newConfig.name = `A/B Test ${savedConfigs.length + 1}`;
    newConfig.slots = freshSlots;
    setConfig(newConfig);
    setShowConfigList(false);
    setStep(1);
  }, [projectId, savedConfigs.length]);

  const handleDeleteConfig = useCallback(async (id) => {
    await deleteABTest(id);
    setSavedConfigs((prev) => prev.filter((c) => c.id !== id));
    if (config?.id === id) handleNewConfig();
  }, [config, handleNewConfig]);

  const matrixSize = (() => {
    if (!config) return 0;
    const { freeSlots } = classifySlots(config.slots, config.bindings);
    return freeSlots.reduce((acc, s) => acc * Math.max(s.values.length, 1), 1);
  })();

  if (!config) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0d0d0d] flex items-center justify-center">
        <span className="w-6 h-6 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#0d0d0d] flex flex-col">
      {/* Header */}
      <header className="flex items-center gap-4 px-6 py-3 bg-[#111] border-b border-[#1e1e1e] flex-shrink-0">
        {/* Config name + config switcher */}
        <div className="relative">
          <button
            onClick={() => setShowConfigList((v) => !v)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1a1a1a] hover:bg-[#242424] border border-[#2a2a2a] transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-indigo-400">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
            </svg>
            <input
              value={config.name}
              onChange={(e) => setConfig((c) => ({ ...c, name: e.target.value }))}
              onClick={(e) => e.stopPropagation()}
              className="bg-transparent text-sm text-white font-semibold focus:outline-none w-36"
            />
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          {showConfigList && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl shadow-2xl z-10 overflow-hidden">
              <div className="p-2 border-b border-[#2a2a2a]">
                <button
                  onClick={handleNewConfig}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[#242424] text-xs text-indigo-400 transition-colors"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  New A/B Test
                </button>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {savedConfigs.map((c) => (
                  <div key={c.id} className="flex items-center gap-1 px-2 py-1 hover:bg-[#242424] group">
                    <button onClick={() => handleLoadConfig(c)} className="flex-1 text-left text-xs text-gray-300 py-1 truncate">
                      {c.name}
                    </button>
                    <button onClick={() => handleDeleteConfig(c.id)} className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 text-xs px-1 transition-all">✕</button>
                  </div>
                ))}
                {savedConfigs.length === 0 && (
                  <p className="text-xs text-gray-600 px-3 py-3">No saved configs yet.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Step indicator */}
        <div className="flex-1 flex justify-center">
          <StepIndicator current={step} onGoTo={setStep} variants={variants} />
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <div className="text-[10px] text-gray-600 text-right">
            <p>{variants.length} variant{variants.length !== 1 ? 's' : ''}</p>
            <p>{matrixSize} matrix size</p>
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a1a1a] hover:bg-[#242424] border border-[#2a2a2a] text-xs text-gray-300 hover:text-white transition-colors disabled:opacity-40"
          >
            {isSaving ? (
              <span className="w-3 h-3 rounded-full border border-white/30 border-t-white animate-spin" />
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                <polyline points="17 21 17 13 7 13 7 21"/>
                <polyline points="7 3 7 8 15 8"/>
              </svg>
            )}
            Save
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-[#1a1a1a] transition-colors"
            title="Close"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-hidden flex">
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto">
            {step === 1 && (
              <ABTestSlots
                slots={config.slots}
                onChange={(slots) => setConfig((c) => ({ ...c, slots }))}
              />
            )}
            {step === 2 && (
              <ABTestBindings
                slots={config.slots}
                onChangeSlots={(slots) => setConfig((c) => ({ ...c, slots }))}
                bindingGroups={config.bindingGroups ?? []}
                bindings={config.bindings}
                onChangeGroups={(bindingGroups) => setConfig((c) => ({ ...c, bindingGroups }))}
                onChangeBindings={(bindings) => setConfig((c) => ({ ...c, bindings }))}
              />
            )}
            {step === 3 && (
              <ABTestPreview
                variants={variants}
                slots={config.slots}
                project={projectSnapshot()}
                stageRef={stageRef}
                bottomStageRef={bottomStageRef}
                threeCanvasRef={threeCanvasRef}
                excludedIds={excludedIds}
                onUpdateExcludes={setExcludedIds}
              />
            )}
            {step === 4 && (
              <ABTestExport
                variants={variants}
                slots={config.slots}
                project={projectSnapshot()}
                stageRef={stageRef}
                bottomStageRef={bottomStageRef}
                threeCanvasRef={threeCanvasRef}
                excludedIds={excludedIds}
                configName={config.name}
              />
            )}
          </div>
        </main>
      </div>

      {/* Footer nav */}
      <footer className="flex items-center justify-between px-6 py-3 bg-[#111] border-t border-[#1e1e1e] flex-shrink-0">
        <button
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          disabled={step === 1}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1a1a1a] hover:bg-[#242424] border border-[#2a2a2a] text-sm text-gray-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Back
        </button>

        <div className="flex items-center gap-2">
          {STEPS.map((s) => (
            <div key={s.id} className={`w-1.5 h-1.5 rounded-full transition-colors ${s.id === step ? 'bg-indigo-500' : s.id < step ? 'bg-indigo-900' : 'bg-[#2a2a2a]'}`} />
          ))}
        </div>

        {step < 4 ? (
          <button
            onClick={() => setStep((s) => Math.min(4, s + 1))}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm text-white font-medium transition-colors"
          >
            {step === 1 ? 'Configure Values' : step === 2 ? 'Preview Variants' : step === 3 ? 'Go to Export' : 'Next'}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        ) : (
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#1a1a1a] hover:bg-[#242424] border border-[#2a2a2a] text-sm text-gray-300 hover:text-white transition-colors"
          >
            Close
          </button>
        )}
      </footer>
    </div>
  );
}
