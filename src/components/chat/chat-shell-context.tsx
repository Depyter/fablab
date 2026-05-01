"use client";

import * as React from "react";

const ChatShellContext = React.createContext(false);

export function ChatShellProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ChatShellContext.Provider value={true}>
      {children}
    </ChatShellContext.Provider>
  );
}

export function useHasChatShell() {
  return React.useContext(ChatShellContext);
}
