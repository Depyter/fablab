"use client";

import dynamic from "next/dynamic";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html, useProgress } from "@react-three/drei";
import { Suspense, useState, useEffect, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";
import { Focus } from "lucide-react";
import * as THREE from "three";
import type { ModelData } from "./utils";
import { Button } from "@/components/ui/button";
import { getModelFormat } from "./modelViewer";

const ModelScene = dynamic(() => import("./modelScene"), { ssr: false });

const COMPLEXITY_LEVELS = {
  1: { label: "Calm", color: "var(--fab-teal)" },
  2: { label: "Steady", color: "var(--fab-teal-light)" },
  3: { label: "Tuned", color: "var(--fab-amber)" },
  4: { label: "Detailed", color: "var(--fab-magenta-light)" },
  5: { label: "Wild", color: "var(--fab-magenta)" },
} as const;

function CameraAnimator({
  action,
}: {
  action: {
    type: "recenter";
    id: number;
  } | null;
}) {
  const targetPos = useMemo(() => new THREE.Vector3(60, 80, 120), []);
  const animating = useRef(false);

  useEffect(() => {
    if (!action) return;

    if (action.type === "recenter") {
      targetPos.set(60, 80, 120);
      animating.current = true;
      const timeout = setTimeout(() => {
        animating.current = false;
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [action, targetPos]);

  useFrame((state, delta) => {
    if (animating.current && state.controls) {
      state.camera.position.lerp(targetPos, delta * 5);
      // @ts-expect-error OrbitControls target exists
      state.controls.target.lerp(new THREE.Vector3(0, 0, 0), delta * 5);
      // @ts-expect-error OrbitControls update exists
      state.controls.update();
    }
  });

  return null;
}

function Loader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="flex flex-col items-center justify-center text-white bg-black/80 p-4 rounded-xl backdrop-blur-md border border-sidebar-border/50">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-3"></div>
        <div className="font-bold text-sm tracking-wider uppercase">
          {progress.toFixed(0)}%
        </div>
      </div>
    </Html>
  );
}

export default function ModelViewerClient({
  fileUrl,
  fileType,
  originalName,
  className,
}: {
  fileUrl: string | null;
  fileType?: string | null;
  originalName?: string | null;
  className?: string;
}) {
  const [modelData, setModelData] = useState<ModelData | null>(null);
  const [cameraAction, setCameraAction] = useState<{
    type: "recenter";
    id: number;
  } | null>(null);

  const triggerCameraAction = (type: "recenter") => {
    setCameraAction({ type, id: Date.now() });
  };

  if (!fileUrl) return null;
  const format = getModelFormat(fileType, originalName);

  // Convert mm to cm and format
  const toCm = (mm: number) => (mm / 10).toFixed(1);
  const dimensions = modelData
    ? {
        x: modelData.boundingBox.max.x - modelData.boundingBox.min.x,
        y: modelData.boundingBox.max.y - modelData.boundingBox.min.y,
        z: modelData.boundingBox.max.z - modelData.boundingBox.min.z,
      }
    : null;
  const complexity = modelData
    ? (COMPLEXITY_LEVELS[
        modelData.complexityTier as keyof typeof COMPLEXITY_LEVELS
      ] ?? COMPLEXITY_LEVELS[3])
    : null;

  return (
    <div
      className={cn(
        "mt-2 w-full overflow-hidden rounded-2xl border border-sidebar-border/50 bg-black relative shadow-inner",
        className,
      )}
    >
      <Canvas shadows camera={{ position: [60, 80, 120], fov: 50 }}>
        <CameraAnimator action={cameraAction} />
        <Suspense fallback={<Loader />}>
          <ModelScene fileUrl={fileUrl} format={format} onData={setModelData} />
        </Suspense>
      </Canvas>

      {modelData && dimensions && complexity && (
        <div className="absolute top-3 left-3 right-3 z-10 flex gap-2">
          {/* Pill 1: Vol + Size */}
          <div className="flex flex-1 sm:flex-none items-center h-8 rounded-full border border-[var(--fab-border-md)] bg-white/90 px-3 shadow-sm backdrop-blur-md gap-2 text-[11px] font-semibold text-[var(--fab-text-primary)] whitespace-nowrap">
            <span className="text-[var(--fab-text-dim)] font-bold uppercase tracking-[0.10em] text-[9px]">
              Vol
            </span>
            <span className="tabular-nums">
              {(modelData.volume / 1000).toFixed(1)} cm³
            </span>
            <div className="w-px h-3.5 bg-[var(--fab-border-md)]" />
            <span className="text-[var(--fab-text-dim)] font-bold uppercase tracking-[0.10em] text-[9px]">
              Size
            </span>
            <span className="tabular-nums">
              {toCm(dimensions.x)}×{toCm(dimensions.y)}×{toCm(dimensions.z)} cm
            </span>
          </div>

          {/* Pill 2: Complexity */}
          <div className="flex flex-1 sm:flex-none items-center justify-center h-8 rounded-full border border-[var(--fab-border-md)] bg-white/90 px-3 shadow-sm backdrop-blur-md gap-2 whitespace-nowrap">
            <div className="flex items-end gap-px">
              {Array.from({ length: 5 }, (_, index) => {
                const tier = index + 1;
                const active = index < modelData.complexityTier;
                const tierColor =
                  COMPLEXITY_LEVELS[tier as keyof typeof COMPLEXITY_LEVELS]
                    .color;
                return (
                  <span
                    key={`complexity-bar-${tier}`}
                    className="w-[10px] rounded-full transition-opacity border"
                    style={{
                      height: `${5 + index * 2}px`,
                      background: active
                        ? tierColor
                        : "color-mix(in srgb, var(--fab-border-md) 60%, white)",
                      opacity: active ? 1 : 0.5,
                    }}
                  />
                );
              })}
            </div>
            <span
              className="rounded-[4px] px-[5px] py-[1px] text-[9px] font-bold uppercase tracking-[0.06em]"
              style={{
                background: `color-mix(in srgb, ${complexity.color} 20%, white)`,
                color: complexity.color,
              }}
            >
              {complexity.label}
            </span>
          </div>
        </div>
      )}

      <Button
        variant="default"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          triggerCameraAction("recenter");
        }}
        className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 h-8 rounded-full px-4 text-xs font-semibold gap-1.5 bg-[var(--fab-teal)] text-white hover:bg-[var(--fab-teal)]/90 shadow-md"
        title="Recenter"
      >
        <Focus className="h-3.5 w-3.5" />
        Recenter
      </Button>
    </div>
  );
}
