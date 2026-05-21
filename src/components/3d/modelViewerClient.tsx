"use client";

import dynamic from "next/dynamic";
import { Canvas, useFrame } from "@react-three/fiber";

import { Suspense, useState, useEffect, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";
import { Focus, Scissors } from "lucide-react";
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
const MIN_THICKNESS_RATIO = 0.002; // 0.2% of model dimension to prevent thin slice rendering artifacts

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
  const [showClippingPanel, setShowClippingPanel] = useState(false);
  const [clippingConfig, setClippingConfig] = useState({
    x: { enabled: false, value: 0, dir: -1 },
    y: { enabled: false, value: 0, dir: -1 },
    z: { enabled: false, value: 0, dir: -1 },
    showHelpers: true,
  });

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

  // Compute bounding box dimensions and limits normalized in world space
  const worldBounds = useMemo(() => {
    if (!modelData) return null;
    const localX = modelData.boundingBox.max.x - modelData.boundingBox.min.x;
    const localY = modelData.boundingBox.max.y - modelData.boundingBox.min.y;
    const localZ = modelData.boundingBox.max.z - modelData.boundingBox.min.z;

    if (format === "stl") {
      // STL is rotated in STLModel: rotation={[-Math.PI / 2, 0, 0]}
      // local X -> world X
      // local Y -> world Z
      // local Z -> world Y
      return {
        xMin: -localX / 2,
        xMax: localX / 2,
        yMin: 0,
        yMax: localZ,
        zMin: -localY / 2,
        zMax: localY / 2,
      };
    } else {
      // GLTF/OBJ are bottomed at Y = 0 and centered on X/Z
      return {
        xMin: -localX / 2,
        xMax: localX / 2,
        yMin: 0,
        yMax: localY,
        zMin: -localZ / 2,
        zMax: localZ / 2,
      };
    }
  }, [modelData, format]);

  // Use a ref for worldBounds to ensure event handlers always have the latest value
  // without needing to be recreated on every render (though they currently are).
  const worldBoundsRef = useRef(worldBounds);
  useEffect(() => {
    worldBoundsRef.current = worldBounds;
  }, [worldBounds]);

  const hasInitializedRef = useRef(false);

  // Proactively set clipping slider initial values once worldBounds are calculated
  useEffect(() => {
    if (worldBounds && !hasInitializedRef.current) {
      setClippingConfig({
        x: {
          enabled: false,
          value: (worldBounds.xMin + worldBounds.xMax) / 2,
          dir: -1,
        },
        y: {
          enabled: false,
          value: (worldBounds.yMin + worldBounds.yMax) / 2,
          dir: -1,
        },
        z: {
          enabled: false,
          value: (worldBounds.zMin + worldBounds.zMax) / 2,
          dir: -1,
        },
        showHelpers: true,
      });
      hasInitializedRef.current = true;
    }
  }, [worldBounds]);

  // Construct active THREE.Plane objects based on state
  const activePlanes = useMemo(() => {
    if (!modelData || !worldBounds) return [];

    const planes: THREE.Plane[] = [];

    if (clippingConfig.x.enabled) {
      const normal = new THREE.Vector3(clippingConfig.x.dir, 0, 0);
      const constant =
        clippingConfig.x.dir === -1
          ? clippingConfig.x.value
          : -clippingConfig.x.value;
      planes.push(new THREE.Plane(normal, constant));
    }

    if (clippingConfig.y.enabled) {
      const normal = new THREE.Vector3(0, clippingConfig.y.dir, 0);
      const constant =
        clippingConfig.y.dir === -1
          ? clippingConfig.y.value
          : -clippingConfig.y.value;
      planes.push(new THREE.Plane(normal, constant));
    }

    if (clippingConfig.z.enabled) {
      const normal = new THREE.Vector3(0, 0, clippingConfig.z.dir);
      const constant =
        clippingConfig.z.dir === -1
          ? clippingConfig.z.value
          : -clippingConfig.z.value;
      planes.push(new THREE.Plane(normal, constant));
    }

    return planes;
  }, [clippingConfig, modelData, worldBounds]);

  const handleAxisToggle = (axis: "x" | "y" | "z", enabled: boolean) => {
    setClippingConfig((prev) => ({
      ...prev,
      [axis]: { ...prev[axis], enabled },
    }));
  };

  const handleAxisInvert = (axis: "x" | "y" | "z") => {
    setClippingConfig((prev) => {
      const newDir = prev[axis].dir === -1 ? 1 : -1;
      let newValue = prev[axis].value;

      const bounds = worldBoundsRef.current;
      if (bounds) {
        const min = bounds[`${axis}Min` as keyof typeof bounds];
        const max = bounds[`${axis}Max` as keyof typeof bounds];
        const L = max - min;
        const minThickness = L * MIN_THICKNESS_RATIO;

        if (newDir === -1) {
          newValue = Math.max(min + minThickness, Math.min(max, newValue));
        } else {
          newValue = Math.max(min, Math.min(max - minThickness, newValue));
        }
      }

      return {
        ...prev,
        [axis]: { ...prev[axis], dir: newDir, value: newValue },
      };
    });
  };

  const handleAxisValueChange = (axis: "x" | "y" | "z", value: number) => {
    setClippingConfig((prev) => ({
      ...prev,
      [axis]: { ...prev[axis], value },
    }));
  };

  return (
    <>
      <LoadingOverlay phase={loadingPhase} />

      <Canvas
        shadows
        gl={{ localClippingEnabled: true }}
      >
        <CameraAnimator action={cameraAction} />
        <Suspense fallback={null}>
          <ModelScene
            fileUrl={fileUrl}
            format={format}
            onData={setModelData}
            clippingPlanes={activePlanes}
            showHelpers={clippingConfig.showHelpers}
          />
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
        <button
          onClick={(e) => {
            e.stopPropagation();
            triggerCameraAction("recenter");
          }}
          className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 h-8 rounded-full px-4 text-xs font-semibold inline-flex items-center justify-center gap-1.5 bg-fab-teal text-white hover:bg-(--fab-teal)/90 shadow-md transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer select-none outline-none shrink-0 border-0"
          title="Recenter"
        >
          <Focus className="h-3.5 w-3.5 shrink-0" />
          Recenter
        </button>
      )}

      {/* Floating clipping plane toggle button */}
      {loadingPhase === "done" && (
        <Button
          variant="default"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setShowClippingPanel(!showClippingPanel);
          }}
          className={cn(
            "absolute bottom-3 right-3 z-10 h-8 w-8 rounded-full p-0 shadow-md border transition-all duration-200 hover:scale-105 active:scale-95",
            showClippingPanel
              ? "bg-fab-teal border-fab-teal text-white hover:bg-(--fab-teal)/90"
              : "bg-black/60 border-white/10 text-white hover:bg-black/80 hover:text-white",
          )}
          title="Cross Sections"
        >
          <Scissors className="h-3.5 w-3.5" />
        </Button>
      )}

      {/* Floating clipping planes control panel */}
      {loadingPhase === "done" && showClippingPanel && worldBounds && (
        <div className="absolute bottom-13 right-3 z-10 w-72 rounded-2xl border border-white/10 bg-black/85 p-4 shadow-xl backdrop-blur-md flex flex-col gap-3.5 select-none animate-in fade-in slide-in-from-bottom-2 duration-200 text-white">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-white/90 flex items-center gap-1.5">
              <Scissors className="h-3.5 w-3.5 text-fab-teal" />
              Cross Sections
            </span>
            <label className="flex items-center gap-1.5 text-[9px] font-semibold text-white/50 cursor-pointer hover:text-white/80 transition-colors">
              <input
                type="checkbox"
                checked={clippingConfig.showHelpers}
                onChange={(e) =>
                  setClippingConfig((prev) => ({
                    ...prev,
                    showHelpers: e.target.checked,
                  }))
                }
                className="rounded border-white/20 bg-white/5 text-fab-teal focus:ring-0 focus:ring-offset-0 h-3 w-3 cursor-pointer"
              />
              Show Planes
            </label>
          </div>

          <AxisControl
            axis="x"
            label="X Plane"
            colorClass="text-fab-teal"
            accentClass="accent-fab-teal"
            config={clippingConfig.x}
            bounds={{ min: worldBounds.xMin, max: worldBounds.xMax }}
            onToggle={(enabled) => handleAxisToggle("x", enabled)}
            onInvert={() => handleAxisInvert("x")}
            onChange={(val) => handleAxisValueChange("x", val)}
          />

          <AxisControl
            axis="y"
            label="Y Plane"
            colorClass="text-fab-amber"
            accentClass="accent-fab-amber"
            config={clippingConfig.y}
            bounds={{ min: worldBounds.yMin, max: worldBounds.yMax }}
            onToggle={(enabled) => handleAxisToggle("y", enabled)}
            onInvert={() => handleAxisInvert("y")}
            onChange={(val) => handleAxisValueChange("y", val)}
          />

          <AxisControl
            axis="z"
            label="Z Plane"
            colorClass="text-fab-magenta"
            accentClass="accent-fab-magenta"
            config={clippingConfig.z}
            bounds={{ min: worldBounds.zMin, max: worldBounds.zMax }}
            onToggle={(enabled) => handleAxisToggle("z", enabled)}
            onInvert={() => handleAxisInvert("z")}
            onChange={(val) => handleAxisValueChange("z", val)}
          />
        </div>
      )}
    </>
  );
}

