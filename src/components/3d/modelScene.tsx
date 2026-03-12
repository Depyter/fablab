"use client";

import { useEffect, useMemo, useCallback, useState, Suspense } from "react";
import { useLoader } from "@react-three/fiber";
import {
  OrbitControls,
  Grid,
  Environment,
  Center,
  useGLTF,
} from "@react-three/drei";
import { STLLoader, OBJLoader } from "three-stdlib";
import * as THREE from "three";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ModelFormat = "stl" | "glb" | "gltf" | "obj";

interface GridConfig {
  cellSize: number;
  sectionSize: number;
  fadeDistance: number;
}

interface ZoomConfig {
  minDistance: number;
  maxDistance: number;
}

interface ModelSceneProps {
  fileUrl: string;
  format?: ModelFormat | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Derives a visually pleasing grid config from the model's XZ footprint. */
function computeGridConfig(footprint: number): GridConfig {
  const rawCell = footprint / 20;
  const magnitude = Math.pow(
    10,
    Math.floor(Math.log10(Math.max(rawCell, 0.001))),
  );
  const norm = rawCell / magnitude;
  const niceStep = norm < 1.5 ? 1 : norm < 3.5 ? 2 : norm < 7.5 ? 5 : 10;
  const cellSize = Math.max(0.1, niceStep * magnitude);
  return {
    cellSize,
    sectionSize: cellSize * 10,
    fadeDistance: footprint * 3,
  };
}

/** Computes a ZoomConfig from the model's footprint. */
function computeZoomConfig(footprint: number): ZoomConfig {
  const minDistance = Math.max(footprint / 4, 1); // Minimum zoom in
  const maxDistance = footprint * 3; // Maximum zoom out
  return { minDistance, maxDistance };
}

// ---------------------------------------------------------------------------
// Per-format model components
// ---------------------------------------------------------------------------

function STLModel({
  fileUrl,
  onGridConfig,
  onZoomConfig,
}: {
  fileUrl: string;
  onGridConfig: (cfg: GridConfig) => void;
  onZoomConfig: (cfg: ZoomConfig) => void;
}) {
  const geometry = useLoader(STLLoader, fileUrl);

  const { position, gridConfig, zoomConfig } = useMemo(() => {
    geometry.computeBoundingBox();
    const bb = geometry.boundingBox!;

    // After rotation [-PI/2, 0, 0]:
    //   new_x = old_x, new_y = old_z, new_z = -old_y
    const px = -(bb.min.x + bb.max.x) / 2;
    const py = -bb.min.z;
    const pz = (bb.min.y + bb.max.y) / 2;

    const width = bb.max.x - bb.min.x;
    const depth = bb.max.y - bb.min.y;
    const footprint = Math.max(width, depth);

    return {
      position: [px, py, pz] as [number, number, number],
      gridConfig: computeGridConfig(footprint),
      zoomConfig: computeZoomConfig(footprint),
    };
  }, [geometry]);

  useEffect(() => {
    onGridConfig(gridConfig);
    onZoomConfig(zoomConfig);
  }, [gridConfig, onGridConfig, onZoomConfig]);

  return (
    <mesh
      geometry={geometry}
      rotation={[-Math.PI / 2, 0, 0]}
      position={position}
    >
      <meshStandardMaterial color="#888888" roughness={0.4} metalness={0.1} />
    </mesh>
  );
}

function GLTFModel({
  fileUrl,
  onGridConfig,
  onZoomConfig,
}: {
  fileUrl: string;
  onGridConfig: (cfg: GridConfig) => void;
  onZoomConfig: (cfg: ZoomConfig) => void;
}) {
  const { scene } = useGLTF(fileUrl);

  // Clone so the cached GLTF scene isn't mutated by other renders.
  const clonedScene = useMemo(() => scene.clone(true), [scene]);

  const { gridConfig, zoomConfig } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(clonedScene);
    const size = box.getSize(new THREE.Vector3());
    const footprint = Math.max(size.x, size.z);
    return {
      gridConfig: computeGridConfig(footprint),
      zoomConfig: computeZoomConfig(footprint),
    };
  }, [clonedScene]);

  useEffect(() => {
    onGridConfig(gridConfig);
    onZoomConfig(zoomConfig);
  }, [gridConfig, zoomConfig, onGridConfig, onZoomConfig]);

  return (
    <Center bottom>
      <primitive object={clonedScene} />
    </Center>
  );
}

