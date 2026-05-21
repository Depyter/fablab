"use client";

import { useEffect, useMemo, useCallback, useState, Suspense } from "react";
import { useLoader } from "@react-three/fiber";
import {
  PerspectiveCamera,
  OrbitControls,
  Environment,
  Center,
  useGLTF,
  GizmoHelper,
  GizmoViewport,
} from "@react-three/drei";
import { STLLoader, OBJLoader } from "three-stdlib";
import * as THREE from "three";
import { type Vector3, type ModelData, computeModelData } from "./utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ModelFormat = "stl" | "glb" | "gltf" | "obj";

interface ZoomConfig {
  minDistance: number;
  maxDistance: number;
}

interface ModelSceneProps {
  fileUrl: string;
  format?: ModelFormat | null;
  onData?: (data: ModelData) => void;
  clippingPlanes?: THREE.Plane[];
  showHelpers?: boolean;
}

interface ModelProps {
  fileUrl: string;
  onZoomConfig: (cfg: ZoomConfig) => void;
  onData?: (data: ModelData) => void;
  clippingPlanes?: THREE.Plane[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Computes a ZoomConfig from the model's footprint. */
function computeZoomConfig(footprint: number): ZoomConfig {
  const minDistance = Math.max(footprint / 4, 1);
  const maxDistance = footprint * 10;
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

function STLModel({
  fileUrl,
  onZoomConfig,
  onData,
  clippingPlanes,
}: ModelProps) {
  const geometry = useLoader(STLLoader, fileUrl);

  const { position, zoomConfig, data } = useMemo(() => {
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
      zoomConfig: computeZoomConfig(footprint),
      data,
    };
  }, [geometry]);

  useEffect(() => {
    onZoomConfig(zoomConfig);
    onData?.(data);
  }, [zoomConfig, data, onZoomConfig, onData]);

  return (
    <mesh
      geometry={geometry}
      rotation={[-Math.PI / 2, 0, 0]}
      position={position}
    >
      <meshStandardMaterial
        color="#888888"
        roughness={0.5}
        metalness={0.4}
        clippingPlanes={clippingPlanes}
        clipShadows={true}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function GLTFModel({
  fileUrl,
  onZoomConfig,
  onData,
  clippingPlanes,
}: ModelProps) {
  const { scene } = useGLTF(fileUrl);

  // Clone so the cached GLTF scene isn't mutated by other renders.
  const clonedScene = useMemo(() => scene.clone(true), [scene]);

  const { zoomConfig, data } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(clonedScene);
    const size = box.getSize(new THREE.Vector3());
    const footprint = Math.max(size.x, size.z);

    const { vertices, faces } = extractFromObject3D(clonedScene);
    const data = computeModelData(vertices, faces);

    return {
      zoomConfig: computeZoomConfig(footprint),
      data,
    };
  }, [clonedScene]);

  useEffect(() => {
    onZoomConfig(zoomConfig);
    onData?.(data);
  }, [zoomConfig, data, onZoomConfig, onData]);

  // Apply clipping planes reactively to all materials in the scene
  useEffect(() => {
    clonedScene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const materials = Array.isArray(child.material)
          ? child.material
          : [child.material];
        materials.forEach((mat) => {
          if (mat) {
            mat.clippingPlanes = clippingPlanes || [];
            mat.clipShadows = true;
            mat.side = THREE.DoubleSide;
            mat.needsUpdate = true;
          }
        });
      }
    });
  }, [clonedScene, clippingPlanes]);

  return (
    <Center bottom>
      <primitive object={clonedScene} />
    </Center>
  );
}

function OBJModel({
  fileUrl,
  onZoomConfig,
  onData,
  clippingPlanes,
}: ModelProps) {
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

  const { zoomConfig, data } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(clonedObj);
    const size = box.getSize(new THREE.Vector3());
    const footprint = Math.max(size.x, size.z);

    const { vertices, faces } = extractFromObject3D(clonedObj);
    const data = computeModelData(vertices, faces);

    return {
      zoomConfig: computeZoomConfig(footprint),
      data,
    };
  }, [clonedObj]);

  useEffect(() => {
    onZoomConfig(zoomConfig);
    onData?.(data);
  }, [zoomConfig, data, onZoomConfig, onData]);

  // Apply clipping planes reactively to all materials in the object
  useEffect(() => {
    clonedObj.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const materials = Array.isArray(child.material)
          ? child.material
          : [child.material];
        materials.forEach((mat) => {
          if (mat) {
            mat.clippingPlanes = clippingPlanes || [];
            mat.clipShadows = true;
            mat.side = THREE.DoubleSide;
            mat.needsUpdate = true;
          }
        });
      }
    });
  }, [clonedObj, clippingPlanes]);

  return (
    <Center bottom>
      <primitive object={clonedObj} />
    </Center>
  );
}

