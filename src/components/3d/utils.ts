export type Vector3 = {
  x: number;
  y: number;
  z: number;
};

export interface Triangle {
  v1: Vector3;
  v2: Vector3;
  v3: Vector3;
  normal: Vector3;
}

function vecSub(a: Vector3, b: Vector3): Vector3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function vecCross(a: Vector3, b: Vector3): Vector3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function vecDot(a: Vector3, b: Vector3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function vecLength(v: Vector3): number {
  return Math.sqrt(vecDot(v, v));
}

function vecNormalize(v: Vector3): Vector3 {
  const len = vecLength(v);
  if (len === 0) return { x: 0, y: 0, z: 0 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

/**
 * Computes the triangle faces from vertices and face indices.
 * @param vertices Array of vertex positions.
 * @param faces Array of face indices, each as [i1, i2, i3].
 * @returns Array of triangles with positions and computed normals.
 */
export function getTriangleFaces(
  vertices: Vector3[],
  faces: [number, number, number][],
): Triangle[] {
  return faces.map((face) => {
    const v1 = vertices[face[0]];
    const v2 = vertices[face[1]];
    const v3 = vertices[face[2]];
    const normal = vecNormalize(vecCross(vecSub(v2, v1), vecSub(v3, v1)));
    return { v1, v2, v3, normal };
  });
}

/**
 * Computes the bounding box of the vertices.
 * @param vertices Array of vertex positions.
 * @returns Object with min and max Vector3.
 */
export function getBoundingBox(vertices: Vector3[]): {
  min: Vector3;
  max: Vector3;
} {
  if (vertices.length === 0) {
    return {
      min: { x: 0, y: 0, z: 0 },
      max: { x: 0, y: 0, z: 0 },
    };
  }
  const min = { ...vertices[0] };
  const max = { ...vertices[0] };
  for (const v of vertices) {
    min.x = Math.min(min.x, v.x);
    min.y = Math.min(min.y, v.y);
    min.z = Math.min(min.z, v.z);
    max.x = Math.max(max.x, v.x);
    max.y = Math.max(max.y, v.y);
    max.z = Math.max(max.z, v.z);
  }
  return { min, max };
}

/**
 * Computes the volume of the mesh in mm³ using the divergence theorem.
 * Assumes the mesh is closed.
 * @param triangles Array of triangles.
 * @returns Volume in mm³.
 */
export function getVolume(triangles: Triangle[]): number {
  let volume = 0;
  for (const tri of triangles) {
    const { v1, v2, v3 } = tri;
    volume += vecDot(v1, vecCross(v2, v3));
  }
  return Math.abs(volume) / 6;
}

/**
 * Computes the surface area of the mesh in mm².
 * @param triangles Array of triangles.
 * @returns Surface area in mm².
 */
export function getSurfaceArea(triangles: Triangle[]): number {
  let area = 0;
  for (const tri of triangles) {
    const { v1, v2, v3 } = tri;
    const a = vecLength(vecSub(v2, v1));
    const b = vecLength(vecSub(v3, v2));
    const c = vecLength(vecSub(v1, v3));
    const s = (a + b + c) / 2;
    area += Math.sqrt(s * (s - a) * (s - b) * (s - c));
  }
  return area;
}

/**
 * Returns the number of triangles.
 * @param triangles Array of triangles.
 * @returns Triangle count.
 */
export function getTriangleCount(triangles: Triangle[]): number {
  return triangles.length;
}

/**
 * Computes the weight in grams.
 * @param volumeMm3 Volume in mm³.
 * @param infillPercent Infill percentage (0-100).
 * @param materialDensity Material density in g/cm³.
 * @returns Weight in grams.
 */
export function getWeight(
  volumeMm3: number,
  infillPercent: number,
  materialDensity: number,
): number {
  return (volumeMm3 / 1000) * (infillPercent / 100) * materialDensity;
}

/**
 * Computes the print time in hours using Volumetric Flow Rate.
 * More accurate than bounding-box perimeter guessing — accounts for infill
 * percentage, wall thickness, and support material.
 * @param volumeMm3 Model volume in mm³.
 * @param surfaceAreaMm2 Model surface area in mm².
 * @param infillPercent Infill percentage (0–100).
 * @param supportVolumeMm3 Estimated support volume in mm³.
 * @param layerHeightMm Layer height in mm (default 0.2).
 * @param extrusionWidthMm Extrusion width in mm (default 0.4).
 * @param printSpeedMmPerS Print speed in mm/s (default 60).
 * @returns Print time in hours.
 */
export function getPrintTime(
  volumeMm3: number,
  surfaceAreaMm2: number,
  infillPercent: number,
  supportVolumeMm3: number,
  layerHeightMm: number = 0.2,
  extrusionWidthMm: number = 0.4,
  printSpeedMmPerS: number = 60,
): number {
  // 1. Estimate the volume of the solid outer shell (assume 3 walls thick)
  const wallThicknessMm = extrusionWidthMm * 3;
  const shellVolumeMm3 = surfaceAreaMm2 * wallThicknessMm;

  // 2. Estimate the volume of the infill
  const internalVolumeMm3 = Math.max(0, volumeMm3 - shellVolumeMm3);
  const infillVolumeMm3 = internalVolumeMm3 * (infillPercent / 100);

  // 3. Total plastic actually being extruded
  const totalExtrusionVolumeMm3 =
    shellVolumeMm3 + infillVolumeMm3 + supportVolumeMm3;

  // 4. Volumetric flow rate (mm³/s)
  const flowRate = layerHeightMm * extrusionWidthMm * printSpeedMmPerS;

  // 5. Raw print time + 25% overhead for travel, retractions, and acceleration
  const printTimeSeconds = (totalExtrusionVolumeMm3 / flowRate) * 1.25;

  return printTimeSeconds / 3600;
}

/**
 * Determines if support is required based on overhang angles.
 * Assumes build direction is positive Z (0,0,1).
 * Overhang if angle between normal and build direction > threshold (e.g., 45 degrees).
 * @param triangles Array of triangles.
 * @param overhangThresholdDegrees Threshold in degrees (default 45).
 * @returns True if support is required.
 */
export function isSupportRequired(
  triangles: Triangle[],
  overhangThresholdDegrees: number = 45,
): boolean {
  const buildDir = { x: 0, y: 0, z: 1 };
  const cosThreshold = Math.cos((overhangThresholdDegrees * Math.PI) / 180);
  for (const tri of triangles) {
    const dot = vecDot(tri.normal, buildDir);
    if (dot < -cosThreshold) {
      return true;
    }
  }
  return false;
}

/**
 * Computes the overhang ratio (fraction of triangles that are overhangs).
 * @param triangles Array of triangles.
 * @param overhangThresholdDegrees Threshold in degrees (default 45).
 * @returns Overhang ratio (0-1).
 */
export function getOverhangRatio(
  triangles: Triangle[],
  overhangThresholdDegrees: number = 45,
): number {
  const buildDir = { x: 0, y: 0, z: 1 };
  const cosThreshold = Math.cos((overhangThresholdDegrees * Math.PI) / 180);
  let overhangCount = 0;
  for (const tri of triangles) {
    const dot = vecDot(tri.normal, buildDir);
    if (dot < -cosThreshold) {
      overhangCount++;
    }
  }
  return overhangCount / triangles.length;
}

/**
 * Computes the complexity tier based on surface area, volume, overhang ratio, and triangle count.
 * Tier 1: Simple, 2: Medium, 3: Complex.
 * @param surfaceAreaMm2 Surface area in mm².
 * @param volumeMm3 Volume in mm³.
 * @param overhangRatio Overhang ratio (0-1).
 * @param triangleCount Number of triangles.
 * @returns Complexity tier (1-3).
 */
export function getComplexityTier(
  surfaceAreaMm2: number,
  volumeMm3: number,
  overhangRatio: number,
  triangleCount: number,
): number {
  // Normalize each signal to a 0–1 range before combining

  // 1. Shape complexity (not size) — higher = more surface per unit volume
  const svRatio = surfaceAreaMm2 / Math.cbrt(volumeMm3 ** 2);
  const svScore = Math.min(svRatio / 0.05, 1); // normalize, cap at 1

  // 2. Overhang ratio already 0–1, most meaningful signal
  const overhangScore = overhangRatio;

  // 3. Mesh density — complexity of detail, not raw count
  const meshDensity = triangleCount / surfaceAreaMm2;
  const densityScore = Math.min(meshDensity / 2, 1); // normalize, cap at 1

  // Weighted combination — overhangs matter most for print cost
  const score = svScore * 0.3 + overhangScore * 0.5 + densityScore * 0.2;

  if (score < 0.33) return 1; // Simple
  if (score < 0.66) return 2; // Moderate
  return 3; // Complex
}
/**
 * Computes the price breakdown split into machine time and human labor.
 * Material costs are excluded — charge those separately at point of sale.
 * @param printTimeHr Print time in hours.
 * @param supportRequired Whether the model requires support structures.
 * @param complexityTier Complexity tier (1–3).
 * @param machineCostPerHr Cost per hour to run the machine (electricity/wear).
 * @param laborCostPerHr Cost per hour of human labor.
 * @returns Total price in ₱.
 */
export function getPriceBreakdown(
  printTimeHr: number,
  supportRequired: boolean,
  complexityTier: number,
  machineCostPerHr: number,
  laborCostPerHr: number,
): number {
  // 1. Machine running cost
  const machineCost = printTimeHr * machineCostPerHr;

  // 2. Human labor time (in hours)
  // Base: 10 minutes for slicing, starting print, and bed removal
  let laborTimeHr = 10 / 60;

  // Add post-processing time for support removal — complex prints take longer
  if (supportRequired) {
    // Tier 1: +5 min, Tier 2: +10 min, Tier 3: +15 min
    laborTimeHr += (5 * complexityTier) / 60;
  }

  const laborCost = laborTimeHr * laborCostPerHr;

  return machineCost + laborCost;
}

/**
 * Estimates the support volume in mm³.
 * If no support is required, returns 0.
 * Otherwise, estimates based on overhang ratio and total volume.
 * @param triangles Array of triangles.
 * @param volumeMm3 Total volume in mm³.
 * @param overhangRatio Overhang ratio (0-1).
 * @param supportFactor Factor for support volume estimation (default 0.2).
 * @returns Estimated support volume in mm³.
 */
export function getSupportVolume(
  triangles: Triangle[],
  volumeMm3: number,
  overhangRatio: number,
  supportFactor: number = 0.2,
): number {
  if (!isSupportRequired(triangles)) return 0;
  return overhangRatio * volumeMm3 * supportFactor;
}

// ---------------------------------------------------------------------------
// Shared model data types and defaults
// ---------------------------------------------------------------------------

export interface ModelData {
  boundingBox: { min: Vector3; max: Vector3 };
  volume: number;
  surfaceArea: number;
  triangleCount: number;
  weight: number;
  printTime: number;
  supportRequired: boolean;
  overhangRatio: number;
  complexityTier: number;
  price: number;
}

export const PRINT_DEFAULTS = {
  infillPercent: 20,
  materialDensity: 1.25, // g/cm³ (PLA)
  layerHeightMm: 0.2, // mm
  extrusionWidthMm: 0.4, // mm (standard 0.4 mm nozzle)
  printSpeedMmPerS: 60, // mm/s (realistic standard speed)
  overhangThreshold: 45, // degrees
  machineCostPerHr: 15, // ₱/hr (electricity + wear)
  laborCostPerHr: 180, // ₱/hr (human time)
};

/**
 * Computes all derived model metrics from raw vertices and faces in one pass.
 * @param vertices Array of vertex positions.
 * @param faces Array of face indices, each as [i1, i2, i3].
 * @returns ModelData with all computed metrics.
 */
export function computeModelData(
  vertices: Vector3[],
  faces: [number, number, number][],
): ModelData {
  const triangles = getTriangleFaces(vertices, faces);
  const boundingBox = getBoundingBox(vertices);
  const volume = getVolume(triangles);
  const surfaceArea = getSurfaceArea(triangles);
  const triangleCount = getTriangleCount(triangles);
  const weight = getWeight(
    volume,
    PRINT_DEFAULTS.infillPercent,
    PRINT_DEFAULTS.materialDensity,
  );

  const supportRequired = isSupportRequired(
    triangles,
    PRINT_DEFAULTS.overhangThreshold,
  );
  const overhangRatio = getOverhangRatio(
    triangles,
    PRINT_DEFAULTS.overhangThreshold,
  );

  // Support volume must be calculated before print time so it's included in
  // the extrusion total.
  const supportVolume = getSupportVolume(triangles, volume, overhangRatio);

  const printTime = getPrintTime(
    volume,
    surfaceArea,
    PRINT_DEFAULTS.infillPercent,
    supportVolume,
    PRINT_DEFAULTS.layerHeightMm,
    PRINT_DEFAULTS.extrusionWidthMm,
    PRINT_DEFAULTS.printSpeedMmPerS,
  );

  const complexityTier = getComplexityTier(
    surfaceArea,
    volume,
    overhangRatio,
    triangleCount,
  );

  const price = getPriceBreakdown(
    printTime,
    supportRequired,
    complexityTier,
    PRINT_DEFAULTS.machineCostPerHr,
    PRINT_DEFAULTS.laborCostPerHr,
  );

  return {
    boundingBox,
    volume,
    surfaceArea,
    triangleCount,
    weight,
    printTime,
    supportRequired,
    overhangRatio,
    complexityTier,
    price,
  };
}
