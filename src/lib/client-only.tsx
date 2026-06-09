// lib/client-only.tsx
import { useEffect, useState } from "react";

export function ClientOnly({
  children,
  fallback = null,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  // biome-ignore  lint/complexity/noUselessFragments: needed so it can wrap other components
  return mounted ? <>{children}</> : <>{fallback}</>;
}
