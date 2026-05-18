'use client';

import { useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useAssetStore } from '@/store/assetStore';
import ValueCard from './ValueCard';

// ─────────────────────────────────────────────
// Shared constants
// ─────────────────────────────────────────────

const TYPE_ICONS = {
  model3d:        '⬡',
  background:     '◧',
  imageElement:   '▣',
  textElement:    'T',
  textboxElement: 'T',
};

const TYPE_LABELS = {
  model3d:        '3D Model',
  background:     'Background',
  imageElement:   'Image',
  textElement:    'Text',
  textboxElement: 'Text Box',
};

const TYPE_COLORS = {
  model3d:        { icon: 'bg-indigo-900/60 text-indigo-300', badge: 'bg-indigo-500/15 text-indigo-300', border: 'border-indigo-500/30' },
  background:     { icon: 'bg-violet-900/60 text-violet-300', badge: 'bg-violet-500/15 text-violet-300', border: 'border-violet-500/30' },
  imageElement:   { icon: 'bg-sky-900/60 text-sky-300',       badge: 'bg-sky-500/15 text-sky-300',       border: 'border-sky-500/30' },
  textElement:    { icon: 'bg-amber-900/60 text-amber-300',   badge: 'bg-amber-500/15 text-amber-300',   border: 'border-amber-500/30' },
  textboxElement: { icon: 'bg-amber-900/60 text-amber-300',   badge: 'bg-amber-500/15 text-amber-300',   border: 'border-amber-500/30' },
};

// ─────────────────────────────────────────────
// Value input controls (moved from ABTestSlots)
// ─────────────────────────────────────────────

