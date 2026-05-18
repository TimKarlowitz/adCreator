'use client';

import { useEffect, useState } from 'react';
import { useAssetStore } from '@/store/assetStore';

/**
 * Shared visual preview card for any slot value.
 *
 * Props:
 *   value       — SlotValue object
 *   slotType    — 'model3d' | 'background' | 'imageElement' | 'textElement' | 'textboxElement'
 *   selected    — bool, highlight with indigo border when true
 *   onClick     — optional click handler (makes it interactive)
 *   onRemove    — optional, shows remove button on hover
 *   onEditLabel — optional, makes label inline-editable
 *   size        — 'sm' (compact) | 'md' (default) | 'lg'
 *   showLabel   — bool (default true)
 */

const SIZE_CONFIG = {
  sm: { card: 'w-16',  img: 'h-14', text: 'h-14', label: 'text-[9px]',  icon: 16, pad: 'p-1',   px: 64  },
  md: { card: 'w-24',  img: 'h-20', text: 'h-20', label: 'text-[10px]', icon: 20, pad: 'p-1.5', px: 96  },
  lg: { card: 'w-32',  img: 'h-24', text: 'h-24', label: 'text-xs',     icon: 24, pad: 'p-2',   px: 128 },
};

// ─────────────────────────────────────────────
// Offscreen 3D thumbnail generator
// Loads a GLB into a temporary WebGLRenderer, renders one frame, returns a
// data URL, then fully disposes all GPU resources.
// ─────────────────────────────────────────────
async function renderGLBThumb(src, sizePx) {
  // Dynamic import — equivalent to `import * as THREE from 'three'`
  const THREE = await import('three');
  const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setSize(sizePx, sizePx);
  renderer.setPixelRatio(1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.001, 10000);

  scene.add(new THREE.AmbientLight(0xffffff, 0.9));
  const dir = new THREE.DirectionalLight(0xffffff, 1.5);
  dir.position.set(2, 4, 3);
  scene.add(dir);
  const fill = new THREE.DirectionalLight(0xffffff, 0.4);
  fill.position.set(-3, -1, -2);
  scene.add(fill);

  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.load(
      src,
      (gltf) => {
        const model = gltf.scene;

        // Center and frame the model
        const box = new THREE.Box3().setFromObject(model);
        const center = new THREE.Vector3();
        const sizeVec = new THREE.Vector3();
        box.getCenter(center);
        box.getSize(sizeVec);
        model.position.sub(center);
        scene.add(model);

        const maxDim = Math.max(sizeVec.x, sizeVec.y, sizeVec.z);
        const dist = Math.max(maxDim * 1.8, 0.5);
        // Slight angle for a 3D feel
        camera.position.set(dist * 0.5, dist * 0.35, dist);
        camera.lookAt(0, 0, 0);
        camera.near = dist * 0.001;
        camera.far = dist * 20;
        camera.updateProjectionMatrix();

        renderer.render(scene, camera);
        const dataUrl = renderer.domElement.toDataURL('image/jpeg', 0.85);

        // Dispose all GPU resources
        renderer.dispose();
        scene.traverse((child) => {
          if (!child.isMesh) return;
          child.geometry?.dispose();
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          for (const mat of mats) {
            mat?.map?.dispose();
            mat?.dispose();
          }
        });

        resolve(dataUrl);
      },
      undefined,
      (err) => {
        renderer.dispose();
        reject(err);
      },
    );
  });
}

