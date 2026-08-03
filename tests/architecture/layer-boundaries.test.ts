import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "fs";
import { join, relative } from "path";

/**
 * Guarda automatizada da arquitetura do Pipeline:
 *
 *   UI (app/, exceto app/api, e components/) → lib/data.ts → store.ts (Server Adapter)
 *     → lib/application/container.ts → Pipeline Service → Pipeline Engine → Registry
 *
 *   HTTP → app/api/pipeline/:projectId/<ação>/route.ts → lib/application/container.ts (Use Cases)
 *        → Pipeline Service → Pipeline Engine → Registry
 *                            ↘ Pipeline Repository → Prisma → PostgreSQL
 *
 * Estes testes não validam comportamento — validam que ninguém, no
 * futuro, reintroduz um import que quebre essa cadeia. Não é uma análise
 * estática exaustiva (não resolve grafos de módulo), mas cobre os
 * padrões de import reais usados neste projeto.
 */

const ROOT = join(__dirname, "..", "..");
const IGNORED_DIRS = new Set(["node_modules", ".next", ".git"]);

function listSourceFiles(startDir: string): string[] {
  const result: string[] = [];

  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      if (IGNORED_DIRS.has(entry)) continue;
      const fullPath = join(dir, entry);
      const info = statSync(fullPath);
      if (info.isDirectory()) {
        walk(fullPath);
      } else if (/\.(ts|tsx)$/.test(entry)) {
        result.push(fullPath);
      }
    }
  };

  walk(startDir);
  return result;
}

function toRepoPath(filePath: string): string {
  return relative(ROOT, filePath).replace(/\\/g, "/");
}

