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
    city: 'city',
    dawn: 'dawn',
    forest: 'forest',
    lobby: 'lobby',
    sunset: 'sunset',
    warehouse: 'warehouse',
  };
  try {
    return <Environment preset={presetMap[preset] || 'studio'} />;
  } catch {
    return null;
  }
}

function SceneLights({ lights = {} }) {
  const {
    ambientIntensity = 0.5, ambientColor = '#ffffff',
    directionalIntensity = 1, directionalColor = '#ffffff',
    directionalX = 5, directionalY = 5, directionalZ = 5,
    pointEnabled = false, pointIntensity = 0.8, pointColor = '#ffffff',
    pointX = -3, pointY = 3, pointZ = 2,
    hemisphereEnabled = false, hemisphereSkyColor = '#4466ff',
    hemisphereGroundColor = '#442200', hemisphereIntensity = 0.4,
  } = lights;

  return (
    <>
      <ambientLight intensity={ambientIntensity} color={ambientColor} />
      <directionalLight
        position={[directionalX, directionalY, directionalZ]}
        intensity={directionalIntensity}
        color={directionalColor}
        castShadow
      />
      {pointEnabled && (
        <pointLight
          position={[pointX, pointY, pointZ]}
          intensity={pointIntensity}
          color={pointColor}
        />
      )}
      {hemisphereEnabled && (
        <hemisphereLight
          args={[hemisphereSkyColor, hemisphereGroundColor, hemisphereIntensity]}
        />
      )}
    </>
  );
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
      <SceneLights lights={model3d.lights} />

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
