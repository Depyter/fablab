"use client";

import * as React from "react";

interface PageHeaderContextValue {
  setContent: (content: React.ReactNode) => void;
  clearContent: () => void;
}

const PageHeaderContext = React.createContext<PageHeaderContextValue | null>(null);

export function PageHeaderProvider({ children }: { children: React.ReactNode }) {
  const [content, setContentState] = React.useState<React.ReactNode>(null);

  const setContent = React.useCallback((c: React.ReactNode) => {
    setContentState(c);
  }, []);

  const clearContent = React.useCallback(() => {
    setContentState(null);
  }, []);

  return (
    <PageHeaderContext.Provider value={{ setContent, clearContent }}>
      {/* Render injected header content — consumed by DashboardHeader */}
      <PageHeaderSlotContext.Provider value={content}>
        {children}
      </PageHeaderSlotContext.Provider>
    </PageHeaderContext.Provider>
  );
}

/** Internal context that carries the rendered slot value up to DashboardHeader */
const PageHeaderSlotContext = React.createContext<React.ReactNode>(null);

export function usePageHeaderSlot(): React.ReactNode {
  return React.useContext(PageHeaderSlotContext);
}

/**
 * Drop this inside any page to inject title + actions into the DashboardHeader.
 * Cleans up automatically when the component unmounts.
 */
export function PageHeader({ children }: { children: React.ReactNode }) {
  const ctx = React.useContext(PageHeaderContext);

  React.useEffect(() => {
    if (!ctx) return;
    ctx.setContent(children);
    return () => ctx.clearContent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [children]);

  return null;
}
