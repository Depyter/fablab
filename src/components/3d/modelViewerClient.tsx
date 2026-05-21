"use client";

import dynamic from "next/dynamic";
import { Canvas, useFrame } from "@react-three/fiber";

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

// ---------------------------------------------------------------------------
// LoadingOverlay — rendered *outside* the Canvas so it covers the whole card.
// Shows during both the Convex-fetch phase and the Three.js-parse phase.
// ---------------------------------------------------------------------------
const FAB_JOKES = [
  "Why did the 3D print fail? Because it needed some space!",
  "I told my filament a joke, but it just got all tangled up.",
  "What's a 3D printer's favorite music? PLA-list!",
  "How do you fix a broken 3D printer? With a re-PLAIR-men!",
  "Why don't 3D printers ever get lost? They always follow the G-code!",
  "What do you call a 3D printed dinosaur? A dino-SURE!",
  "I asked my printer for a joke… it gave me a support structure.",
  "Why did the bed leveling fail? It couldn't handle the pressure!",
  "What's a filament's favorite drink? Layer-ade!",
  "Why did the extruder break up? It couldn't handle the heat!",
  "How many 3D printers does it take to screw in a lightbulb? Just one—but it'll take 6 hours and you'll need supports.",
  "Why was the STL file so confident? It had great mesh-urements!",
  "What do you say to a clogged nozzle? Nozzle business!",
  "Why did the print head go to therapy? Too many emotional layers.",
  "3D printing is like cooking—except when you burn it, it's called 'experimental texture'.",
  "Why do 3D printers hate secrets? Because they always come to light-er!",
  "What did the PLA say to the ABS? You're resin-ted!",
  "Why did the model get a ticket? It didn't follow the layer lines!",
  "How do you know a print is done? It starts making that weird clicking noise…",
  "Why did the calibration cube go to school? To get better layer-ning!",
];

function LoadingOverlay({ phase }: { phase: "convex" | "three" | "done" }) {
  const [jokeIndex, setJokeIndex] = useState(0);

  // Cycle through jokes every 4 seconds while loading
  useEffect(() => {
    if (phase === "done") return;
    const interval = setInterval(() => {
      setJokeIndex((prev) => (prev + 1) % FAB_JOKES.length);
    }, 4_000);
    return () => clearInterval(interval);
  }, [phase]);

  if (phase === "done") return null;

  const label = phase === "convex" ? "Fetching model…" : "Loading geometry…";

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-6 rounded-2xl bg-black/85 backdrop-blur-sm px-6">
      {/* Bigger indeterminate progress bar — animated while loading */}
      <div className="w-full max-w-72 h-3 rounded-full bg-white/15 overflow-hidden ring-1 ring-white/10">
        <div className="h-full rounded-full bg-linear-to-r from-fab-teal via-fab-amber to-fab-magenta shadow-[0_0_8px_rgba(255,255,255,0.15)] animate-indeterminate-bar" />
      </div>

      <p className="text-sm font-semibold tracking-widest uppercase text-white/70">
        {label}
      </p>

      {/* Joke — replaces the spinner */}
      <p className="text-center text-[13px] leading-relaxed text-white/50 italic max-w-xs transition-opacity duration-500">
        {FAB_JOKES[jokeIndex]}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CameraAnimator (unchanged)
// ---------------------------------------------------------------------------
function CameraAnimator({
  action,
}: {
  action: { type: "recenter"; id: number } | null;
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

// ---------------------------------------------------------------------------
// ModelContent — extracted so it can be keyed on fileUrl for a fresh mount
// (avoids calling setState in an effect to reset loading state).
// ---------------------------------------------------------------------------
function ModelContent({
  fileUrl,
  format,
}: {
  fileUrl: string;
  format: ReturnType<typeof getModelFormat>;
}) {
  const [cameraAction, setCameraAction] = useState<{
    type: "recenter";
    id: number;
  } | null>(null);

  const [modelData, setModelData] = useState<ModelData | null>(null);

  const loadingPhase: "convex" | "three" | "done" = !modelData
    ? "three"
    : "done";

  const triggerCameraAction = (type: "recenter") => {
    setCameraAction({ type, id: Date.now() });
  };

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
    <>
      <LoadingOverlay phase={loadingPhase} />

      <Canvas shadows camera={{ position: [60, 80, 120], fov: 50 }}>
        <CameraAnimator action={cameraAction} />
        <Suspense fallback={null}>
          <ModelScene fileUrl={fileUrl} format={format} onData={setModelData} />
        </Suspense>
      </Canvas>

      {/* Model stats pills — only shown once fully loaded */}
      {loadingPhase === "done" && modelData && dimensions && complexity && (
        <div className="absolute top-3 left-3 right-3 z-10 flex gap-2">
          <div className="flex flex-1 sm:flex-none items-center h-8 rounded-full border border-(--fab-border-md) bg-white/90 px-3 shadow-sm backdrop-blur-md gap-2 text-[11px] font-semibold text-(--fab-text-primary) whitespace-nowrap">
            <span className="text-(--fab-text-dim) font-bold uppercase tracking-widest text-[9px]">
              Vol
            </span>
            <span className="tabular-nums">
              {(modelData.volume / 1000).toFixed(1)} cm³
            </span>
            <div className="w-px h-3.5 bg-(--fab-border-md)" />
            <span className="text-(--fab-text-dim) font-bold uppercase tracking-widest text-[9px]">
              Size
            </span>
            <span className="tabular-nums">
              {toCm(dimensions.x)}×{toCm(dimensions.y)}×{toCm(dimensions.z)} cm
            </span>
          </div>

          <div className="flex flex-1 sm:flex-none items-center justify-center h-8 rounded-full border border-(--fab-border-md) bg-white/90 px-3 shadow-sm backdrop-blur-md gap-2 whitespace-nowrap">
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
                    className="w-2.5 rounded-full transition-opacity border"
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
              className="rounded-lg px-1.25 py-px text-[9px] font-bold uppercase tracking-[0.06em]"
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

      {loadingPhase === "done" && (
        <Button
          variant="default"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            triggerCameraAction("recenter");
          }}
          className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 h-8 rounded-full px-4 text-xs font-semibold gap-1.5 bg-fab-teal text-white hover:bg-(--fab-teal)/90 shadow-md transition-[background-color,box-shadow] duration-200 hover:translate-x-0 hover:translate-y-0 hover:shadow-md"
          title="Recenter"
        >
          <Focus className="h-3.5 w-3.5" />
          Recenter
        </Button>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// ModelViewerClient
// ---------------------------------------------------------------------------
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
  const format = fileUrl ? getModelFormat(fileType, originalName) : null;

  return (
    <div
      className={cn(
        "mt-2 w-full overflow-hidden rounded-2xl border border-sidebar-border/50 bg-black relative shadow-inner",
        className,
      )}
    >
      {fileUrl && format ? (
        <ModelContent key={fileUrl} fileUrl={fileUrl} format={format} />
      ) : (
        <LoadingOverlay phase="convex" />
      )}
    </div>
  );
}
