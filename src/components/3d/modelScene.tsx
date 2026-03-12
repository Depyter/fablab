"use client";

import { useEffect, useMemo, useCallback, useState } from "react";
import { useLoader } from "@react-three/fiber";
import { OrbitControls, Grid, Environment } from "@react-three/drei";
import { STLLoader } from "three-stdlib";
import { Suspense } from "react";

interface ModelSceneProps {
  fileUrl: string;
}

interface GridConfig {
  cellSize: number;
  sectionSize: number;
  fadeDistance: number;
}

function STLModel({
  fileUrl,
  onGridConfig,
}: {
  fileUrl: string;
  onGridConfig: (cfg: GridConfig) => void;
}) {
  const geometry = useLoader(STLLoader, fileUrl);

  // Derive both the mesh position offset and grid config from the bounding box.
  // Only recomputes when the geometry reference changes (useLoader caches it).
  const { position, gridConfig } = useMemo(() => {
    geometry.computeBoundingBox();
    const bb = geometry.boundingBox!;

    // After rotation [-PI/2, 0, 0]:
    //   new_x = old_x   (width stays)
    //   new_y = old_z   (STL Z-up becomes Three.js Y-up)
    //   new_z = -old_y  (STL Y becomes Three.js -Z)
    //
    // We want:
    //   • Bottom face at Y = 0  →  position.y = -bb.min.z
    //   • Centered on X = 0     →  position.x = -(bb.min.x + bb.max.x) / 2
    //   • Centered on Z = 0     →  position.z =  (bb.min.y + bb.max.y) / 2
    const px = -(bb.min.x + bb.max.x) / 2;
    const py = -bb.min.z;
    const pz = (bb.min.y + bb.max.y) / 2;

    // Footprint is the larger of the two horizontal extents.
    const width = bb.max.x - bb.min.x;
    const depth = bb.max.y - bb.min.y;
    const footprint = Math.max(width, depth);

    // Pick a "nice" cell size: aim for ~20 divisions across the footprint,
    // then round to the nearest 1 / 2 / 5 / 10 × power-of-10 step.
    const rawCell = footprint / 20;
    const magnitude = Math.pow(
      10,
      Math.floor(Math.log10(Math.max(rawCell, 0.001))),
    );
    const norm = rawCell / magnitude;
    const niceStep = norm < 1.5 ? 1 : norm < 3.5 ? 2 : norm < 7.5 ? 5 : 10;
    const cellSize = Math.max(0.1, niceStep * magnitude);

    return {
      position: [px, py, pz] as [number, number, number],
      gridConfig: {
        cellSize,
        sectionSize: cellSize * 10,
        fadeDistance: footprint * 3,
      },
    };
  }, [geometry]);

  // Report grid config to the parent after render — never during render.
  useEffect(() => {
    onGridConfig(gridConfig);
  }, [gridConfig, onGridConfig]);

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

export default function ModelScene({ fileUrl }: ModelSceneProps) {
  const [gridConfig, setGridConfig] = useState<GridConfig>({
    cellSize: 5,
    sectionSize: 50,
    fadeDistance: 150,
  });

  // Stable callback so STLModel's useEffect doesn't re-fire unnecessarily.
  const handleGridConfig = useCallback(
    (cfg: GridConfig) => setGridConfig(cfg),
    [],
  );

  return (
    <>
      {/* Lighting — equivalent to what Stage provided */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 20, 10]} intensity={1} castShadow />
      <Environment preset="city" />

      <Suspense fallback={null}>
        <STLModel fileUrl={fileUrl} onGridConfig={handleGridConfig} />
      </Suspense>

      {/* Print-bed grid always lives at Y = 0, i.e. directly under the model */}
      <Grid
        position={[0, 0, 0]}
        infiniteGrid
        cellSize={gridConfig.cellSize}
        sectionSize={gridConfig.sectionSize}
        fadeDistance={gridConfig.fadeDistance}
        sectionColor="#444"
        cellColor="#888"
      />

      <OrbitControls makeDefault autoRotate autoRotateSpeed={0.5} />
    </>
  );
}
