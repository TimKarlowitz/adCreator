'use client';

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
  model3d:        { icon: 'bg-indigo-900/60 text-indigo-300', badge: 'bg-indigo-500/15 text-indigo-300', activeBorder: 'border-indigo-500/70 bg-indigo-950/30 shadow-indigo-900/20' },
  background:     { icon: 'bg-violet-900/60 text-violet-300', badge: 'bg-violet-500/15 text-violet-300', activeBorder: 'border-violet-500/70 bg-violet-950/30 shadow-violet-900/20' },
  imageElement:   { icon: 'bg-sky-900/60 text-sky-300',       badge: 'bg-sky-500/15 text-sky-300',       activeBorder: 'border-sky-500/70 bg-sky-950/30 shadow-sky-900/20' },
  textElement:    { icon: 'bg-amber-900/60 text-amber-300',   badge: 'bg-amber-500/15 text-amber-300',   activeBorder: 'border-amber-500/70 bg-amber-950/30 shadow-amber-900/20' },
  textboxElement: { icon: 'bg-amber-900/60 text-amber-300',   badge: 'bg-amber-500/15 text-amber-300',   activeBorder: 'border-amber-500/70 bg-amber-950/30 shadow-amber-900/20' },
};

function SlotCard({ slot, onToggle }) {
  const colors = TYPE_COLORS[slot.type] || TYPE_COLORS.imageElement;
  const valCount = slot.values.length;

  return (
    <button
      onClick={onToggle}
      className={[
        'relative w-full text-left rounded-2xl border-2 p-4 transition-all duration-200 group',
        slot.active
          ? `${colors.activeBorder} shadow-xl`
          : 'border-[#252525] bg-[#0f0f0f] hover:border-[#363636] hover:bg-[#141414]',
      ].join(' ')}
    >
      {/* Checkmark badge */}
      <div className={[
        'absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center transition-all duration-200',
        slot.active
          ? 'bg-indigo-500 shadow-lg shadow-indigo-900/60 scale-100 opacity-100'
          : 'bg-[#222] scale-90 opacity-40 group-hover:opacity-60',
      ].join(' ')}>
        {slot.active ? (
          <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.5">
            <polyline points="2 6 5 9 10 3"/>
          </svg>
        ) : (
          <span className="text-[8px] text-gray-500">+</span>
        )}
      </div>

      {/* Icon */}
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 text-sm font-bold transition-colors ${colors.icon}`}>
        {TYPE_ICONS[slot.type]}
      </div>

      {/* Name */}
      <p className={`text-sm font-semibold leading-tight mb-1.5 transition-colors ${slot.active ? 'text-white' : 'text-gray-300'}`}>
        {slot.label}
      </p>

      {/* Bottom row: type badge + values count */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${colors.badge}`}>
          {TYPE_LABELS[slot.type]}
        </span>
        {valCount > 0 && (
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${
            valCount >= 2 ? 'bg-green-900/30 text-green-400' : 'bg-amber-900/30 text-amber-400'
          }`}>
            {valCount} value{valCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </button>
  );
}

export default function ABTestSlots({ slots, onChange }) {
  const activeCount = slots.filter((s) => s.active).length;

  const toggleSlot = (slotId) => {
    onChange(slots.map((s) => (s.id === slotId ? { ...s, active: !s.active } : s)));
  };

  return (
    <div>
      {/* Step header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-semibold text-white">Which assets should vary?</h2>
          {activeCount > 0 && (
            <span className="text-xs font-semibold text-indigo-300 bg-indigo-900/30 border border-indigo-700/30 px-3 py-1 rounded-full">
              {activeCount} of {slots.length} selected
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 leading-relaxed">
          Select the elements you want to A/B test. You&apos;ll define the actual values (images, text, 3D files) in the next step.
        </p>
      </div>

      {/* Selection grid */}
      <div className="grid grid-cols-2 gap-3">
        {slots.map((slot) => (
          <SlotCard key={slot.id} slot={slot} onToggle={() => toggleSlot(slot.id)} />
        ))}
      </div>

      {/* Contextual footer hints */}
      {activeCount === 0 && (
        <div className="mt-8 flex flex-col items-center gap-2 text-center py-4">
          <div className="w-10 h-10 rounded-xl bg-[#161616] border border-[#2a2a2a] flex items-center justify-center mb-1">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.5">
              <rect x="3" y="3" width="7" height="7" rx="1"/>
              <rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="3" y="14" width="7" height="7" rx="1"/>
              <rect x="14" y="14" width="7" height="7" rx="1"/>
            </svg>
          </div>
          <p className="text-sm text-gray-500">Select at least one asset to start building your A/B test.</p>
          <p className="text-xs text-gray-700">Each selected asset becomes a dimension in the variant matrix.</p>
        </div>
      )}

      {activeCount > 0 && (
        <div className="mt-6 flex items-start gap-2 text-xs text-gray-600 bg-[#111] border border-[#1e1e1e] rounded-xl px-4 py-3">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" className="flex-shrink-0 mt-0.5">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span>
            In the next step you&apos;ll add the actual variation values for each selected asset and optionally link slots together.
          </span>
        </div>
      )}
    </div>
  );
}
