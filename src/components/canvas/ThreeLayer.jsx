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

function RotatingModel({
  src, position, scale, rotationSpeed, autoRotate,
  rotationAxisX = 0, rotationAxisY = 1, rotationAxisZ = 0,
  pivotX = 0, pivotY = 0, pivotZ = 0,
  syncRotationToGif = false, rotationLoops = 1, gifDuration = 4,
}) {
  const rotatingGroupRef = useRef();
  const modelGroupRef = useRef();
  const { viewport, camera } = useThree();
  const axisVec = useRef(new THREE.Vector3(0, 1, 0));
  const modelRadiusRef = useRef(1);

  // Recompute camera clipping planes whenever scale changes so rotating
  // parts of large models never get culled by the near or far plane.
  useEffect(() => {
    const effectiveRadius = modelRadiusRef.current * (typeof scale === 'number' ? scale : 1);
    if (effectiveRadius <= 0) return;

    // Pull the camera back far enough that the entire model stays in front of it
    const requiredDist = effectiveRadius * 2.5;
    if (camera.position.z < requiredDist) {
      camera.position.z = requiredDist;
    }

    camera.near = Math.max(0.001, camera.position.z - effectiveRadius * 1.2);
    camera.far = camera.position.z + effectiveRadius * 1.2 + 100;
    camera.updateProjectionMatrix();
  }, [scale, camera]);

  useEffect(() => {
    if (!src) return;

    import('three/addons/loaders/GLTFLoader.js').then(({ GLTFLoader }) => {
      const loader = new GLTFLoader();
      loader.load(src, (gltf) => {
        if (!modelGroupRef.current) return;

        // Clear previous model
        while (modelGroupRef.current.children.length) {
          modelGroupRef.current.remove(modelGroupRef.current.children[0]);
        }

        // Auto-center: shift the scene so its bounding-box center sits at the origin
        const scene = gltf.scene;
        const box = new THREE.Box3().setFromObject(scene);
        const center = new THREE.Vector3();
        box.getCenter(center);
        scene.position.sub(center);

        modelGroupRef.current.add(scene);

        // Store the model's unscaled bounding-sphere radius so the clipping
        // planes can be updated correctly whenever scale changes.
        const sphere = new THREE.Sphere();
        box.getBoundingSphere(sphere);
        modelRadiusRef.current = sphere.radius;

        const effectiveRadius = sphere.radius * (typeof scale === 'number' ? scale : 1);
        const requiredDist = effectiveRadius * 2.5;
        if (camera.position.z < requiredDist) {
          camera.position.z = requiredDist;
        }
        camera.near = Math.max(0.001, camera.position.z - effectiveRadius * 1.2);
        camera.far = camera.position.z + effectiveRadius * 1.2 + 100;
        camera.updateProjectionMatrix();
      }, undefined, (err) => {
        console.warn('GLTF load error:', err);
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  const effectiveSpeed = syncRotationToGif
    ? (2 * Math.PI * rotationLoops) / Math.max(0.01, gifDuration)
    : rotationSpeed;

  useFrame((_, delta) => {
    if (rotatingGroupRef.current && autoRotate) {
      axisVec.current.set(rotationAxisX, rotationAxisY, rotationAxisZ);
      const len = axisVec.current.length();
      if (len > 0) {
        axisVec.current.divideScalar(len);
        rotatingGroupRef.current.rotateOnAxis(axisVec.current, effectiveSpeed * delta);
      }
    }
  });

  const posX = (position.x - 0.5) * viewport.width;
  const posY = (0.5 - position.y) * viewport.height;

  return (
    // Outer group: canvas position + scale
    <group position={[posX, posY, 0]} scale={scale}>
      {/* Rotating group: the pivot is its origin; the model is offset inside */}
      <group ref={rotatingGroupRef}>
        {/* Model group: placed at negative pivot so pivot becomes the rotation center */}
        <group ref={modelGroupRef} position={[-pivotX, -pivotY, -pivotZ]} />
      </group>
    </group>
  );
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
  const { background, model3d, exportConfig } = useProjectStore();
  const { blobUrls } = useAssetStore();

  // Prefer fresh blob URL from assetStore (re-created from IndexedDB on each load)
  // over background.src, which may be a stale blob URL from a previous session.
  // Fall back to background.src for static/built-in assets that have no assetId.
  const bgSrc = (background.assetId ? blobUrls[background.assetId] : null) || background.src;
  const modelSrc = (model3d.assetId ? blobUrls[model3d.assetId] : null) || model3d.src;

  return (
    <Canvas
      style={{ width: displayWidth, height: displayHeight, display: 'block' }}
      gl={{ preserveDrawingBuffer: true, antialias: true, alpha: true }}
      camera={{ position: [0, 0, 5], fov: 50 }}
    >
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
            rotationAxisX={model3d.rotationAxisX ?? 0}
            rotationAxisY={model3d.rotationAxisY ?? 1}
            rotationAxisZ={model3d.rotationAxisZ ?? 0}
            pivotX={model3d.pivotX ?? 0}
            pivotY={model3d.pivotY ?? 0}
            pivotZ={model3d.pivotZ ?? 0}
            syncRotationToGif={model3d.syncRotationToGif ?? false}
            rotationLoops={model3d.rotationLoops ?? 1}
            gifDuration={exportConfig.duration ?? 4}
          />
        )}
      </Suspense>
    </Canvas>
  );
}