// ---------------------------------------------------------------------------
// Clipping Plane Helper Component
// ---------------------------------------------------------------------------
interface ClippingPlaneHelperProps {
  plane: THREE.Plane;
  size: number;
}

function getPlaneColor(plane: THREE.Plane): THREE.Color {
  const nx = Math.abs(plane.normal.x);
  const ny = Math.abs(plane.normal.y);
  const nz = Math.abs(plane.normal.z);

  if (nx > ny && nx > nz) {
    return new THREE.Color("#06b6d4"); // Cyan for X
  }
  if (ny > nx && ny > nz) {
    return new THREE.Color("#eab308"); // Yellow for Y
  }
  return new THREE.Color("#ef4444"); // Red for Z
}

function ClippingPlaneHelper({ plane, size }: ClippingPlaneHelperProps) {
  const helper = useMemo(() => {
    const color = getPlaneColor(plane);
    const hp = new THREE.PlaneHelper(plane, size, color);
    hp.traverse((child) => {
      if (child instanceof THREE.Line || child instanceof THREE.Mesh) {
        const materials = Array.isArray(child.material)
          ? child.material
          : [child.material];
        materials.forEach((mat) => {
          if (mat) {
            mat.polygonOffset = true;
            mat.polygonOffsetFactor = 1;
            mat.polygonOffsetUnits = 1;
          }
        });
      }
    });
    return hp;
  }, [plane, size]);

  return <primitive object={helper} />;
}

// ---------------------------------------------------------------------------
// ModelScene — selects the right loader based on `format`
// ---------------------------------------------------------------------------

export default function ModelScene({
  fileUrl,
  format,
  onData,
  clippingPlanes,
  showHelpers = true,
}: ModelSceneProps) {
  const [zoomConfig, setZoomConfig] = useState<ZoomConfig>({
    minDistance: 1,
    maxDistance: 1000,
  });

  const handleZoomConfig = useCallback((cfg: ZoomConfig) => {
    setZoomConfig(cfg);
  }, []);

  const isGLTF = format === "glb" || format === "gltf";
  const isOBJ = format === "obj";
  // Default to STL for unknown/null format (existing behaviour).
  const isSTL = !isGLTF && !isOBJ;

  // Compute standard helper size dynamically from the zoom settings
  const helperSize = Math.max(zoomConfig.minDistance * 5, 20);

  return (
    <>
      <PerspectiveCamera
        makeDefault
        position={[60, 80, 120]}
        fov={50}
        near={Math.max(zoomConfig.minDistance / 5, 0.5)}
        far={zoomConfig.maxDistance * 1.5}
      />
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 20, 10]} intensity={1.2} castShadow />
      <pointLight position={[0, 10, 0]} intensity={0.5} color="#3b82f6" />
      <Suspense fallback={null}>
        <Environment preset="studio" />
        {isSTL && (
          <STLModel
            fileUrl={fileUrl}
            onZoomConfig={handleZoomConfig}
            onData={onData}
            clippingPlanes={clippingPlanes}
          />
        )}
        {isGLTF && (
          <GLTFModel
            fileUrl={fileUrl}
            onZoomConfig={handleZoomConfig}
            onData={onData}
            clippingPlanes={clippingPlanes}
          />
        )}
        {isOBJ && (
          <OBJModel
            fileUrl={fileUrl}
            onZoomConfig={handleZoomConfig}
            onData={onData}
            clippingPlanes={clippingPlanes}
          />
        )}
        {showHelpers &&
          clippingPlanes &&
          clippingPlanes.map((plane, idx) => (
            <ClippingPlaneHelper
              key={`helper-${idx}`}
              plane={plane}
              size={helperSize}
            />
          ))}
      </Suspense>

      <OrbitControls
        makeDefault
        enableDamping={true}
        dampingFactor={0.05}
        enablePan={true}
        enableZoom={true}
        minDistance={zoomConfig.minDistance}
        maxDistance={zoomConfig.maxDistance}
        mouseButtons={{
          LEFT: THREE.MOUSE.ROTATE,
          MIDDLE: THREE.MOUSE.DOLLY,
          RIGHT: THREE.MOUSE.PAN,
        }}
      />

      <GizmoHelper alignment="top-right" margin={[80, 80]}>
        <GizmoViewport
          axisColors={["#06b6d4", "#eab308", "#ef4444"]} // cyan for X, yellow for Y, red for Z
          labelColor="white"
        />
      </GizmoHelper>
    </>
  );
}
