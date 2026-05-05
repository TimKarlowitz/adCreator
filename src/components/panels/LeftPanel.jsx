'use client';

import { useRef, useState } from 'react';
import { useProjectStore, getAllItemsSorted } from '@/store/projectStore';
import { useAssetStore } from '@/store/assetStore';
import { v4 as uuidv4 } from 'uuid';

const BUILT_IN_BACKGROUNDS = [
  { id: 'bg-1', name: 'Dark Aurora', src: '/assets/backgrounds/bg-1.svg', gradient: 'from-[#0f0c29] to-[#302b63]' },
  { id: 'bg-2', name: 'Neon Grid', src: '/assets/backgrounds/bg-2.svg', gradient: 'from-[#000428] to-[#004e92]' },
  { id: 'bg-3', name: 'Deep Space', src: '/assets/backgrounds/bg-3.svg', gradient: 'from-[#0c0032] to-[#130f40]' },
  { id: 'bg-4', name: 'Smoke Black', src: '/assets/backgrounds/bg-4.svg', gradient: 'from-[#0f0f0f] to-[#2a2a2a]' },
  { id: 'bg-5', name: 'Gradient Dusk', src: '/assets/backgrounds/bg-5.svg', gradient: 'from-[#16213e] to-[#533483]' },
  { id: 'bg-6', name: 'Abstract Burst', src: '/assets/backgrounds/bg-6.svg', gradient: 'from-[#1a1a2e] to-[#e94560]' },
];

const BUILT_IN_ARROWS = [
  { variant: 'arrow-right', label: 'Right Arrow' },
  { variant: 'arrow-left', label: 'Left Arrow' },
  { variant: 'arrow-double', label: 'Double Arrow' },
  { variant: 'arrow-curved', label: 'Curved Arrow' },
];

