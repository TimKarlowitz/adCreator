'use client';

import { useRef, useState } from 'react';
import { useProjectStore } from '@/store/projectStore';
import FontPickerModal from '@/components/modals/FontPickerModal';
import RichTextEditor from '@/components/elements/RichTextEditor';

export default function RightPanel() {
  const { elements, selectedId, updateElement, model3d, updateModel3d, exportConfig } = useProjectStore();
  const [showFontPicker, setShowFontPicker] = useState(false);

  const [width, setWidth] = useState(256);
  const dragStartX = useRef(null);
  const dragStartWidth = useRef(null);

  const handleResizeMouseDown = (e) => {
    e.preventDefault();
    dragStartX.current = e.clientX;
    dragStartWidth.current = width;

    const onMouseMove = (e) => {
      const delta = e.clientX - dragStartX.current;
      setWidth(Math.max(180, Math.min(520, dragStartWidth.current - delta)));
    };
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const resizeHandle = (
    <div
      onMouseDown={handleResizeMouseDown}
      title="Drag to resize panel"
      className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize z-20 group"
    >
      <div className="absolute inset-y-0 left-0 w-1 bg-transparent group-hover:bg-indigo-500/60 transition-colors duration-150" />
    </div>
  );

  const selected = elements.find((e) => e.id === selectedId);

  if (!selectedId || selectedId === '__model3d__') {
    return (
      <aside
        className="bg-[#111] border-l border-[#2a2a2a] flex flex-col relative flex-shrink-0"
        style={{ width }}
      >
        {resizeHandle}
        <Model3dPanel model={model3d} onUpdate={updateModel3d} exportConfig={exportConfig} />
      </aside>
    );
  }

  if (!selected) return null;

  return (
    <aside
      className="bg-[#111] border-l border-[#2a2a2a] flex flex-col overflow-y-auto relative flex-shrink-0"
      style={{ width }}
    >
      {resizeHandle}
      <div className="p-3 border-b border-[#2a2a2a]">
        <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">
          {selected.type.toUpperCase()} ELEMENT
        </p>
        <p className="text-xs text-gray-400 truncate">
          {selected.richContent?.length
            ? selected.richContent.map((s) => s.text).join('')
            : selected.content || selected.variant || selected.type}
        </p>
      </div>

      {/* Position & Size */}
      <Section title="Position & Size">
        <Grid2>
          <NumInput label="X" value={Math.round(selected.x)} onChange={(v) => updateElement(selectedId, { x: v })} />
          <NumInput label="Y" value={Math.round(selected.y)} onChange={(v) => updateElement(selectedId, { y: v })} />
          <NumInput label="W" value={Math.round(selected.width)} onChange={(v) => updateElement(selectedId, { width: v })} />
          <NumInput label="H" value={Math.round(selected.height)} onChange={(v) => updateElement(selectedId, { height: v })} />
        </Grid2>
        <NumInput label="Rotation" value={Math.round(selected.rotation || 0)} onChange={(v) => updateElement(selectedId, { rotation: v })} />
      </Section>

      {/* Text properties */}
      {(selected.type === 'text' || selected.type === 'textbox') && (
        <Section title="Text Style">
          <div className="space-y-2">
            <button
              onClick={() => setShowFontPicker(true)}
              className="w-full text-left px-2 py-1.5 rounded bg-[#1a1a1a] border border-[#333] text-xs text-gray-300 hover:border-indigo-500 transition-colors"
            >
              <span className="text-gray-500 mr-2">Font</span>
              {selected.style?.fontFamily || 'Geist'}
            </button>
            <NumInput
              label="Font Size"
              value={selected.style?.fontSize || 24}
              onChange={(v) => updateElement(selectedId, { style: { ...selected.style, fontSize: v } })}
            />
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 w-20 flex-shrink-0">Line Spacing</label>
              <input
                type="range"
                min={0.8}
                max={3}
                step={0.05}
                value={selected.style?.lineHeight ?? 1.3}
                onChange={(e) => updateElement(selectedId, { style: { ...selected.style, lineHeight: Number(e.target.value) } })}
                className="flex-1 min-w-0"
              />
              <span className="text-xs text-gray-400 w-8 text-right flex-shrink-0">
                {(selected.style?.lineHeight ?? 1.3).toFixed(2)}
              </span>
            </div>
            <div className="flex gap-2 items-center">
              <label className="text-xs text-gray-500 w-16">Color</label>
              <input
                type="color"
                value={selected.style?.color || '#ffffff'}
                onChange={(e) => updateElement(selectedId, { style: { ...selected.style, color: e.target.value } })}
                className="w-8 h-7 rounded cursor-pointer border border-[#333] bg-transparent"
              />
              <span className="text-xs text-gray-400">{selected.style?.color || '#ffffff'}</span>
            </div>
            <div className="flex gap-1">
              {['left', 'center', 'right'].map((a) => (
                <button
                  key={a}
                  onClick={() => updateElement(selectedId, { style: { ...selected.style, align: a } })}
                  className={`flex-1 py-1 rounded text-xs transition-colors ${
                    selected.style?.align === a ? 'bg-indigo-600 text-white' : 'bg-[#1a1a1a] text-gray-400 hover:bg-[#2a2a2a]'
                  }`}
                >
                  {a[0].toUpperCase() + a.slice(1)}
                </button>
              ))}
            </div>
            <div className="flex gap-1">
              {['top', 'center', 'bottom'].map((a) => (
                <button
                  key={a}
                  onClick={() => updateElement(selectedId, { style: { ...selected.style, verticalAlign: a } })}
                  className={`flex-1 py-1 rounded text-xs transition-colors ${
                    (selected.style?.verticalAlign ?? 'top') === a ? 'bg-indigo-600 text-white' : 'bg-[#1a1a1a] text-gray-400 hover:bg-[#2a2a2a]'
                  }`}
                >
                  {a[0].toUpperCase() + a.slice(1)}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Toggle
                label="Bold"
                value={selected.style?.bold}
                onChange={(v) => updateElement(selectedId, { style: { ...selected.style, bold: v } })}
              />
              <Toggle
                label="Underline"
                value={selected.style?.underline}
                onChange={(v) => updateElement(selectedId, { style: { ...selected.style, underline: v } })}
              />
            </div>
            {selected.type === 'text' && (
              <BackgroundColorControl
                value={selected.style?.background ?? null}
                defaultColor="rgba(0,0,0,0.6)"
                onChange={(v) => updateElement(selectedId, { style: { ...selected.style, background: v } })}
              />
            )}
          </div>
        </Section>
      )}

      {/* TextBox extras */}
      {selected.type === 'textbox' && (
        <Section title="Box Style">
          <div className="space-y-2">
            <div className="flex gap-2 items-center">
              <label className="text-xs text-gray-500 w-20">Border</label>
              <input
                type="color"
                value={selected.style?.borderColor || '#ffffff'}
                onChange={(e) => updateElement(selectedId, { style: { ...selected.style, borderColor: e.target.value } })}
                className="w-8 h-7 rounded cursor-pointer border border-[#333] bg-transparent"
              />
              <NumInput
                label="Width"
                value={selected.style?.borderWidth || 2}
                onChange={(v) => updateElement(selectedId, { style: { ...selected.style, borderWidth: v } })}
              />
            </div>
            <NumInput
              label="Padding"
              value={selected.style?.padding || 12}
              onChange={(v) => updateElement(selectedId, { style: { ...selected.style, padding: v } })}
            />
            <NumInput
              label="Radius"
              value={selected.style?.borderRadius || 4}
              onChange={(v) => updateElement(selectedId, { style: { ...selected.style, borderRadius: v } })}
            />
            <BackgroundColorControl
              value={selected.style?.background ?? null}
              defaultColor="rgba(0,0,0,0.5)"
              onChange={(v) => updateElement(selectedId, { style: { ...selected.style, background: v } })}
            />
          </div>
        </Section>
      )}

      {/* Image tint */}
      {selected.type === 'image' && (
        <Section title="Image Style">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 w-16">Tint</label>
              <button
                onClick={() => {
                  const next = selected.style?.tintColor ? null : '#ffffff';
                  updateElement(selectedId, { style: { ...selected.style, tintColor: next } });
                }}
                className={`px-3 py-1 rounded text-xs transition-colors border ${
                  selected.style?.tintColor
                    ? 'bg-indigo-600 border-indigo-500 text-white'
                    : 'bg-[#1a1a1a] border-[#333] text-gray-400 hover:bg-[#2a2a2a]'
                }`}
              >
                {selected.style?.tintColor ? 'On' : 'Off'}
              </button>
            </div>
            {selected.style?.tintColor && (
              <div className="flex gap-2 items-center">
                <label className="text-xs text-gray-500 w-16">Color</label>
                <input
                  type="color"
                  value={selected.style.tintColor}
                  onChange={(e) =>
                    updateElement(selectedId, { style: { ...selected.style, tintColor: e.target.value } })
                  }
                  className="w-8 h-7 rounded cursor-pointer border border-[#333] bg-transparent"
                />
                <span className="text-xs text-gray-400">{selected.style.tintColor}</span>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Image box style */}
      {selected.type === 'image' && (
        <Section title="Box Style">
          <div className="space-y-2">
            <div className="flex gap-2 items-center">
              <label className="text-xs text-gray-500 w-20">Border</label>
              <input
                type="color"
                value={selected.style?.borderColor || '#ffffff'}
                onChange={(e) => updateElement(selectedId, { style: { ...selected.style, borderColor: e.target.value } })}
                className="w-8 h-7 rounded cursor-pointer border border-[#333] bg-transparent"
              />
              <NumInput
                label="Width"
                value={selected.style?.borderWidth ?? 0}
                onChange={(v) => updateElement(selectedId, { style: { ...selected.style, borderWidth: v } })}
              />
            </div>
            <NumInput
              label="Radius"
              value={selected.style?.borderRadius ?? 0}
              onChange={(v) => updateElement(selectedId, { style: { ...selected.style, borderRadius: v } })}
            />
            <div className="flex gap-2 items-center">
              <label className="text-xs text-gray-500 w-20">Background</label>
              <button
                onClick={() => {
                  const next = selected.style?.boxBackground ? null : 'rgba(0,0,0,0.4)';
                  updateElement(selectedId, { style: { ...selected.style, boxBackground: next } });
                }}
                className={`px-3 py-1 rounded text-xs transition-colors border ${
                  selected.style?.boxBackground
                    ? 'bg-indigo-600 border-indigo-500 text-white'
                    : 'bg-[#1a1a1a] border-[#333] text-gray-400 hover:bg-[#2a2a2a]'
                }`}
              >
                {selected.style?.boxBackground ? 'On' : 'Off'}
              </button>
              {selected.style?.boxBackground && (
                <input
                  type="color"
                  value={selected.style.boxBackground.startsWith('#') ? selected.style.boxBackground : '#000000'}
                  onChange={(e) => updateElement(selectedId, { style: { ...selected.style, boxBackground: e.target.value } })}
                  className="w-8 h-7 rounded cursor-pointer border border-[#333] bg-transparent"
                />
              )}
            </div>
          </div>
        </Section>
      )}

      {/* Arrow style */}
      {selected.type === 'arrow' && (
        <Section title="Arrow Style">
          <div className="flex gap-2 items-center">
            <label className="text-xs text-gray-500 w-16">Color</label>
            <input
              type="color"
              value={selected.style?.color || '#ffffff'}
              onChange={(e) => updateElement(selectedId, { style: { ...selected.style, color: e.target.value } })}
              className="w-8 h-7 rounded cursor-pointer border border-[#333] bg-transparent"
            />
          </div>
          <NumInput
            label="Stroke Width"
            value={selected.style?.strokeWidth || 3}
            onChange={(v) => updateElement(selectedId, { style: { ...selected.style, strokeWidth: v } })}
          />
        </Section>
      )}

      {/* Rich text content editor */}
      {(selected.type === 'text' || selected.type === 'textbox') && (
        <Section title="Content">
          <RichTextEditor
            key={selectedId}
            richContent={
              selected.richContent?.length
                ? selected.richContent
                : selected.content
                ? [{ text: selected.content }]
                : []
            }
            defaultStyle={selected.style}
            onChange={(segs) => {
              const plain = segs.map((s) => s.text).join('');
              updateElement(selectedId, { richContent: segs, content: plain });
            }}
          />
        </Section>
      )}

      {/* Animation */}
      <Section title="Animation">
        <AnimationPanel
          animation={selected.animation}
          onChange={(anim) => updateElement(selectedId, { animation: anim })}
        />
      </Section>

      {showFontPicker && (
        <FontPickerModal
          currentFont={selected.style?.fontFamily}
          onSelect={(font) => {
            updateElement(selectedId, { style: { ...selected.style, fontFamily: font } });
            setShowFontPicker(false);
          }}
          onClose={() => setShowFontPicker(false)}
        />
      )}
    </aside>
  );
}

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
}

function parseBackground(bg) {
  if (!bg) return { hex: '#000000', opacity: 0.5 };
  const rgba = bg.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/);
  if (rgba) {
    return {
      hex: rgbToHex(+rgba[1], +rgba[2], +rgba[3]),
      opacity: rgba[4] !== undefined ? +rgba[4] : 1,
    };
  }
  if (bg.startsWith('#')) return { hex: bg.slice(0, 7), opacity: 1 };
  return { hex: '#000000', opacity: 0.5 };
}

function buildBackground(hex, opacity) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${opacity})`;
}

function BackgroundColorControl({ value, defaultColor, onChange }) {
  const enabled = !!value;
  const { hex, opacity } = parseBackground(value || defaultColor);

  return (
    <>
      <div className="flex gap-2 items-center">
        <label className="text-xs text-gray-500 w-20">Background</label>
        <button
          onClick={() => onChange(enabled ? null : defaultColor)}
          className={`px-3 py-1 rounded text-xs transition-colors border ${
            enabled
              ? 'bg-indigo-600 border-indigo-500 text-white'
              : 'bg-[#1a1a1a] border-[#333] text-gray-400 hover:bg-[#2a2a2a]'
          }`}
        >
          {enabled ? 'On' : 'Off'}
        </button>
        {enabled && (
          <input
            type="color"
            value={hex}
            onChange={(e) => onChange(buildBackground(e.target.value, opacity))}
            className="w-8 h-7 rounded cursor-pointer border border-[#333] bg-transparent"
          />
        )}
      </div>
      {enabled && (
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 w-20">Opacity</label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={opacity}
            onChange={(e) => onChange(buildBackground(hex, Number(e.target.value)))}
            className="flex-1 min-w-0"
          />
          <span className="text-xs text-gray-400 w-8 text-right flex-shrink-0">
            {Math.round(opacity * 100)}%
          </span>
        </div>
      )}
    </>
  );
}

function Section({ title, children }) {
  return (
    <div className="p-3 border-b border-[#2a2a2a]">
      <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">{title}</p>
      {children}
    </div>
  );
}

function Grid2({ children }) {
  return <div className="grid grid-cols-2 gap-2 mb-2">{children}</div>;
}

function NumInput({ label, value, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-gray-500 w-20 flex-shrink-0">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-indigo-500 min-w-0"
      />
    </div>
  );
}

function Toggle({ label, value, onChange }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`flex-1 py-1 rounded text-xs transition-colors border ${
        value ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-[#1a1a1a] border-[#333] text-gray-400 hover:bg-[#2a2a2a]'
      }`}
    >
      {label}
    </button>
  );
}

function AnimationPanel({ animation = {}, onChange }) {
  const TYPES = ['none', 'fade-in', 'fade-out', 'scale-in', 'scale-out'];

  return (
    <div className="space-y-2">
      <div>
        <label className="text-xs text-gray-500 mb-1 block">Type</label>
        <select
          value={animation.type || 'none'}
          onChange={(e) => onChange({ ...animation, type: e.target.value })}
          className="w-full bg-[#1a1a1a] border border-[#333] text-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
        >
          {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      {animation.type && animation.type !== 'none' && (
        <>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 w-20">Start At</label>
            <input
              type="number"
              step="0.1"
              min="0"
              value={animation.startAt ?? 0}
              onChange={(e) => onChange({ ...animation, startAt: Number(e.target.value) })}
              className="flex-1 bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-xs text-gray-300 focus:outline-none"
            />
            <span className="text-xs text-gray-600">s</span>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 w-20">Duration</label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              value={animation.duration ?? 0.4}
              onChange={(e) => onChange({ ...animation, duration: Number(e.target.value) })}
              className="flex-1 bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-xs text-gray-300 focus:outline-none"
            />
            <span className="text-xs text-gray-600">s</span>
          </div>
        </>
      )}
    </div>
  );
}

function Model3dPanel({ model, onUpdate, exportConfig = {} }) {
  const updateLights = (patch) => onUpdate({ lights: { ...model.lights, ...patch } });
  const lights = model.lights || {};
  const gifDuration = exportConfig.duration ?? 4;
  const syncedSpeed = (2 * Math.PI * (model.rotationLoops ?? 1)) / Math.max(0.01, gifDuration);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-3 border-b border-[#2a2a2a]">
        <p className="text-[10px] text-gray-500 uppercase tracking-wider">3D Model</p>
      </div>

      {!model.assetId && !model.src ? (
        <div className="p-4 text-center">
          <p className="text-xs text-gray-500 py-4">Upload a GLB file in the Assets tab, then click it to load</p>
        </div>
      ) : (
        <>
          {/* Transform */}
          <div className="p-3 border-b border-[#2a2a2a] space-y-2">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Transform</p>
            <SliderRow label="Scale" min={0.1} max={10} step={0.1} value={model.scale}
              onChange={(v) => onUpdate({ scale: v })} fmt={(v) => v.toFixed(1)} />
            <SliderRow label="Pos X" min={0} max={1} step={0.01} value={model.position.x}
              onChange={(v) => onUpdate({ position: { ...model.position, x: v } })}
              fmt={(v) => `${(v * 100).toFixed(0)}%`} />
            <SliderRow label="Pos Y" min={0} max={1} step={0.01} value={model.position.y}
              onChange={(v) => onUpdate({ position: { ...model.position, y: v } })}
              fmt={(v) => `${(v * 100).toFixed(0)}%`} />
          </div>

          {/* Rotation */}
          <div className="p-3 border-b border-[#2a2a2a] space-y-2">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Rotation</p>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 w-20">Auto Rotate</label>
              <button
                onClick={() => onUpdate({ autoRotate: !model.autoRotate })}
                className={`px-3 py-1 rounded text-xs transition-colors ${model.autoRotate ? 'bg-indigo-600 text-white' : 'bg-[#1a1a1a] text-gray-400 border border-[#333]'}`}
              >
                {model.autoRotate ? 'On' : 'Off'}
              </button>
            </div>
            {/* Sync to GIF toggle */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 w-20">Sync to GIF</label>
              <button
                onClick={() => onUpdate({ syncRotationToGif: !model.syncRotationToGif })}
                className={`px-3 py-1 rounded text-xs transition-colors ${model.syncRotationToGif ? 'bg-indigo-600 text-white' : 'bg-[#1a1a1a] text-gray-400 border border-[#333]'}`}
              >
                {model.syncRotationToGif ? 'On' : 'Off'}
              </button>
            </div>

            {model.syncRotationToGif ? (
              <>
                {/* Number of full rotations per GIF loop */}
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500 w-20">Loops</label>
                  <input
                    type="number"
                    min={0.25}
                    max={20}
                    step={0.25}
                    value={model.rotationLoops ?? 1}
                    onChange={(e) => onUpdate({ rotationLoops: Number(e.target.value) })}
                    className="w-16 bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-xs text-gray-300 focus:outline-none"
                  />
                  <span className="text-xs text-gray-600">× per gif</span>
                </div>
                {/* Read-only computed speed */}
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500 w-20">Speed</label>
                  <span className="text-xs text-indigo-400">{syncedSpeed.toFixed(3)} rad/s</span>
                  <span className="text-xs text-gray-600">(auto)</span>
                </div>
              </>
            ) : (
              <SliderRow label="Speed" min={0} max={5} step={0.1} value={model.rotationSpeed}
                onChange={(v) => onUpdate({ rotationSpeed: v })} fmt={(v) => v.toFixed(1)} />
            )}

            {/* Rotation Axis */}
            <div className="pt-1">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Axis</p>
                <div className="flex gap-1">
                  {[['X', 1,0,0], ['Y', 0,1,0], ['Z', 0,0,1]].map(([label, x, y, z]) => (
                    <button
                      key={label}
                      onClick={() => onUpdate({ rotationAxisX: x, rotationAxisY: y, rotationAxisZ: z })}
                      className="px-2 py-0.5 rounded text-[10px] bg-[#2a2a2a] text-gray-400 hover:bg-indigo-700 hover:text-white transition-colors"
                    >
                      {label}
                    </button>
                  ))}
                  <button
                    onClick={() => onUpdate({ rotationAxisX: 0, rotationAxisY: 1, rotationAxisZ: 0, rotationResetKey: (model.rotationResetKey ?? 0) + 1 })}
                    title="Reset to default axis (0, 1, 0)"
                    className="px-2 py-0.5 rounded text-[10px] bg-[#2a2a2a] text-gray-400 hover:bg-red-700 hover:text-white transition-colors"
                  >
                    ↺
                  </button>
                </div>
              </div>
              <SliderRow label="Axis X" min={-1} max={1} step={0.05} value={model.rotationAxisX ?? 0}
                onChange={(v) => onUpdate({ rotationAxisX: v })} fmt={(v) => v.toFixed(2)} />
              <SliderRow label="Axis Y" min={-1} max={1} step={0.05} value={model.rotationAxisY ?? 1}
                onChange={(v) => onUpdate({ rotationAxisY: v })} fmt={(v) => v.toFixed(2)} />
              <SliderRow label="Axis Z" min={-1} max={1} step={0.05} value={model.rotationAxisZ ?? 0}
                onChange={(v) => onUpdate({ rotationAxisZ: v })} fmt={(v) => v.toFixed(2)} />
            </div>

            {/* Pivot offset */}
            <div className="pt-1">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Pivot Offset</p>
                <button
                  onClick={() => onUpdate({ pivotX: 0, pivotY: 0, pivotZ: 0 })}
                  className="px-2 py-0.5 rounded text-[10px] bg-[#2a2a2a] text-gray-400 hover:bg-[#3a3a3a] transition-colors"
                >
                  Reset
                </button>
              </div>
              <SliderRow label="Pivot X" min={-3} max={3} step={0.05} value={model.pivotX ?? 0}
                onChange={(v) => onUpdate({ pivotX: v })} fmt={(v) => v.toFixed(2)} />
              <SliderRow label="Pivot Y" min={-3} max={3} step={0.05} value={model.pivotY ?? 0}
                onChange={(v) => onUpdate({ pivotY: v })} fmt={(v) => v.toFixed(2)} />
              <SliderRow label="Pivot Z" min={-3} max={3} step={0.05} value={model.pivotZ ?? 0}
                onChange={(v) => onUpdate({ pivotZ: v })} fmt={(v) => v.toFixed(2)} />
            </div>
          </div>

          {/* Environment preset */}
          <div className="p-3 border-b border-[#2a2a2a]">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Environment Preset</p>
            <select
              value={model.lighting}
              onChange={(e) => onUpdate({ lighting: e.target.value })}
              className="w-full bg-[#1a1a1a] border border-[#333] text-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
            >
              <option value="studio">Studio (clean, neutral)</option>
              <option value="outdoor">Outdoor (park, bright)</option>
              <option value="dramatic">Dramatic (night, high contrast)</option>
              <option value="city">City (urban, cool)</option>
              <option value="dawn">Dawn (warm, soft)</option>
              <option value="sunset">Sunset (golden hour)</option>
              <option value="forest">Forest (green, diffuse)</option>
              <option value="lobby">Lobby (interior, warm)</option>
              <option value="warehouse">Warehouse (industrial)</option>
            </select>
          </div>

          {/* Ambient light */}
          <div className="p-3 border-b border-[#2a2a2a] space-y-2">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Ambient Light</p>
            <SliderRow label="Intensity" min={0} max={3} step={0.05} value={lights.ambientIntensity ?? 0.5}
              onChange={(v) => updateLights({ ambientIntensity: v })} fmt={(v) => v.toFixed(2)} />
            <ColorRow label="Color" value={lights.ambientColor ?? '#ffffff'}
              onChange={(v) => updateLights({ ambientColor: v })} />
          </div>

          {/* Directional light */}
          <div className="p-3 border-b border-[#2a2a2a] space-y-2">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Directional Light</p>
            <SliderRow label="Intensity" min={0} max={5} step={0.1} value={lights.directionalIntensity ?? 1}
              onChange={(v) => updateLights({ directionalIntensity: v })} fmt={(v) => v.toFixed(1)} />
            <ColorRow label="Color" value={lights.directionalColor ?? '#ffffff'}
              onChange={(v) => updateLights({ directionalColor: v })} />
            <SliderRow label="X" min={-10} max={10} step={0.5} value={lights.directionalX ?? 5}
              onChange={(v) => updateLights({ directionalX: v })} fmt={(v) => v.toFixed(1)} />
            <SliderRow label="Y" min={-10} max={10} step={0.5} value={lights.directionalY ?? 5}
              onChange={(v) => updateLights({ directionalY: v })} fmt={(v) => v.toFixed(1)} />
            <SliderRow label="Z" min={-10} max={10} step={0.5} value={lights.directionalZ ?? 5}
              onChange={(v) => updateLights({ directionalZ: v })} fmt={(v) => v.toFixed(1)} />
          </div>

          {/* Point light */}
          <div className="p-3 border-b border-[#2a2a2a] space-y-2">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Point Light</p>
              <button
                onClick={() => updateLights({ pointEnabled: !lights.pointEnabled })}
                className={`px-2 py-0.5 rounded text-[10px] transition-colors ${lights.pointEnabled ? 'bg-indigo-600 text-white' : 'bg-[#2a2a2a] text-gray-400'}`}
              >
                {lights.pointEnabled ? 'ON' : 'OFF'}
              </button>
            </div>
            {lights.pointEnabled && (
              <>
                <SliderRow label="Intensity" min={0} max={5} step={0.1} value={lights.pointIntensity ?? 0.8}
                  onChange={(v) => updateLights({ pointIntensity: v })} fmt={(v) => v.toFixed(1)} />
                <ColorRow label="Color" value={lights.pointColor ?? '#ffffff'}
                  onChange={(v) => updateLights({ pointColor: v })} />
                <SliderRow label="X" min={-10} max={10} step={0.5} value={lights.pointX ?? -3}
                  onChange={(v) => updateLights({ pointX: v })} fmt={(v) => v.toFixed(1)} />
                <SliderRow label="Y" min={-10} max={10} step={0.5} value={lights.pointY ?? 3}
                  onChange={(v) => updateLights({ pointY: v })} fmt={(v) => v.toFixed(1)} />
                <SliderRow label="Z" min={-10} max={10} step={0.5} value={lights.pointZ ?? 2}
                  onChange={(v) => updateLights({ pointZ: v })} fmt={(v) => v.toFixed(1)} />
              </>
            )}
          </div>

          {/* Hemisphere light */}
          <div className="p-3 space-y-2">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Hemisphere Light</p>
              <button
                onClick={() => updateLights({ hemisphereEnabled: !lights.hemisphereEnabled })}
                className={`px-2 py-0.5 rounded text-[10px] transition-colors ${lights.hemisphereEnabled ? 'bg-indigo-600 text-white' : 'bg-[#2a2a2a] text-gray-400'}`}
              >
                {lights.hemisphereEnabled ? 'ON' : 'OFF'}
              </button>
            </div>
            {lights.hemisphereEnabled && (
              <>
                <SliderRow label="Intensity" min={0} max={3} step={0.05} value={lights.hemisphereIntensity ?? 0.4}
                  onChange={(v) => updateLights({ hemisphereIntensity: v })} fmt={(v) => v.toFixed(2)} />
                <ColorRow label="Sky" value={lights.hemisphereSkyColor ?? '#4466ff'}
                  onChange={(v) => updateLights({ hemisphereSkyColor: v })} />
                <ColorRow label="Ground" value={lights.hemisphereGroundColor ?? '#442200'}
                  onChange={(v) => updateLights({ hemisphereGroundColor: v })} />
              </>
            )}
          </div>
        </>
      )}

      <div className="p-3 border-t border-[#2a2a2a]">
        <p className="text-xs text-gray-500">Select an element to see its properties</p>
      </div>
    </div>
  );
}

function SliderRow({ label, min, max, step, value, onChange, fmt }) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-gray-500 w-16 flex-shrink-0">{label}</label>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 min-w-0"
      />
      <span className="text-xs text-gray-400 w-9 text-right flex-shrink-0">{fmt ? fmt(value) : value}</span>
    </div>
  );
}

function ColorRow({ label, value, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-gray-500 w-16 flex-shrink-0">{label}</label>
      <input
        type="color" value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-8 h-6 rounded cursor-pointer border border-[#333] bg-transparent"
      />
      <span className="text-xs text-gray-400">{value}</span>
    </div>
  );
}
