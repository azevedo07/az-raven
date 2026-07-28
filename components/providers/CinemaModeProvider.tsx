"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface CinemaModeContextValue {
  cinemaMode: boolean;
  toggleCinemaMode: () => void;
  setCinemaMode: (value: boolean) => void;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

const CinemaModeContext = createContext<CinemaModeContextValue | null>(null);

export function CinemaModeProvider({ children }: { children: ReactNode }) {
  const [cinemaMode, setCinemaModeState] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const toggleCinemaMode = () => setCinemaModeState((v) => !v);
  const setCinemaMode = (value: boolean) => setCinemaModeState(value);
  const toggleSidebar = () => setSidebarCollapsed((v) => !v);

  return (
    <CinemaModeContext.Provider
      value={{ cinemaMode, toggleCinemaMode, setCinemaMode, sidebarCollapsed, toggleSidebar }}
    >
      {children}
    </CinemaModeContext.Provider>
  );
}

export function useCinemaMode() {
  const ctx = useContext(CinemaModeContext);
  if (!ctx) throw new Error("useCinemaMode must be used within a CinemaModeProvider");
  return ctx;
}