export default function LeftPanel() {
  const { addElement, setBackground, canvasConfig } = useProjectStore();
  const { assets, uploadAsset } = useAssetStore();
  const fileInputRef = useRef();
  const [activeTab, setActiveTab] = useState('add');
  const [isDragging, setIsDragging] = useState(false);
  const imageAssets = assets.filter((a) => a.type === 'image');
  const modelAssets = assets.filter((a) => a.type === '3d');

  const handleFileUpload = async (files) => {
    for (const file of Array.from(files)) {
      await uploadAsset(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileUpload(e.dataTransfer.files);
  };

  const addText = () => {
    const id = uuidv4();
    addElement({
      id,
      type: 'text',
      x: 80,
      y: 120,
      width: 500,
      height: 100,
      zIndex: 0,
      content: 'Your Text Here',
      style: {
        fontFamily: 'Geist',
        fontSize: 48,
        color: '#ffffff',
        bold: false,
        underline: false,
        align: 'left',
        spans: [],
      },
      animation: { type: 'none', startAt: 0, duration: 0.5 },
    });
  };

  const addTextBox = () => {
    const id = uuidv4();
    addElement({
      id,
      type: 'textbox',
      x: 80,
      y: 200,
      width: 400,
      height: 120,
      zIndex: 0,
      content: 'Text Box Content',
      style: {
        fontFamily: 'Geist',
        fontSize: 20,
        color: '#ffffff',
        bold: false,
        align: 'left',
        borderColor: '#6366f1',
        borderWidth: 2,
        padding: 16,
        background: 'rgba(0,0,0,0.5)',
        borderRadius: 8,
      },
      animation: { type: 'none', startAt: 0, duration: 0.5 },
    });
  };

  const addArrow = (variant) => {
    const id = uuidv4();
    addElement({
      id,
      type: 'arrow',
      x: 100,
      y: 300,
      width: 200,
      height: 60,
      zIndex: 0,
      variant,
      style: { color: '#ffffff', strokeWidth: 3 },
      animation: { type: 'none', startAt: 0, duration: 0.4 },
    });
  };

  const addImageFromAsset = (asset) => {
    const id = uuidv4();
    addElement({
      id,
      type: 'image',
      x: 100,
      y: 100,
      width: 300,
      height: 300,
      zIndex: 0,
      assetId: asset.id,
      src: asset.objectUrl,
      animation: { type: 'none', startAt: 0, duration: 0 },
    });
  };

  const useBuiltInBackground = (bg) => {
    setBackground({ type: 'image', src: bg.src, assetId: null, opacity: 1, fit: 'cover' });
  };

  const Tab = ({ id, label }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`px-3 py-1.5 text-xs rounded transition-colors ${
        activeTab === id ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
      }`}
    >
      {label}
    </button>
  );

  return (
    <aside className="w-56 bg-[#111] border-r border-[#2a2a2a] flex flex-col overflow-hidden">
      {/* Tabs */}
      <div className="flex gap-1 p-2 border-b border-[#2a2a2a]">
        <Tab id="add" label="Add" />
        <Tab id="assets" label="Assets" />
        <Tab id="bgs" label="BGs" />
        <Tab id="layers" label="Layers" />
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {activeTab === 'add' && (
          <div className="space-y-1">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 px-1">Elements</p>
            <AddButton onClick={addText} icon="T" label="Text" />
            <AddButton onClick={addTextBox} icon="☐" label="Text Box" />

            <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-3 mb-2 px-1">Arrows</p>
            {BUILT_IN_ARROWS.map(({ variant, label }) => (
              <AddButton key={variant} onClick={() => addArrow(variant)} icon="→" label={label} />
            ))}

            <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-3 mb-2 px-1">Upload</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2 rounded border border-dashed border-[#333] text-gray-400 hover:border-indigo-500 hover:text-indigo-400 text-xs transition-colors"
            >
              + Upload Image / GLB
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.glb,.gltf"
              className="hidden"
              onChange={(e) => handleFileUpload(e.target.files)}
            />
          </div>
        )}

        {activeTab === 'assets' && (
          <div>
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              className={`w-full py-4 rounded border border-dashed text-center text-xs mb-3 transition-colors cursor-pointer ${
                isDragging ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' : 'border-[#333] text-gray-500'
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              Drop files here or click
            </div>

            {imageAssets.length > 0 && (
              <>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Images</p>
                <div className="grid grid-cols-2 gap-1 mb-3">
                  {imageAssets.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => addImageFromAsset(a)}
                      className="aspect-square rounded overflow-hidden bg-[#1a1a1a] hover:ring-2 hover:ring-indigo-500 transition-all"
                      title={a.name}
                    >
                      <img src={a.objectUrl} alt={a.name} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </>
            )}

            {modelAssets.length > 0 && (
              <>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">3D Models</p>
                <div className="space-y-1">
                  {modelAssets.map((a) => (
                    <ModelAssetRow key={a.id} asset={a} />
                  ))}
                </div>
              </>
            )}

            {assets.length === 0 && (
              <p className="text-center text-gray-600 text-xs mt-8">No assets yet. Upload images or GLB files.</p>
            )}
          </div>
        )}

        {activeTab === 'bgs' && (
          <div>
            <BgImageUploader setBackground={setBackground} uploadAsset={uploadAsset} />

            <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-3 mb-2">Built-in Backgrounds</p>
            <div className="grid grid-cols-2 gap-1">
              {BUILT_IN_BACKGROUNDS.map((bg) => (
                <button
                  key={bg.id}
                  onClick={() => useBuiltInBackground(bg)}
                  className="aspect-video rounded overflow-hidden bg-[#1a1a1a] hover:ring-2 hover:ring-indigo-500 transition-all"
                  title={bg.name}
                >
                  <div className={`w-full h-full bg-gradient-to-br ${bg.gradient} flex items-end p-1`}>
                    <span className="text-[8px] text-white/60">{bg.name}</span>
                  </div>
                </button>
              ))}
            </div>

            <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-3 mb-2">Solid Color</p>
            <SolidColorPicker />
          </div>
        )}

        {activeTab === 'layers' && <LayersPanel />}
      </div>
    </aside>
  );
}

function AddButton({ onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-2 py-2 rounded hover:bg-[#1e1e1e] text-gray-300 hover:text-white transition-colors text-sm"
    >
      <span className="w-6 h-6 rounded bg-[#2a2a2a] flex items-center justify-center text-xs text-gray-400">{icon}</span>
      {label}
    </button>
  );
}

function ModelAssetRow({ asset }) {
  const { setModel3d } = useProjectStore();
  return (
    <button
      onClick={() => {
        const { model3d } = useProjectStore.getState();
        setModel3d({ ...model3d, assetId: asset.id, src: asset.objectUrl });
      }}
      className="w-full flex items-center gap-2 px-2 py-2 rounded hover:bg-[#1e1e1e] text-gray-300 transition-colors text-xs"
    >
      <div className="w-8 h-8 rounded bg-[#2a2a2a] flex items-center justify-center text-lg">📦</div>
      <span className="truncate">{asset.name}</span>
    </button>
  );
}

function SolidColorPicker() {
  const { setBackgroundColor, setBackground, canvasConfig } = useProjectStore();
  const PRESETS = ['#000000', '#0f0f0f', '#111827', '#1e1b4b', '#0c0a09', '#030712', '#1a0a2e', '#0a0a0a'];

  return (
    <div>
      <div className="grid grid-cols-4 gap-1 mb-2">
        {PRESETS.map((c) => (
          <button
            key={c}
            onClick={() => {
              setBackgroundColor(c);
              setBackground({ type: 'color', src: null, assetId: null, opacity: 1, fit: 'cover' });
            }}
            className="aspect-square rounded border border-[#333] hover:ring-2 hover:ring-indigo-500 transition-all"
            style={{ background: c }}
            title={c}
          />
        ))}
      </div>
      <input
        type="color"
        value={canvasConfig.backgroundColor}
        onChange={(e) => {
          setBackgroundColor(e.target.value);
          setBackground({ type: 'color', src: null, assetId: null, opacity: 1, fit: 'cover' });
        }}
        className="w-full h-8 rounded cursor-pointer bg-transparent border border-[#333]"
      />
    </div>
  );
}

function BgImageUploader({ setBackground, uploadAsset }) {
  const inputRef = useRef();
  const [preview, setPreview] = useState(null);

  const handleFile = async (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const { id, objectUrl } = await uploadAsset(file);
    setBackground({ type: 'image', src: objectUrl, assetId: id, opacity: 1, fit: 'cover' });
    setPreview(objectUrl);
  };

  return (
    <div className="mb-1">
      <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Upload Image</p>
      <button
        onClick={() => inputRef.current?.click()}
        className="w-full flex items-center gap-2 px-3 py-2 rounded border border-dashed border-[#333] hover:border-indigo-500 text-gray-400 hover:text-indigo-400 text-xs transition-colors"
      >
        {preview ? (
          <img src={preview} alt="bg" className="w-8 h-8 rounded object-cover" />
        ) : (
          <span className="w-8 h-8 rounded bg-[#2a2a2a] flex items-center justify-center text-base">🖼</span>
        )}
        <span>{preview ? 'Change background image' : 'Upload background image'}</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
    </div>
  );
}

// ---- Layers Panel ----

function elementIcon(el) {
  switch (el.type) {
    case 'text':    return 'T';
    case 'textbox': return '☐';
    case 'image':   return '🖼';
    case 'arrow':   return '→';
    default:        return '?';
  }
}

function elementLabel(el) {
  if (el.type === 'text' || el.type === 'textbox') {
    const text = (el.content || '').trim();
    return text.length > 20 ? text.slice(0, 20) + '…' : text || el.type;
  }
  if (el.type === 'arrow') return el.variant || 'Arrow';
  if (el.type === 'image') return 'Image';
  return el.type;
}

function LayersPanel() {
  const {
    elements, model3d, selectedId,
    setSelectedId, bringForward, sendBackward,
  } = useProjectStore();

  // Unified sorted list — highest zIndex first (top of visual stack at top of list)
  const allSorted = getAllItemsSorted(elements, model3d).reverse();

  return (
    <div>
      <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 px-1 pt-1">
        Stack order (top → bottom)
      </p>
      <div className="space-y-0.5">
        {allSorted.map((item) => {
          const isModel = item.kind === 'model3d';
          const isSelected = isModel
            ? selectedId === '__model3d__'
            : selectedId === item.id;

          let icon, label;
          if (isModel) {
            icon = '📦';
            label = '3D Model';
          } else {
            const el = elements.find((e) => e.id === item.id);
            icon = el ? elementIcon(el) : '?';
            label = el ? elementLabel(el) : 'Unknown';
          }

          const handleSelect = () => {
            if (isModel) {
              setSelectedId('__model3d__');
            } else {
              setSelectedId(item.id);
            }
          };

          return (
            <div
              key={item.id}
              onClick={handleSelect}
              className={`flex items-center gap-1.5 px-2 py-1.5 rounded cursor-pointer transition-colors group ${
                isSelected
                  ? 'bg-indigo-600/30 border border-indigo-500/50'
                  : 'hover:bg-[#1e1e1e] border border-transparent'
              }`}
            >
              <span className="w-5 h-5 rounded bg-[#2a2a2a] flex items-center justify-center text-xs text-gray-400 flex-shrink-0">
                {icon}
              </span>
              <span className={`flex-1 text-xs truncate ${isSelected ? 'text-white' : 'text-gray-400'}`}>
                {label}
              </span>
              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => { e.stopPropagation(); bringForward(item.id); }}
                  className="w-5 h-5 rounded bg-[#333] hover:bg-indigo-600 text-gray-400 hover:text-white flex items-center justify-center text-[10px] transition-colors"
                  title="Bring Forward"
                >
                  ↑
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); sendBackward(item.id); }}
                  className="w-5 h-5 rounded bg-[#333] hover:bg-indigo-600 text-gray-400 hover:text-white flex items-center justify-center text-[10px] transition-colors"
                  title="Send Backward"
                >
                  ↓
                </button>
              </div>
            </div>
          );
        })}

        {/* Background — always fixed at the bottom */}
        <div className="flex items-center gap-1.5 px-2 py-1.5 rounded border border-transparent opacity-40 cursor-default">
          <span className="w-5 h-5 rounded bg-[#2a2a2a] flex items-center justify-center text-xs text-gray-400 flex-shrink-0">
            ▬
          </span>
          <span className="flex-1 text-xs text-gray-500 truncate">Background</span>
          <span className="text-[9px] text-gray-600">locked</span>
        </div>
      </div>

      {allSorted.length === 0 && (
        <p className="text-center text-gray-600 text-xs mt-6 px-2">
          Add elements or a 3D model to see layers here.
        </p>
      )}
    </div>
  );
}