function importsSpecifier(content: string, needle: string, siblingNames: string[]): boolean {
  const importLikeLines = content
    .split("\n")
    .filter((line) => /^\s*(import|export)\b.*from\s+["']/.test(line));

  return importLikeLines.some((line) => {
    if (line.includes(needle)) return true;
    return siblingNames.some((name) => new RegExp(`from\\s+["']\\.\\.?/${name}["']`).test(line));
  });
}

const importsEngine = (content: string) => importsSpecifier(content, "pipeline-core/engine", ["engine"]);
const importsRegistry = (content: string) => importsSpecifier(content, "pipeline-core/registry", ["registry"]);
const importsService = (content: string) =>
  importsSpecifier(content, "pipeline-service/pipelineService", ["pipelineService"]);
const importsRepository = (content: string) =>
  importsSpecifier(content, "repositories/pipelineRepository", ["pipelineRepository"]);
const importsPrisma = (content: string) =>
  importsSpecifier(content, "@prisma/client", []) ||
  importsSpecifier(content, "db/client", ["client"]) ||
  importsSpecifier(content, "generated/prisma", []);
const importsContainer = (content: string) => importsSpecifier(content, "application/container", ["container"]);

describe("Fronteiras de arquitetura do Pipeline", () => {
  it("nenhum arquivo de UI (app/, exceto app/api, e components/) importa Pipeline Engine, Registry, Pipeline Service ou Repository", () => {
    const appFiles = listSourceFiles(join(ROOT, "app")).filter((file) => !toRepoPath(file).startsWith("app/api/"));
    const componentFiles = listSourceFiles(join(ROOT, "components"));

    const violations = [...appFiles, ...componentFiles]
      .map((file) => {
        const content = readFileSync(file, "utf-8");
        const problems = [
          importsEngine(content) && "Pipeline Engine",
          importsRegistry(content) && "Registry",
          importsService(content) && "Pipeline Service",
          importsRepository(content) && "Repository",
          importsPrisma(content) && "Prisma",
        ].filter(Boolean);
        return { file: toRepoPath(file), problems };
      })
      .filter((entry) => entry.problems.length > 0);

    expect(violations).toEqual([]);
  });

  it("rotas da API (app/api) nunca importam Pipeline Engine, Registry, Pipeline Service, Repository ou Prisma diretamente — só o container (Use Cases)", () => {
    const apiFiles = listSourceFiles(join(ROOT, "app", "api"));
    expect(apiFiles.length).toBeGreaterThan(0);

    const violations = apiFiles
      .map((file) => {
        const content = readFileSync(file, "utf-8");
        const problems = [
          importsEngine(content) && "Pipeline Engine",
          importsRegistry(content) && "Registry",
          importsService(content) && "Pipeline Service",
          importsRepository(content) && "Repository",
          importsPrisma(content) && "Prisma",
        ].filter(Boolean);
        return { file: toRepoPath(file), problems };
      })
      .filter((entry) => entry.problems.length > 0);

    expect(violations).toEqual([]);
  });

  it("Pipeline Engine só é importado pelo Pipeline Service", () => {
    const files = [
      ...listSourceFiles(join(ROOT, "app")),
      ...listSourceFiles(join(ROOT, "components")),
      ...listSourceFiles(join(ROOT, "lib")),
    ];

    const importers = files
      .filter((file) => importsEngine(readFileSync(file, "utf-8")))
      .map(toRepoPath)
      .sort();

    expect(importers).toEqual(["lib/pipeline-service/pipelineService.ts"]);
  });

  it("Registry só é importado pelo Pipeline Engine e pelo Server Adapter (store.ts)", () => {
    const files = [
      ...listSourceFiles(join(ROOT, "app")),
      ...listSourceFiles(join(ROOT, "components")),
      ...listSourceFiles(join(ROOT, "lib")),
    ];

    const importers = files
      .filter((file) => importsRegistry(readFileSync(file, "utf-8")))
      .map(toRepoPath)
      .sort();

    expect(importers).toEqual(["lib/pipeline-core/engine.ts", "lib/pipeline-core/store.ts"]);
  });

  it("store.ts (Server Adapter) é o único ponto fora de app/api que importa o container de Application", () => {
    const uiFiles = [
      ...listSourceFiles(join(ROOT, "app")).filter((file) => !toRepoPath(file).startsWith("app/api/")),
      ...listSourceFiles(join(ROOT, "components")),
    ];

    // Nenhum arquivo de UI (fora de app/api) importa o container ou o Service diretamente.
    expect(uiFiles.filter((file) => importsContainer(readFileSync(file, "utf-8")))).toEqual([]);
    expect(uiFiles.filter((file) => importsService(readFileSync(file, "utf-8")))).toEqual([]);

    // Dentro de lib/ (fora da própria lib/application/), só store.ts importa o container.
    const libFilesOutsideApplication = listSourceFiles(join(ROOT, "lib")).filter(
      (file) => !toRepoPath(file).startsWith("lib/application/")
    );
    const containerImporters = libFilesOutsideApplication
      .filter((file) => importsContainer(readFileSync(file, "utf-8")))
      .map(toRepoPath);
    expect(containerImporters).toEqual(["lib/pipeline-core/store.ts"]);
  });

  it("somente os Use Cases (e o container que os monta) acessam o Pipeline Service diretamente", () => {
    const files = [
      ...listSourceFiles(join(ROOT, "app")),
      ...listSourceFiles(join(ROOT, "components")),
      ...listSourceFiles(join(ROOT, "lib")),
    ];

    const importers = files
      .filter((file) => importsService(readFileSync(file, "utf-8")))
      .map(toRepoPath)
      .sort();

    expect(importers).toEqual([
      "lib/application/container.ts",
      "lib/application/use-cases/cancelProjectUseCase.ts",
      "lib/application/use-cases/createVersionUseCase.ts",
      "lib/application/use-cases/failModuleUseCase.ts",
      "lib/application/use-cases/finishModuleUseCase.ts",
      "lib/application/use-cases/getPipelineDashboardUseCase.ts",
      "lib/application/use-cases/getPipelineTimelineUseCase.ts",
      "lib/application/use-cases/getProjectStateUseCase.ts",
      "lib/application/use-cases/listVersionsUseCase.ts",
      "lib/application/use-cases/pauseProjectUseCase.ts",
      "lib/application/use-cases/restoreVersionUseCase.ts",
      "lib/application/use-cases/resumeProjectUseCase.ts",
      "lib/application/use-cases/retryModuleUseCase.ts",
      "lib/application/use-cases/runNextModuleUseCase.ts",
      "lib/application/use-cases/startProjectUseCase.ts",
    ]);
  });

  it("somente o container (ponto de composição) acessa a implementação concreta do Repository", () => {
    const files = [
      ...listSourceFiles(join(ROOT, "app")),
      ...listSourceFiles(join(ROOT, "components")),
      ...listSourceFiles(join(ROOT, "lib")),
    ];

    const importers = files
      .filter((file) => importsRepository(readFileSync(file, "utf-8")) && toRepoPath(file) !== "lib/repositories/pipelineRepository.ts")
      .map(toRepoPath)
      .sort();

    expect(importers).toEqual(["lib/application/container.ts"]);
  });

  it("somente lib/db/client.ts, lib/repositories/ e as implementações Prisma do Asset Manager/Asset Binding Engine acessam Prisma diretamente", () => {
    const files = [
      ...listSourceFiles(join(ROOT, "app")),
      ...listSourceFiles(join(ROOT, "components")),
      ...listSourceFiles(join(ROOT, "lib")).filter((file) => !toRepoPath(file).startsWith("lib/generated/")),
    ];

    const importers = files
      .filter((file) => importsPrisma(readFileSync(file, "utf-8")))
      .map(toRepoPath)
      .sort();

    // lib/assets/prismaAssetRepository.ts (Sprint 1.7) e
    // lib/scene-assets/prismaSceneAssetRepository.ts (Sprint 2.0) são
    // módulos deliberadamente separados do Pipeline (ver
    // tests/architecture/asset-layer-boundaries.test.ts e
    // scene-asset-layer-boundaries.test.ts) — compartilham só o cliente
    // Prisma singleton (lib/db/client.ts), nunca
    // lib/repositories/pipelineRepository.ts.
    expect(importers).toEqual([
      "lib/assets/prismaAssetRepository.ts",
      "lib/db/client.ts",
      "lib/repositories/pipelineRepository.ts",
      "lib/scene-assets/prismaSceneAssetRepository.ts",
    ]);
  });
});