function OBJModel({
  fileUrl,
  onGridConfig,
  onZoomConfig,
}: {
  fileUrl: string;
  onGridConfig: (cfg: GridConfig) => void;
  onZoomConfig: (cfg: ZoomConfig) => void;
}) {
  const obj = useLoader(OBJLoader, fileUrl);

  // Clone so the cached OBJ group isn't mutated between renders.
  const clonedObj = useMemo(() => {
    const clone = obj.clone(true);
    // Apply a default material to any mesh that has no material,
    // since OBJ files loaded without an MTL will be invisible otherwise.
    const defaultMat = new THREE.MeshStandardMaterial({
      color: "#888888",
      roughness: 0.4,
      metalness: 0.1,
    });
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh && !child.material) {
        child.material = defaultMat;
      }
    });
    return clone;
  }, [obj]);

  const { gridConfig, zoomConfig } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(clonedObj);
    const size = box.getSize(new THREE.Vector3());
    const footprint = Math.max(size.x, size.z);
    return {
      gridConfig: computeGridConfig(footprint),
      zoomConfig: computeZoomConfig(footprint),
    };
  }, [clonedObj]);

  useEffect(() => {
    onGridConfig(gridConfig);
    onZoomConfig(zoomConfig);
  }, [gridConfig, zoomConfig, onGridConfig, onZoomConfig]);

  return (
    <Center bottom>
      <primitive object={clonedObj} />
    </Center>
  );
}

// ---------------------------------------------------------------------------
// ModelScene — selects the right loader based on `format`
// ---------------------------------------------------------------------------

export default function ModelScene({ fileUrl, format }: ModelSceneProps) {
  const [gridConfig, setGridConfig] = useState<GridConfig>({
    cellSize: 5,
    sectionSize: 50,
    fadeDistance: 150,
  });
  const [zoomConfig, setZoomConfig] = useState<ZoomConfig>({
    minDistance: 1,
    maxDistance: 300,
  });

  const handleGridConfig = useCallback((cfg: GridConfig) => {
    setGridConfig(cfg);
  }, []);
  const handleZoomConfig = useCallback((cfg: ZoomConfig) => {
    setZoomConfig(cfg);
  }, []);

  const isGLTF = format === "glb" || format === "gltf";
  const isOBJ = format === "obj";
  // Default to STL for unknown/null format (existing behaviour).
  const isSTL = !isGLTF && !isOBJ;

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 20, 10]} intensity={1} castShadow />
      <Environment preset="city" />

      <Suspense fallback={null}>
        {isSTL && (
          <STLModel
            fileUrl={fileUrl}
            onGridConfig={handleGridConfig}
            onZoomConfig={handleZoomConfig}
          />
        )}
        {isGLTF && (
          <GLTFModel
            fileUrl={fileUrl}
            onGridConfig={handleGridConfig}
            onZoomConfig={handleZoomConfig}
          />
        )}
        {isOBJ && (
          <OBJModel
            fileUrl={fileUrl}
            onGridConfig={handleGridConfig}
            onZoomConfig={handleZoomConfig}
          />
        )}
      </Suspense>

      <Grid
        position={[0, 0, 0]}
        infiniteGrid
        cellSize={gridConfig.cellSize}
        sectionSize={gridConfig.sectionSize}
        fadeDistance={gridConfig.fadeDistance}
        sectionColor="#444"
        cellColor="#888"
      />

      <OrbitControls
        makeDefault
        autoRotate
        autoRotateSpeed={0.5}
        minDistance={zoomConfig.minDistance}
        maxDistance={zoomConfig.maxDistance}
      />
    </>
  );
}
