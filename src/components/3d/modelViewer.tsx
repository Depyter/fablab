"use client";

import dynamic from "next/dynamic";
import { Canvas } from "@react-three/fiber";
import { Suspense, useState } from "react";
import { cn } from "@/lib/utils";
import { X, Info } from "lucide-react";
import type { ModelFormat } from "./modelScene";
import type { ModelData } from "./utils";
import { Button } from "@/components/ui/button";

const ModelScene = dynamic(() => import("./modelScene"), { ssr: false });

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
        <Suspense fallback={null}>
          <ModelScene fileUrl={fileUrl} format={format} onData={setModelData} />
        </Suspense>
      </Canvas>

      {modelData && isInfoVisible && (
        <div className="absolute top-3 right-3 bg-background/90 backdrop-blur-md p-3.5 rounded-xl shadow-2xl text-foreground w-[190px] z-10 border border-sidebar-border/50 font-sans text-sm">
          <div className="flex justify-between items-center mb-2 border-b border-sidebar-border/30 pb-1.5">
            <span className="font-bold uppercase tracking-tight text-primary/80">
              Analysis
            </span>
            <button
              onClick={() => setIsInfoVisible(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-2">
            <div className="space-y-1">
              <div className="flex justify-between text-muted-foreground">
                <span>Volume</span>
                <span className="font-semibold text-foreground">
                  {(modelData.volume / 1000).toFixed(2)} cm³
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Size (XYZ)</span>
                <span className="font-semibold text-foreground tabular-nums">
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

            <div className="space-y-1 border-t border-sidebar-border/20 pt-2">
              <div className="flex justify-between text-muted-foreground">
                <span>Weight</span>
                <span className="font-semibold text-foreground">
                  {modelData.weight.toFixed(1)}g
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Est. Time</span>
                <span className="font-semibold text-foreground">
                  {modelData.printTime.toFixed(1)}h
                </span>
              </div>
            </div>

            <div className="pt-1.5 mt-0.5 border-t border-sidebar-border/30 flex items-center justify-between">
              <span className=" font-bold text-muted-foreground uppercase">
                Total
              </span>
              <span className="font-black text-primary text-lg">
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
          onClick={() => setIsInfoVisible(true)}
          className="bg-secondary hover:bg-primary absolute top-3 right-3 backdrop-blur-md rounded-lg shadow-lg border border-sidebar-border/50 gap-1.5 font-bold uppercase tracking-widest text-sm h-7 px-2.5"
        >
          <Info className="h-5 w-5" />
          Analysis
        </Button>
      )}
    </div>
  );
}