function AddValueControls({ slotType, onAdd }) {
  const { assets, uploadAsset } = useAssetStore();
  const fileRef = useRef();
  const [text, setText] = useState('');
  const [color, setColor] = useState('#3366ff');
  const [bgMode, setBgMode] = useState('image');
  const [uploading, setUploading] = useState(false);

  const relevantAssets = assets.filter((a) =>
    slotType === 'model3d' ? a.type === '3d' : a.type === 'image'
  );

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploading(true);
    try {
      const { id, objectUrl } = await uploadAsset(file);
      onAdd({ id: uuidv4(), label: file.name.replace(/\.[^.]+$/, ''), data: { assetId: id, objectUrl } });
    } finally {
      setUploading(false);
    }
  };

  const handlePickAsset = (asset) => {
    onAdd({ id: uuidv4(), label: asset.name.replace(/\.[^.]+$/, ''), data: { assetId: asset.id, objectUrl: asset.objectUrl } });
  };

  const handleAddText = () => {
    if (!text.trim()) return;
    onAdd({ id: uuidv4(), label: text.slice(0, 30), data: { content: text } });
    setText('');
  };

  const handleAddColor = () => {
    onAdd({ id: uuidv4(), label: color, data: { type: 'color', color } });
  };

  const handleAddBgImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploading(true);
    try {
      const { id, objectUrl } = await uploadAsset(file);
      onAdd({ id: uuidv4(), label: file.name.replace(/\.[^.]+$/, ''), data: { type: 'image', assetId: id, objectUrl } });
    } finally {
      setUploading(false);
    }
  };

  if (slotType === 'textElement' || slotType === 'textboxElement') {
    return (
      <div className="flex gap-2 mt-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddText()}
          placeholder="Type a text value…"
          className="flex-1 bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500/60 placeholder-gray-700 transition-colors"
        />
        <button
          onClick={handleAddText}
          disabled={!text.trim()}
          className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium transition-colors flex-shrink-0"
        >
          Add
        </button>
      </div>
    );
  }

  if (slotType === 'background') {
    return (
      <div className="mt-3 space-y-2">
        <div className="flex gap-1">
          {['image', 'color'].map((m) => (
            <button
              key={m}
              onClick={() => setBgMode(m)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-colors ${
                bgMode === m ? 'bg-indigo-600 text-white' : 'bg-[#1a1a1a] text-gray-500 hover:text-white'
              }`}
            >
              {m === 'image' ? 'Image / Video' : 'Color'}
            </button>
          ))}
        </div>
        {bgMode === 'color' ? (
          <div className="flex gap-2 items-center">
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer bg-transparent border-0" />
            <span className="text-xs text-gray-400 font-mono">{color}</span>
            <button onClick={handleAddColor}
              className="ml-auto px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors">
              Add Color
            </button>
          </div>
        ) : (
          <div className="space-y-1.5">
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="w-full py-2 rounded-lg border border-dashed border-[#2a2a2a] hover:border-indigo-500/40 text-xs text-gray-600 hover:text-indigo-400 transition-colors">
              {uploading ? 'Uploading…' : '+ Upload image / video'}
            </button>
            <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleAddBgImage} />
            {relevantAssets.length > 0 && (
              <div className="grid grid-cols-5 gap-1 max-h-24 overflow-y-auto">
                {relevantAssets.map((a) => (
                  <button key={a.id}
                    onClick={() => handlePickAsset({ ...a, data: { type: 'image', assetId: a.id, objectUrl: a.objectUrl } })}
                    className="aspect-square rounded-lg bg-[#111] border border-[#2a2a2a] hover:border-indigo-500/40 overflow-hidden transition-colors">
                    <img src={a.objectUrl} alt={a.name} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // model3d or imageElement
  return (
    <div className="mt-3 space-y-1.5">
      <button onClick={() => fileRef.current?.click()} disabled={uploading}
        className="w-full py-2 rounded-lg border border-dashed border-[#2a2a2a] hover:border-indigo-500/40 text-xs text-gray-600 hover:text-indigo-400 transition-colors">
        {uploading ? 'Uploading…' : `+ Upload ${slotType === 'model3d' ? 'GLB / GLTF' : 'image'}`}
      </button>
      <input ref={fileRef} type="file" accept={slotType === 'model3d' ? '.glb,.gltf' : 'image/*'} className="hidden" onChange={handleFileUpload} />
      {relevantAssets.length > 0 && (
        <div className="max-h-28 overflow-y-auto space-y-1">
          <p className="text-[10px] text-gray-700 mb-1">From asset library:</p>
          {relevantAssets.map((a) => (
            <button key={a.id} onClick={() => handlePickAsset(a)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg bg-[#0d0d0d] hover:bg-[#161616] border border-[#1e1e1e] hover:border-indigo-500/30 text-left transition-colors">
              {slotType === 'imageElement' ? (
                <img src={a.objectUrl} className="w-6 h-6 rounded object-cover flex-shrink-0" alt="" />
              ) : (
                <span className="w-6 h-6 rounded-lg bg-indigo-900/40 flex items-center justify-center text-indigo-400 text-[9px] font-bold flex-shrink-0">3D</span>
              )}
              <span className="text-[11px] text-gray-300 truncate">{a.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Slot value status badge
// ─────────────────────────────────────────────

function ValueStatusBadge({ count }) {
  if (count === 0) return (
    <span className="text-[10px] font-medium text-gray-600 bg-[#1a1a1a] px-2 py-0.5 rounded-full">
      No values yet
    </span>
  );
  if (count === 1) return (
    <span className="text-[10px] font-medium text-amber-400 bg-amber-900/20 border border-amber-700/20 px-2 py-0.5 rounded-full">
      1 value — add 1 more
    </span>
  );
  return (
    <span className="text-[10px] font-medium text-green-400 bg-green-900/20 border border-green-700/20 px-2 py-0.5 rounded-full flex items-center gap-1">
      <svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5">
        <polyline points="2 6 5 9 10 3"/>
      </svg>
      {count} values
    </span>
  );
}

// ─────────────────────────────────────────────
// Expandable slot configuration card
// ─────────────────────────────────────────────

function SlotConfigCard({ slot, isDependent, onAddValue, onRemoveValue, onUpdateLabel }) {
  const [expanded, setExpanded] = useState(slot.values.length === 0);
  const colors = TYPE_COLORS[slot.type] || TYPE_COLORS.imageElement;

  return (
    <div className={`rounded-2xl border overflow-hidden transition-colors ${
      isDependent ? 'border-amber-600/30 bg-[#15120a]' : 'border-[#252525] bg-[#0f0f0f]'
    }`}>
      {/* Header row */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/[0.02] transition-colors text-left"
      >
        {/* Type icon */}
        <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 ${colors.icon}`}>
          {TYPE_ICONS[slot.type]}
        </span>

        {/* Name + type */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{slot.label}</p>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${colors.badge}`}>
              {TYPE_LABELS[slot.type]}
            </span>
            {isDependent && (
              <span className="text-[9px] font-semibold text-amber-400 bg-amber-900/25 border border-amber-700/25 px-1.5 py-0.5 rounded-md">
                BOUND
              </span>
            )}
          </div>
        </div>

        {/* Value count + chevron */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <ValueStatusBadge count={slot.values.length} />
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2"
            className={`transition-transform flex-shrink-0 ${expanded ? 'rotate-180' : ''}`}
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </button>

      {/* Expanded body */}
      {expanded && (
        <div className="border-t border-[#1e1e1e] px-4 pb-4 pt-3">
          {/* Existing value cards */}
          {slot.values.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {slot.values.map((v) => (
                <ValueCard
                  key={v.id}
                  value={v}
                  slotType={slot.type}
                  size="md"
                  onEditLabel={(vid, label) => onUpdateLabel(vid, label)}
                  onRemove={(vid) => onRemoveValue(vid)}
                />
              ))}
            </div>
          )}

          {/* Hint when 0 or 1 values */}
          {slot.values.length === 0 && (
            <p className="text-[11px] text-gray-600 mb-3">
              Add at least 2 values to create variants for this asset.
            </p>
          )}

          {/* Add controls */}
          <AddValueControls slotType={slot.type} onAdd={onAddValue} />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Binding row — driver value → pick dependent
// ─────────────────────────────────────────────

function BindingRow({ driverSlot, driverValue, dependentSlot, bindings, onChangeBindings }) {
  const existing = bindings.find(
    (b) =>
      b.driverSlotId === driverSlot.id &&
      b.driverValueId === driverValue.id &&
      b.dependentSlotId === dependentSlot.id
  );

  const handleSelect = (dependentValueId) => {
    const isSame = existing?.dependentValueId === dependentValueId;
    if (isSame) {
      onChangeBindings(bindings.filter((b) => !(
        b.driverSlotId === driverSlot.id &&
        b.driverValueId === driverValue.id &&
        b.dependentSlotId === dependentSlot.id
      )));
      return;
    }
    const updated = {
      id: existing?.id || uuidv4(),
      driverSlotId: driverSlot.id,
      driverValueId: driverValue.id,
      dependentSlotId: dependentSlot.id,
      dependentValueId,
    };
    if (existing) {
      onChangeBindings(bindings.map((b) => (b.id === existing.id ? updated : b)));
    } else {
      onChangeBindings([...bindings, updated]);
    }
  };

  const isBound = !!existing;

  return (
    <div className={`flex items-center gap-3 py-3 px-1 border-b border-[#181818] last:border-0 ${isBound ? '' : 'opacity-80 hover:opacity-100'} transition-opacity`}>
      <div className="flex-shrink-0">
        <ValueCard value={driverValue} slotType={driverSlot.type} size="sm" showLabel />
      </div>

      <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={isBound ? '#6366f1' : '#333'} strokeWidth="1.5" className="transition-colors">
          <line x1="4" y1="12" x2="20" y2="12"/><polyline points="13 5 20 12 13 19"/>
        </svg>
        <span className={`text-[8px] font-medium ${isBound ? 'text-green-500' : 'text-gray-700'}`}>
          {isBound ? 'bound' : '—'}
        </span>
      </div>

      <div className="flex-1 min-w-0 overflow-x-auto">
        <div className="flex gap-2 pb-1">
          {dependentSlot.values.map((depVal) => (
            <ValueCard
              key={depVal.id}
              value={depVal}
              slotType={dependentSlot.type}
              size="sm"
              selected={existing?.dependentValueId === depVal.id}
              onClick={() => handleSelect(depVal.id)}
              showLabel
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Binding group panel
// ─────────────────────────────────────────────

function BindingGroupPanel({ group, slots, bindings, onChangeBindings, onRemove }) {
  const driverSlot = slots.find((s) => s.id === group.driverSlotId);
  const dependentSlot = slots.find((s) => s.id === group.dependentSlotId);
  if (!driverSlot || !dependentSlot) return null;

  const boundCount = driverSlot.values.filter((dv) =>
    bindings.some(
      (b) =>
        b.driverSlotId === driverSlot.id &&
        b.driverValueId === dv.id &&
        b.dependentSlotId === dependentSlot.id
    )
  ).length;
  const total = driverSlot.values.length;
  const isComplete = total > 0 && boundCount === total;

  return (
    <div className="rounded-xl border border-[#252525] bg-[#0d0d0d] overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 bg-[#141414] border-b border-[#1e1e1e]">
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <span className="text-xs font-semibold text-indigo-300 truncate">{driverSlot.label}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="1.5" className="flex-shrink-0">
            <line x1="4" y1="12" x2="20" y2="12"/><polyline points="13 5 20 12 13 19"/>
          </svg>
          <span className="text-xs font-semibold text-amber-300 truncate">{dependentSlot.label}</span>
        </div>

        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
          isComplete ? 'bg-green-900/30 text-green-400' : 'bg-amber-900/30 text-amber-500'
        }`}>
          {boundCount}/{total} bound
        </span>

        <button onClick={onRemove}
          className="text-gray-600 hover:text-red-400 transition-colors ml-1 flex-shrink-0"
          title="Remove binding group">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <div className="flex items-center gap-3 px-5 pt-2.5 pb-0">
        <p className="w-16 flex-shrink-0 text-[9px] text-indigo-400/60 uppercase tracking-wider">{driverSlot.label}</p>
        <div className="w-[18px] flex-shrink-0" />
        <p className="flex-1 text-[9px] text-amber-400/60 uppercase tracking-wider">→ {dependentSlot.label} (click to bind)</p>
      </div>

      <div className="px-4 pb-2">
        {driverSlot.values.length === 0 ? (
          <p className="text-xs text-gray-700 py-3 text-center">Add values to &quot;{driverSlot.label}&quot; above first.</p>
        ) : dependentSlot.values.length === 0 ? (
          <p className="text-xs text-gray-700 py-3 text-center">Add values to &quot;{dependentSlot.label}&quot; above first.</p>
        ) : (
          driverSlot.values.map((dv) => (
            <BindingRow
              key={dv.id}
              driverSlot={driverSlot}
              driverValue={dv}
              dependentSlot={dependentSlot}
              bindings={bindings}
              onChangeBindings={onChangeBindings}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main component — Configure (Step 2)
// ─────────────────────────────────────────────

export default function ABTestBindings({
  slots,
  onChangeSlots,
  bindingGroups,
  bindings,
  onChangeGroups,
  onChangeBindings,
}) {
  const [showBindings, setShowBindings] = useState(bindingGroups.length > 0);
  const [addDriver, setAddDriver] = useState('');
  const [addDependent, setAddDependent] = useState('');

  const activeSlots = slots.filter((s) => s.active);
  const slotsWithValues = activeSlots.filter((s) => s.values.length > 0);
  const canBind = slotsWithValues.length >= 2;
  const dependentSlotIds = new Set(bindings.map((b) => b.dependentSlotId));

  const totalValues = activeSlots.reduce((sum, s) => sum + s.values.length, 0);
  const readySlots = activeSlots.filter((s) => s.values.length >= 2).length;

  // Value management
  const updateSlot = (slotId, updater) => {
    onChangeSlots(slots.map((s) => (s.id === slotId ? updater(s) : s)));
  };

  // Binding management
  const alreadyGrouped = (driverSlotId, dependentSlotId) =>
    bindingGroups.some((g) => g.driverSlotId === driverSlotId && g.dependentSlotId === dependentSlotId);

  const canAdd =
    addDriver && addDependent && addDriver !== addDependent && !alreadyGrouped(addDriver, addDependent);

  const handleAddGroup = () => {
    if (!canAdd) return;
    onChangeGroups([...bindingGroups, { id: uuidv4(), driverSlotId: addDriver, dependentSlotId: addDependent }]);
    setAddDriver('');
    setAddDependent('');
  };

  const handleRemoveGroup = (groupId, driverSlotId, dependentSlotId) => {
    onChangeGroups(bindingGroups.filter((g) => g.id !== groupId));
    onChangeBindings(bindings.filter((b) => !(b.driverSlotId === driverSlotId && b.dependentSlotId === dependentSlotId)));
  };

  // No active slots
  if (activeSlots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-12 h-12 rounded-xl bg-[#141414] border border-[#252525] flex items-center justify-center mb-4">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="1.5">
            <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
          </svg>
        </div>
        <p className="text-sm text-gray-500 mb-1">No assets selected yet.</p>
        <p className="text-xs text-gray-700">Go back to Step 1 and select the assets you want to vary.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Step header with progress */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-semibold text-white">Configure variation values</h2>
          {totalValues > 0 && (
            <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${
              readySlots === activeSlots.length
                ? 'text-green-400 bg-green-900/20 border-green-700/25'
                : 'text-amber-400 bg-amber-900/20 border-amber-700/25'
            }`}>
              {readySlots}/{activeSlots.length} ready
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 leading-relaxed">
          Add at least 2 values for each asset. Each value represents one variation — they combine to form the full variant matrix.
        </p>
      </div>

      {/* Slot config cards */}
      {activeSlots.map((slot) => (
        <SlotConfigCard
          key={slot.id}
          slot={slot}
          isDependent={dependentSlotIds.has(slot.id)}
          onAddValue={(val) => updateSlot(slot.id, (s) => ({ ...s, values: [...s.values, val] }))}
          onRemoveValue={(vid) => updateSlot(slot.id, (s) => ({ ...s, values: s.values.filter((v) => v.id !== vid) }))}
          onUpdateLabel={(vid, label) => updateSlot(slot.id, (s) => ({ ...s, values: s.values.map((v) => (v.id === vid ? { ...v, label } : v)) }))}
        />
      ))}

      {/* ─── Bindings section ─── */}
      {canBind && (
        <div className="mt-2">
          {/* Toggle header */}
          <button
            onClick={() => setShowBindings((v) => !v)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border border-dashed border-[#2a2a2a] hover:border-[#3a3a3a] bg-[#0d0d0d] hover:bg-[#111] transition-all group"
          >
            <div className="w-7 h-7 rounded-xl bg-[#1a1a1a] group-hover:bg-[#222] border border-[#2a2a2a] flex items-center justify-center flex-shrink-0 transition-colors">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.5">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
            </div>
            <div className="flex-1 text-left">
              <p className="text-xs font-semibold text-gray-300">Link slots together <span className="text-gray-600 font-normal">(optional)</span></p>
              <p className="text-[10px] text-gray-600 mt-0.5">
                {bindingGroups.length > 0
                  ? `${bindingGroups.length} binding group${bindingGroups.length !== 1 ? 's' : ''} active — reduces variant count`
                  : 'Tie slot values together so they change in sync, reducing variant count'}
              </p>
            </div>
            {bindingGroups.length > 0 && (
              <span className="text-[10px] font-medium text-indigo-400 bg-indigo-900/20 px-2 py-0.5 rounded-full flex-shrink-0">
                {bindingGroups.length} group{bindingGroups.length !== 1 ? 's' : ''}
              </span>
            )}
            <svg
              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2"
              className={`flex-shrink-0 transition-transform ${showBindings ? 'rotate-180' : ''}`}
            >
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          {/* Bindings content */}
          {showBindings && (
            <div className="mt-3 space-y-3">
              {/* Explainer */}
              <div className="px-4 py-3 rounded-xl bg-[#0d0d0d] border border-[#1e1e1e] text-xs text-gray-500 leading-relaxed">
                <strong className="text-gray-300">How bindings work:</strong> Choose a driver slot and a dependent slot.
                For each driver value, pick which dependent value pairs with it.
                Fully-bound slots are removed from the free matrix, reducing the total variant count.
              </div>

              {/* Existing binding groups */}
              {bindingGroups.map((group) => (
                <BindingGroupPanel
                  key={group.id}
                  group={group}
                  slots={slotsWithValues}
                  bindings={bindings}
                  onChangeBindings={onChangeBindings}
                  onRemove={() => handleRemoveGroup(group.id, group.driverSlotId, group.dependentSlotId)}
                />
              ))}

              {bindingGroups.length === 0 && (
                <p className="text-center text-xs text-gray-700 py-2">
                  No binding groups yet — all slots will form a free matrix.
                </p>
              )}

              {/* Add new group */}
              <div className="rounded-xl border border-[#252525] bg-[#0d0d0d] p-4 space-y-3">
                <p className="text-xs font-medium text-gray-400">Add binding group</p>
                <div className="flex items-end gap-2">
                  <div className="flex-1 min-w-0">
                    <label className="text-[10px] text-gray-600 mb-1 block">Driver</label>
                    <select
                      value={addDriver}
                      onChange={(e) => setAddDriver(e.target.value)}
                      className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500/60 transition-colors"
                    >
                      <option value="">Select slot…</option>
                      {slotsWithValues.map((s) => (
                        <option key={s.id} value={s.id} disabled={s.id === addDependent}>{s.label}</option>
                      ))}
                    </select>
                  </div>

                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.5" className="flex-shrink-0 mb-2">
                    <line x1="4" y1="12" x2="20" y2="12"/><polyline points="13 5 20 12 13 19"/>
                  </svg>

                  <div className="flex-1 min-w-0">
                    <label className="text-[10px] text-gray-600 mb-1 block">Dependent</label>
                    <select
                      value={addDependent}
                      onChange={(e) => setAddDependent(e.target.value)}
                      className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500/60 transition-colors"
                    >
                      <option value="">Select slot…</option>
                      {slotsWithValues.map((s) => (
                        <option key={s.id} value={s.id} disabled={s.id === addDriver}>{s.label}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={handleAddGroup}
                    disabled={!canAdd}
                    className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium transition-colors flex-shrink-0"
                  >
                    Add
                  </button>
                </div>

                {addDriver && addDependent && addDriver === addDependent && (
                  <p className="text-[10px] text-red-400">Driver and dependent must be different slots.</p>
                )}
                {addDriver && addDependent && addDriver !== addDependent && alreadyGrouped(addDriver, addDependent) && (
                  <p className="text-[10px] text-amber-400">This binding group already exists.</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Hint when can't bind yet */}
      {!canBind && activeSlots.length >= 2 && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#0d0d0d] border border-[#1e1e1e] text-xs text-gray-600">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.5" className="flex-shrink-0">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>
          Add values to at least 2 slots to unlock slot linking.
        </div>
      )}
    </div>
  );
}
