import { ModuleDefinition, ModuleId } from "./types";

/**
 * Registro oficial dos 12 módulos do pipeline de produção, na ordem
 * canônica definida na Seção 5 do `docs/MASTER_SPECIFICATION.md` — os
 * mesmos módulos e a mesma ordem já usados hoje pelo array
 * `pipelineModules` mockado em `lib/data.ts`.
 *
 * A cadeia de dependência é estritamente linear: cada módulo depende
 * apenas do módulo imediatamente anterior na ordem de produção. Um
 * módulo só deve transitar para "active" quando o módulo listado em
 * `dependsOn` estiver com status "done" — essa regra é aplicada pelo
 * motor de execução (`lib/pipeline-core/engine.ts`, Task 3), não aqui.
 */
export const moduleRegistry: ModuleDefinition[] = [
  {
    id: "literary-director",
    order: 1,
    title: "Literary Director",
    dependsOn: [],
  },
  {
    id: "emotion-engine",
    order: 2,
    title: "Emotion Engine",
    dependsOn: ["literary-director"],
  },
  {
    id: "character-engine",
    order: 3,
    title: "Character Engine",
    dependsOn: ["emotion-engine"],
  },
  {
    id: "world-builder",
    order: 4,
    title: "World Builder",
    dependsOn: ["character-engine"],
  },
  {
    id: "storyboard",
    order: 5,
    title: "Storyboard Engine",
    dependsOn: ["world-builder"],
  },
  {
    id: "director-engine",
    order: 6,
    title: "Director Engine",
    dependsOn: ["storyboard"],
  },
  {
    id: "prompt-builder",
    order: 7,
    title: "Prompt Builder",
    dependsOn: ["director-engine"],
  },
  {
    id: "assets",
    order: 8,
    title: "Assets",
    dependsOn: ["prompt-builder"],
  },
  {
    id: "production",
    order: 9,
    title: "Produção",
    dependsOn: ["assets"],
  },
  {
    id: "quality-director",
    order: 10,
    title: "AZ Quality Director",
    dependsOn: ["production"],
  },
  {
    id: "audience-intelligence",
    order: 11,
    title: "Audience Intelligence",
    // Nota explícita da Seção 5 do Master Spec: o Quality Director roda
    // antes do Audience Intelligence — não faz sentido preparar estratégia
    // de publicação para uma obra que ainda pode não estar aprovada.
    dependsOn: ["quality-director"],
  },
  {
    id: "export",
    order: 12,
    title: "Exportação",
    dependsOn: ["audience-intelligence"],
  },
];

/** Erro lançado quando o registry está inconsistente (ver `validateRegistry`). */
export class PipelineRegistryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PipelineRegistryError";
  }
}

/**
 * Busca a definição estática de um módulo pelo id.
 *
 * @throws {PipelineRegistryError} se o módulo não estiver registrado.
 */
export function getModuleDefinition(id: ModuleId): ModuleDefinition {
  const found = moduleRegistry.find((module) => module.id === id);
  if (!found) {
    throw new PipelineRegistryError(`Módulo "${id}" não está registrado no Pipeline Core.`);
  }
  return found;
}

/**
 * Valida a integridade do registry: ids duplicados, dependências para
 * módulos inexistentes e ciclos de dependência.
 *
 * O registry é estático (definido acima em código, não em dados
 * dinâmicos), então isto não é validação de runtime no sentido
 * tradicional — é uma rede de segurança contra erro humano ao editar
 * este arquivo no futuro, chamada pelo motor de execução (Task 3) na
 * inicialização.
 *
 * @throws {PipelineRegistryError} na primeira inconsistência encontrada.
 */
export function validateRegistry(): void {
  const knownIds = new Set<ModuleId>();
  for (const module of moduleRegistry) {
    if (knownIds.has(module.id)) {
      throw new PipelineRegistryError(`Módulo duplicado no registry: "${module.id}".`);
    }
    knownIds.add(module.id);
  }

  for (const module of moduleRegistry) {
    for (const dependencyId of module.dependsOn) {
      if (!knownIds.has(dependencyId)) {
        throw new PipelineRegistryError(
          `Módulo "${module.id}" declara dependência inexistente: "${dependencyId}".`
        );
      }
    }
  }

  const visiting = new Set<ModuleId>();
  const visited = new Set<ModuleId>();

  function visit(id: ModuleId, path: ModuleId[]): void {
    if (visited.has(id)) return;
    if (visiting.has(id)) {
      throw new PipelineRegistryError(
        `Ciclo de dependência detectado no Pipeline Core: ${[...path, id].join(" -> ")}.`
      );
    }
    visiting.add(id);
    const definition = getModuleDefinition(id);
    for (const dependencyId of definition.dependsOn) {
      visit(dependencyId, [...path, id]);
    }
    visiting.delete(id);
    visited.add(id);
  }

  for (const module of moduleRegistry) {
    visit(module.id, []);
  }
}
