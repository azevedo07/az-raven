"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import NewProjectModal from "../NewProjectModal";

interface NewProjectModalContextValue {
  openNewProjectModal: () => void;
}

const NewProjectModalContext = createContext<NewProjectModalContextValue | null>(null);

export function NewProjectModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <NewProjectModalContext.Provider value={{ openNewProjectModal: () => setOpen(true) }}>
      {children}
      <NewProjectModal open={open} onClose={() => setOpen(false)} />
    </NewProjectModalContext.Provider>
  );
}

export function useNewProjectModal() {
  const ctx = useContext(NewProjectModalContext);
  if (!ctx) throw new Error("useNewProjectModal must be used within a NewProjectModalProvider");
  return ctx;
}
