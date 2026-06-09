import type { ComponentProps } from "react";
import { lazy, Suspense } from "react";
import { ClientOnly } from "@/lib/client-only";

const ModelViewerClient = lazy(() => import("./modelViewerClient"));

export default function ModelViewer(
  props: ComponentProps<typeof ModelViewerClient>,
) {
  return (
    <ClientOnly>
      <Suspense fallback={null}>
        <ModelViewerClient {...props} />
      </Suspense>
    </ClientOnly>
  );
}
