"use client";

import dynamic from "next/dynamic";
import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { cn } from "@/lib/utils";

const ModelScene = dynamic(() => import("./modelScene"), { ssr: false });

interface ModelViewerProps {
  fileUrl: string | null;
  className?: string;
}

export function ModelViewer({ fileUrl, className }: ModelViewerProps) {
  if (!fileUrl) {
    return (
      <div
        className={cn(
          "mt-1 flex h-60 w-full items-center justify-center rounded-md border-2 border-dashed border-gray-300 bg-gray-50",
          className,
        )}
      >
        <p className="text-gray-500">
          Upload an STL file to preview your model
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "mt-1 h-60 w-full overflow-hidden rounded-md border border-gray-200 bg-zinc-900",
        className,
      )}
    >
      <Canvas shadows camera={{ position: [60, 80, 120], fov: 50 }}>
        <Suspense fallback={null}>
          <ModelScene fileUrl={fileUrl} />
        </Suspense>
      </Canvas>
    </div>
  );
}