interface AxisControlProps {
  axis: "x" | "y" | "z";
  label: string;
  colorClass: string;
  accentClass: string;
  config: { enabled: boolean; value: number; dir: number };
  bounds: { min: number; max: number };
  onToggle: (enabled: boolean) => void;
  onInvert: () => void;
  onChange: (value: number) => void;
}

function AxisControl({
  label,
  colorClass,
  accentClass,
  config,
  bounds,
  onToggle,
  onInvert,
  onChange,
}: AxisControlProps) {
  const { min, max } = bounds;
  const L = max - min;
  const minThickness = L * MIN_THICKNESS_RATIO;
  const sliderMin = config.dir === -1 ? min + minThickness : min;
  const sliderMax = config.dir === -1 ? max : max - minThickness;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-[10px] font-medium text-white/80">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) => onToggle(e.target.checked)}
            className="rounded border-white/20 bg-white/5 text-fab-teal focus:ring-0 focus:ring-offset-0 h-3.5 w-3.5 cursor-pointer"
          />
          <span
            className={cn(
              "font-bold uppercase tracking-wider",
              config.enabled && colorClass,
            )}
          >
            {label}
          </span>
        </div>
        {config.enabled && (
          <button
            onClick={onInvert}
            className={cn(
              "text-[9px] font-bold uppercase tracking-wider hover:opacity-80 transition-opacity cursor-pointer",
              colorClass,
            )}
            title="Toggle kept side"
          >
            {config.dir === -1 ? "Keep Min" : "Keep Max"}
          </button>
        )}
      </div>

      {config.enabled && (
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={sliderMin}
            max={sliderMax}
            step={L / 200}
            value={config.value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className={cn(
              "flex-1 h-1 rounded-lg bg-white/10 appearance-none cursor-pointer focus:outline-hidden",
              accentClass,
            )}
          />
          <span className="text-[10px] font-mono text-white/60 tabular-nums w-12 text-right">
            {(config.value / 10).toFixed(1)} cm
          </span>
        </div>
      )}
    </div>
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
