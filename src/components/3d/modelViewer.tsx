"use client";

import dynamic from "next/dynamic";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html, useProgress } from "@react-three/drei";
import { Suspense, useState, useEffect, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";
import { X, Info, Focus } from "lucide-react";
import * as THREE from "three";
import type { ModelFormat } from "./modelScene";
import type { ModelData } from "./utils";
import { Button } from "@/components/ui/button";

const ModelScene = dynamic(() => import("./modelScene"), { ssr: false });

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

export function getModelFormat(
  fileType?: string | null,
  originalName?: string | null,
): ModelFormat | null {
  const ext = originalName?.split(".").pop()?.toLowerCase();
  if (ext === "stl") return "stl";
  if (ext === "glb" || ext === "gltf") return ext as ModelFormat;
  if (ext === "obj") return "obj";
  return null;
}

export function is3DModel(
  fileType?: string | null,
  originalName?: string | null,
): boolean {
  return getModelFormat(fileType, originalName) !== null;
}

export function ModelViewer({
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
  const [isInfoVisible, setIsInfoVisible] = useState(false);
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

      {modelData && isInfoVisible && (
        <div className="absolute top-3 right-3 bg-sidebar/95 backdrop-blur-md p-4 rounded-xl shadow-2xl text-sidebar-foreground w-56 z-10 border border-sidebar-border font-sans text-sm">
          <div className="flex justify-between items-center mb-3 border-b border-sidebar-border pb-2">
            <span className="font-bold text-xs uppercase tracking-wider text-sidebar-foreground/70">
              Model Analysis
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsInfoVisible(false);
              }}
              className="text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <div className="flex justify-between text-sidebar-foreground/70">
                <span>Volume</span>
                <span className="font-semibold text-sidebar-foreground">
                  {(modelData.volume / 1000).toFixed(2)} cm³
                </span>
              </div>
              <div className="flex justify-between text-sidebar-foreground/70">
                <span>Size (XYZ)</span>
                <span className="font-semibold text-sidebar-foreground tabular-nums">
                  {toCm(
                    modelData.boundingBox.max.x - modelData.boundingBox.min.x,
                  )}
                  ×
                  {toCm(
                    modelData.boundingBox.max.y - modelData.boundingBox.min.y,
                  )}
                  ×
                  {toCm(
                    modelData.boundingBox.max.z - modelData.boundingBox.min.z,
                  )}{" "}
                  cm
                </span>
              </div>
            </div>

            <div className="space-y-1.5 border-t border-sidebar-border/50 pt-3">
              <div className="flex justify-between text-sidebar-foreground/70">
                <span>Weight</span>
                <span className="font-semibold text-sidebar-foreground">
                  {modelData.weight.toFixed(1)}g
                </span>
              </div>
              <div className="flex justify-between text-sidebar-foreground/70">
                <span>Est. Time</span>
                <span className="font-semibold text-sidebar-foreground">
                  {modelData.printTime.toFixed(1)}h
                </span>
              </div>
            </div>

            <div className="pt-3 mt-1 border-t border-sidebar-border flex items-center justify-between">
              <span className="font-bold text-xs text-sidebar-foreground/70 uppercase tracking-wider">
                Total
              </span>
              <span className="font-black text-chart-6 text-lg">
                ₱{modelData.price.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}

      {modelData && !isInfoVisible && (
        <Button
          variant="default"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setIsInfoVisible(true);
          }}
          className="bg-secondary hover:bg-primary absolute top-3 right-3 backdrop-blur-md rounded-lg shadow-lg border border-sidebar-border/50 gap-1.5 font-bold uppercase tracking-widest text-sm h-7 px-2.5 z-10"
        >
          <Info className="h-5 w-5" />
          Analysis
        </Button>
      )}

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-1 bg-background/80 backdrop-blur-md p-1.5 rounded-full shadow-lg border border-sidebar-border/50">
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            triggerCameraAction("recenter");
          }}
          className="h-8 px-3 rounded-full text-xs font-semibold gap-1.5"
          title="Recenter"
        >
          <Focus className="h-4 w-4" />
          Recenter
        </Button>
      </div>
    </div>
  );
}