// ─────────────────────────────────────────────
// 3D Model preview — renders a real thumbnail via offscreen WebGL
// ─────────────────────────────────────────────
function Model3DPreview({ value, size }) {
  const { blobUrls } = useAssetStore();
  const cfg = SIZE_CONFIG[size];
  const [thumbUrl, setThumbUrl] = useState(null);
  const [thumbState, setThumbState] = useState('idle'); // idle | loading | done | error

  // Resolve the GLB source URL (prefer fresh blob from store)
  const src = (value.data?.assetId ? blobUrls[value.data.assetId] : null)
    || value.data?.objectUrl
    || null;

  const rawLabel = value.label || '';
  const extMatch = rawLabel.match(/\.(glb|gltf)$/i);
  const ext = extMatch ? extMatch[1].toUpperCase() : 'GLB';
  const displayName = rawLabel.replace(/\.(glb|gltf)$/i, '') || '3D Model';

  useEffect(() => {
    if (!src) return;
    let cancelled = false;
    setThumbState('loading');

    renderGLBThumb(src, cfg.px)
      .then((url) => {
        if (!cancelled) { setThumbUrl(url); setThumbState('done'); }
      })
      .catch(() => {
        if (!cancelled) setThumbState('error');
      });

    return () => { cancelled = true; };
  // Re-render whenever the resolved src changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  // Rendered thumbnail
  if (thumbState === 'done' && thumbUrl) {
    return (
      <div className={`w-full ${cfg.img} relative overflow-hidden`}>
        <img src={thumbUrl} alt={displayName} className="w-full h-full object-cover" />
        <span className="absolute top-1 right-1 text-[7px] font-bold bg-black/70 text-indigo-300 px-1 py-0.5 rounded backdrop-blur-sm">
          {ext}
        </span>
      </div>
    );
  }

  // Loading / error / no-src placeholder
  return (
    <div className={`w-full ${cfg.img} bg-gradient-to-br from-[#1a1230] via-[#120d22] to-[#0d0a1a] flex flex-col items-center justify-center gap-1 relative overflow-hidden`}>
      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-[0.08]"
        style={{ backgroundImage: 'linear-gradient(#818cf8 1px,transparent 1px),linear-gradient(90deg,#818cf8 1px,transparent 1px)', backgroundSize: '10px 10px' }} />

      <span className="absolute top-1 right-1 text-[7px] font-bold bg-indigo-600/70 text-white px-1 py-0.5 rounded z-10">
        {ext}
      </span>

      {thumbState === 'loading' ? (
        <span className="w-3.5 h-3.5 rounded-full border-2 border-indigo-500/40 border-t-indigo-400 animate-spin relative z-10" />
      ) : (
        <svg width={cfg.icon} height={cfg.icon} viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.5" className="relative z-10 drop-shadow">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/>
          <path d="M2 17l10 5 10-5"/>
          <path d="M2 12l10 5 10-5"/>
        </svg>
      )}

      <span className="relative z-10 text-[8px] text-indigo-300/80 font-medium px-1 text-center leading-tight line-clamp-2 max-w-full">
        {displayName}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────
// Text preview
// ─────────────────────────────────────────────
function TextPreview({ value, size }) {
  const cfg = SIZE_CONFIG[size];
  const text = value.data?.content || value.label || '—';
  return (
    <div className={`w-full ${cfg.text} bg-[#0d0d0d] flex items-center justify-center ${cfg.pad} overflow-hidden`}>
      <p className="text-white text-center leading-snug line-clamp-4" style={{
        fontSize: size === 'sm' ? '8px' : size === 'md' ? '9px' : '10px',
        wordBreak: 'break-word',
      }}>
        {text}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────
// Image preview — uses fresh blob URL from store with error fallback
// ─────────────────────────────────────────────
function ImagePreview({ value, size }) {
  const { blobUrls } = useAssetStore();
  const cfg = SIZE_CONFIG[size];
  const [imgError, setImgError] = useState(false);

  // Prefer fresh blob URL from the asset store (survives page reload), same as ThreeLayer
  const src = !imgError && (
    (value.data?.assetId ? blobUrls[value.data.assetId] : null)
    || value.data?.objectUrl
    || value.data?.src
    || null
  );

  if (src) {
    return (
      <img
        src={src}
        alt={value.label || ''}
        className={`w-full ${cfg.img} object-cover`}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div className={`w-full ${cfg.img} bg-[#1a1a1a] flex items-center justify-center`}>
      <svg width={cfg.icon} height={cfg.icon} viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="1.5">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <polyline points="21 15 16 10 5 21"/>
      </svg>
    </div>
  );
}

// ─────────────────────────────────────────────
// Color swatch
// ─────────────────────────────────────────────
function ColorPreview({ value, size }) {
  const cfg = SIZE_CONFIG[size];
  const color = value.data?.color || '#333333';
  return (
    <div className={`w-full ${cfg.img} flex items-center justify-center relative`} style={{ background: color }}>
      <span className="text-[8px] font-mono bg-black/50 text-white px-1 py-0.5 rounded absolute bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap shadow">
        {color}
      </span>
    </div>
  );
}

function BackgroundPreview({ value, size }) {
  if (value.data?.type === 'color') return <ColorPreview value={value} size={size} />;
  return <ImagePreview value={value} size={size} />;
}

// ─────────────────────────────────────────────
// Public preview switcher (used by BindingRow etc.)
// ─────────────────────────────────────────────
export function ValuePreview({ value, slotType, size = 'md' }) {
  switch (slotType) {
    case 'model3d':        return <Model3DPreview value={value} size={size} />;
    case 'background':     return <BackgroundPreview value={value} size={size} />;
    case 'imageElement':   return <ImagePreview value={value} size={size} />;
    case 'textElement':
    case 'textboxElement': return <TextPreview value={value} size={size} />;
    default:               return <ImagePreview value={value} size={size} />;
  }
}

// ─────────────────────────────────────────────
// ValueCard wrapper
// ─────────────────────────────────────────────
export default function ValueCard({
  value,
  slotType,
  selected = false,
  onClick,
  onRemove,
  onEditLabel,
  size = 'md',
  showLabel = true,
}) {
  const cfg = SIZE_CONFIG[size];
  const isInteractive = !!onClick;

  return (
    <div className="relative group flex-shrink-0">
      <div
        onClick={onClick}
        className={[
          'rounded-xl overflow-hidden border transition-all duration-150 flex flex-col',
          cfg.card,
          isInteractive ? 'cursor-pointer' : '',
          selected
            ? 'border-indigo-500 ring-2 ring-indigo-500/30 shadow-lg shadow-indigo-900/30'
            : isInteractive
            ? 'border-[#2a2a2a] hover:border-[#4a4a4a] hover:shadow-md'
            : 'border-[#2a2a2a]',
        ].join(' ')}
      >
        <div className="overflow-hidden rounded-t-xl">
          <ValuePreview value={value} slotType={slotType} size={size} />
        </div>

        {selected && (
          <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-indigo-500 flex items-center justify-center shadow">
            <svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.5">
              <polyline points="2 6 5 9 10 3"/>
            </svg>
          </div>
        )}

        {showLabel && (
          <div className="px-1 py-1 bg-[#111] flex-1 min-h-0">
            {onEditLabel ? (
              <input
                value={value.label}
                onChange={(e) => onEditLabel(value.id, e.target.value)}
                onClick={(e) => e.stopPropagation()}
                placeholder="Label…"
                className={`w-full bg-transparent ${cfg.label} text-gray-300 focus:outline-none placeholder-gray-600 text-center leading-tight`}
              />
            ) : (
              <p className={`${cfg.label} text-gray-400 text-center truncate leading-tight`} title={value.label}>
                {value.label || '—'}
              </p>
            )}
          </div>
        )}
      </div>

      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(value.id); }}
          className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[#1a1a1a] border border-[#333] text-gray-500 hover:text-red-400 hover:border-red-700/50 hover:bg-red-950/50 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 z-10"
          title="Remove"
        >
          <svg width="6" height="6" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="1" y1="1" x2="9" y2="9"/><line x1="9" y1="1" x2="1" y2="9"/>
          </svg>
        </button>
      )}
    </div>
  );
}
