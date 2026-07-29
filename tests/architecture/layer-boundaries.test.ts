import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "fs";
import { join, relative } from "path";

/**
 * Guarda automatizada da arquitetura do Pipeline:
 *
 *   UI (app/, exceto app/api, e components/) → lib/data.ts → store.ts (Server Adapter)
 *     → Pipeline Service → Pipeline Engine → Registry
 *
 *   Consumidor externo → app/api → Pipeline Service
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

describe("Fronteiras de arquitetura do Pipeline", () => {
  it("nenhum arquivo de UI (app/, exceto app/api, e components/) importa Pipeline Engine, Registry ou Pipeline Service", () => {
    const appFiles = listSourceFiles(join(ROOT, "app")).filter((file) => !toRepoPath(file).startsWith("app/api/"));
    const componentFiles = listSourceFiles(join(ROOT, "components"));

    const violations = [...appFiles, ...componentFiles]
      .map((file) => {
        const content = readFileSync(file, "utf-8");
        const problems = [
          importsEngine(content) && "Pipeline Engine",
          importsRegistry(content) && "Registry",
          importsService(content) && "Pipeline Service",
        ].filter(Boolean);
        return { file: toRepoPath(file), problems };
      })
      .filter((entry) => entry.problems.length > 0);

    expect(violations).toEqual([]);
  });

  it("rotas da API (app/api) nunca importam Pipeline Engine ou Registry diretamente — só o Pipeline Service", () => {
    const apiFiles = listSourceFiles(join(ROOT, "app", "api"));
    expect(apiFiles.length).toBeGreaterThan(0);

    const violations = apiFiles
      .map((file) => {
        const content = readFileSync(file, "utf-8");
        const problems = [
          importsEngine(content) && "Pipeline Engine",
          importsRegistry(content) && "Registry",
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

  it("store.ts (Server Adapter) é o único ponto da UI (fora de app/api) que importa o Pipeline Service", () => {
    const appFiles = listSourceFiles(join(ROOT, "app")).filter((file) => !toRepoPath(file).startsWith("app/api/"));
    const files = [...appFiles, ...listSourceFiles(join(ROOT, "components"))];

    const importers = files.filter((file) => importsService(readFileSync(file, "utf-8")));
    expect(importers).toEqual([]);

    const storeContent = readFileSync(join(ROOT, "lib", "pipeline-core", "store.ts"), "utf-8");
    expect(importsService(storeContent)).toBe(true);
  });
});
