'use client';

import { useRef, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import * as THREE from 'three';
import { useProjectStore } from '@/store/projectStore';
import { useAssetStore } from '@/store/assetStore';

function BackgroundImage({ src }) {
  const { viewport } = useThree();
  const meshRef = useRef();

  useEffect(() => {
    if (!src) return;
    const loader = new THREE.TextureLoader();
    loader.crossOrigin = 'anonymous';
    loader.load(src, (texture) => {
      if (meshRef.current) {
        meshRef.current.material.map = texture;
        meshRef.current.material.needsUpdate = true;
      }
    });
  }, [src]);

  return (
    <mesh ref={meshRef} position={[0, 0, -1]}>
      <planeGeometry args={[viewport.width * 2, viewport.height * 2]} />
      <meshBasicMaterial />
    </mesh>
  );
}

function RotatingModel({ src, position, scale, rotationSpeed, autoRotate }) {
  const groupRef = useRef();
  const { viewport } = useThree();
  const sceneRef = useRef(null);

  // Dynamically load GLTF to avoid static import issues
  useEffect(() => {
    if (!src) return;
    let objectUrl = src;
    let revoke = false;

    import('three/addons/loaders/GLTFLoader.js').then(({ GLTFLoader }) => {
      const loader = new GLTFLoader();
      loader.load(objectUrl, (gltf) => {
        sceneRef.current = gltf.scene;
        if (groupRef.current) {
          // Clear existing children
          while (groupRef.current.children.length) {
            groupRef.current.remove(groupRef.current.children[0]);
          }
          groupRef.current.add(gltf.scene);
        }
      }, undefined, (err) => {
        console.warn('GLTF load error:', err);
      });
    });

    return () => {
      if (revoke) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);

  useFrame((_, delta) => {
    if (groupRef.current && autoRotate) {
      groupRef.current.rotation.y += rotationSpeed * delta;
    }
  });

  const posX = (position.x - 0.5) * viewport.width;
  const posY = (0.5 - position.y) * viewport.height;

  return <group ref={groupRef} position={[posX, posY, 0]} scale={scale} />;
}

function SceneLighting({ preset }) {
  const presetMap = {
    studio: 'studio',
    outdoor: 'park',
    dramatic: 'night',
  };
  try {
    return <Environment preset={presetMap[preset] || 'studio'} />;
  } catch {
    return <ambientLight intensity={1} />;
  }
}

export default function ThreeLayer({ displayWidth, displayHeight }) {
  const { background, model3d, canvasConfig } = useProjectStore();
  const { blobUrls } = useAssetStore();

  const bgSrc = background.src || (background.assetId ? blobUrls[background.assetId] : null);
  const modelSrc = model3d.src || (model3d.assetId ? blobUrls[model3d.assetId] : null);

  return (
    <Canvas
      style={{ width: displayWidth, height: displayHeight, display: 'block' }}
      gl={{ preserveDrawingBuffer: true, antialias: true }}
      camera={{ position: [0, 0, 5], fov: 50 }}
    >
      <color attach="background" args={[canvasConfig.backgroundColor]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} />

      <Suspense fallback={null}>
        <SceneLighting preset={model3d.lighting} />

        {bgSrc && background.type === 'image' && (
          <BackgroundImage src={bgSrc} />
        )}

        {modelSrc && (
          <RotatingModel
            src={modelSrc}
            position={model3d.position}
            scale={model3d.scale}
            rotationSpeed={model3d.rotationSpeed}
            autoRotate={model3d.autoRotate}
          />
        )}
      </Suspense>
    </Canvas>
  );
}
