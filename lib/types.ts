export type ProjectStatus = "andamento" | "revisao" | "concluido";

export interface Project {
  id: string;
  name: string;
  autor: string;
  idioma: string;
  status: ProjectStatus;
  statusLabel: string;
  progress: number;
  tempo: string;
  paletteFrom: string;
  paletteTo: string;
  scenesCount: number;
  lastEdited: string;
  objective: string;
}

export interface Scene {
  n: number;
  title: string;
  emo: string;
  narr: string;
  tempo: string;
  duracao: string;
  som: string;
  luz: string;
  cam: string;
  paleta: [string, string, string];
  status: "aprovado" | "em revisão" | "pendente";
  criterio: string;
}

export type PipelineStatus = "done" | "active" | "pending";

export interface PipelineModule {
  title: string;
  status: PipelineStatus;
  description: string;
  pct: number;
  eta: string;
}

export interface QualityCategory {
  name: string;
  note: string;
  score: number;
}

export interface PlatformStrategy {
  label: string;
  rows: [string, string][];
}
