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
import { type Vector3, type ModelData, computeModelData } from "./utils";

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
  onData?: (data: ModelData) => void;
}

interface ModelProps {
  fileUrl: string;
  onGridConfig: (cfg: GridConfig) => void;
  onZoomConfig: (cfg: ZoomConfig) => void;
  onData?: (data: ModelData) => void;
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
  const minDistance = Math.max(footprint / 4, 1);
  const maxDistance = footprint * 3;
  return { minDistance, maxDistance };
}

/** Extracts vertices and faces from a single BufferGeometry. */
function extractFromGeometry(geometry: THREE.BufferGeometry): {
  vertices: Vector3[];
  faces: [number, number, number][];
} {
  const vertices: Vector3[] = [];
  const posArray = geometry.attributes.position.array as Float32Array;
  for (let i = 0; i < posArray.length; i += 3) {
    vertices.push({ x: posArray[i], y: posArray[i + 1], z: posArray[i + 2] });
  }

  const faces: [number, number, number][] = [];
  const idx = geometry.index;
  if (idx) {
    const ia = idx.array as Uint32Array | Uint16Array;
    for (let i = 0; i < ia.length; i += 3) {
      faces.push([ia[i], ia[i + 1], ia[i + 2]]);
    }
  } else {
    for (let i = 0; i < vertices.length; i += 3) {
      faces.push([i, i + 1, i + 2]);
    }
  }

  return { vertices, faces };
}

/** Extracts vertices and faces by traversing all meshes in an Object3D. */
function extractFromObject3D(object: THREE.Object3D): {
  vertices: Vector3[];
  faces: [number, number, number][];
} {
  const allVertices: Vector3[] = [];
  const allFaces: [number, number, number][] = [];
  let offset = 0;

  object.traverse((child) => {
    if (child instanceof THREE.Mesh && child.geometry) {
      const { vertices, faces } = extractFromGeometry(child.geometry);
      allVertices.push(...vertices);
      allFaces.push(
        ...faces.map(
          ([a, b, c]) =>
            [a + offset, b + offset, c + offset] as [number, number, number],
        ),
      );
      offset += vertices.length;
    }
  });

  return { vertices: allVertices, faces: allFaces };
}

// ---------------------------------------------------------------------------
// Per-format model components
// ---------------------------------------------------------------------------

function STLModel({ fileUrl, onGridConfig, onZoomConfig, onData }: ModelProps) {
  const geometry = useLoader(STLLoader, fileUrl);

  const { position, gridConfig, zoomConfig, data } = useMemo(() => {
    geometry.computeBoundingBox();
    const bb = geometry.boundingBox!;

    const px = -(bb.min.x + bb.max.x) / 2;
    const py = -bb.min.z;
    const pz = (bb.min.y + bb.max.y) / 2;

    const width = bb.max.x - bb.min.x;
    const depth = bb.max.y - bb.min.y;
    const footprint = Math.max(width, depth);

    const { vertices, faces } = extractFromGeometry(geometry);
    const data = computeModelData(vertices, faces);

    return {
      position: [px, py, pz] as [number, number, number],
      gridConfig: computeGridConfig(footprint),
      zoomConfig: computeZoomConfig(footprint),
      data,
    };
  }, [geometry]);

  useEffect(() => {
    onGridConfig(gridConfig);
    onZoomConfig(zoomConfig);
    onData?.(data);
  }, [gridConfig, zoomConfig, data, onGridConfig, onZoomConfig, onData]);

  return (
    <mesh
      geometry={geometry}
      rotation={[-Math.PI / 2, 0, 0]}
      position={position}
    >
      <meshStandardMaterial color="#888888" roughness={0.5} metalness={0.4} />
    </mesh>
  );
}

function GLTFModel({
  fileUrl,
  onGridConfig,
  onZoomConfig,
  onData,
}: ModelProps) {
  const { scene } = useGLTF(fileUrl);

  // Clone so the cached GLTF scene isn't mutated by other renders.
  const clonedScene = useMemo(() => scene.clone(true), [scene]);

  const { gridConfig, zoomConfig, data } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(clonedScene);
    const size = box.getSize(new THREE.Vector3());
    const footprint = Math.max(size.x, size.z);

    const { vertices, faces } = extractFromObject3D(clonedScene);
    const data = computeModelData(vertices, faces);

    return {
      gridConfig: computeGridConfig(footprint),
      zoomConfig: computeZoomConfig(footprint),
      data,
    };
  }, [clonedScene]);

  useEffect(() => {
    onGridConfig(gridConfig);
    onZoomConfig(zoomConfig);
    onData?.(data);
  }, [gridConfig, zoomConfig, data, onGridConfig, onZoomConfig, onData]);

  return (
    <Center bottom>
      <primitive object={clonedScene} />
    </Center>
  );
}

function OBJModel({ fileUrl, onGridConfig, onZoomConfig, onData }: ModelProps) {
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

  const { gridConfig, zoomConfig, data } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(clonedObj);
    const size = box.getSize(new THREE.Vector3());
    const footprint = Math.max(size.x, size.z);

    const { vertices, faces } = extractFromObject3D(clonedObj);
    const data = computeModelData(vertices, faces);

    return {
      gridConfig: computeGridConfig(footprint),
      zoomConfig: computeZoomConfig(footprint),
      data,
    };
  }, [clonedObj]);

  useEffect(() => {
    onGridConfig(gridConfig);
    onZoomConfig(zoomConfig);
    onData?.(data);
  }, [gridConfig, zoomConfig, data, onGridConfig, onZoomConfig, onData]);

  return (
    <Center bottom>
      <primitive object={clonedObj} />
    </Center>
  );
}

// ---------------------------------------------------------------------------
// ModelScene — selects the right loader based on `format`
// ---------------------------------------------------------------------------

export default function ModelScene({
  fileUrl,
  format,
  onData,
}: ModelSceneProps) {
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
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 20, 10]} intensity={1.2} castShadow />
      <pointLight position={[0, 10, 0]} intensity={0.5} color="#3b82f6" />
      <Environment preset="studio" />

      <Suspense fallback={null}>
        {isSTL && (
          <STLModel
            fileUrl={fileUrl}
            onGridConfig={handleGridConfig}
            onZoomConfig={handleZoomConfig}
            onData={onData}
          />
        )}
        {isGLTF && (
          <GLTFModel
            fileUrl={fileUrl}
            onGridConfig={handleGridConfig}
            onZoomConfig={handleZoomConfig}
            onData={onData}
          />
        )}
        {isOBJ && (
          <OBJModel
            fileUrl={fileUrl}
            onGridConfig={handleGridConfig}
            onZoomConfig={handleZoomConfig}
            onData={onData}
          />
        )}
      </Suspense>

      <Grid
        position={[0, 0, 0]}
        infiniteGrid
        cellSize={gridConfig.cellSize}
        sectionSize={gridConfig.sectionSize}
        fadeDistance={gridConfig.fadeDistance}
        sectionColor="#666"
        cellColor="#999"
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
